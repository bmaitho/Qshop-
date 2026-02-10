import React, { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { Store, ImagePlus, Camera, X, Plus, Edit, Trash2, MapPin, Building, Star } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shopToasts } from '../utils/toastConfig';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';

const ShopSettingsForm = ({ shopData, onUpdate, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bannerDeleted, setBannerDeleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef(null);

  // Shop locations state
  const [shopLocations, setShopLocations] = useState([]);
  const [campusLocations, setCampusLocations] = useState([]);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationFormData, setLocationFormData] = useState({
    shop_name: '',
    physical_address: '',
    campus_id: null,
    is_primary: false
  });

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      shopName: shopData?.shop_name || '',
      description: shopData?.description || '',
      businessHours: shopData?.business_hours ? JSON.stringify(shopData.business_hours) : '',
      policies: shopData?.policies || '',
      offersDelivery: shopData?.offers_delivery || false
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (shopData?.banner_url) {
      setPreviewUrl(shopData.banner_url);
    }
    // Fetch shop locations and campus locations
    fetchShopLocations();
    fetchCampusLocations();
  }, [shopData]);

  const fetchShopLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('seller_shop_locations')
        .select(`
          *,
          campus_locations:campus_id(name)
        `)
        .eq('seller_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShopLocations(data || []);
    } catch (error) {
      console.error('Error fetching shop locations:', error);
    }
  };

  const fetchCampusLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('campus_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setCampusLocations(data || []);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const handleOpenLocationDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setLocationFormData({
        shop_name: location.shop_name,
        physical_address: location.physical_address,
        campus_id: location.campus_id,
        is_primary: location.is_primary
      });
    } else {
      setEditingLocation(null);
      setLocationFormData({
        shop_name: '',
        physical_address: '',
        campus_id: null,
        is_primary: shopLocations.length === 0
      });
    }
    setLocationDialogOpen(true);
  };

  const handleCloseLocationDialog = () => {
    setLocationDialogOpen(false);
    setEditingLocation(null);
    setLocationFormData({
      shop_name: '',
      physical_address: '',
      campus_id: null,
      is_primary: false
    });
  };

  const handleSaveLocation = async () => {
    try {
      if (!locationFormData.shop_name.trim() || !locationFormData.physical_address.trim()) {
        toast.error('Shop name and address are required');
        return;
      }

      if (!editingLocation && shopLocations.length >= 2) {
        toast.error('Maximum 2 shop locations allowed');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingLocation) {
        const { error } = await supabase
          .from('seller_shop_locations')
          .update({
            shop_name: locationFormData.shop_name.trim(),
            physical_address: locationFormData.physical_address.trim(),
            campus_id: locationFormData.campus_id,
            is_primary: locationFormData.is_primary,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast.success('Shop location updated successfully');
      } else {
        const { error } = await supabase
          .from('seller_shop_locations')
          .insert([{
            seller_id: user.id,
            shop_name: locationFormData.shop_name.trim(),
            physical_address: locationFormData.physical_address.trim(),
            campus_id: locationFormData.campus_id,
            is_primary: locationFormData.is_primary || shopLocations.length === 0
          }]);

        if (error) throw error;
        toast.success('Shop location added successfully');

        if (shopLocations.length === 0) {
          await supabase
            .from('profiles')
            .update({ has_physical_shop: true })
            .eq('id', user.id);
        }
      }

      handleCloseLocationDialog();
      fetchShopLocations();
    } catch (error) {
      console.error('Error saving shop location:', error);
      toast.error('Failed to save shop location');
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this shop location?')) return;

    try {
      const { error } = await supabase
        .from('seller_shop_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Shop location deleted');
      fetchShopLocations();

      if (shopLocations.length === 1) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('profiles')
          .update({ 
            has_physical_shop: false,
            shop_and_campus: false 
          })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error deleting shop location:', error);
      toast.error('Failed to delete shop location');
    }
  };

  const handleSetPrimary = async (locationId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('seller_shop_locations')
        .update({ is_primary: false })
        .eq('seller_id', user.id);

      const { error } = await supabase
        .from('seller_shop_locations')
        .update({ is_primary: true })
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Primary shop location updated');
      fetchShopLocations();
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('Failed to update primary location');
    }
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
      setBannerDeleted(false);
    }
  };

  const handleRemoveBanner = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setBannerDeleted(true);
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
      setBannerDeleted(false);
    }
  };

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

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        shopToasts.updateError();
        return;
      }

      let bannerUrl = shopData?.banner_url;
      
      if (imageFile) {
        bannerUrl = await uploadBannerImage(imageFile);
      } else if (bannerDeleted) {
        bannerUrl = null;
      }

      let businessHours = data.businessHours;
      if (typeof businessHours === 'string') {
        try {
          businessHours = JSON.parse(businessHours);
        } catch (e) {
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

      if (!shopData) {
        shopInfo.created_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shops')
        .upsert([shopInfo]);

      if (error) throw error;

      shopToasts.updateSuccess();
      setBannerDeleted(false);
      onUpdate?.(shopInfo);
    } catch (error) {
      console.error('Error updating shop:', error);
      shopToasts.updateError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20"> 
        <form id="shop-settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Shop Name */}
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

          {/* Shop Banner */}
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
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveBanner}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Tell customers about your shop..."
              className="min-h-[80px]"
            />
          </div>

          {/* Policies */}
          <div className="space-y-2">
            <Label htmlFor="policies">Shop Policies</Label>
            <Textarea
              id="policies"
              {...register("policies")}
              placeholder="Returns, warranties, shipping policies..."
              className="min-h-[80px]"
            />
          </div>

          {/* Offers Delivery */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="offersDelivery" 
              {...register("offersDelivery")}
              defaultChecked={shopData?.offers_delivery}
            />
            <Label htmlFor="offersDelivery">Offers Delivery</Label>
          </div>

          {/* SHOP LOCATIONS SECTION */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Shop Locations
                </h3>
                <p className="text-sm text-gray-600">Manage your physical shop locations (max 2)</p>
              </div>
              <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => handleOpenLocationDialog()}
                    disabled={shopLocations.length >= 2}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocation ? 'Edit Shop Location' : 'Add Shop Location'}
                    </DialogTitle>
                    <DialogDescription>
                      Add a physical shop where buyers can pick up orders
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Shop Name *</Label>
                      <Input
                        placeholder="e.g., Tulley's Electronics"
                        value={locationFormData.shop_name}
                        onChange={(e) => setLocationFormData(prev => ({
                          ...prev,
                          shop_name: e.target.value
                        }))}
                      />
                    </div>

                    <div>
                      <Label>Physical Address/Landmark *</Label>
                      <Input
                        placeholder="e.g., KU Main Gate, Shop 12"
                        value={locationFormData.physical_address}
                        onChange={(e) => setLocationFormData(prev => ({
                          ...prev,
                          physical_address: e.target.value
                        }))}
                      />
                    </div>

                    <div>
                      <Label>Campus Location</Label>
                      <select
                        value={locationFormData.campus_id || ''}
                        onChange={(e) => setLocationFormData(prev => ({
                          ...prev,
                          campus_id: e.target.value ? parseInt(e.target.value) : null
                        }))}
                        className="w-full p-2 border rounded bg-background text-foreground dark:bg-gray-800 dark:border-gray-600"
                      >
                        <option value="">Select campus (optional)</option>
                        {campusLocations.map(campus => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {shopLocations.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_primary"
                          checked={locationFormData.is_primary}
                          onChange={(e) => setLocationFormData(prev => ({
                            ...prev,
                            is_primary: e.target.checked
                          }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="is_primary">Set as primary location</Label>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseLocationDialog}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleSaveLocation} className="bg-green-600">
                      {editingLocation ? 'Update' : 'Add'} Location
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Locations List */}
            {shopLocations.length === 0 ? (
              <Card className="bg-gray-50 dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <Building className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    No shop locations yet. Add locations where buyers can pick up products.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {shopLocations.map(location => (
                  <Card key={location.id} className={location.is_primary ? 'border-green-500 border-2' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{location.shop_name}</h4>
                            {location.is_primary && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location.physical_address}
                          </p>
                          {location.campus_locations?.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              {location.campus_locations.name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!location.is_primary && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetPrimary(location.id)}
                              title="Set as primary"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLocationDialog(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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