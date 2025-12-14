require('dotenv').config();
const { Pool } = require('pg');
const { OpenAI } = require('openai');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SQL_AGENT_SYSTEM_PROMPT = `
You are a PostgreSQL Expert. Write a SQL query for view: v_receipt_line_items_enriched.
Columns: user_id, transaction_date, merchant_name, item, price, quantity, main_category, sub_category.
RULES:
1. ALWAYS filter by user_id = $1 (Security).
2. Read-only SELECT only.
3. Price is GBP.
4. Return ONLY raw SQL.
5. Use ILIKE for all string comparisons to ensure case-insensitivity.
6. When searching for a product/category, check 'item', 'main_category', and 'sub_category' using OR logic wrapped in parentheses (e.g., AND (item ILIKE '%beer%' OR sub_category ILIKE '%beer%')).
`;

async function simulate() {
    let client;
    const question = "Which is my favourite beer?";
    const userId = '103517642769452703078'; // Target User

    try {
        console.log(`\n\n--- 🧪 SIMULATING: "${question}" ---`);
        console.log(`Using User ID: ${userId}`);

        client = await pool.connect();

        // 1. Generate SQL
        console.log('Generating SQL...');
        const sqlRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SQL_AGENT_SYSTEM_PROMPT + "\nOutput JSON: { \"sql\": \"SELECT ...\" }" },
                { role: "user", content: question }
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const { sql } = JSON.parse(sqlRes.choices[0].message.content);
        console.log('generated_sql:', sql);

        // 2. Execute SQL
        console.log('Executing SQL...');
        const { rows } = await client.query(sql, [userId]);
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
