import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, getSupabaseKeys } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'react-toastify';
import { Eye, EyeOff, AlertTriangle, AlertCircle } from 'lucide-react';
import { emailApiService } from '../../Services/emailApiService';

const Login = ({ setToken }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing again
    if (networkError) {
      setNetworkError(false);
    }
    if (authError) {
      setAuthError('');
    }
  };

  const handleResendEmail = async (email) => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    
    try {
      setResendingEmail(true);
      
      const result = await emailApiService.resendConfirmationEmail(email);
      
      if (result.success) {
        toast.success('Confirmation email has been resent. Please check your inbox.');
      } else {
        toast.error(result.error || 'Failed to resend confirmation email');
      }
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      toast.error('An error occurred while resending the email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNetworkError(false);
    setAuthError('');
    setEmailNotConfirmed(false); // Reset email confirmation state

    try {
      // First try standard Supabase method
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Check specifically for email confirmation errors
          if (error.message && (
              error.message.includes('Email not confirmed') || 
              error.message.includes('Email confirmation') ||
              error.message.includes('not confirmed')
            )) {
            setAuthError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
            setEmailNotConfirmed(true);
            // Show toast with more details and offer to resend
            toast.info(
              <div>
                Email not verified. Check your inbox or 
                <Button 
                  variant="link" 
                  className="p-0 mx-1 text-white underline" 
                  onClick={() => handleResendEmail(formData.email)}
                >
                  Resend Confirmation
                </Button>
              </div>, 
              { position: "top-right", autoClose: 8000 }
            );
            setLoading(false);
            return;
          }
          
          throw error;
        }
        
        // Store token in sessionStorage
        sessionStorage.setItem('token', JSON.stringify(data));
        setToken(data);
        
        toast.success('Successfully logged in!', {
          position: "top-right",
          autoClose: 2000,
        });

        navigate('/home');
        return; // Exit early if successful
      } catch (standardError) {
        // Check if this is an email confirmation error before trying other methods
        if (standardError.message && (
            standardError.message.includes('Email not confirmed') ||
            standardError.message.includes('Email confirmation') ||
            standardError.message.includes('not confirmed')
          )) {
          setAuthError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
          setEmailNotConfirmed(true);
          setLoading(false);
          return;
        }

        // If standard method failed, try direct API method
        console.log("Standard login failed, trying direct API method:", standardError);
        
        // Fall through to the direct API method if we get a CORS error
        if (!standardError.message?.includes('CORS') && 
            !standardError.message?.includes('network') &&
            !standardError.message?.includes('Failed to fetch')) {
          // If it's not a CORS or network error, rethrow it
          throw standardError;
        }
      }
      
      // Direct API method (backup method for CORS issues)
      const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseKeys();
      
      // Create a specific headers object for auth
      const authHeaders = new Headers();
      authHeaders.append('apikey', supabaseAnonKey);
      authHeaders.append('Content-Type', 'application/json');
      
      // Direct fetch to auth endpoint with proper CORS
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Invalid login credentials');
      }
      
      const authData = await response.json();
      
      // Create a session object similar to what supabase.auth.signInWithPassword returns
      const authResult = {
        data: {
          session: {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            user: authData.user
          },
          user: authData.user
        }
      };
      
      // Also update the supabase auth state
      await supabase.auth.setSession({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token
      });
      
      // Store token in sessionStorage
      sessionStorage.setItem('token', JSON.stringify(authResult.data));
      setToken(authResult.data);
      
      toast.success('Successfully logged in!', {
        position: "top-right",
        autoClose: 2000,
      });

      navigate('/home');
    } catch (error) {
      console.error('Login error:', error);
      
      // Check for email confirmation error in the general catch block too
      if (error.message && (
          error.message.includes('Email not confirmed') ||
          error.message.includes('Email confirmation') ||
          error.message.includes('not confirmed')
        )) {
        setAuthError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
        setEmailNotConfirmed(true);
      } else if (error.message && (error.message.includes('Invalid') || error.message.includes('password') || error.message.includes('not found'))) {
        setAuthError('Invalid email or password');
        toast.error('Invalid email or password', {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        setNetworkError(true);
        toast.error('Please check your internet connection and try again', {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setNetworkError(false);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Allow user to select which account to use
          },
        }
      });

      if (error) throw error;
      
      // The redirect to callback happens automatically through Supabase
      // The AuthCallback component will handle the session and redirection to /home
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // For Google sign-in, most errors are likely network related
      // But we can still check for specific error types
      if (error.message && error.message.includes('popup blocked')) {
        toast.error('Google sign-in popup was blocked', {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        // Display network error for other errors
        setNetworkError(true);
        toast.error('Network error. Please check your connection and try again.', {
          position: "top-right",
          autoClose: 5000,
        });
      }
      
      setGoogleLoading(false);
    }
    // Note: We don't set googleLoading to false here because page will redirect
  };

  return (
    <>
      <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border">
        <h2 className="text-2xl text-center font-bold mb-4 text-foreground dark:text-foreground">Welcome Back</h2>
        
        {networkError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Connection Error</p>
                <p className="text-sm">Please check your internet connection and try again.</p>
              </div>
            </div>
          </div>
        )}
        
        {authError && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-center text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm">{authError}</p>
              </div>
            </div>
          </div>
        )}
        
        {emailNotConfirmed && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center text-blue-700 dark:text-blue-400 mb-2">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Email verification required</p>
                <p className="text-sm">Please check your inbox for the confirmation link.</p>
              </div>
            </div>
            <Button 
              onClick={() => handleResendEmail(formData.email)}
              disabled={resendingEmail}
              variant="outline"
              className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
              Email
            </label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring pr-10"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#113b1e] text-white hover:bg-[#113b1e]/90 dark:bg-[#113b1e] dark:text-white dark:hover:bg-[#113b1e]/90"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6">
          {/* Google sign-in temporarily hidden
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border dark:border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card dark:bg-card text-foreground/60 dark:text-foreground/60">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" className="h-5 w-5 mr-2" />
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
          </div>
          */}
        </div>

        <p className="mt-6 text-center text-sm text-foreground/60 dark:text-foreground/60">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="text-accent-foreground hover:text-accent-foreground/90 dark:text-primary dark:hover:text-primary/90 hover:underline font-medium">
          Sign Up
        </Link>
        </p>
      </div>
    </>
  );
};

export default Login;