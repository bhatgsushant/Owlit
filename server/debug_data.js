require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function exploreData() {
    let client;
    try {
        client = await pool.connect();

        // 1. Get a valid user ID (same logic as before)
        let userId;
        const userRes = await client.query('SELECT user_id FROM receipts LIMIT 1');
        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].user_id;
            console.log('Using User ID:', userId);
        } else {
            console.error("No receipts found to infer user_id.");
            return;
        }

        // 2. SEARCH FOR "BEER" (Generic)
        console.log("\n--- Searching for 'beer' in item names or categories ---");
        const searchRes = await client.query(`
        SELECT item, main_category, sub_category, price 
        FROM v_receipt_line_items_enriched 
        WHERE user_id = $1 
        AND (
            item ILIKE '%beer%' OR 
            sub_category ILIKE '%beer%' OR 
            main_category ILIKE '%beer%'
        )
    `, [userId]);

        if (searchRes.rows.length === 0) {
            console.log("❌ No items found matching 'beer'.");
        } else {
            console.log(`✅ Found ${searchRes.rows.length} items matching 'beer':`);
            console.table(searchRes.rows);
        }

        // 3. LIST ALL SUB-CATEGORIES
        console.log("\n--- Distinct Sub-Categories ---");
        const catRes = await client.query(`
        SELECT DISTINCT sub_category 
        FROM v_receipt_line_items_enriched 
        WHERE user_id = $1
    `, [userId]);
        console.log(catRes.rows.map(r => r.sub_category).filter(Boolean).sort());

        // 4. USER'S SPECIFIC REQUEST (For the user who actually HAS beer)
        const beerUserId = '103517642769452703078';
        console.log(`\n--- Executing User's Request for User ${beerUserId} ---`);
        console.log("Checking dates and values...");
        const exactRes = await client.query(`
        SELECT transaction_date, item, price
        FROM v_receipt_line_items_enriched 
        WHERE user_id = $1 AND sub_category = 'beer'
        ORDER BY transaction_date DESC
    `, [beerUserId]);
        console.table(exactRes.rows);

        // 4. CHECK USER COUNT
        const userCountRes = await client.query('SELECT distinct user_id FROM receipts');
        console.log(`\n--- Total Users with Receipts: ${userCountRes.rows.length} ---`);
        userCountRes.rows.forEach(r => console.log(`User: ${r.user_id}`));

        // 6. GLOBAL SEARCH FOR 'BEER'
        console.log("\n--- Global Search for 'beer' (Any User) ---");
        const globalRes = await client.query(`
        SELECT user_id, item, main_category, sub_category, price 
        FROM v_receipt_line_items_enriched 
        WHERE 
            item ILIKE '%beer%' OR 
            sub_category ILIKE '%beer%' OR 
            main_category ILIKE '%beer%'
    `);

        if (globalRes.rows.length === 0) {
            console.log("❌ No 'beer' items found for ANY user in the entire database.");
        } else {
            console.log(`✅ Found 'beer' items for the following users:`);
            console.table(globalRes.rows);
        }


        // 5. DUMP ALL ITEMS (Limit 50)
        console.log("\n--- First 50 Items for this User ---");
        const allItems = await client.query(`
        SELECT item, main_category, sub_category, price 
        FROM v_receipt_line_items_enriched 
        WHERE user_id = $1
        LIMIT 50
    `, [userId]);
        console.table(allItems.rows);


    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

exploreData();
