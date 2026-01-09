import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { Store, ImagePlus, Camera, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { shopToasts } from '../utils/toastConfig';
import { supabase } from './SupabaseClient';

const ShopSettingsForm = ({ shopData, onUpdate, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bannerDeleted, setBannerDeleted] = useState(false); // Track if banner was deleted
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      shopName: shopData?.shop_name || '',
      description: shopData?.description || '',
      businessHours: shopData?.business_hours ? JSON.stringify(shopData.business_hours) : '',
      policies: shopData?.policies || '',
      offersDelivery: shopData?.offers_delivery || false
    }
  });

  // Check for mobile screen on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use effect to set banner image preview if it exists
  useEffect(() => {
    if (shopData?.banner_url) {
      setPreviewUrl(shopData.banner_url);
    }
  }, [shopData]);

  // Handle file selection for banner image
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
      setBannerDeleted(false); // Reset deletion flag when new image is selected
    }
  };

  // Handle drag events for image upload
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
        setBannerDeleted(false); // Reset deletion flag
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
    setPreviewUrl(null);
    setBannerDeleted(true); // Mark banner as deleted
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload banner image to Supabase
  const uploadBannerImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `shop_banner_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shop-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop-banners')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading banner image:', error);
      throw error;
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        shopToasts.updateError();
        return;
      }

      // Determine banner URL based on user actions
      let bannerUrl = shopData?.banner_url;
      
      if (imageFile) {
        // User selected a new image
        bannerUrl = await uploadBannerImage(imageFile);
      } else if (bannerDeleted) {
        // User deleted the banner
        bannerUrl = null;
      }
      // Otherwise keep existing banner_url

      // Parse business hours if provided as string
      let businessHours = data.businessHours;
      if (typeof businessHours === 'string') {
        try {
          businessHours = JSON.parse(businessHours);
        } catch (e) {
          // If not valid JSON, store as is
          businessHours = data.businessHours;
        }
      }

      const shopInfo = {
        id: user.id,
        shop_name: data.shopName,
        description: data.description,
        business_hours: businessHours,
        policies: data.policies,
        banner_url: bannerUrl,
        offers_delivery: data.offersDelivery,
        updated_at: new Date().toISOString()
      };

      // If it's a new shop, add created_at
      if (!shopData) {
        shopInfo.created_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shops')
        .upsert([shopInfo]);

      if (error) throw error;

      shopToasts.updateSuccess();
      
      // Reset deletion flag after successful update
      setBannerDeleted(false);
      
      onUpdate?.();
    } catch (error) {
      console.error('Error updating shop:', error);
      shopToasts.updateError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Main content area with proper padding */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20"> 
        <form id="shop-settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              {...register("shopName", { required: "Shop name is required" })}
              placeholder="Enter your shop name"
            />
            {errors.shopName && (
              <p className="text-sm text-red-500">{errors.shopName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Shop Banner</Label>
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
                    alt="Shop banner preview" 
                    className="w-full h-40 object-cover rounded"
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
                    Drag and drop a banner image, or click to browse
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

          <div className="space-y-2">
            <Label htmlFor="description">Shop Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe your shop"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policies">Shop Policies</Label>
            <Textarea
              id="policies"
              {...register("policies")}
              placeholder="Return policy, delivery information, etc."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="offersDelivery" 
              {...register("offersDelivery")}
              defaultChecked={shopData?.offers_delivery}
            />
            <Label htmlFor="offersDelivery">Offers Delivery</Label>
          </div>
          
          {/* Form buttons visible on mobile */}
          <div className="pt-8 pb-20 flex gap-3">
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
              form="shop-settings-form"
              type="submit" 
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Updating..." : shopData ? "Update Shop" : "Create Shop"}
            </Button>
          </div>
        </form>
      </div>

      {/* Fixed footer with buttons - only visible on desktop */}
      {!isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-md hidden md:block">
          <div className="flex gap-3 max-w-screen-md mx-auto">
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
              form="shop-settings-form"
              type="submit" 
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Updating..." : shopData ? "Update Shop" : "Create Shop"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopSettingsForm;