import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const targetEmail = 'bmaitho@gmail.com'; // Change this

// Generate a magic link and extract the token parts
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: targetEmail,
});

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Use the token_hash to verify and create a real session
const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
  token_hash: data.properties.hashed_token,
  type: 'magiclink',
});

if (verifyError) {
  console.error('Verify error:', verifyError.message);
  process.exit(1);
}

console.log('\n===== PASTE THIS IN BROWSER CONSOLE (incognito) =====\n');
console.log(`
const sessionData = ${JSON.stringify({ session: sessionData.session }, null, 2)};
sessionStorage.setItem('token', JSON.stringify(sessionData));
location.reload();
`);
console.log('\n=====================================================');