
const { OpenAI } = require('openai');
const { Pool } = require('pg');
const supabase = require('../supabaseClient');
const { ROUTER_SYSTEM_PROMPT } = require('../agents/router_prompts');
const { SQL_AGENT_SYSTEM_PROMPT } = require('../agents/sql_agent_prompts');
const { searchSqlMemory, saveSqlMemory } = require('../agents/memory_agent');
const { safeJsonParseWithMarkdown } = require('../utils/ai_utils');
const { refineQuestion } = require('../agents/query_refiner');
const { searchItemsVector } = require('../agents/vector_agent');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const AskController = {
    /**
     * Processes a user question using the AI flow.
     * Supports retry logic by ignoring bad memories if retryContext is provided.
     * 
     * @param {Object} params
     * @param {string} params.userId - The user's ID
     * @param {string} params.question - The raw question
     * @param {Array} params.history - Chat history
     * @param {boolean} params.isRetry - Whether this is a retry attempt (skips memory)
     */
    async processQuestion({ userId, question, history = [], isRetry = false }) {
        let tool = "";
        let usedMemoryId = null;
        let suggestedQuestions = [];

        // 0. LOGGING
        console.log(`🤖 AskController: Processing for ${userId} (Retry: ${isRetry})`);
        console.log(`🤖 Raw Question: "${question}"`);

        // --- STEP 1: QUERY REFINEMENT (Typo Fixes) ---
        const finalQuestion = await refineQuestion(question);

        // --- CONTEXT PREPARATION ---
        const recentHistory = history.slice(-6).map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text || ''
        }));

        const messagesWithContext = [
            ...recentHistory,
            { role: 'user', content: finalQuestion }
        ];

        // 1. DETERMINISTIC ROUTING (Force SQL for clear keywords)
        const lowerQ = finalQuestion.toLowerCase();
        if (lowerQ.match(/spend|spent|cost|total|average|sum|how much/)) {
            console.log('🤖 Keyword Rule Triggered -> Forcing SQL_AGENT');
            tool = "SQL_AGENT";
        }

        // 2. LLM ROUTING (Using History!)
        if (!tool) {
            const routerRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: ROUTER_SYSTEM_PROMPT },
                    ...messagesWithContext
                ],
                response_format: { type: "json_object" },
                temperature: 0
            });
            const parsed = safeJsonParseWithMarkdown(routerRes.choices[0].message.content);
            tool = parsed.tool;
        }

        console.log(`🤖 Selected Tool: ${tool}`);

        let answer = "";
        let items = [];

        // 3. EXECUTION
        if (tool === "SQL_AGENT") {
            let client;
            try {
                client = await pool.connect();

                // 🧠 MEMORY CHECK (Dynamic Few-Shot)
                let memoryContext = "";

                // CRITICAL: If Retrying, DO NOT use memory (assume it was bad)
                if (!isRetry) {
                    const similarSql = await searchSqlMemory(finalQuestion);
                    if (similarSql) {
                        console.log('💡 Using Dynamic Few-Shot Prompting from Memory');
                        usedMemoryId = similarSql.id;
                        memoryContext = `
IMPORTANT - PROVEN EXAMPLE:
A very similar question was successfully answered in the past.
Similar Question: "${similarSql.question}"
Correct SQL used: ${similarSql.sql_query}

INSTRUCTION: Use the above SQL as a "Proven Template". Copy its logic (joins, filters) but adapt the WHERE clauses (merchant name, date range) to match the CURRENT request.
`;
                    }
                } else {
                    console.log('🔄 RETRY MODE: Skipping Memory Lookup to ensure fresh perspective.');
                }

                // Generate SQL
                const sqlRes = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: SQL_AGENT_SYSTEM_PROMPT + memoryContext + "\nOutput JSON: { \"sql\": \"SELECT ...\" }" },
                        ...messagesWithContext
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0
                });

                const { sql } = JSON.parse(sqlRes.choices[0].message.content);
                console.log('🤖 Generated SQL:', sql);

                // Execute SQL
                const { rows } = await client.query(sql, [userId]);
                console.log(`✅ SQL Execution Success: ${rows.length} rows`);

                if (rows.length > 0) {
                    // If we have results, verify aggregation
                    // If the user asked "How much" but we got unrelated rows, we might need to sum them manually?
                    // No, the prompt FORCES SUM().

                    if (!isRetry) {
                        await saveSqlMemory(finalQuestion, sql);
                    }

                    // Summarize Results
                    const summaryRes = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "You are a helpful financial assistant. Summarize the following data into a friendly 1-2 sentence answer. Convert currency to GBP (£). Bold the total." },
                            { role: "user", content: `Question: ${finalQuestion}\nData: ${JSON.stringify(rows)}` }
                        ],
                    });
                    answer = summaryRes.choices[0].message.content;

                    // Generate Suggestions
                    const suggestionRes = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "Generate 3 follow-up questions explicitly related to the database/spending. JSON format: { \"questions\": [\"...\"] }" },
                            { role: "user", content: `Original Q: ${finalQuestion}\nAnswer: ${answer}` }
                        ],
                        response_format: { type: "json_object" }
                    });
                    suggestedQuestions = JSON.parse(suggestionRes.choices[0].message.content).questions;

                } else {
                    // Fallback to Logic 2: Vector Search if SQL returns empty?
                    console.log('⚠️ SQL returned 0/empty results. Auto-fallback to Vector Search for semantic match.');
                    const vectorFallbackItems = await searchItemsVector(finalQuestion, userId);

                    if (vectorFallbackItems && vectorFallbackItems.length > 0) {
                        console.log(`✅ Fallback found ${vectorFallbackItems.length} items from Vector Store.`);
                        // Sort by transaction_date descending (newest first)
                        items = vectorFallbackItems.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

                        const systemPrompt = "You are a helpful assistant. Summarize the database results for the user. Be witty and concise. Use emojis! 🍺 🛒 ALWAYS use '£' for currency, never '$'. \n\nIMPORTANT: Use the provided items to answer. Since these were found via semantic search (fallback), do NOT assume they represent a specific time period like 'this month' unless the transaction dates clearly show it. Instead, mention that these are the most recent relevant matches found.\n\nALSO: Generate 3 short, relevant follow-up questions.\n\nOutput JSON: { \"answer\": \"...\", \"suggested_questions\": [\"Q1\", \"Q2\", \"Q3\"] }";

                        const summaryRes = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: `Question: ${finalQuestion}\nData: ${JSON.stringify(items)}` }
                            ],
                            response_format: { type: "json_object" }
                        });
                        const parsed = JSON.parse(summaryRes.choices[0].message.content);
                        answer = parsed.answer;
                        suggestedQuestions = parsed.suggested_questions || [];

                    } else {
                        answer = "I couldn't find any recent transactions matching that description.";
                    }
                }

            } catch (err) {
                console.error("SQL_AGENT Error:", err);
                answer = "I ran into a trouble checking your data. Please try again.";
            } finally {
                if (client) client.release();
            }
        } else {
            // VECTOR STORE LOGIC
            console.log(`🔎 Executing Vector Search for: "${finalQuestion}"`);
            const vectorItems = await searchItemsVector(finalQuestion, userId);

            if (vectorItems && vectorItems.length > 0) {
                console.log(`✅ Found ${vectorItems.length} items via Vector Search.`);
                // Sort by transaction_date descending
                items = vectorItems.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

                const systemPrompt = "You are a helpful assistant. Summarize the database results for the user. Be witty and concise. Use emojis! 🍺 🛒 ALWAYS use '£' for currency, never '$'. \n\nIMPORTANT: Use the provided items to answer. Since these were found via semantic search, do NOT assume they represent a specific time period unless valid dates are shown.\n\nALSO: Generate 3 short, relevant follow-up questions.\n\nOutput JSON: { \"answer\": \"...\", \"suggested_questions\": [\"Q1\", \"Q2\", \"Q3\"] }";

                const summaryRes = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Question: ${finalQuestion}\nData: ${JSON.stringify(items)}` }
                    ],
                    response_format: { type: "json_object" }
                });
                const parsed = JSON.parse(summaryRes.choices[0].message.content);
                answer = parsed.answer;
                suggestedQuestions = parsed.suggested_questions || [];
            } else {
                answer = "I couldn't find any receipts matching your search.";
            }
        }

        return {
            tool,
            answer,
            usedMemoryId,
            suggestedQuestions
        };
    }
};

module.exports = AskController;
