import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'react-toastify';

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    campusLocation: '',
    isSeller: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.fullName,
              phone: formData.phone,
              campus_location: formData.campusLocation,
              is_seller: formData.isSeller
            }
          ]);

        if (profileError) throw profileError;

        toast.success('Account created successfully! Please check your email for verification.', {
          position: "top-right",
          autoClose: 5000,
        });

        navigate('/');
      }
    } catch (error) {
      let errorMessage = 'Failed to create account';
      
      if (error.message.includes('password')) {
        errorMessage = error.message;
      } else if (error.message.includes('email')) {
        errorMessage = 'This email is already registered';
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Create an Account</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1 text-gray-700">
            Full Name
          </label>
          <Input
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700">
            Email
          </label>
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700">
            Password
          </label>
          <Input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1 text-gray-700">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
          />
        </div>

        <div>
          <label htmlFor="campusLocation" className="block text-sm font-medium mb-1 text-gray-700">
            Campus Location
          </label>
          <Input
            id="campusLocation"
            name="campusLocation"
            value={formData.campusLocation}
            onChange={handleChange}
            placeholder="Enter your campus location"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isSeller"
            name="isSeller"
            checked={formData.isSeller}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <label htmlFor="isSeller" className="text-sm font-medium text-gray-700">
            Register as a Seller
          </label>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-orange-600 hover:bg-orange-700"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/" className="text-orange-600 hover:text-orange-700 hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  );
};

export  default SignUp ;

