// SignUp.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from 'react-toastify';

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campusLocations, setCampusLocations] = useState([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    campusLocation: '',
    campusLocationId: '',
    isSeller: false
  });
  
  const [errors, setErrors] = useState({});

  // Fetch campus locations when component mounts
  useEffect(() => {
    fetchCampusLocations();
  }, []);

  const fetchCampusLocations = async () => {
    try {
      setLoadingCampuses(true);
      const { data, error } = await supabase
        .from('campus_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setCampusLocations(data || []);
    } catch (error) {
      console.error('Error fetching campus locations:', error);
      toast.error('Failed to load campus locations');
    } finally {
      setLoadingCampuses(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    // Check for either direct input or dropdown selection
    if (!formData.campusLocation.trim() && !formData.campusLocationId) {
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

  const handleCampusChange = (value) => {
    // Find the selected campus to get its name
    const selectedCampus = campusLocations.find(c => c.id.toString() === value);
    
    setFormData(prev => ({
      ...prev,
      campusLocationId: value,
      campusLocation: selectedCampus ? selectedCampus.name : prev.campusLocation
    }));
    
    // Clear error
    if (errors.campusLocation) {
      setErrors(prev => ({
        ...prev,
        campusLocation: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            campus_location: formData.campusLocation,
            campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
            is_seller: formData.isSeller
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (data.user) {
        // Create or update the profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: data.user.id,
              full_name: formData.fullName,
              phone: formData.phone,
              campus_location: formData.campusLocation,
              campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
              is_seller: formData.isSeller,
              email: formData.email
            }
          ]);
          
        if (profileError) throw profileError;
        
        toast.success("Account created! Please Log in.", {
          position: "top-right",
          autoClose: 5000,
        });
        
        navigate('/login');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      
      let errorMessage = 'Failed to create account';
      
      if (error.message && error.message.includes('password')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('email')) {
        errorMessage = 'This email is already registered';
      } else if (error.status === 422) {
        errorMessage = 'Invalid email or password format';
      } else if (error.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.status === 500 || error.status === 522) {
        errorMessage = 'Server error. Please try again later.';
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500">UniHive</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Student Marketplace</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md dark:shadow-gray-900/30">
          <h2 className="text-2xl text-center font-bold mb-4 dark:text-gray-100">Create an Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary ${errors.fullName ? "border-red-500 dark:border-red-400" : ""}`}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.fullName}</p>
              )}
            </div>

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
                placeholder="Enter your email"
                className={`h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary ${errors.email ? "border-red-500 dark:border-red-400" : ""}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.email}</p>
              )}
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
                placeholder="Enter your password"
                className={`h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary ${errors.password ? "border-red-500 dark:border-red-400" : ""}`}
              />
              {errors.password && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div className="space-y-1">
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
                className="h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="campusLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Campus Location
              </label>
              
              {loadingCampuses ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading campus locations...</div>
              ) : campusLocations.length > 0 ? (
                <Select
                  value={formData.campusLocationId}
                  onValueChange={handleCampusChange}
                >
                  <SelectTrigger 
                    id="campusLocationId"
                    className={`h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary ${errors.campusLocation ? "border-red-500 dark:border-red-400" : ""}`}
                  >
                    <SelectValue placeholder="Select your campus" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 dark:bg-gray-800">
                    {campusLocations.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id.toString()}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // Fallback to text input if no campus locations are loaded
                <Input
                  id="campusLocation"
                  name="campusLocation"
                  value={formData.campusLocation}
                  onChange={handleChange}
                  placeholder="Enter your campus location"
                  className={`h-9 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:focus:border-secondary ${errors.campusLocation ? "border-red-500 dark:border-red-400" : ""}`}
                />
              )}
              
              {errors.campusLocation && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.campusLocation}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="isSeller"
                name="isSeller"
                checked={formData.isSeller}
                onChange={handleChange}
                className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-secondary"
              />
              <label 
                htmlFor="isSeller" 
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Register as a Seller
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white h-9"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
          
          <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 hover:underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;