import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Custom fetch function with retry logic and proper CORS headers
async function customFetch(url, options = {}) {
  // Ensure all necessary headers are present
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'X-Client-Info': 'supabase-js/2.x',
  };

  // Define the new options
  const newOptions = {
    ...options,
    headers,
    // Explicitly set the mode to 'cors' to handle CORS properly
    mode: 'cors',
  };

  // Try the fetch, with retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      return await fetch(url, newOptions);
    } catch (error) {
      if (retries === 1) throw error;
      retries -= 1;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x',
    }
  },
  // Always use the custom fetch for better CORS handling
  fetch: customFetch
});

// Export the keys for components that need direct API access
export const getSupabaseKeys = () => ({
  url: supabaseUrl,
  key: supabaseAnonKey
});