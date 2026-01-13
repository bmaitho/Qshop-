import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from 'lucide-react';
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
import { ImagePlus, Upload, X, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Email service for confirmation emails
import { emailApiService } from '../../Services/emailApiService';

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campusLocations, setCampusLocations] = useState([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [activeTab, setActiveTab] = useState('student');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // File upload state for wholesaler
  const [documentFile, setDocumentFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);
  
  // Form data with all necessary fields for both student and wholesaler
  const [formData, setFormData] = useState({
    // Common fields
    fullName: '',
    email: '',
    password: '',
    phone: '',
    campusLocation: '',
    campusLocationId: null,
    accountType: 'student', // 'student' or 'wholesaler'
    
    // Student-specific fields
    studentId: '',
    
    // Wholesaler-specific fields
    businessName: '',
    businessLicenseNumber: '',
    taxId: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessDescription: '',
    businessWebsite: '',
    wholesalerCode: '',
    
    // Document verification
    documentFile: null
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'campusLocation') {
      const selectedLocation = campusLocations.find(loc => loc.name === value);
      setFormData(prev => ({
        ...prev,
        campusLocation: value,
        campusLocationId: selectedLocation?.id || null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user makes selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.campusLocation) newErrors.campusLocation = "Campus location is required";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Account type specific validations - MAKE OPTIONAL FOR NOW
    if (formData.accountType === 'student') {
      // Student ID is optional for now
      // if (!formData.studentId.trim()) newErrors.studentId = "Student ID is required";
    }

    if (formData.accountType === 'wholesaler') {
      // Make all wholesaler fields optional for now - can be filled later
      // if (!formData.businessName.trim()) newErrors.businessName = "Business name is required";
      // if (!formData.businessLicenseNumber.trim()) newErrors.businessLicenseNumber = "Business license number is required";
      // if (!formData.businessAddress.trim()) newErrors.businessAddress = "Business address is required";
      // if (!formData.businessPhone.trim()) newErrors.businessPhone = "Business phone is required";
      // if (!formData.businessEmail.trim()) newErrors.businessEmail = "Business email is required";
      // if (!formData.wholesalerCode.trim()) newErrors.wholesalerCode = "Access code is required";
      
      // Business email validation only if provided
      if (formData.businessEmail && !emailRegex.test(formData.businessEmail)) {
        newErrors.businessEmail = "Please enter a valid business email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      const { error: documentError } = await supabase
        .from('verification_documents')
        .insert([
          {
            user_id: userId,
            document_type: documentType,
            document_url: publicUrl,
            verification_status: 'pending'
          }
        ]);

      if (documentError) throw documentError;
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const handleResendEmail = async () => {
    try {
      setSubmitting(true);
      
      const result = await emailApiService.resendConfirmationEmail(formData.email);
      
      if (result.success) {
        toast.success("Confirmation email has been resent. Please check your inbox.");
      } else {
        toast.error(result.error || "Failed to resend confirmation email");
      }
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error("An error occurred while resending the email");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    let userCreated = false;
    let userId = null;

    try {
      // If account type is wholesaler and code provided, verify it (optional)
      if (formData.accountType === 'wholesaler' && formData.wholesalerCode.trim()) {
        try {
          const { data: codeData, error: codeError } = await supabase
            .from('wholesaler_codes')
            .select('*')
            .eq('code', formData.wholesalerCode.trim())
            .eq('is_used', false)
            .single();
          
          if (codeError || !codeData) {
            toast.warning("Wholesaler code not found or already used. You can update this later in your profile.");
            // Don't fail the signup - just warn
          }
        } catch (codeError) {
          console.error('Code verification error (non-critical):', codeError);
          toast.warning("Could not verify wholesaler code. You can update this later in your profile.");
        }
      }

      // Prepare metadata for Supabase - EXACTLY what your database trigger expects
      const metadata = {
        full_name: formData.fullName,
        phone: formData.phone,
        campus_location: formData.campusLocation,
        is_seller: formData.accountType === 'wholesaler', // Simple mapping
        // These extra fields will be ignored by your trigger but stored in raw_user_meta_data
        campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
        account_type: formData.accountType,
        student_id: formData.accountType === 'student' ? formData.studentId : null,
        business_name: formData.accountType === 'wholesaler' ? formData.businessName : null,
        business_license_number: formData.accountType === 'wholesaler' ? formData.businessLicenseNumber : null,
        email: formData.email // Include email in metadata for completeness
      };

      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      if (data.user) {
        userCreated = true;
        userId = data.user.id;

        // Upload document if provided (optional)
        if (documentFile) {
          try {
            await uploadDocument(userId);
            toast.success("Document uploaded successfully!");
          } catch (uploadError) {
            console.error('Document upload error (non-critical):', uploadError);
            toast.warning("Account created, but there was an issue uploading your document. You can upload it later in your profile.");
          }
        }

        // Create wholesaler details if needed and data provided (optional)
        if (formData.accountType === 'wholesaler' && formData.businessName.trim()) {
          try {
            const { error: wholesalerError } = await supabase
              .from('wholesaler_details')
              .insert([
                {
                  user_id: userId,
                  business_name: formData.businessName || 'TBD',
                  business_license_number: formData.businessLicenseNumber || null,
                  tax_id: formData.taxId || null,
                  business_address: formData.businessAddress || null,
                  business_phone: formData.businessPhone || null,
                  business_email: formData.businessEmail || null,
                  business_description: formData.businessDescription || null,
                  business_website: formData.businessWebsite || null,
                  verification_status: 'pending'
                }
              ]);

            if (wholesalerError) {
              console.error('Wholesaler details creation error (non-critical):', wholesalerError);
              toast.warning("Account created, but some business details couldn't be saved. You can complete them in your profile.");
            }

            // Mark the code as used (optional)
            if (formData.wholesalerCode.trim()) {
              try {
                await supabase
                  .from('wholesaler_codes')
                  .update({
                    is_used: true,
                    used_by: formData.email,
                    used_at: new Date().toISOString()
                  })
                  .eq('code', formData.wholesalerCode.trim());
              } catch (updateCodeError) {
                console.error('Error updating code status (non-critical):', updateCodeError);
              }
            }
          } catch (wholesalerError) {
            console.error('Wholesaler details creation error (non-critical):', wholesalerError);
            toast.warning("Account created, but some business details couldn't be saved. You can complete them in your profile.");
          }
        }
        
        // Send confirmation email using Resend - FIXED VERSION
        try {
          await emailApiService.sendConfirmationEmail(
            formData.email,
            formData.fullName
          );
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          toast.warning("Account created, but there was an issue sending the custom confirmation email. Please check your inbox for the default confirmation email.");
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      
      if (userCreated) {
        toast.warning("Your account was created, but we encountered some issues. Please check your email for the confirmation link.");
        setEmailSent(true);
        setSubmitting(false);
        return;
      }
      
      let errorMessage = 'Failed to create account';
      
      if (error.message?.includes('password')) {
        errorMessage = error.message;
      } else if (error.message?.includes('email')) {
        errorMessage = 'This email is already registered';
        setErrors(prev => ({
          ...prev,
          email: "This email is already registered"
        }));
      } else if (error.status === 422) {
        errorMessage = 'Invalid email or password format';
      } else if (error.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.status === 500 || error.status === 522) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage);
      setSubmitting(false);
      return;
    }

    setEmailSent(true);
    setSubmitting(false);
    toast.success("Account created successfully! Please check your email for the confirmation link.");
  };

  // Show email confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background p-4">
        <div className="w-full max-w-md bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            
            <h2 className="text-xl font-bold mb-2 text-foreground dark:text-foreground">Check Your Email</h2>
            
            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">Verification Required</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                We've sent a confirmation email to <strong>{formData.email}</strong>.
                Please click the link in the email to verify your account.
              </AlertDescription>
            </Alert>
            
            <p className="mb-6 text-primary/70 dark:text-foreground/70">
              Once verified, you'll be able to sign in to your account.
            </p>

            <Button 
              variant="outline"
              onClick={handleResendEmail}
              disabled={submitting}
              className="w-full mb-4"
            >
              {submitting ? 'Sending...' : 'Resend Email'}
            </Button>
            
            <Link 
              to="/login" 
              className="inline-block text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // File handling functions
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setFormData(prev => ({ ...prev, documentFile: file }));
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setDocumentFile(file);
      setFormData(prev => ({ ...prev, documentFile: file }));
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const removeFile = () => {
    setDocumentFile(null);
    setFormData(prev => ({ ...prev, documentFile: null }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background p-4">
      <div className="w-full max-w-md bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Join the UniHive marketplace
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="student" 
              onClick={() => setFormData(prev => ({ ...prev, accountType: 'student' }))}
            >
              Student
            </TabsTrigger>
            <TabsTrigger 
              value="wholesaler"
              onClick={() => setFormData(prev => ({ ...prev, accountType: 'wholesaler' }))}
            >
              Wholesaler
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div>
              <Input
                name="fullName"
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                className={`text-gray-900 dark:text-white ${errors.fullName ? "border-red-500" : ""}`}
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={`text-gray-900 dark:text-white ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className={`text-gray-900 dark:text-white ${errors.password ? "border-red-500" : ""}`}
              />
              <button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
>
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
         </button>
            </div>

            <div>
              <Input
                name="phone"
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className={`text-gray-900 dark:text-white ${errors.phone ? "border-red-500" : ""}`}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Select 
                value={formData.campusLocation} 
                onValueChange={(value) => handleSelectChange('campusLocation', value)}
              >
                <SelectTrigger className={errors.campusLocation ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select Campus Location" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCampuses ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    campusLocations.map((location) => (
                      <SelectItem key={location.id} value={location.name}>
                        {location.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.campusLocation && <p className="text-red-500 text-sm mt-1">{errors.campusLocation}</p>}
            </div>

            {/* Student-specific fields */}
            <TabsContent value="student" className="space-y-4 mt-0">
              <div>
                <Input
                  name="studentId"
                  type="text"
                  placeholder="Student ID (required)"
                  value={formData.studentId}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.studentId ? "border-red-500" : ""}`}
                />
                {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>}
               
              </div>
            </TabsContent>

            {/* Wholesaler-specific fields */}
            <TabsContent value="wholesaler" className="space-y-4 mt-0">
              <div>
                <Input
                  name="businessName"
                  type="text"
                  placeholder="Business Name (Optional)"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.businessName ? "border-red-500" : ""}`}
                />
                {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <Input
                  name="businessLicenseNumber"
                  type="text"
                  placeholder="Business License Number (Optional)"
                  value={formData.businessLicenseNumber}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.businessLicenseNumber ? "border-red-500" : ""}`}
                />
                {errors.businessLicenseNumber && <p className="text-red-500 text-sm mt-1">{errors.businessLicenseNumber}</p>}
              </div>

              <div>
                <Input
                  name="taxId"
                  type="text"
                  placeholder="Tax ID (Optional)"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Textarea
                  name="businessAddress"
                  placeholder="Business Address (Optional)"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.businessAddress ? "border-red-500" : ""}`}
                />
                {errors.businessAddress && <p className="text-red-500 text-sm mt-1">{errors.businessAddress}</p>}
              </div>

              <div>
                <Input
                  name="businessPhone"
                  type="tel"
                  placeholder="Business Phone (Optional)"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.businessPhone ? "border-red-500" : ""}`}
                />
                {errors.businessPhone && <p className="text-red-500 text-sm mt-1">{errors.businessPhone}</p>}
              </div>

              <div>
                <Input
                  name="businessEmail"
                  type="email"
                  placeholder="Business Email (Optional)"
                  value={formData.businessEmail}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.businessEmail ? "border-red-500" : ""}`}
                />
                {errors.businessEmail && <p className="text-red-500 text-sm mt-1">{errors.businessEmail}</p>}
              </div>

              <div>
                <Textarea
                  name="businessDescription"
                  placeholder="Business Description (Optional)"
                  value={formData.businessDescription}
                  onChange={handleChange}
                  className="text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Input
                  name="businessWebsite"
                  type="url"
                  placeholder="Business Website (Optional)"
                  value={formData.businessWebsite}
                  onChange={handleChange}
                  className="text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Input
                  name="wholesalerCode"
                  type="text"
                  placeholder="Wholesaler Access Code (Optional)"
                  value={formData.wholesalerCode}
                  onChange={handleChange}
                  className={`text-gray-900 dark:text-white ${errors.wholesalerCode ? "border-red-500" : ""}`}
                />
                {errors.wholesalerCode && <p className="text-red-500 text-sm mt-1">{errors.wholesalerCode}</p>}
                <p className="text-xs text-muted-foreground mt-1">You can verify your access code later</p>
              </div>
            </TabsContent>

            {/* Document Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {activeTab === 'student' ? 'Student ID Document' : 'Business License'} (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                  ${documentFile ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {documentFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Upload className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {documentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="mx-auto mt-2 max-h-20 object-cover rounded"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to upload {activeTab === 'student' ? 'student ID' : 'business license'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or PDF up to 10MB (Optional - you can upload later)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Tabs>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;