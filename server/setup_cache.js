const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSetup() {
    try {
        const sqlPath = path.join(__dirname, '../supabase/setup_semantic_cache.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔌 Connecting to database...');
        const client = await pool.connect();

        console.log('🚀 Running SQL setup...');
        await client.query(sql);

        console.log('✅ Semantic cache tables and functions set up successfully!');
        client.release();
    } catch (err) {
        console.error('❌ Error setting up semantic cache:', err);
    } finally {
        await pool.end();
    }
}

runSetup();
