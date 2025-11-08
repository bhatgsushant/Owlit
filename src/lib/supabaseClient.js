import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};
const supabaseUrl =
  env.VITE_SUPABASE_URL || env.SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
