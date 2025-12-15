require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to set up admin policies

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const sqlPath = path.join(__dirname, '../supabase/fix_feedback_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Supabase JS client doesn't support executing raw SQL directly unless via specific RPC or special access.
    // However, often users have an `exec_sql` RPC or similar. 
    // If not, we can try to use standard pg client if we have connection string.
    // server.js uses pg pool. Let's use that logic here for certainty.

    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Running SQL fix...');
        await pool.query(sql);
        console.log('✅ Successfully applied RLS policies to feedbacks table.');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await pool.end();
    }
}

run();
