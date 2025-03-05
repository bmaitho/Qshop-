import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

const AuthCallback = ({ setToken }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        // Get the session data
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          // No session found, redirect to login
          navigate('/login');
          return;
        }

        // For Google sign-in, we only want to support existing users
        // Check if user already exists in the profiles table
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const userExists = existingProfile && !profileError;
        
        // If this is a new user (no profile found), redirect to sign up page
        if (!userExists) {
          // Sign them out first
          await supabase.auth.signOut();
          
          toast.info('Please sign up for an account first', {
            position: "top-right",
            autoClose: 3000,
          });
          
          // Redirect to signup
          navigate('/signup');
          return;
        }

        // This is an existing user - store their session and continue
        const tokenData = { session };
        sessionStorage.setItem('token', JSON.stringify(tokenData));
        setToken(tokenData);
        
        toast.success('Welcome back!', {
          position: "top-right",
          autoClose: 2000,
        });
        
        // Redirect existing user to home page
        navigate('/home');
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError(err.message);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, setToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Verifying account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 flex-col p-4">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <AlertTriangle className="h-16 w-16 mx-auto" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">Authentication Error</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">{error}</p>
        <Button 
          onClick={() => navigate('/login')}
          className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
        >
          Return to Login
        </Button>
      </div>
    );
  }

  return null;
};

export default AuthCallback;