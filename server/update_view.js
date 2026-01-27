
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const UPDATE_VIEW_SQL = `
CREATE OR REPLACE VIEW public.v_receipt_line_items_enriched AS
WITH base AS (
    SELECT r.id AS receipt_id,
        r.user_id,
        r.transaction_date,
        r.total_amount,
        r.merchant_name,
        r.canonical_merchant_id,
        li.line_index,
        li.item,
        li.main_category,
        li.sub_category,
        COALESCE(li.total_price, li.price * COALESCE(li.quantity, 1::numeric)) AS total_price,
        li.price AS unit_price,
        COALESCE(li.quantity, 1::numeric) AS quantity
    FROM receipts r
        CROSS JOIN LATERAL jsonb_to_recordset(
        CASE
            WHEN r.line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(r.line_items) = 'object'::text THEN jsonb_build_array(r.line_items)
            ELSE r.line_items
        END) li(line_index bigint, item text, total_price numeric, price numeric, quantity numeric, sub_category text, main_category text)
)
SELECT b.receipt_id,
    b.user_id,
    b.transaction_date,
    b.total_amount,
    b.merchant_name,
    b.line_index,
    b.item,
    b.total_price,
    b.unit_price,
    b.quantity,
    b.main_category,
    b.sub_category,
    i.normalized_name,
    si.main_category AS store_main_category,
    si.store_type
FROM base b
    LEFT JOIN "Item_Table" i ON lower(i.item_name) = lower(b.item)
    JOIN store_info si ON si.id = b.canonical_merchant_id;
`;

async function updateView() {
    try {
        console.log("Updating view 'v_receipt_line_items_enriched'...");
        const client = await pool.connect();
        await client.query(UPDATE_VIEW_SQL);
        console.log("✅ View updated successfully.");
        client.release();
    } catch (err) {
        console.error("❌ Failed to update view:", err);
    } finally {
        await pool.end();
    }
}

updateView();
