require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        console.log("Testing connection to:", process.env.DATABASE_URL ? "DATABASE_URL is set" : "DATABASE_URL is MISSING");
        const client = await pool.connect();
        console.log("Successfully connected to the database!");

        try {
            const res = await client.query('SELECT NOW()');
            console.log("Current time from DB:", res.rows[0]);

            // Also test the view used by the agent
            console.log("Testing access to view v_receipt_line_items_enriched...");
            try {
                const viewRes = await client.query('SELECT count(*) FROM v_receipt_line_items_enriched');
                console.log("View row count:", viewRes.rows[0]);
            } catch (viewErr) {
                console.error("Failed to query view v_receipt_line_items_enriched:", viewErr.message);
            }

        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Connection failed:", err);
    } finally {
        await pool.end();
    }
}

testConnection();
