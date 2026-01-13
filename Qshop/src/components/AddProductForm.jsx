import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, Upload, Plus, GripVertical } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
      console.error('Failed to load categories');
    }
  };

  const handleNewCategory = async (categoryData) => {
    try {
      if (!categoryData.name.trim()) {
        shopToasts.error('Category name is required');
        return;
      }
  
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        shopToasts.error('Please sign in to add categories');
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
        shopToasts.error('Failed to add category');
        return;
      }
  
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === tempId ? data : cat
        )
      );
      
      setValue("category", data.id);
      console.log('Category added successfully');
      shopToasts.success('New category added');
      
    } catch (error) {
      console.error('Error adding category:', error);
      shopToasts.error('Failed to add category');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validImageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validImageFiles.length !== files.length) {
      console.error('Please upload image files only');
    }

    if (validImageFiles.length === 0) return;

    const remainingSlots = 8 - previewUrls.length;
    if (validImageFiles.length > remainingSlots) {
      console.log(`Maximum 8 images allowed. Only adding first ${remainingSlots} images.`);
      validImageFiles.splice(remainingSlots);
    }

    const newPreviews = validImageFiles.map(file => URL.createObjectURL(file));
    
    setImageFiles(prev => [...prev, ...validImageFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...imageFiles];
    const newPreviews = [...previewUrls];
    
    const draggedFile = newFiles[draggedIndex];
    const draggedPreview = newPreviews[draggedIndex];
    
    newFiles.splice(draggedIndex, 1);
    newPreviews.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    newPreviews.splice(index, 0, draggedPreview);
    
    setImageFiles(newFiles);
    setPreviewUrls(newPreviews);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

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

  const handleDragOverZone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];
    
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
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Please sign in to add products');
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
        location: profile?.campus_location || 'Unknown'
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

      console.log('Product added successfully');
      reset();
      setImageFiles([]);
      setPreviewUrls([]);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding product:', error);
      console.error('Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Mobile sticky button at top - always visible */}
      <div className="md:hidden sticky top-0 left-0 right-0 p-4 bg-background border-b shadow-sm z-50 mb-4">
        <Button 
          onClick={handleSubmit(onSubmit)}
          className="w-full bg-secondary text-primary hover:bg-secondary/90 py-3 text-base font-medium"
          disabled={uploading}
        >
          {uploading ? "Adding Product..." : "Add Product"}
        </Button>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 py-0 md:py-6 md:px-6 overflow-y-auto" style={{ maxHeight: '85vh' }}>
        <div className="space-y-4">
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <div className="flex gap-2">
                <Select 
                  onValueChange={(value) => setValue("category", value)}
                  value={watch("category")}
                >
                  <SelectTrigger id="category" className="flex-1">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCategoryDialog(true)}
                  className="flex-shrink-0 h-10 px-3 rounded-md"
                  aria-label="Add new category"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition" className="text-sm font-medium">Condition</Label>
              <Select
                value={watch("condition")}
                onValueChange={(value) => setValue("condition", value)}
              >
                <SelectTrigger id="condition" className="w-full">
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
                <p className="text-sm text-destructive">{errors.condition.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Product Images {previewUrls.length > 0 && `(${previewUrls.length}/8)`}
            </Label>
            
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group cursor-move rounded-lg overflow-hidden border-2 ${
                      index === 0 ? 'border-secondary' : 'border-border'
                    } ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    <div className="aspect-square">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-secondary text-primary text-xs px-2 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                    
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <GripVertical className="h-3 w-3" />
                      Drag
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`border-2 ${
                isDragging 
                  ? 'border-ring bg-ring/5' 
                  : previewUrls.length > 0
                    ? 'border-ring/50' 
                    : 'border-dashed border-input'
              } rounded-lg transition-colors ${previewUrls.length === 0 ? 'p-4 md:p-6' : 'p-4'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOverZone}
              onDrop={handleDrop}
            >
              {previewUrls.length < 8 && (
                <div className="text-center">
                  <ImagePlus className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {previewUrls.length === 0 
                      ? 'Drag and drop images, or use the options below'
                      : 'Add more images (drag to reorder)'}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center mt-4 space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                </div>
              )}
              
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
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {previewUrls.length > 0 && (
              <p className="text-xs text-muted-foreground">
                First image will be the primary image. Drag to reorder.
              </p>
            )}
          </div>

          {/* Desktop button - inline with form */}
          <div className="hidden md:block">
            <Button 
              onClick={handleSubmit(onSubmit)}
              className="w-full bg-secondary text-primary hover:bg-secondary/90 py-4 mt-6 text-base font-medium"
              disabled={uploading}
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