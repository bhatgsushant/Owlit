-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. SQL Memory Table (The "Cheat Sheet" for Logic)
create table if not exists sql_memory (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  sql_query text not null,
  embedding vector(1536), -- Matching OpenAI text-embedding-3-small dimension
  created_at timestamptz default now()
);

-- 2. QA Cache Table (The "Short Term Memory" for Facts)
create table if not exists qa_cache (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Index for faster similarity search on sql_memory
create index on sql_memory using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Index for faster similarity search on qa_cache
create index on qa_cache using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RPC Function to search SQL Memory
create or replace function match_sql_memory (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  question text,
  sql_query text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    sql_memory.id,
    sql_memory.question,
    sql_memory.sql_query,
    1 - (sql_memory.embedding <=> query_embedding) as similarity
  from sql_memory
  where 1 - (sql_memory.embedding <=> query_embedding) > match_threshold
  order by sql_memory.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RPC Function to search QA Cache
create or replace function match_qa_cache (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  question text,
  answer text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    qa_cache.id,
    qa_cache.question,
    qa_cache.answer,
    1 - (qa_cache.embedding <=> query_embedding) as similarity
  from qa_cache
  where 1 - (qa_cache.embedding <=> query_embedding) > match_threshold
  order by qa_cache.embedding <=> query_embedding
  limit match_count;
end;
$$;
