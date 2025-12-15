require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    try {
        console.log("🛠️ Fixing 'feedbacks' table schema...");

        // Change user_id from UUID to TEXT
        await pool.query(`ALTER TABLE feedbacks ALTER COLUMN user_id TYPE text;`);

        console.log("✅ Successfully altered 'user_id' to TEXT.");

    } catch (err) {
        console.error("❌ Error altering table:", err);
    } finally {
        await pool.end();
    }
}

fixSchema();
