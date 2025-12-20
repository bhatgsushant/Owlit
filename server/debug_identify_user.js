
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
    const email = 'engg.sushant@gmail.com';
    console.log(`Looking up user: ${email}`);

    // Try querying user_settings or similar table if exact auth.users access is restricted/different
    // Usually in supabase-js with service role we can list users, but simple way matches server.js patterns
    // server.js uses `supabase` from `./supabaseClient.js` which might be anon key.
    // But here we need to find the UUID.

    // Let's try querying a public table that might have the user_id, like 'receipts'
    const { data, error } = await supabase
        .from('receipts')
        .select('user_id')
        .limit(1);

    if (error) {
        console.error("Error querying receipts:", error);
    } else if (data.length > 0) {
        // We can't filter receipts by email easily unless we have a table for it.
        // Let's rely on server.js `pg` pool if possible, but that needs connection string.
    }
}

// Better approach: Use the pg pool directly like server.js to query auth.users if possible, 
// or just run a query on receipts using the provided SQL to see if we get ANY results for ANY user, 
// wait, the log provided the SQL: "WHERE user_id = $1"
// I need the $1.

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        // Try to find the user_id by looking at a recent receipt or just assuming 
        // I'll try to select distinct user_id from v_receipt_line_items_enriched limit 1 
        // This is a guess. 
        // Actually, if I can't find the user_id, I can't reproduce exact results.

        // Let's try to find based on the JWT in the log? 
        // "✅ JWT verified for user: engg.sushant@gmail.com"
        // The server logs don't show the user_id explicitly in that text.

        // Let's query the 'users' table or 'auth.users' view?
        const res = await pool.query("SELECT id, email FROM auth.users WHERE email = 'engg.sushant@gmail.com'");
        if (res.rows.length > 0) {
            console.log("FOUND USER ID:", res.rows[0].id);
        } else {
            console.log("User not found in auth.users");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
