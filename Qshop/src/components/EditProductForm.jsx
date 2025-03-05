import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, PackageOpen } from 'lucide-react';
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
import { Label } from "@/components/ui/label";
import { shopToasts } from '../utils/toastConfig';
import { supabase } from './SupabaseClient';

const EditProductForm = ({ product, onSuccess, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(product?.image_url || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: product?.name || '',
      price: product?.price || '',
      description: product?.description || '',
      category: product?.category || '',
      condition: product?.condition || ''
    }
  });

  // Register select fields
  useEffect(() => {
    register("category", { required: "Category is required" });
    register("condition", { required: "Condition is required" });
    
    // Set initial values for select fields
    setValue("category", product?.category || '');
    
    // Map condition from display value to form value
    const conditionMap = {
      'New': 'new',
      'Used - Like New': 'like_new',
      'Used - Good': 'good',
      'Used - Fair': 'fair'
    };
    
    const reverseCondition = Object.entries(conditionMap).find(
      ([key, value]) => key === product?.condition
    );
    
    setValue("condition", reverseCondition ? reverseCondition[1] : 'new');
  }, [register, setValue, product]);

  // Handle file selection
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

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(product?.image_url || null);
  };

  // Upload image to Supabase
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

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setUploading(true);
      
      // Upload image if provided
      let imageUrl = product?.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Map condition from form value to display value
      const conditionMap = {
        'new': 'New',
        'like_new': 'Used - Like New',
        'good': 'Used - Good',
        'fair': 'Used - Fair'
      };

      const productData = {
        id: product.id,
        name: data.name,
        price: parseFloat(data.price),
        description: data.description,
        category: data.category,
        condition: conditionMap[data.condition] || data.condition,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);

      if (error) throw error;

      shopToasts.updateSuccess();
      onSuccess?.();
    } catch (error) {
      console.error('Error updating product:', error);
      shopToasts.updateError();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-[80vh] overflow-y-auto p-4">
      <div className="flex items-center space-x-2 mb-6">
        <PackageOpen className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Edit Product</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Product name is required" })}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="price">Price (KES)</Label>
          <Input
            id="price"
            type="number"
            {...register("price", { 
              required: "Price is required",
              min: { value: 0, message: "Price must be positive" }
            })}
            placeholder="Enter price in KES"
          />
          {errors.price && (
            <p className="text-sm text-red-500">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description", { required: "Description is required" })}
            placeholder="Describe your product"
            className="min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Select 
              onValueChange={(value) => setValue("category", value)}
              value={watch("category")}
            >
              <SelectTrigger id="category">
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
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="condition">Condition</Label>
            <Select
              onValueChange={(value) => setValue("condition", value)}
              value={watch("condition")}
            >
              <SelectTrigger id="condition">
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
              <p className="text-sm text-red-500">{errors.condition.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Product Image</Label>
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
                  Drag and drop an image, or click to browse
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={openFileBrowser}
                  className="mt-4"
                >
                  Browse Files
                </Button>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button 
            type="submit" 
            className="flex-1"
            disabled={uploading}
          >
            {uploading ? "Updating..." : "Save Changes"}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditProductForm;