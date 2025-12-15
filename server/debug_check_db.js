require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log("🔌 Connecting to DB to check tables...");
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tables = res.rows.map(r => r.table_name);
        console.log("Tables found:", tables.sort());

        const feedbackTable = tables.find(t => t === 'feedbacks' || t === 'feedback');
        const profilesTable = tables.find(t => t === 'profiles');

        const tablesToCheck = [feedbackTable, profilesTable].filter(Boolean);

        if (tablesToCheck.length === 0) {
            console.log("\n❌ No specified tables ('feedbacks', 'feedback', 'profiles') found.");
        }

        for (const tableName of tablesToCheck) {
            console.log(`\n✅ Found table: ${tableName}`);
            // Check columns
            const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${tableName}'
        `);
            console.log("Columns:");
            cols.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
        }

    } catch (err) {
        console.error("❌ Error querying DB:", err);
    } finally {
        await pool.end();
    }
}

checkTables();
