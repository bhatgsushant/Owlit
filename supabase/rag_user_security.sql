-- 2. Update match_documents function to support filtering by user_id
-- We drop the old function first to ensure signature changes work cleanly
DROP FUNCTION IF EXISTS match_documents(vector(384), float, int);
DROP FUNCTION IF EXISTS match_documents(vector(384), float, int, jsonb);

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents_with_embeddings.id,
    documents_with_embeddings.content,
    1 - (documents_with_embeddings.embedding <=> query_embedding) AS similarity
  FROM documents_with_embeddings
  WHERE 1 - (documents_with_embeddings.embedding <=> query_embedding) > match_threshold
  -- Check for user_id in filter. If present, filter by it.
  AND (
    (filter ->> 'user_id') IS NULL
    OR
    -- Comparison as text (since user_id is text in your table)
    documents_with_embeddings.user_id = (filter ->> 'user_id')
  )
  ORDER BY documents_with_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
