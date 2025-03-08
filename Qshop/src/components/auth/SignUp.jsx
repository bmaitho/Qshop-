import React, { useState, useEffect, useRef } from 'react';
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';

const SignUp = ({ compact = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campusLocations, setCampusLocations] = useState([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [activeTab, setActiveTab] = useState('student');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // File upload state
  const [documentFile, setDocumentFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    // Common fields
    fullName: '',
    email: '',
    password: '',
    phone: '',
    accountType: 'student',
    
    // Student-specific fields
    campusLocation: '',
    campusLocationId: '',
    
    // Wholesaler-specific fields
    businessName: '',
    businessLicenseNumber: '',
    taxId: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessDescription: '',
    businessWebsite: ''
  });
  
  const [errors, setErrors] = useState({});

  // Check for mobile screen on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch campus locations when component mounts
  useEffect(() => {
    fetchCampusLocations();
  }, []);

  // Set form data account type when tab changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, accountType: activeTab }));
  }, [activeTab]);

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
    
    // Validate common fields
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
    
    // Validate student-specific fields
    if (formData.accountType === 'student') {
      if (!formData.campusLocation.trim() && !formData.campusLocationId) {
        newErrors.campusLocation = "Campus location is required";
      }
    }
    
    // Validate wholesaler-specific fields
    if (formData.accountType === 'wholesaler') {
      if (!formData.businessName.trim()) {
        newErrors.businessName = "Business name is required";
      }
      
      if (!documentFile) {
        newErrors.businessDocument = "Business verification document is required";
      }
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

  // File upload handlers
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('Please upload an image or PDF file');
        return;
      }
      
      setDocumentFile(file);
      
      // Only create preview for images
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        // For PDFs, just show a placeholder or filename
        setPreviewUrl(null);
      }
      
      // Clear document upload errors
      if (errors.studentId || errors.businessDocument) {
        setErrors(prev => ({
          ...prev,
          studentId: undefined,
          businessDocument: undefined
        }));
      }
    }
  };

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files?.length) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        handleFileChange({ target: { files } });
      } else {
        toast.error('Please upload an image or PDF file');
      }
    }
  };

  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setDocumentFile(null);
    setPreviewUrl(null);
  };

  const uploadDocument = async (userId) => {
    if (!documentFile) return null;
    
    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Determine document type based on account type
      const documentType = formData.accountType === 'student' ? 'student_id' : 'business_license';
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      // Insert into verification_documents table
      const { data: documentData, error: documentError } = await supabase
        .from('verification_documents')
        .insert([
          {
            user_id: userId,
            document_type: documentType,
            document_url: publicUrl,
            verification_status: 'pending'
          }
        ])
        .single();

      if (documentError) throw documentError;
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // 1. Create the account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            campus_location: formData.campusLocation,
            campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
            // We'll set this after successful profile creation
            seller_type: formData.accountType
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (data.user) {
        const userId = data.user.id;
        
        // 2. Upload document if provided
        let documentUrl = null;
        if (documentFile) {
          documentUrl = await uploadDocument(userId);
        }
        
        // 3. Create profile with seller_type
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: userId,
              full_name: formData.fullName,
              phone: formData.phone,
              campus_location: formData.campusLocation,
              campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
              seller_type: formData.accountType,
              email: formData.email
            }
          ]);
          
        if (profileError) throw profileError;
        
        // 4. Create wholesaler details if applicable
        if (formData.accountType === 'wholesaler') {
          const { error: wholesalerError } = await supabase
            .from('wholesaler_details')
            .insert([
              {
                id: userId,
                business_name: formData.businessName,
                business_license_number: formData.businessLicenseNumber,
                tax_id: formData.taxId,
                business_address: formData.businessAddress,
                business_phone: formData.businessPhone || formData.phone,
                business_email: formData.businessEmail || formData.email,
                business_description: formData.businessDescription,
                business_website: formData.businessWebsite
              }
            ]);
            
          if (wholesalerError) throw wholesalerError;
        }
        
        toast.success(
          "Account created! Please Log in.", 
          { position: "top-right", autoClose: 5000 }
        );
        
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
    <div className="flex flex-col h-full">
      <div className="w-full mx-auto px-3 py-2">
        {!compact && (
          <div className="text-center mb-3">
            <h1 className="text-2xl font-bold text-secondary">UniHive</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Student Marketplace</p>
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-primary dark:text-secondary mb-3 text-center">
            Create an account
          </h2>
          <p className="text-xs text-center text-gray-500 mb-4">Sign up and get 30 day free trial</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="wholesaler">Wholesaler</TabsTrigger>
            </TabsList>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
              {activeTab === 'student' && 'Create a student account to buy and sell within your campus.'}
              {activeTab === 'wholesaler' && 'Create a wholesaler account to sell products to students.'}
            </div>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
            {/* Common fields for all account types */}
            <div>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full name"
                className={`h-10 ${errors.fullName ? "border-red-500" : ""}`}
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className={`h-10 ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className={`h-10 ${errors.password ? "border-red-500" : ""}`}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <Input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number (optional)"
                className="h-10"
              />
            </div>

            {/* Student-specific fields */}
            {activeTab === 'student' && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div>
                  {loadingCampuses ? (
                    <div className="text-xs text-gray-600 dark:text-gray-400">Loading campus locations...</div>
                  ) : campusLocations.length > 0 ? (
                    <Select value={formData.campusLocationId} onValueChange={handleCampusChange}>
                      <SelectTrigger
                        className={`h-10 ${errors.campusLocation ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select campus location">
                          {formData.campusLocationId 
                            ? campusLocations.find(c => c.id.toString() === formData.campusLocationId)?.name 
                            : 'Select campus location'
                          }
                        </SelectValue>
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
                    <div className="text-xs text-gray-600 dark:text-gray-400">No campus locations available</div>
                  )}
                  {errors.campusLocation && (
                    <p className="text-xs text-red-500 mt-1">{errors.campusLocation}</p>
                  )}
                </div>

                <div>
                  <div
                    className={`border ${isDragging ? 'border-secondary bg-secondary/5' : documentFile ? 'border-secondary/50' : 'border-dashed border-gray-300 dark:border-gray-600'} rounded-lg transition-colors ${!documentFile ? 'p-3' : 'p-2'}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {documentFile ? (
                      <div className="relative">
                        {previewUrl ? (
                          <img 
                            src={previewUrl} 
                            alt="Document preview" 
                            className="w-full h-24 object-contain rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-12 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-full px-2">{documentFile.name}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={removeFile}
                          className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50"
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImagePlus className="mx-auto h-6 w-6 text-gray-400 dark:text-gray-500" />
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Upload a photo or scan of your student ID (optional)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Supported formats: JPG, PNG, PDF
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={openFileBrowser}
                          className="mx-auto mt-2 h-8 text-xs"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Browse Files
                        </Button>
                      </div>
                    )}
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Wholesaler-specific fields */}
            {activeTab === 'wholesaler' && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Business name"
                    className={`h-10 ${errors.businessName ? "border-red-500" : ""}`}
                  />
                  {errors.businessName && (
                    <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <Input
                    id="businessLicenseNumber"
                    name="businessLicenseNumber"
                    value={formData.businessLicenseNumber}
                    onChange={handleChange}
                    placeholder="Business license number (optional)"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="businessEmail"
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleChange}
                    placeholder="Business email"
                    className="h-10"
                  />
                  
                  <Input
                    id="businessPhone"
                    type="tel"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={handleChange}
                    placeholder="Business phone"
                    className="h-10"
                  />
                </div>

                <div>
                  <Textarea
                    id="businessAddress"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={handleChange}
                    placeholder="Business address"
                    className="resize-none h-16 text-sm"
                  />
                </div>

                <div>
                  <Textarea
                    id="businessDescription"
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    placeholder="Business description"
                    className="resize-none h-16 text-sm"
                  />
                </div>

                <div>
                  <div
                    className={`border ${isDragging ? 'border-secondary bg-secondary/5' : documentFile ? 'border-secondary/50' : 'border-dashed border-gray-300 dark:border-gray-600'} rounded-lg transition-colors ${!documentFile ? 'p-3' : 'p-2'}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {documentFile ? (
                      <div className="relative">
                        {previewUrl ? (
                          <img 
                            src={previewUrl} 
                            alt="Document preview" 
                            className="w-full h-24 object-contain rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-12 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-full px-2">{documentFile.name}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={removeFile}
                          className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50"
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImagePlus className="mx-auto h-6 w-6 text-gray-400 dark:text-gray-500" />
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Upload business license or registration*
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Supported formats: JPG, PNG, PDF
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={openFileBrowser}
                          className="mx-auto mt-2 h-8 text-xs"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Browse Files
                        </Button>
                      </div>
                    )}
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  {errors.businessDocument && (
                    <p className="text-xs text-red-500 mt-1">{errors.businessDocument}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <div className="flex h-9 items-center space-x-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600"
                    aria-label="Sign up with Apple"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.23-3.74 4.25z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600"
                    aria-label="Sign up with Google"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                      <path fill="#4285F4" d="M21.35 11.334h-9.17v3.333h5.306c-.26 1.334-1.653 3.333-5.306 3.333-3.193 0-5.794-2.648-5.794-5.953 0-3.305 2.601-5.953 5.794-5.953 1.824 0 3.046.775 3.747 1.444l2.552-2.458C16.654 3.493 14.21 2.667 12.18 2.667 7.055 2.667 3 6.734 3 11.667s4.055 9 9.18 9c5.306 0 8.82-3.724 8.82-8.962 0-.655-.065-1.16-.13-1.655l-.52-.716z"/>
                    </svg>
                  </button>
                </div>
                
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  or
                </span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 mt-2 bg-secondary text-primary dark:bg-secondary dark:text-primary font-medium text-sm"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Submit'}
            </Button>

            <div className="mt-3 text-xs text-center text-gray-600 dark:text-gray-400">
              Have any account? 
              <Link to="/login" className="text-secondary hover:text-secondary/80 dark:text-secondary dark:hover:text-secondary/90 ml-2">
                Sign in
              </Link>
            </div>
            
            <div className="mt-2 text-xs text-center text-gray-500">
              <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;