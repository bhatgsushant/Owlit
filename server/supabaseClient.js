const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Key in your .env file!');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
