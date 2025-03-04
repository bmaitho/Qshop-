import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

const AuthCallback = () => {
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

        // Check if user already has a profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!existingProfile) {
          // Create a basic profile for the new user
          const newProfile = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            campus_location: '', // Default empty, will need to be updated by user
            is_seller: false
          };
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile]);
            
          if (insertError) throw insertError;
          
          // Store token in sessionStorage
          sessionStorage.setItem('token', JSON.stringify({ session }));
          
          toast.success('Successfully signed in with Google!', {
            position: "top-right",
            autoClose: 2000,
          });

          // Redirect to profile completion page for new users
          navigate('/complete-profile');
          return;
        }

        // If profile exists but is incomplete (missing campus_location)
        if (existingProfile && !existingProfile.campus_location) {
          // Store token in sessionStorage
          sessionStorage.setItem('token', JSON.stringify({ session }));
          
          toast.info('Please complete your profile information.', {
            position: "top-right",
            autoClose: 3000,
          });
          
          // Redirect to profile completion page
          navigate('/complete-profile');
          return;
        }

        // Store token in sessionStorage for complete profiles
        sessionStorage.setItem('token', JSON.stringify({ session }));
        
        toast.success('Successfully signed in with Google!', {
          position: "top-right",
          autoClose: 2000,
        });

        // Redirect to the homepage for users with complete profiles
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