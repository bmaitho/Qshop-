import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const selectedCampus = campusLocations.find(c => c.id.toString() === value);
    
    setFormData(prev => ({
      ...prev,
      campusLocationId: value,
      campusLocation: selectedCampus ? selectedCampus.name : prev.campusLocation
    }));
    
    if (errors.campusLocation) {
      setErrors(prev => ({
        ...prev,
        campusLocation: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
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
        
        toast.success("Account created! Please Log in.", { position: "top-right", autoClose: 5000 });
        
        navigate('/login');
      }
    } catch (error) {
      let errorMessage = 'Failed to create account';
      
      if (error.message && error.message.includes('password')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('email')) {
        errorMessage = 'This email is already registered';
      } else {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage, { position: "top-right", autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-[#0D2B20]">
      <div className="w-full max-w-md px-6 py-8 bg-white shadow-xl flex-grow">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#E7C65F]">UniHive</h1>
          <p className="text-gray-600 mt-2">Student Marketplace</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#E7C65F]">Create an Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`h-12 w-full p-2 border rounded-md ${errors.fullName ? "border-red-500" : "border-[#E7C65F]"} focus:outline-none focus:ring-2 focus:ring-[#E7C65F] text-black`}  // Added text-black and rounded corners
              />
              {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
            </div>

            <div>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={`h-12 w-full p-2 border rounded-md ${errors.email ? "border-red-500" : "border-[#E7C65F]"} focus:outline-none focus:ring-2 focus:ring-[#E7C65F] text-black`}  // Added text-black and rounded corners
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`h-12 w-full p-2 border rounded-md ${errors.password ? "border-red-500" : "border-[#E7C65F]"} focus:outline-none focus:ring-2 focus:ring-[#E7C65F] text-black`}  // Added text-black and rounded corners
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="h-12 w-full p-2 border rounded-md border-[#E7C65F] focus:outline-none focus:ring-2 focus:ring-[#E7C65F] text-black"  // Added text-black and rounded corners
              />
            </div>

            <div>
              {loadingCampuses ? (
                <div className="text-sm text-gray-600">Loading campus locations...</div>
              ) : campusLocations.length > 0 ? (
                <Select value={formData.campusLocationId} onValueChange={handleCampusChange}>
                  <SelectTrigger
                    className={`h-12 w-full p-2 border rounded-md ${errors.campusLocation ? "border-red-500" : "border-[#E7C65F]"} focus:outline-none focus:ring-2 focus:ring-[#E7C65F] text-black`}  // Added text-black and rounded corners
                  >
                    <SelectValue>{formData.campusLocationId ? campusLocations.find(c => c.id.toString() === formData.campusLocationId)?.name : 'Select campus location'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {campusLocations.map(location => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-gray-600">No campus locations available</div>
              )}
              {errors.campusLocation && <p className="text-sm text-red-500">{errors.campusLocation}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isSeller"
                type="checkbox"
                name="isSeller"
                checked={formData.isSeller}
                onChange={handleChange}
                className="h-4 w-4 text-[#E7C65F]"
              />
              <label htmlFor="isSeller" className="text-sm text-gray-700">Sign up as a seller</label>
            </div>

            <Button type="submit" className="w-full mt-4 h-12 bg-[#E7C65F] hover:bg-[#d1b054] text-white rounded-md">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <div className="mt-4 text-sm text-center text-gray-600">
              Already have an account? 
              <Link to="/login" className="text-[#E7C65F] hover:text-[#d1b054] transition duration-300 ease-in-out ml-2">
                Log In
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
