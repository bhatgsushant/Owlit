require('dotenv').config();
const { Pool } = require('pg');
const { OpenAI } = require('openai');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { SQL_AGENT_SYSTEM_PROMPT } = require('./agents/sql_agent_prompts');

async function simulate() {
    let client;
    const question = "how I spped dinning ths month?"; // Typo test
    const userId = '103517642769452703078'; // Target User

    try {
        console.log(`\n\n--- 🧪 SIMULATING: "${question}" ---`);
        console.log(`Using User ID: ${userId}`);

        client = await pool.connect();

        // --- STEP 1: QUERY REFINEMENT ---
        console.log(`original_question: "${question}"`);
        const { refineQuestion } = require('./agents/query_refiner');
        const refinedQuestion = await refineQuestion(question);
        console.log(`refined_question: "${refinedQuestion}"`);

        // 1. Generate SQL
        console.log('Generating SQL...');
        const sqlRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SQL_AGENT_SYSTEM_PROMPT + "\nOutput JSON: { \"sql\": \"SELECT ...\" }" },
                { role: "user", content: refinedQuestion }
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const json = JSON.parse(sqlRes.choices[0].message.content);
        let sqlQuery;

        if (json.sql) {
            console.log('generated_sql:', json.sql);
            sqlQuery = json.sql.replace(/```sql|```/g, '').trim();
        } else {
            console.log("No 'sql' key in JSON:", json);
        }


        // 2. Execute SQL
        console.log('Executing SQL...');
        const { rows } = await client.query(sqlQuery, [userId]);
        console.log('SQL Execution Success!');
        console.log(`Rows returned: ${rows.length}`);
        if (rows.length > 0) {
            console.log('First row:', rows[0]);
        }

        // 3. Summarize
        console.log('Summarizing...');
        const sumRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful, witty, and friendly personal finance assistant. Answer the user's question naturally and conversationally (like a human). Do not just state the number, give it some personality." },
                { role: "user", content: `Q: ${question}\nData: ${JSON.stringify(rows)}` }
            ]
        });
        console.log('\n--- 🤖 AI RESPONSE ---');
        console.log(sumRes.choices[0].message.content);
        console.log('----------------------\n');

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

simulate();
