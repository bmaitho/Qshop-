import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'react-toastify';

const Login = ({ setToken }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Store token in sessionStorage
      sessionStorage.setItem('token', JSON.stringify(data));
      setToken(data);
      
      toast.success('Successfully logged in!', {
        position: "top-right",
        autoClose: 2000,
      });

      navigate('/home');
    } catch (error) {
      let errorMessage = 'Login failed';
      if (error.message.includes('Invalid')) {
        errorMessage = 'Invalid email or password';
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      
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
      toast.error('Google sign-in failed: ' + error.message, {
        position: "top-right",
        autoClose: 3000,
      });
      setGoogleLoading(false);
    }
    // Note: We don't set googleLoading to false here because page will redirect
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-background">
      <div className="max-w-md w-full px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary dark:text-primary">UniHive</h1>
          <p className="text-foreground/80 dark:text-foreground/80 mt-2">Student Marketplace</p>
        </div>
        
        <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border">
          <h2 className="text-2xl text-center font-bold mb-4 text-foreground dark:text-foreground">Welcome Back</h2>
          
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
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                placeholder="Enter your password"
              />
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
          </div>

          <p className="mt-3 text-center text-sm text-foreground/60 dark:text-foreground/60">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent-foreground hover:text-accent-foreground/90 dark:text-primary dark:hover:text-primary/90 hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;