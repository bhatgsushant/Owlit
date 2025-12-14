require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROUTER_SYSTEM_PROMPT = `
You are the Router. Classify user questions into: [SQL_AGENT] or [VECTOR_STORE].
DATA: Table 'v_receipt_line_items_enriched' has columns: transaction_date, merchant_name, item, price, quantity, main_category, sub_category.
LOGIC:
- SQL_AGENT: DEFAULT CHOICE. Use this for ANY question about items, spending, prices, dates, categories, "favorite", "most bought", "how much", or analysis.
- VECTOR_STORE: ONLY for questions like "Show me receipts", "What did I buy", or specific text search (e.g. "Find receipts with text X").
- If unsure, use SQL_AGENT.
OUTPUT JSON: { "tool": "SQL_AGENT" | "VECTOR_STORE" }
`;

async function testRouter() {
    const questions = [
        "Which is my favourite beer?",
        "How much spend on Tesco?",
        "Show me my last receipt",
        "What did I buy yesterday?",
        "What are my favorite healthy snacks?"
    ];

    for (const q of questions) {
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: ROUTER_SYSTEM_PROMPT },
                { role: "user", content: q }
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });
        const { tool } = JSON.parse(res.choices[0].message.content);
        console.log(`"${q}" -> ${tool}`);
    }
}

testRouter();
