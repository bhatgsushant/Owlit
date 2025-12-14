require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const CREATE_RPC_SQL = `
DROP FUNCTION IF EXISTS match_receipt_items(vector, int, text);

CREATE OR REPLACE FUNCTION match_receipt_items (
  query_embedding vector(1536),
  match_count int,
  _user_id text
) RETURNS TABLE (
  receipt_id uuid,
  item_name text,
  main_category text,
  sub_category text,
  total_price float8,
  merchant_name text,
  transaction_date timestamptz,
  similarity float8
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rie.receipt_id,
    rie.item_name,
    rie.main_category,
    rie.sub_category,
    rie.total_price::float8,
    rie.merchant_name,
    rie.transaction_date::timestamptz,
    (1 - (rie.embedding <=> query_embedding))::float8 AS similarity
  FROM receipt_item_embeddings rie
  WHERE rie.user_id = _user_id
  ORDER BY rie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;

async function applyFix() {
    try {
        console.log("🔌 Connecting to DB...");
        const client = await pool.connect();
        console.log("🚀 Creating match_receipt_items function...");
        await client.query(CREATE_RPC_SQL);
        console.log("✅ Function created successfully!");
        client.release();
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to create function:", err);
        process.exit(1);
    }
}

applyFix();
