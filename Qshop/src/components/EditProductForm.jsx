import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, PackageOpen, MapPin } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from 'react-toastify';
import { supabase } from './SupabaseClient';

const EditProductForm = ({ product, onSuccess, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(product?.image_url || null);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState([]);

  // Local state for selects (avoids watch() infinite loop issues)
  const [selectedCategory, setSelectedCategory] = useState(product?.category || '');
  const [selectedCondition, setSelectedCondition] = useState(() => {
    const conditionMap = {
      'New': 'new',
      'Used - Like New': 'like_new',
      'Used - Good': 'good',
      'Used - Fair': 'fair'
    };
    return conditionMap[product?.condition] || 'new';
  });

  // Shop locations state
  const [shopLocations, setShopLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const fileInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: product?.name || '',
      price: product?.price || '',
      description: product?.description || ''
    }
  });

  useEffect(() => {
    fetchCategories();
    fetchShopLocations();
    fetchProductLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchShopLocations = async () => {
    try {
      setLoadingLocations(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('seller_shop_locations')
        .select('*')
        .eq('seller_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setShopLocations(data || []);
    } catch (error) {
      console.error('Error fetching shop locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchProductLocations = async () => {
    try {
      if (!product?.id) return;

      const { data, error } = await supabase
        .from('product_shop_locations')
        .select('shop_location_id')
        .eq('product_id', product.id);

      if (error) throw error;
      
      const locationIds = data.map(item => item.shop_location_id);
      setSelectedLocations(locationIds);
    } catch (error) {
      console.error('Error fetching product locations:', error);
    }
  };

  const handleLocationToggle = (locationId) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
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
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
      // Validate category
      if (!selectedCategory) {
        toast.error('Please select a category');
        return;
      }

      // Validate locations selected (only if locations exist)
      if (shopLocations.length > 0 && selectedLocations.length === 0) {
        toast.error('Please select at least one location for this product');
        return;
      }

      setUploading(true);

      let imageUrl = product.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

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
        category: selectedCategory,
        condition: conditionMap[selectedCondition] || selectedCondition,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);

      if (error) throw error;

      // Update product locations
      // First, delete existing locations
      await supabase
        .from('product_shop_locations')
        .delete()
        .eq('product_id', product.id);

      // Then insert new locations
      const locationRecords = selectedLocations.map(locationId => ({
        product_id: product.id,
        shop_location_id: locationId
      }));

      const { error: locationsError } = await supabase
        .from('product_shop_locations')
        .insert(locationRecords);

      if (locationsError) {
        console.error('Error updating product locations:', locationsError);
        toast.error('Product updated but failed to save locations');
      }

      toast.success('Product updated successfully');
      onSuccess?.({ ...product, ...productData });
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <form id="edit-product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="edit-name">Product Name</Label>
          <Input
            id="edit-name"
            {...register("name", { required: "Product name is required" })}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="edit-price">Price (KES)</Label>
          <Input
            id="edit-price"
            type="number"
            {...register("price", { 
              required: "Price is required",
              min: { value: 0, message: "Price must be positive" }
            })}
            placeholder="Enter price"
          />
          {errors.price && (
            <p className="text-sm text-red-500">{errors.price.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            {...register("description", { required: "Description is required" })}
            placeholder="Describe your product"
            className="min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length > 0 ? (
                categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>Loading categories...</SelectItem>
              )}
            </SelectContent>
          </Select>
          {!selectedCategory && (
            <p className="text-sm text-red-500">Category is required</p>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label>Condition</Label>
          <Select
            value={selectedCondition}
            onValueChange={setSelectedCondition}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="like_new">Used - Like New</SelectItem>
              <SelectItem value="good">Used - Good</SelectItem>
              <SelectItem value="fair">Used - Fair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SHOP LOCATIONS SELECTOR */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Available Locations *
          </Label>
          <p className="text-xs text-gray-600">
            Select where buyers can pick up this product
          </p>
          
          {loadingLocations ? (
            <div className="p-4 text-center text-gray-500">
              Loading locations...
            </div>
          ) : shopLocations.length === 0 ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You need to set up shop locations first. Go to "Customize Shop" to add locations.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {shopLocations.map(location => (
                <label
                  key={location.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors block ${
                    selectedLocations.includes(location.id)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{location.shop_name}</h4>
                        {location.is_primary && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {location.physical_address}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          
          {selectedLocations.length === 0 && shopLocations.length > 0 && (
            <p className="text-sm text-red-500">Please select at least one location</p>
          )}
        </div>

        {/* Product Image */}
        <div className="space-y-2">
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
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop an image here, or click to select
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Select Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        </form>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex gap-3 p-4 border-t bg-white dark:bg-gray-900">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          form="edit-product-form"
          className="flex-1"
          disabled={uploading || !selectedCategory || (shopLocations.length > 0 && selectedLocations.length === 0)}
        >
          {uploading ? "Updating..." : "Update Product"}
        </Button>
      </div>
    </div>
  );
};

export default EditProductForm;