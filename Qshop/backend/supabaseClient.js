
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vycftqpspmxdohfbkqjb.supabase.co';

// Use the service role key instead of the anon key for backend operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Log which key is being used (but mask most of it for security)
console.log(`Using Supabase key: ${supabaseKey.substring(0, 5)}...${supabaseKey.substring(supabaseKey.length - 5)}`);
console.log(`Is using service role: ${supabaseKey !== process.env.VITE_SUPABASE_ANON_KEY}`);

// Create a single client instance for the backend with admin privileges
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-server-js/1.0.0',
    }
  }
});