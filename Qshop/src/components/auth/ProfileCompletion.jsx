import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'react-toastify';

const ProfileCompletion = ({ token }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    campusLocation: '',
    isSeller: false
  });
  const [errors, setErrors] = useState({});

  // Extract user details from token
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        if (!token) {
          navigate('/login');
          return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          throw new Error('User not authenticated');
        }

        // Check if user already has complete profile information
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // If profile exists and has campus_location, user can skip this step
        if (profile && profile.campus_location) {
          // Profile is already complete, redirect to home
          navigate('/home');
          return;
        }

        // Pre-fill form with any data we have
        setFormData({
          fullName: user.user_metadata?.full_name || '',
          phone: profile?.phone || '',
          campusLocation: profile?.campus_location || '',
          isSeller: profile?.is_seller || false
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile information');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [token, navigate]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!formData.campusLocation.trim()) {
      newErrors.campusLocation = "Campus location is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear error when field is being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          campus_location: formData.campusLocation,
          is_seller: formData.isSeller
        }
      });

      if (updateError) throw updateError;
      
      // Update or create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: user.id,
            full_name: formData.fullName,
            phone: formData.phone,
            campus_location: formData.campusLocation,
            is_seller: formData.isSeller,
            email: user.email
          }
        ]);
        
      if (profileError) throw profileError;
      
      toast.success("Profile completed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      
      // Redirect to home page
      navigate('/home');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile information', {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500">UniHive</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Student Marketplace</p>
        </div>
        
        <Card className="border-primary/10 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-primary dark:text-gray-100">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.fullName ? "border-red-500 dark:border-red-400" : ""}`}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="campusLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Campus Location
                </label>
                <Input
                  id="campusLocation"
                  name="campusLocation"
                  value={formData.campusLocation}
                  onChange={handleChange}
                  placeholder="Enter your campus location"
                  className={`dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.campusLocation ? "border-red-500 dark:border-red-400" : ""}`}
                />
                {errors.campusLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errors.campusLocation}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isSeller"
                  name="isSeller"
                  checked={formData.isSeller}
                  onChange={handleChange}
                  className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-orange-500"
                />
                <label 
                  htmlFor="isSeller" 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Register as a Seller
                </label>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Profile...' : 'Complete Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileCompletion;