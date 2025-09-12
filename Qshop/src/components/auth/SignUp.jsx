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
        businessWebsite: '',
        wholesalerCode: ''
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
    // setFormData(prev => ({ ...prev, accountType: activeTab })); // REMOVE THIS LINE
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
      
      if (!formData.wholesalerCode.trim()) {
        newErrors.wholesalerCode = "Wholesaler access code is required";
      }
      
      if (!documentFile) {
        newErrors.businessDocument = "Business verification document is required";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  // File upload handlers for wholesaler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
      
      // Clear error
      if (errors.businessDocument) {
        setErrors(prev => ({
          ...prev,
          businessDocument: undefined
        }));
      }
    }
  };

  const handleFileRemove = () => {
    setDocumentFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setDocumentFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
      
      // Clear error
      if (errors.businessDocument) {
        setErrors(prev => ({
          ...prev,
          businessDocument: undefined
        }));
      }
    }
  };

  const uploadDocument = async (userId) => {
    try {
      if (!documentFile) return null;

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
    let emailSent = false;

    try {
      // If account type is wholesaler, verify the code first
      if (formData.accountType === 'wholesaler') {
        const { data: codeData, error: codeError } = await supabase
          .from('wholesaler_codes')
          .select('*')
          .eq('code', formData.wholesalerCode.trim())
          .eq('is_used', false)
          .single();
        
        if (codeError || !codeData) {
          setErrors(prev => ({
            ...prev,
            wholesalerCode: "Invalid or already used access code"
          }));
          setSubmitting(false);
          return;
        }
      }

      // Prepare metadata for Supabase
      const metadata = {
        full_name: formData.fullName,
        phone: formData.phone,
        campus_location: formData.campusLocation,
        campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
        // account_type: formData.accountType, // REMOVE THIS LINE
        ...(activeTab === 'wholesaler' && {
          business_name: formData.businessName,
          business_license_number: formData.businessLicenseNumber,
          tax_id: formData.taxId,
          business_address: formData.businessAddress,
          business_phone: formData.businessPhone,
          business_email: formData.businessEmail,
          business_description: formData.businessDescription,
          business_website: formData.businessWebsite
        })
      };

      // Create user account
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
        
        // Insert into profiles table
         try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([
              {
                id: userId,
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                campus_location: formData.campusLocation,
                campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
                //account_type: formData.accountType,
                is_seller: formData.accountType === 'wholesaler',
                //verification_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ], {
              onConflict: 'id'
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        } catch (profileError) {
          console.error('Profile creation error (non-critical):', profileError);
        }

        // Upload document if provided (wholesaler)
        if (documentFile && formData.accountType === 'wholesaler') {
          try {
            await uploadDocument(userId);
          } catch (documentError) {
            console.error('Document upload error (non-critical):', documentError);
            toast.warning("Account created but document upload failed. Please upload verification documents in your profile.");
          }
        }

        // Create wholesaler details if needed
        if (formData.accountType === 'wholesaler') {
          try {
            const { error: wholesalerError } = await supabase
              .from('wholesaler_details')
              .insert([
                {
                  user_id: userId,
                  business_name: formData.businessName,
                  business_license_number: formData.businessLicenseNumber,
                  tax_id: formData.taxId,
                  business_address: formData.businessAddress,
                  business_phone: formData.businessPhone,
                  business_email: formData.businessEmail,
                  business_description: formData.businessDescription,
                  business_website: formData.businessWebsite,
                  verification_status: 'pending'
                }
              ]);

            if (wholesalerError) {
              console.error('Wholesaler details creation error:', wholesalerError);
            }

            // Mark the code as used
            const { error: updateCodeError } = await supabase
              .from('wholesaler_codes')
              .update({
                is_used: true,
                used_by: formData.email,
                used_at: new Date().toISOString()
              })
              .eq('code', formData.wholesalerCode.trim());
            
            if (updateCodeError) {
              console.error('Error updating code status:', updateCodeError);
            }
          } catch (wholesalerError) {
            console.error('Wholesaler details creation error (non-critical):', wholesalerError);
          }
        }
        
        // Send confirmation email using our service
        try {
          const confirmationToken = data.session?.access_token || '';
          
          await emailApiService.sendConfirmationEmail(
            formData.email,
            confirmationToken,
            formData.fullName
          );
          
          emailSent = true;
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          emailSent = true;
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
      <div className="bg-card dark:bg-card p-4 rounded-lg shadow-md border border-border dark:border-border">
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
            {submitting ? 'Sending...' : 'Resend Confirmation Email'}
          </Button>
          
          <Link to="/auth" className="block w-full">
            <Button 
              variant="default"
              className="w-full bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90"
            >
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card dark:bg-card p-4 rounded-lg shadow-md border border-border dark:border-border">
      <h2 className="text-2xl text-center font-bold mb-4 text-foreground dark:text-foreground">Create an Account</h2>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="wholesaler">Wholesaler</TabsTrigger>
        </TabsList>
        <div className="mt-2 text-xs text-center text-foreground/60 dark:text-foreground/60">
          {activeTab === 'student' && 'Create a student account to buy and sell within your campus.'}
          {activeTab === 'wholesaler' && 'Create a wholesaler account to sell products to students.'}
        </div>
      </Tabs>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Common fields for all account types */}
        <div className="space-y-1">
          <Input
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Full name"
            className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
            aria-invalid={errors.fullName ? "true" : "false"}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500 dark:text-red-400">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-1">
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-sm text-red-500 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring pr-10"
              aria-invalid={errors.password ? "true" : "false"}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <div className="space-y-1">
          <Input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone number (mpesa)"
            className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
          />
        </div>

        {/* Student-specific fields - NO SELLER CHECKBOX */}
        {activeTab === 'student' && (
          <div className="p-3 border border-border dark:border-border rounded-md space-y-2 bg-background/50 dark:bg-muted/50">
            <div className="space-y-1">
              <label htmlFor="campusLocation" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Campus Location
              </label>
              
              {loadingCampuses ? (
                <div className="text-sm text-foreground/60 dark:text-foreground/60">Loading campus locations...</div>
              ) : campusLocations.length > 0 ? (
                <Select
                  value={formData.campusLocationId}
                  onValueChange={handleCampusChange}
                >
                  <SelectTrigger 
                    id="campusLocationId"
                    className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                    aria-invalid={errors.campusLocation ? "true" : "false"}
                  >
                    <SelectValue placeholder="Select your campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="campusLocation"
                  name="campusLocation"
                  value={formData.campusLocation}
                  onChange={handleChange}
                  placeholder="Enter your campus location"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                  aria-invalid={errors.campusLocation ? "true" : "false"}
                />
              )}
              
              {errors.campusLocation && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.campusLocation}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Student ID (Optional)
              </label>
              <div
                className={`border-2 ${isDragging ? 'border-ring bg-ring/5' : documentFile ? 'border-ring/50' : 'border-dashed border-input dark:border-input'} rounded-lg transition-colors ${!documentFile ? 'hover:border-ring/70 cursor-pointer' : ''} p-3`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !documentFile && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                
                {documentFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{documentFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileRemove();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <ImagePlus className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-foreground mb-1">
                      {isDragging ? 'Drop your student ID here' : 'Upload student ID card'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click • PDF, JPG, PNG
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wholesaler-specific fields */}
        {activeTab === 'wholesaler' && (
          <div className="p-3 border border-border dark:border-border rounded-md space-y-2 bg-background/50 dark:bg-muted/50">
            <div className="space-y-1">
              <label htmlFor="wholesalerCode" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Wholesaler Access Code *
              </label>
              <Input
                id="wholesalerCode"
                name="wholesalerCode"
                value={formData.wholesalerCode}
                onChange={handleChange}
                placeholder="Enter your access code"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                aria-invalid={errors.wholesalerCode ? "true" : "false"}
              />
              {errors.wholesalerCode && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.wholesalerCode}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="businessName" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business Name *
              </label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business name"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                aria-invalid={errors.businessName ? "true" : "false"}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.businessName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="businessLicenseNumber" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  License Number
                </label>
                <Input
                  id="businessLicenseNumber"
                  name="businessLicenseNumber"
                  value={formData.businessLicenseNumber}
                  onChange={handleChange}
                  placeholder="Business license number"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="taxId" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Tax ID
                </label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder="Tax identification number"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="businessEmail" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Business Email
                </label>
                <Input
                  id="businessEmail"
                  type="email"
                  name="businessEmail"
                  value={formData.businessEmail}
                  onChange={handleChange}
                  placeholder="Business email (optional)"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="businessPhone" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                  Business Phone
                </label>
                <Input
                  id="businessPhone"
                  type="tel"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  placeholder="Business phone (optional)"
                  className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="businessAddress" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business Address
              </label>
              <Textarea
                id="businessAddress"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="Enter business address"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="businessDescription" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business Description
              </label>
              <Textarea
                id="businessDescription"
                name="businessDescription"
                value={formData.businessDescription}
                onChange={handleChange}
                placeholder="Describe your business"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="businessWebsite" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Website (Optional)
              </label>
              <Input
                id="businessWebsite"
                type="url"
                name="businessWebsite"
                value={formData.businessWebsite}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business Document *
              </label>
              <div
                className={`border-2 ${isDragging ? 'border-ring bg-ring/5' : documentFile ? 'border-ring/50' : 'border-dashed border-input dark:border-input'} rounded-lg transition-colors ${!documentFile ? 'hover:border-ring/70 cursor-pointer' : ''} p-4`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !documentFile && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                
                {documentFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{documentFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileRemove();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-foreground mb-1">
                      {isDragging ? 'Drop your document here' : 'Upload business license or certificate'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to browse • PDF, JPG, PNG, DOC
                    </p>
                  </div>
                )}
              </div>
              {errors.businessDocument && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.businessDocument}</p>
              )}
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90"
          disabled={submitting}
        >
          {submitting ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>
      
      <p className="mt-3 text-center text-sm text-foreground/60 dark:text-foreground/60">
        Already have an account?{' '}
        <Link to="/auth" className="text-accent-foreground hover:text-accent-foreground/90 dark:text-primary dark:hover:text-primary/90 hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  );
};

export default SignUp;