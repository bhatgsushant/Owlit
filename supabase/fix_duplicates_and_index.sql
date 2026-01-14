-- Step 1: Remove duplicates by keeping only the row with the lower CTID (effectively the first one)
DELETE FROM public.receipt_item_embeddings a USING public.receipt_item_embeddings b
WHERE a.id < b.id
AND a.receipt_id = b.receipt_id 
AND a.item_name = b.item_name 
AND a.total_price = b.total_price;

-- Step 2: Create the unique index now that duplicates are gone
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_item_embeddings_conflict 
ON public.receipt_item_embeddings (receipt_id, item_name, total_price);
