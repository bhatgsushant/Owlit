require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        console.log("Connecting to DB...");
        const client = await pool.connect();
        console.log("Connected to DB.");

        console.log("Checking if view 'v_receipt_line_items_enriched' exists...");
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'v_receipt_line_items_enriched'
    `);

        if (res.rows.length > 0) {
            console.log("✅ View 'v_receipt_line_items_enriched' found.");

            // Check columns
            const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'v_receipt_line_items_enriched'
      `);
            console.log("Columns:", cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

            // Try a simple select
            console.log("Trying simple SELECT (limit 1)...");
            try {
                const rows = await client.query('SELECT * FROM v_receipt_line_items_enriched LIMIT 1');
                console.log("✅ SELECT success. Rows returned:", rows.rows.length);
            } catch (err) {
                console.error("❌ SELECT failed:", err.message);
            }

        } else {
            console.error("❌ View 'v_receipt_line_items_enriched' NOT found.");
        }

        client.release();
    } catch (err) {
        console.error("❌ Connection failed:", err);
    } finally {
        await pool.end();
    }
}

testConnection();
