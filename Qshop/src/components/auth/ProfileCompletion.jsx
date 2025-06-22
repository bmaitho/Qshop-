// src/components/auth/ProfileCompletion.jsx
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
          navigate('/auth');
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
        if (profile && profile.campus_location && profile.full_name) {
          // Profile is already complete, redirect to home
          navigate('/home');
          return;
        }

        // Pre-fill form with any data we have - INCLUDING GOOGLE DATA
        setFormData({
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || profile?.full_name || '',
          phone: profile?.phone || '',
          campusLocation: profile?.campus_location || '',
          isSeller: profile?.is_seller || false
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile information');
        navigate('/auth');
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
            email: user.email,
            is_google_user: user.app_metadata?.provider === 'google',
            onboarding_completed: true,
            profile_completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
        
      if (profileError) throw profileError;
      
      // Set up tutorial for new users
      localStorage.setItem('isNewUser', 'true');
      localStorage.setItem('hasLoggedInBefore', 'true');
      localStorage.removeItem('unihive_tutorial_completed');
      
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
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent dark:border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-background">
      <div className="max-w-md w-full px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary dark:text-primary">UniHive</h1>
          <p className="text-foreground/80 dark:text-foreground/80 mt-2">Student Marketplace</p>
        </div>
        
        <Card className="bg-card dark:bg-card border-border dark:border-border">
          <CardHeader>
            <CardTitle className="text-center text-foreground dark:text-foreground">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                  aria-invalid={errors.fullName ? "true" : "false"}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="campusLocation" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Campus Location
                </label>
                <Input
                  id="campusLocation"
                  name="campusLocation"
                  value={formData.campusLocation}
                  onChange={handleChange}
                  placeholder="Enter your campus location"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                  aria-invalid={errors.campusLocation ? "true" : "false"}
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
                  className="rounded border-input dark:border-input bg-background dark:bg-muted checked:bg-accent dark:checked:bg-primary"
                />
                <label 
                  htmlFor="isSeller" 
                  className="text-sm font-medium text-foreground/80 dark:text-foreground/80"
                >
                  Register as a Seller
                </label>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-secondary text-primary hover:bg-secondary/90 dark:bg-primary dark:text-foreground dark:hover:bg-primary/90"
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