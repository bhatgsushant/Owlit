import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://licnbiprrtvzjxrtsjbk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpY25iaXBycnR2emp4cnRzamJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDc1OTksImV4cCI6MjA3NzQyMzU5OX0.TK5FemGHmTyw0E9bHwaLWJGBtCE7-lGlTZgoNoYlAQM'
);

const { data } = await supabase.from('receipts').select('*').limit(1);
console.log(data);
