// AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../SupabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session) {
        // Get user profile when signed in
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // Store user info in local storage
        localStorage.setItem('user', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          ...profile
        }));
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    signUp: async (data) => {
      // First create the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp(data);
      
      if (signUpError) throw signUpError;
      
      if (authData.user) {
        // Then create the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            full_name: data.options.data.full_name,
            phone: data.options.data.phone,
            campus_location: data.options.data.campus_location,
            is_seller: data.options.data.is_seller
          }]);
        
        if (profileError) throw profileError;
      }
      
      return { data: authData, error: null };
    },
    signIn: async (data) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword(data);
      if (error) throw error;
      return { data: authData, error: null };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    },
    updateProfile: async (userId, updates) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      return { data, error: null };
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};