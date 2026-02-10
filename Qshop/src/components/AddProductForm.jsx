import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, Upload, Plus, GripVertical, MapPin } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shopToasts } from '@/utils/toastConfig';
import { supabase } from '../components/SupabaseClient';

const NewCategoryDialog = ({ open, onClose, onSubmit }) => {
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const handleSubmit = () => {
    onSubmit(newCategory);
    setNewCategory({ name: '', description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Suggest New Category</DialogTitle>
          <DialogDescription>
            Your suggestion will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category Name</Label>
            <Input
              placeholder="Enter category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Describe this category"
              value={newCategory.description}
              onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter className="flex sm:flex-row gap-2 mt-4 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1 bg-secondary text-primary">Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddProductForm = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Shop locations state
  const [shopLocations, setShopLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      category: '',
      condition: 'new',
    }
  });

  useEffect(() => {
    fetchCategories();
    fetchShopLocations();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    register("category", { required: "Category is required" });
    register("condition", { required: "Condition is required" });
  }, [register]);

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
      
      // Auto-select primary location or first location as default
      if (data && data.length > 0) {
        const defaultLocation = data.find(loc => loc.is_primary) || data[0];
        setSelectedLocations([defaultLocation.id]);
      }
    } catch (error) {
      console.error('Error fetching shop locations:', error);
      toast.error('Failed to load shop locations');
    } finally {
      setLoadingLocations(false);
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

  const handleNewCategory = async (categoryData) => {
    try {
      if (!categoryData.name.trim()) {
        toast.error('Category name is required');
        return;
      }
  
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to add categories');
        return;
      }
  
      const tempId = `temp_${Date.now()}`;
      
      const newTempCategory = {
        id: tempId,
        name: categoryData.name.trim(),
        description: categoryData.description.trim(),
        status: 'pending'
      };
      
      setCategories(prevCategories => [...prevCategories, newTempCategory]);
      setValue("category", tempId);
      setShowNewCategoryDialog(false);
  
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryData.name.trim(),
          description: categoryData.description.trim(),
          created_by: user.id,
          status: 'approved'
        }])
        .select()
        .single();
  
      if (error) {
        console.error('Error adding category:', error);
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== tempId));
        toast.error('Failed to add category');
        return;
      }
  
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === tempId ? data : cat
        )
      );
      
      setValue("category", data.id);
      toast.success('Category added successfully');
      
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleCameraCapture = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files) => {
    if (imageFiles.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    setImageFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const newFiles = [...imageFiles];
    const newPreviews = [...previewUrls];
    
    const [draggedFile] = newFiles.splice(draggedIndex, 1);
    const [draggedPreview] = newPreviews.splice(draggedIndex, 1);
    
    newFiles.splice(dropIndex, 0, draggedFile);
    newPreviews.splice(dropIndex, 0, draggedPreview);
    
    setImageFiles(newFiles);
    setPreviewUrls(newPreviews);
    setDraggedIndex(null);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const uploadImages = async () => {
    try {
      const uploadPromises = imageFiles.map(async (file, index) => {
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

        return {
          url: publicUrl,
          order: index,
          isPrimary: index === 0
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  };

  const onSubmit = async (data) => {
    try {
      // Validate locations selected
      if (selectedLocations.length === 0) {
        toast.error('Please select at least one location for this product');
        return;
      }

      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to add products');
        return;
      }

      let uploadedImages = [];
      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages();
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('campus_location')
        .eq('id', user.id)
        .single();

      const productData = {
        name: data.name,
        price: parseFloat(data.price),
        description: data.description,
        category: data.category,
        condition: data.condition,
        image_url: uploadedImages.length > 0 ? uploadedImages[0].url : null,
        seller_id: user.id,
        status: 'active',
        location: profile?.campus_location || 'Unknown' // Keep for backward compatibility
      };

      const { data: product, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      // Insert multiple images into product_images table
      if (uploadedImages.length > 0) {
        const imageRecords = uploadedImages.map(img => ({
          product_id: product.id,
          image_url: img.url,
          display_order: img.order,
          is_primary: img.isPrimary
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageRecords);

        if (imagesError) {
          console.error('Error saving images:', imagesError);
        }
      }

      // Insert product-location relationships
      const locationRecords = selectedLocations.map(locationId => ({
        product_id: product.id,
        shop_location_id: locationId
      }));

      const { error: locationsError } = await supabase
        .from('product_shop_locations')
        .insert(locationRecords);

      if (locationsError) {
        console.error('Error saving product locations:', locationsError);
        toast.error('Product created but failed to save locations');
      }

      toast.success('Product added successfully');
      reset();
      setImageFiles([]);
      setPreviewUrls([]);
      setSelectedLocations(shopLocations.length > 0 ? [shopLocations[0].id] : []);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Mobile sticky button at top */}
      <div className="md:hidden sticky top-0 left-0 right-0 p-4 bg-background border-b shadow-sm z-50 mb-4">
        <Button 
          onClick={handleSubmit(onSubmit)}
          className="w-full bg-secondary text-primary hover:bg-secondary/90 py-3 text-base font-medium"
          disabled={uploading}
        >
          {uploading ? "Adding Product..." : "Add Product"}
        </Button>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 py-0 md:py-6 md:px-6 overflow-y-auto pb-48 md:pb-8" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        <div className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Product Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Product name is required" })}
              placeholder="Enter product name"
              className="w-full"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">Price (KES)</Label>
            <Input
              id="price"
              type="number"
              {...register("price", { 
                required: "Price is required",
                min: { value: 0, message: "Price must be positive" }
              })}
              placeholder="Enter price in KES"
              className="w-full"
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              {...register("description", { required: "Description is required" })}
              placeholder="Describe your product"
              className="min-h-[100px] w-full"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Category</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowNewCategoryDialog(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Suggest Category
              </Button>
            </div>
            <Select
              value={watch("category")}
              onValueChange={(value) => setValue("category", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Condition</Label>
            <Select
              value={watch("condition")}
              onValueChange={(value) => setValue("condition", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="like_new">Used - Like New</SelectItem>
                <SelectItem value="good">Used - Good</SelectItem>
                <SelectItem value="fair">Used - Fair</SelectItem>
              </SelectContent>
            </Select>
            {errors.condition && (
              <p className="text-sm text-destructive">{errors.condition.message}</p>
            )}
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
                  <div
                    key={location.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLocations.includes(location.id)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => handleLocationToggle(location.id)}
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
                  </div>
                ))}
              </div>
            )}
            
            {selectedLocations.length === 0 && shopLocations.length > 0 && (
              <p className="text-sm text-red-500">Please select at least one location</p>
            )}
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Product Images (Max 5)</Label>
            <div
              className={`border-2 ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDropZone}
            >
              {previewUrls.length === 0 ? (
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop images here, or
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="relative group cursor-move"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  ))}
                  {previewUrls.length < 5 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {previewUrls.length > 0 && (
              <p className="text-xs text-gray-500">
                First image is the primary. Drag to reorder.
              </p>
            )}
          </div>

          {/* Desktop button */}
          <div className="hidden md:block">
            <Button 
              onClick={handleSubmit(onSubmit)}
              className="w-full bg-secondary text-primary hover:bg-secondary/90 py-4 mt-6 text-base font-medium"
              disabled={uploading || (shopLocations.length > 0 && selectedLocations.length === 0)}
            >
              {uploading ? "Adding Product..." : "Add Product"}
            </Button>
          </div>
        </div>

        <NewCategoryDialog
          open={showNewCategoryDialog}
          onClose={() => setShowNewCategoryDialog(false)}
          onSubmit={handleNewCategory}
        />
      </div>
    </div>
  );
}

export default AddProductForm;