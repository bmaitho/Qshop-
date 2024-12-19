import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../SupabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the existing user from the database
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .single();

        if (error) throw error;
        
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Simplified auth methods
  const value = {
    user,
    loading,
    signIn: () => {}, // Empty function since we're not using auth
    signOut: () => {}, // Empty function since we're not using auth
    updateProfile: async (updates) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUser({ ...user, ...updates });
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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