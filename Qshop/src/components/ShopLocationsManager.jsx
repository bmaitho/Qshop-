// ========================================
// SHOP LOCATIONS MANAGEMENT COMPONENT
// FIXED VERSION - Compatible with campus_locations table
// Add to MyShop.jsx as a new tab
// ========================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Building } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';

const ShopLocationsManager = () => {
  const [shopLocations, setShopLocations] = useState([]);
  const [campusLocations, setCampusLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    shop_name: '',
    physical_address: '',
    campus_id: null,
    is_primary: false
  });

  useEffect(() => {
    fetchShopLocations();
    fetchCampusLocations();
  }, []);

  const fetchShopLocations = async () => {
    try {
      setLoading(true);
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
      toast.error('Failed to load shop locations');
    } finally {
      setLoading(false);
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

  const handleOpenDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        shop_name: location.shop_name,
        physical_address: location.physical_address,
        campus_id: location.campus_id,
        is_primary: location.is_primary
      });
    } else {
      setEditingLocation(null);
      setFormData({
        shop_name: '',
        physical_address: '',
        campus_id: null,
        is_primary: shopLocations.length === 0 // First location is primary
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      shop_name: '',
      physical_address: '',
      campus_id: null,
      is_primary: false
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.shop_name.trim() || !formData.physical_address.trim()) {
        toast.error('Shop name and address are required');
        return;
      }

      // Max 2 locations
      if (!editingLocation && shopLocations.length >= 2) {
        toast.error('Maximum 2 shop locations allowed');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingLocation) {
        // Update existing
        const { error } = await supabase
          .from('seller_shop_locations')
          .update({
            shop_name: formData.shop_name.trim(),
            physical_address: formData.physical_address.trim(),
            campus_id: formData.campus_id,
            is_primary: formData.is_primary,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast.success('Shop location updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('seller_shop_locations')
          .insert([{
            seller_id: user.id,
            shop_name: formData.shop_name.trim(),
            physical_address: formData.physical_address.trim(),
            campus_id: formData.campus_id,
            is_primary: formData.is_primary || shopLocations.length === 0
          }]);

        if (error) throw error;
        toast.success('Shop location added successfully');

        // Update profile if this is first shop
        if (shopLocations.length === 0) {
          await supabase
            .from('profiles')
            .update({ has_physical_shop: true })
            .eq('id', user.id);
        }
      }

      handleCloseDialog();
      fetchShopLocations();
    } catch (error) {
      console.error('Error saving shop location:', error);
      toast.error('Failed to save shop location');
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this shop location?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('seller_shop_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Shop location deleted');
      fetchShopLocations();

      // Update profile if no shops left
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

      // Unset all primary flags
      await supabase
        .from('seller_shop_locations')
        .update({ is_primary: false })
        .eq('seller_id', user.id);

      // Set this one as primary
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

  if (loading) {
    return <div className="p-8 text-center">Loading shop locations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shop Locations</h2>
          <p className="text-gray-600">Manage your physical shop locations (max 2)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              disabled={shopLocations.length >= 2}
              className="bg-green-600 hover:bg-green-700"
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
                  value={formData.shop_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shop_name: e.target.value
                  }))}
                />
              </div>

              <div>
                <Label>Physical Address/Landmark *</Label>
                <Input
                  placeholder="e.g., KU Main Gate, Shop 12"
                  value={formData.physical_address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical_address: e.target.value
                  }))}
                />
              </div>

              <div>
                <Label>Campus Location</Label>
                <select
                  value={formData.campus_id || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    campus_id: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full p-2 border rounded"
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
                    checked={formData.is_primary}
                    onChange={(e) => setFormData(prev => ({
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
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-green-600">
                {editingLocation ? 'Update' : 'Add'} Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {shopLocations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shop locations yet</h3>
            <p className="text-gray-600 mb-4">
              Add your physical shop locations to offer more delivery options
            </p>
            <Button onClick={() => handleOpenDialog()} className="bg-green-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shopLocations.map(location => (
            <Card key={location.id} className="relative">
              {location.is_primary && (
                <div className="absolute top-2 right-2">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    Primary
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-green-600" />
                  {location.shop_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-400" />
                    <span className="text-sm">{location.physical_address}</span>
                  </div>
                  {location.campus_locations && (
                    <div className="text-sm text-gray-600">
                      📍 {location.campus_locations.name}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {!location.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetPrimary(location.id)}
                    >
                      Set as Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(location)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopLocationsManager;

