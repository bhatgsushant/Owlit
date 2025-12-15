-- Enable RLS on feedbacks table
alter table feedbacks enable row level security;

-- Policy to allow authenticated users to insert their own feedback
create policy "Enable insert for authenticated users only"
on feedbacks for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy to allow users to view their own feedback (optional, but good for completeness)
create policy "Enable select for users based on user_id"
on feedbacks for select
to authenticated
using (auth.uid() = user_id);
