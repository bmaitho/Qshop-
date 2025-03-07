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

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0D2B20]">
      <div className="max-w-md w-full px-8 py-10 bg-white rounded-2xl shadow-xl transition-transform transform hover:scale-105">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#E7C65F] font-playfair">UniHive</h1>
          <p className="text-gray-700 font-lato mt-2">Student Marketplace</p>
        </div>
        
        <h2 className="text-2xl text-center font-semibold mb-5 text-gray-900 font-merriweather">Welcome Back</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 font-lato">Email</label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="h-10 bg-gray-100 text-gray-900 border border-gray-300 focus:border-[#E7C65F] rounded-lg shadow-sm"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 font-lato">Password</label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="h-10 bg-gray-100 text-gray-900 border border-gray-300 focus:border-[#E7C65F] rounded-lg shadow-sm"
              placeholder="Enter your password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#E7C65F] hover:bg-[#d4af50] text-white h-10 rounded-lg shadow-md font-merriweather transition-transform transform hover:scale-105"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-700 font-lato">
          Don't have an account?{'   '}
          <Link to="/signup" className="text-[#E7C65F] hover:text-[#d4af50] hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
