
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const UPDATE_VIEW_SQL = `
CREATE OR REPLACE VIEW public.v_receipt_line_items_enriched AS
SELECT
    r.id AS receipt_id,
    r.user_id,
    r.transaction_date,
    r.total_amount,
    r.merchant_name,
    li.line_index,

    NULLIF(TRIM(BOTH FROM (li.item ->> 'item')), '') AS item,

    ((li.item ->> 'price'))::numeric AS price,

    (
        COALESCE(
            NULLIF((li.item ->> 'quantity'), ''),
            '1'
        )
    )::numeric AS quantity,

    COALESCE(NULLIF((li.item ->> 'main_category'), ''), 'other') AS main_category,
    COALESCE(NULLIF((li.item ->> 'sub_category'), ''), 'miscellaneous') AS sub_category,

    -- ✅ NEW COLUMNS (APPENDED)
    it.normalized_name,
    si.main_category AS store_main_category,
    si.store_type

FROM receipts r
CROSS JOIN LATERAL
    jsonb_array_elements(
        COALESCE(r.line_items, '[]'::jsonb)
    ) WITH ORDINALITY li(item, line_index)

LEFT JOIN public."Item_Table" it
    ON LOWER(it.item_name) =
       LOWER(NULLIF(TRIM(BOTH FROM (li.item ->> 'item')), ''))

LEFT JOIN public.store_info si
    ON LOWER(si.merchant_name) =
       LOWER(r.merchant_name);
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
