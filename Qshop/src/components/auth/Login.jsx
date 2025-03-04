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
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;
      
      // The actual redirect happens automatically through Supabase
    } catch (error) {
      toast.error('Google sign-in failed: ' + error.message, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500">UniHive</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Student Marketplace</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md dark:shadow-gray-900/30">
          <h2 className="text-2xl text-center font-bold mb-4 dark:text-gray-100">Welcome Back</h2>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary"
                placeholder="Enter your password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white h-9"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" className="h-5 w-5 mr-2" />
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;