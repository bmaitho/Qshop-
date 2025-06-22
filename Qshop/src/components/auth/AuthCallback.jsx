// src/components/auth/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSupabaseKeys } from '../SupabaseClient';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

const AuthCallback = ({ setToken }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    handleAuthCallback();
  }, [retryCount]);

  const handleAuthCallback = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try standard method first
      try {
        // Get the session data
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          // No session found, redirect to login
          navigate('/auth');
          return;
        }

        // Check if user already exists in the profiles table
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const userExists = existingProfile && !profileError;
        
        // If this is a new user (no profile found), allow them to complete profile
        if (!userExists) {
          // Store their session first
          const tokenData = { session };
          sessionStorage.setItem('token', JSON.stringify(tokenData));
          setToken(tokenData);
          
          // Mark as new user for tutorial and redirect to profile completion
          localStorage.setItem('isNewUser', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
          
          toast.info('Please complete your profile to get started', {
            position: "top-right",
            autoClose: 3000,
          });
          
          // Redirect to profile completion
          navigate('/complete-profile');
          return;
        }

        // Check if existing user has complete profile
        const isProfileComplete = existingProfile.full_name && 
                                 existingProfile.campus_location && 
                                 existingProfile.phone;

        if (!isProfileComplete) {
          // Store their session first
          const tokenData = { session };
          sessionStorage.setItem('token', JSON.stringify(tokenData));
          setToken(tokenData);
          
          // Mark as needing profile completion
          localStorage.setItem('isNewUser', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
          
          toast.info('Please complete your profile', {
            position: "top-right",
            autoClose: 3000,
          });
          
          navigate('/complete-profile');
          return;
        }

        // This is an existing user with complete profile
        const tokenData = { session };
        sessionStorage.setItem('token', JSON.stringify(tokenData));
        setToken(tokenData);
        
        // Check if they need tutorial (first time logging in)
        const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
        const tutorialCompleted = localStorage.getItem('unihive_tutorial_completed');
        
        if (!hasLoggedInBefore || !tutorialCompleted) {
          localStorage.setItem('isNewUser', 'true');
          localStorage.setItem('hasLoggedInBefore', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
        }
        
        toast.success('Welcome back!', {
          position: "top-right",
          autoClose: 2000,
        });
        
        // Redirect to home page
        navigate('/home');
        return;
      } catch (standardError) {
        // If standard method failed and it's a CORS/network error, try direct API method
        console.log("Standard callback handling failed, attempting direct method:", standardError);
        
        if (!standardError.message?.includes('CORS') && 
            !standardError.message?.includes('network') &&
            !standardError.message?.includes('Failed to fetch')) {
          // If it's not a CORS or network error, rethrow it
          throw standardError;
        }
      }
      
      // Fallback to direct URL parameter parsing
      try {
        // Parse the URL to get auth parameters
        const url = new URL(window.location.href);
        const accessToken = url.hash.match(/access_token=([^&]*)/)?.[1];
        const refreshToken = url.hash.match(/refresh_token=([^&]*)/)?.[1];
        
        if (!accessToken) {
          throw new Error('No access token found in URL');
        }
        
        // Set the session manually
        const { data: { user }, error: userError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (userError) throw userError;
        
        if (!user) {
          throw new Error('User information not found');
        }
        
        // Check if user exists in profiles
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const userExists = existingProfile && !profileError;
        
        // Create the token data
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          user: user,
        };
        
        const tokenData = { session };
        sessionStorage.setItem('token', JSON.stringify(tokenData));
        setToken(tokenData);
        
        if (!userExists) {
          // New user - redirect to profile completion
          localStorage.setItem('isNewUser', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
          
          toast.info('Please complete your profile to get started', {
            position: "top-right",
            autoClose: 3000,
          });
          
          navigate('/complete-profile');
          return;
        }

        // Check if existing user has complete profile
        const isProfileComplete = existingProfile.full_name && 
                                 existingProfile.campus_location && 
                                 existingProfile.phone;

        if (!isProfileComplete) {
          localStorage.setItem('isNewUser', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
          
          toast.info('Please complete your profile', {
            position: "top-right",
            autoClose: 3000,
          });
          
          navigate('/complete-profile');
          return;
        }
        
        // Existing user with complete profile
        const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
        const tutorialCompleted = localStorage.getItem('unihive_tutorial_completed');
        
        if (!hasLoggedInBefore || !tutorialCompleted) {
          localStorage.setItem('isNewUser', 'true');
          localStorage.setItem('hasLoggedInBefore', 'true');
          localStorage.removeItem('unihive_tutorial_completed');
        }
        
        toast.success('Welcome back!', {
          position: "top-right",
          autoClose: 2000,
        });
        
        navigate('/home');
      } catch (directMethodError) {
        console.error("Direct method also failed:", directMethodError);
        throw directMethodError;
      }
    } catch (err) {
      console.error('Error in auth callback:', err);
      setError(err.message);
      toast.error('Authentication failed. Please try again.', {
        position: "top-right", 
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-background flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent dark:border-primary mb-4"></div>
        <p className="text-foreground/80 dark:text-foreground/80">Verifying account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-background flex-col p-4">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <AlertTriangle className="h-16 w-16 mx-auto" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-foreground dark:text-foreground">Authentication Error</h2>
        <p className="text-foreground/80 dark:text-foreground/80 mb-4 text-center">{error}</p>
        
        <div className="flex gap-4">
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
          >
            Return to Login
          </Button>
          <Button 
            onClick={handleRetry}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;