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

        // Check if this looks like a first-time user or returning user
        const isNewUser = session.user?.new_user;

        // Store token in sessionStorage immediately - this is critical
        // and must match the format in the direct login method
        const tokenData = { session };
        sessionStorage.setItem('token', JSON.stringify(tokenData));
        
        // Also update App state via the setToken prop to avoid page refresh issues
        setToken(tokenData);
        
        // Check if user has a profile in the database
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const hasProfile = existingProfile && !profileError;
        
        // If this is a brand new user with no profile, create one
        if (isNewUser || !hasProfile) {
          console.log("New user detected or profile missing - creating profile");
          
          // For brand new users, redirect to profile completion
          if (isNewUser) {
            // Create a temporary basic profile
            const newProfile = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              campus_location: '', // Empty to enforce completion
              is_seller: false
            };
            
            await supabase.from('profiles').upsert([newProfile]);
            
            toast.success('Account created! Please complete your profile.', {
              position: "top-right",
              autoClose: 3000,
            });
            
            // Redirect to profile completion
            navigate('/complete-profile');
            return;
          } else {
            // For returning users with missing profiles, create one in the background
            const newProfile = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              campus_location: session.user.user_metadata?.campus_location || 'Not specified', 
              is_seller: session.user.user_metadata?.is_seller || false
            };
            
            // Do this in the background
            supabase
              .from('profiles')
              .upsert([newProfile])
              .then(({ error }) => {
                if (error) console.error('Error creating profile:', error);
              });
          }
        }
        
        // This is a returning user - go straight to home
        toast.success('Welcome back!', {
          position: "top-right",
          autoClose: 2000,
        });

        // Redirect to homepage immediately
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
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Completing sign-in...</p>
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