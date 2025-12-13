-- Create a table for public user profiles
-- We use 'profiles' instead of 'users' to avoid confusion with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id text NOT NULL PRIMARY KEY, -- Google ID
  email text,
  full_name text,
  avatar_url text,
  age integer,      -- Placeholder for future use
  gender text,      -- Placeholder for future use
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( id = auth.uid()::text OR id::text = current_user );
-- Note: The auth.uid() cast depends on how you handle auth. Since we are using custom Google Auth, 
-- we might rely on the server-side role to write to this table.

-- Policy: Service role can manage all profiles
-- (This is implicit if using service_role key, but good to be explicit for other roles)
