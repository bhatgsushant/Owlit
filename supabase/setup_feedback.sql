-- Create Feedbacks Table
create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id text, -- Link to user if authenticated (supports both UUID and Google OAuth sub IDs)
  question text not null,
  answer text,
  feedback text not null check (feedback in ('good', 'bad')),
  memory_id uuid, -- Link to the specific sql_memory record used/created
  created_at timestamptz default now()
);

-- Index for faster lookups by memory_id
create index if not exists idx_feedbacks_memory_id on feedbacks(memory_id);
