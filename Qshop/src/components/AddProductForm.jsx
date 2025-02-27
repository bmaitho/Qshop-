import React, { useState, useRef, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, Upload } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shopToasts } from '@/utils/toastConfig';
import { supabase } from '../components/SupabaseClient';

const AddProductForm = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      category: '',
      condition: 'new', // Default value
    }
  });

  // Watch form values for debugging
  const watchAllFields = watch();
  
  useEffect(() => {
    // Register the fields that use Select component
    register("category", { required: "Category is required" });
    register("condition", { required: "Condition is required" });
  }, [register]);

  // Using the existing shopToasts from utils/toastConfig

  // Handle file selection (from file dialog or camera)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        shopToasts.imageTypeError();
        return;
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setValue('image', file); // Set the value in the form
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
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setValue('image', file); // Set the value in the form
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        shopToasts.imageTypeError();
      }
    }
  };

  // Open file browser
  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // Open camera
  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setValue('image', null);
  };

  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const onSubmit = async (data) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        shopToasts.addProductError();
        return;
      }
      
      // Check if the required fields are there
      if (!data.category || !data.condition) {
        shopToasts.addProductError();
        return;
      }
      
      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Get user's campus location
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('campus_location')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Map condition value to readable format
      const conditionMap = {
        'new': 'New',
        'like_new': 'Used - Like New',
        'good': 'Used - Good',
        'fair': 'Used - Fair'
      };

      const productData = {
        name: data.name,
        price: parseFloat(data.price),
        description: data.description,
        category: data.category,
        condition: conditionMap[data.condition] || data.condition,
        image_url: imageUrl,
        seller_id: user.id,
        status: 'active',
        location: profile?.campus_location || 'Unknown'
      };

      console.log('Submitting product data:', productData);

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;

      shopToasts.addProductSuccess();
      reset();
      setImageFile(null);
      setPreviewUrl(null);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding product:', error);
      shopToasts.addProductError();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] overflow-y-auto p-4 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Product</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Product Name</label>
          <Input
            {...register("name", { required: "Product name is required" })}
            placeholder="Enter product name"
            className="focus:border-orange-500 focus:ring-orange-500"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Price (KES)</label>
          <Input
            type="number"
            {...register("price", { 
              required: "Price is required",
              min: { value: 0, message: "Price must be positive" }
            })}
            placeholder="Enter price in KES"
            className="focus:border-orange-500 focus:ring-orange-500"
          />
          {errors.price && (
            <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <Textarea
            {...register("description", { required: "Description is required" })}
            placeholder="Describe your product"
            className="min-h-[100px] focus:border-orange-500 focus:ring-orange-500"
          />
          {errors.description && (
            <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select 
              onValueChange={(value) => setValue("category", value)}
              value={watchAllFields.category}
            >
              <SelectTrigger className="focus:ring-orange-500">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Condition</label>
            <Select
              value={watchAllFields.condition}
              onValueChange={(value) => setValue("condition", value)}
            >
              <SelectTrigger className="focus:ring-orange-500">
                <SelectValue placeholder="Select Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="like_new">Used - Like New</SelectItem>
                <SelectItem value="good">Used - Good</SelectItem>
                <SelectItem value="fair">Used - Fair</SelectItem>
              </SelectContent>
            </Select>
            {errors.condition && (
              <p className="text-sm text-red-500 mt-1">{errors.condition.message}</p>
            )}
          </div>
        </div>

        {/* Enhanced Image Upload Section */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Product Image</label>
          <div
            className={`border-2 ${isDragging ? 'border-orange-500 bg-orange-50' : previewUrl ? 'border-orange-300' : 'border-dashed border-gray-300'} rounded-lg transition-colors ${!previewUrl ? 'p-6' : 'p-2'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Product preview" 
                  className="w-full h-64 object-contain rounded"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                >
                  <X className="h-5 w-5 text-red-500" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop an image, or use the options below
                </p>
                <div className="flex justify-center mt-4 space-x-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={openFileBrowser}
                    className="flex items-center hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={openCamera}
                    className="flex items-center hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>
            )}
            
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {errors.image && (
            <p className="text-sm text-red-500 mt-1">{errors.image.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white py-3"
          disabled={uploading || isSubmitting}
        >
          {uploading || isSubmitting ? "Adding Product..." : "Add Product"}
        </Button>
      </form>
    </div>
  );
};

export default AddProductForm;