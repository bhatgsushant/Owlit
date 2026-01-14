-- Create a unique index to support upsert operations on receipt_item_embeddings
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_item_embeddings_conflict 
ON public.receipt_item_embeddings (receipt_id, item_name, total_price);
