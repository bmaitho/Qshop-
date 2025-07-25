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
  
  // File upload state
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
      // Check for either direct input or dropdown selection
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
      if (errors.businessDocument) {
        setErrors(prev => ({
          ...prev,
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
        seller_type: formData.accountType,
        is_seller: formData.isSeller
      };

      // 1. Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (signUpError) throw signUpError;
      
      if (data?.user) {
        userId = data.user.id;
        userCreated = true;
        
        // 2. Upload document if provided
        let documentUrl = null;
        try {
          if (documentFile) {
            documentUrl = await uploadDocument(userId);
          }
        } catch (docError) {
          console.error('Document upload error (non-critical):', docError);
          // Continue even if document upload fails
        }
        
        // 3. Create profile with seller_type
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{
              id: userId,
              full_name: formData.fullName,
              phone: formData.phone,
              campus_location: formData.campusLocation,
              campus_location_id: formData.campusLocationId ? parseInt(formData.campusLocationId) : null,
              seller_type: formData.accountType,
              is_seller: formData.isSeller,
              email: formData.email
            }]);
            
          if (profileError) {
            // If it's an RLS error, log it but don't throw
            if (profileError.code === '42501') {
              console.warn('RLS error during profile creation (non-critical):', profileError);
            } else {
              throw profileError;
            }
          }
        } catch (profileError) {
          console.error('Profile creation error (non-critical):', profileError);
          // Continue even if profile creation fails - the main auth record was created
        }
        
        // 4. Create wholesaler details if applicable
        if (formData.accountType === 'wholesaler') {
          try {
            const { error: wholesalerError } = await supabase
              .from('wholesaler_details')
              .insert([{
                id: userId,
                business_name: formData.businessName,
                business_license_number: formData.businessLicenseNumber,
                tax_id: formData.taxId,
                business_address: formData.businessAddress,
                business_phone: formData.businessPhone || formData.phone,
                business_email: formData.businessEmail || formData.email,
                business_description: formData.businessDescription,
                business_website: formData.businessWebsite
              }]);
              
            if (wholesalerError) throw wholesalerError;
            
            // 5. Mark the code as used
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
            // Continue even if wholesaler details creation fails
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
          // Still consider email sent even if our service fails
          emailSent = true;
          toast.warning("Account created, but there was an issue sending the custom confirmation email. Please check your inbox for the default confirmation email.");
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      
      // If user was created but we hit other errors, still show confirmation screen
      if (userCreated) {
        toast.warning("Your account was created, but we encountered some issues. Please check your email for the confirmation link.");
        setEmailSent(true);
        setSubmitting(false);
        return;
      }
      
      // Handle other signup errors
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
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      // If user was created and email was sent (or attempted),
      // show the confirmation screen regardless of other errors
      if (userCreated && emailSent) {
        setEmailSent(true);
      }
      
      setSubmitting(false);
    }
  };

  // If email sent, show confirmation message
  if (emailSent) {
    return (
      <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-primary dark:text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground dark:text-foreground">
            Verify Your Email
          </h2>
          
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
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
    <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md border border-border dark:border-border styled-scrollbar">
      <h2 className="text-2xl text-center font-bold mb-4 text-foreground dark:text-foreground">Create an Account</h2>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="mb-6"
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
      
      <form onSubmit={handleSubmit} className="space-y-3">
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
            placeholder="Phone number (optional)"
            className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
          />
        </div>

        {/* Student-specific fields */}
        {activeTab === 'student' && (
          <div className="p-4 border border-border dark:border-border rounded-md space-y-3 bg-background/50 dark:bg-muted/50">
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
                  <SelectContent className="bg-card dark:bg-card text-foreground dark:text-foreground border-border dark:border-border">
                    {campusLocations.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id.toString()}>
                        {campus.name}
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
                className={`border-2 ${isDragging ? 'border-ring bg-ring/5' : documentFile ? 'border-ring/50' : 'border-dashed border-input dark:border-input'} rounded-lg transition-colors ${!documentFile ? 'p-6' : 'p-2'}`}
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
                        alt="Student ID preview" 
                        className="w-full h-40 object-contain rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-16 bg-background dark:bg-muted rounded">
                        <p className="text-sm text-foreground/70 dark:text-foreground/70 truncate max-w-full px-4">
                          {documentFile.name}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-background rounded-full shadow-md hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-10 w-10 text-foreground/40 dark:text-foreground/40" />
                    <p className="mt-2 text-sm text-foreground/60 dark:text-foreground/60">
                      Upload a photo of your student ID
                    </p>
                    <p className="text-xs text-foreground/50 dark:text-foreground/50 mt-1">
                      Drag and drop, or click to browse
                    </p>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current.click()}
                      className="mt-4 border-input dark:border-input text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent"
                    >
                      <Upload className="h-4 w-4 mr-2" />
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
          </div>
        )}

        {/* Wholesaler-specific fields */}
        {activeTab === 'wholesaler' && (
          <div className="p-4 border border-border dark:border-border rounded-md space-y-3 bg-background/50 dark:bg-muted/50">
            {/* Wholesaler code field */}
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
                Business Name
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

            <div className="space-y-1">
              <label htmlFor="businessLicenseNumber" className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business License Number
              </label>
              <Input
                id="businessLicenseNumber"
                name="businessLicenseNumber"
                value={formData.businessLicenseNumber}
                onChange={handleChange}
                placeholder="Enter license number (optional)"
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring min-h-[80px]"
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
                className="bg-background dark:bg-muted text-foreground dark:text-foreground border-input dark:border-input focus:border-ring dark:focus:border-ring min-h-[80px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground/80 dark:text-foreground/80">
                Business Document *
              </label>
              <div
                className={`border-2 ${isDragging ? 'border-ring bg-ring/5' : documentFile ? 'border-ring/50' : 'border-dashed border-input dark:border-input'} rounded-lg transition-colors ${!documentFile ? 'p-6' : 'p-2'}`}
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
                        className="w-full h-40 object-contain rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-16 bg-background dark:bg-muted rounded">
                        <p className="text-sm text-foreground/70 dark:text-foreground/70 truncate max-w-full px-4">
                          {documentFile.name}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-background rounded-full shadow-md hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-10 w-10 text-foreground/40 dark:text-foreground/40" />
                    <p className="mt-2 text-sm text-foreground/60 dark:text-foreground/60">
                      Upload business license or registration document
                      </p>
                    <p className="text-xs text-foreground/50 dark:text-foreground/50 mt-1">
                      Supported formats: JPG, PNG, PDF
                    </p>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current.click()}
                      className="mt-4 border-input dark:border-input text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent"
                    >
                      <Upload className="h-4 w-4 mr-2" />
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
                <p className="text-sm text-red-500 dark:text-red-400">{errors.businessDocument}</p>
              )}
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full mt-4 bg-[#113b1e] text-white hover:bg-[#113b1e]/90 dark:bg-[#113b1e] dark:text-white dark:hover:bg-[#113b1e]/90"
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