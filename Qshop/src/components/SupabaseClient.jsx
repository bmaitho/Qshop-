import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Set up app URLs for OAuth redirects
const getURL = () => {
  // List of authorized domains
  const domains = [
    'unihive.store',
    'unihive.shop'
  ];
  
  // Check if current domain is in the allowed list
  const currentDomain = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Default to the first domain if not on an allowed domain (like localhost)
  let url = domains.includes(currentDomain) 
    ? `${protocol}//${currentDomain}/` 
    : 'https://unihive.store/';
  
  // Make sure to include trailing slash
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};

// Configure Supabase client
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.sessionStorage,
      flowType: 'pkce',
      redirectTo: `${getURL()}auth/callback`
    }
  }
);