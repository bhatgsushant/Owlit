
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REFINER_SYSTEM_PROMPT = `
You are a Query Refiner for a Financial Assistant AI.
Your goal is to fix typos and clarify the user's intent to ensure accurate SQL processing.

INPUT: A raw user question (potentially with typos).
OUTPUT: A JSON object with the refined question.

RULES:
1. **Fix Typos:** Correct spelling (e.g., "spped" -> "spend", "grocries" -> "groceries").
2. **Clarify Intent:** Ensure the question is grammatically complete for a data analyst.
   - "how much dinning" -> "How much did I spend on dining this month?" (Unknown time -> Default to "this month")
3. **Preserve Context:** Do NOT change the core meaning or specific entities (e.g. "Tesco" stays "Tesco").
4. **No Chat:** meaningful JSON output only.

EXAMPLE 1:
Input: "how I spped dinning ths month"
Output: { "refined_question": "How much did I spend on dining this month?", "was_modified": true }

EXAMPLE 2:
Input: "top merchant"
Output: { "refined_question": "Who is my top merchant by spend this month?", "was_modified": true }

EXAMPLE 3:
Input: "How much did I spend on Uber?"
Output: { "refined_question": "How much did I spend on Uber?", "was_modified": false }
`;

/**
 * Refines a user's raw question to fix typos and clarify intent.
 * @param {string} rawQuestion 
 * @returns {Promise<string>} The refined question (or original if failure).
 */
async function refineQuestion(rawQuestion) {
    if (!rawQuestion || rawQuestion.length < 3) return rawQuestion;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast & Cheap
            messages: [
                { role: "system", content: REFINER_SYSTEM_PROMPT },
                { role: "user", content: rawQuestion }
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
