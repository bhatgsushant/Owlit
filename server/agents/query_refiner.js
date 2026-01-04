
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REFINER_SYSTEM_PROMPT = `
You are a Query Refiner for a Financial Assistant AI.
Your goal is to fix typos and clarify the user's intent to ensure accurate SQL processing.

INPUT: 
- Current Question (potentially with typos or ambiguous pronouns).
- Chat History (for context).

OUTPUT: A JSON object with the refined question.

RULES:
1. **Fix Typos:** Correct spelling (e.g., "spped" -> "spend", "grocries" -> "groceries").
2. **Clarify Intent:** Ensure the question is grammatically complete for a data analyst.
   - "how much dinning" -> "How much did I spend on dining this month?" (Unknown time -> Default to "this month")
3. **RESOLVE AMBIGUITY (CRITICAL):** 
   - Use Chat History to resolve pronouns ("it", "this", "that") and follow-up fragments.
   - Example Context: User asked "How much on Uber?". Assistant answered.
   - Current Input: "and Lyft?"
   - Refined Output: "How much did I spend on Lyft?" (Inherit intent from previous turn)
   - Current Input: "what about last year?"
   - Refined Output: "How much did I spend on Uber last year?" (Inherit entity from previous turn)
4. **Preserve Context:** Do NOT change the core meaning or specific entities (e.g. "Tesco" stays "Tesco").
5. **No Chat:** meaningful JSON output only.

EXAMPLE 1:
Input: "how I spped dinning ths month"
Output: { "refined_question": "How much did I spend on dining this month?", "was_modified": true }

EXAMPLE 2 (Contextual):
History: User: "How much did I spend on Groceries?" -> AI: "£400"
Input: "and restaurants?"
Output: { "refined_question": "How much did I spend on restaurants?", "was_modified": true }
`;

/**
 * Refines a user's raw question to fix typos and clarify intent using history.
 * @param {string} rawQuestion 
 * @param {Array} history - Array of {role, text}
 * @returns {Promise<string>} The refined question (or original if failure).
 */
async function refineQuestion(rawQuestion, history = []) {
    if (!rawQuestion || rawQuestion.length < 2) return rawQuestion;

    // Prepare recent history context (last 2 turns are usually enough)
    const contextMessages = history.slice(-2).map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content || msg.text || ''}`
    ).join('\n');

    const prompt = `
Chat History:
${contextMessages || "None"}

Current Question: ${rawQuestion}
`;


    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast & Cheap
            messages: [
                { role: "system", content: REFINER_SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const data = JSON.parse(response.choices[0].message.content);

        if (data.was_modified) {
            console.log(`✨ Query Refined: "${rawQuestion}" -> "${data.refined_question}"`);
            return data.refined_question;
        }

        return rawQuestion;

    } catch (error) {
        console.error("⚠️ Query Refinement failed (using raw):", error.message);
        return rawQuestion; // Fail safe
    }
}

module.exports = { refineQuestion };
