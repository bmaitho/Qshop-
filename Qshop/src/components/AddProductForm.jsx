import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus, Camera, X, Upload, Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shopToasts } from '../utils/toastConfig';
import { supabase } from '../components/SupabaseClient';

const NewCategoryDialog = ({ open, onClose, onSubmit }) => {
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const handleSubmit = () => {
    onSubmit(newCategory);
    setNewCategory({ name: '', description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest New Category</DialogTitle>
          <DialogDescription>
            Your suggestion will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter category name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryDescription">Description (Optional)</Label>
            <Textarea
              id="categoryDescription"
              value={newCategory.description}
              onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this category"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AddProductForm({ onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
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
      shopToasts.error('Failed to load categories');
    }
  };

  const handleNewCategory = async (categoryData) => {
    try {
      if (!categoryData.name.trim()) {
        shopToasts.error('Category name is required');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryData.name.trim(),
          description: categoryData.description.trim(),
          created_by: user.id,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      shopToasts.success('Category suggestion submitted for approval');
      setShowNewCategoryDialog(false);
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error('Error adding category:', error);
      shopToasts.error('Failed to add category');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        shopToasts.error('Please upload an image file');
        return;
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
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
        handleFileChange({ target: { files } });
      } else {
        shopToasts.error('Please upload an image file');
      }
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

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
        shopToasts.error('Please sign in to add products');
        return;
      }

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
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
        image_url: imageUrl,
        seller_id: user.id,
        status: 'active',
        location: profile?.campus_location || 'Unknown'
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;

      shopToasts.success('Product added successfully');
      reset();
      setImageFile(null);
      setPreviewUrl(null);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding product:', error);
      shopToasts.error('Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative max-h-[80vh] overflow-y-auto p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Product name is required" })}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
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
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description", { required: "Description is required" })}
            placeholder="Describe your product"
            className="min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Category and Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex gap-2">
              <Select 
                onValueChange={(value) => setValue("category", value)}
                value={watch("category")}
              >
                <SelectTrigger id="category" className="flex-1">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
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
                size="icon"
                onClick={() => setShowNewCategoryDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={watch("condition")}
              onValueChange={(value) => setValue("condition", value)}
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
              <p className="text-sm text-destructive">{errors.condition.message}</p>
            )}
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Product Image</Label>
          <div
            className={`border-2 ${
              isDragging 
                ? 'border-ring bg-ring/5' 
                : previewUrl 
                  ? 'border-ring/50' 
                  : 'border-dashed border-input'
            } rounded-lg transition-colors ${!previewUrl ? 'p-6' : 'p-2'}`}
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
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop an image, or use the options below
                </p>
                <div className="flex justify-center mt-4 space-x-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
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
              </div>
            )}
            
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
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-secondary text-primary hover:bg-secondary/90"
          disabled={uploading}
        >
          {uploading ? "Adding Product..." : "Add Product"}
        </Button>
      </form>

      {/* New Category Dialog */}
      <NewCategoryDialog
        open={showNewCategoryDialog}
        onClose={() => setShowNewCategoryDialog(false)}
        onSubmit={handleNewCategory}
      />
    </div>
  );
}