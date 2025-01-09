// AddProductForm.jsx
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { ImagePlus } from 'lucide-react';
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
import { supabase } from './SupabaseClient';

const AddProductForm = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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
      
      // Upload image if provided
      let imageUrl = null;
      if (data.image?.[0]) {
        imageUrl = await uploadImage(data.image[0]);
      }

      // Get user's campus location
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
        location: profile.campus_location
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;

      shopToasts.addProductSuccess();
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error adding product:', error);
      shopToasts.addProductError();
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
      <div>
        <Input
          {...register("name", { required: "Product name is required" })}
          placeholder="Product Name"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Input
          type="number"
          {...register("price", { 
            required: "Price is required",
            min: { value: 0, message: "Price must be positive" }
          })}
          placeholder="Price (KES)"
        />
        {errors.price && (
          <p className="text-sm text-red-500">{errors.price.message}</p>
        )}
      </div>

      <div>
        <Textarea
          {...register("description", { required: "Description is required" })}
          placeholder="Product Description"
          className="min-h-[100px]"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Select 
          onValueChange={(value) => register("category").onChange({ target: { value } })}
        >
          <SelectTrigger>
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

      <div>
        <Select
          onValueChange={(value) => register("condition").onChange({ target: { value } })}
        >
          <SelectTrigger>
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

      <div>
        <label htmlFor="image" className="block w-full cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
            <span className="mt-2 block text-sm text-gray-600">
              Upload Product Image
            </span>
          </div>
          <Input
            id="image"
            type="file"
            accept="image/*"
            className="hidden"
            {...register("image")}
          />
        </label>
        {errors.image && (
          <p className="text-sm text-red-500">{errors.image.message}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={uploading}
      >
        {uploading ? "Adding Product..." : "Add Product"}
      </Button>
    </form>
  );
};

export default AddProductForm;