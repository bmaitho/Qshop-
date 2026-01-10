import React, { useEffect, useState } from 'react';
import { User, MapPin, MessageCircle, Package, Heart, ShoppingBag, Plus, Settings, History, Save, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '../components/SupabaseClient';
import { ToastContainer, toast } from 'react-toastify';
import { productToasts, wishlistToasts } from '../utils/toastConfig';
import 'react-toastify/dist/ReactToastify.css';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';
import OrderHistory from './OrderHistory';
import MessageCenter from './MessageCenter';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [userWishlist, setUserWishlist] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSeller, setIsSeller] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    campus_location: '',
    phone: ''
  });

  useEffect(() => {
    fetchUserData();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse URL query parameters to set the active tab
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    
    if (tabParam && ['messages', 'wishlist', 'orders', 'listings', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (profileData) {
      // Set default tab based on seller status
      setActiveTab(isSeller ? 'listings' : 'wishlist');
    }
  }, [location.search, isSeller, profileData]);

  // Load appropriate data when tab changes
  useEffect(() => {
    if (!activeTab) return;
    
    if (activeTab === 'listings' && isSeller) {
      fetchUserListings();
    } else if (activeTab === 'wishlist') {
      fetchUserWishlist();
    } else if (activeTab === 'orders') {
      fetchUserOrders();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to get profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);

      // Handle case where profile might not exist yet
      let profileInfo = null;
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else if (profile && profile.length > 0) {
        // Use the first profile if multiple exist
        profileInfo = profile[0];
        setIsSeller(profileInfo.is_seller === true);
      } else {
        // No profile exists yet, create a default profile object
        profileInfo = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          campus_location: user.user_metadata?.campus_location || 'Not specified',
          phone: '',
          created_at: new Date().toISOString(),
          is_seller: user.user_metadata?.is_seller || false
        };
        
        setIsSeller(profileInfo.is_seller === true);
        
        // Optionally create a profile in the database
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([profileInfo]);
            
          if (insertError) console.error('Error creating profile:', insertError);
        } catch (insertErr) {
          console.error('Failed to create profile:', insertErr);
        }
      }

      // Get the counts regardless of whether the profile exists
      const [listingsCount, wishlistCount] = await Promise.all([
        supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('seller_id', user.id),
        supabase
          .from('wishlist')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
      ]);

      setProfileData({
        ...profileInfo,
        email: user.email,
        listings: listingsCount.count || 0,
        wishlist: wishlistCount.count || 0
      });

      // Initialize edit form with current data
      setEditForm({
        full_name: profileInfo.full_name || '',
        campus_location: profileInfo.campus_location || '',
        phone: profileInfo.phone || ''
      });
    } catch (error) {
      console.error('Error in profile data flow:', error);
      productToasts.loadError();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = async () => {
    try {
      console.log('Fetching user listings...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Listings data:', data);
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      productToasts.loadError();
    }
  };

  const fetchUserWishlist = async () => {
    try {
      console.log('Fetching wishlist items...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('Wishlist data:', data);
      setUserWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      wishlistToasts.error();
    }
  };

  const fetchUserOrders = async () => {
    try {
      console.log('Fetching orders...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Orders data:', data);
      setUserOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Validate input
      if (!editForm.full_name.trim()) {
        toast.error('Name cannot be empty');
        return;
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          campus_location: editForm.campus_location.trim(),
          phone: editForm.phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfileData(prev => ({
        ...prev,
        full_name: editForm.full_name.trim(),
        campus_location: editForm.campus_location.trim(),
        phone: editForm.phone.trim()
      }));

      toast.success('Profile updated successfully!');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="animate-pulse">
            <div className="bg-gray-200 h-32 rounded-lg mb-8"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <Navbar />
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <p className="text-center text-gray-600">
            Profile not found. Please sign in again or contact support.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={`max-w-6xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : ''}`}>
        <ToastContainer />
        
        {/* Edit Profile Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your profile information below
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="campus_location">Campus Location</Label>
                <Input
                  id="campus_location"
                  name="campus_location"
                  value={editForm.campus_location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Campus, East Campus"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., +254 700 000000"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="mb-6">
          <CardContent className={`p-4 md:p-6 ${isMobile ? 'flex flex-col items-center' : ''}`}>
            <div className={`${isMobile ? 'flex flex-col items-center text-center' : 'flex items-start gap-6'}`}>
              <div className={`${isMobile ? 'w-24 h-24 mb-4' : 'w-32 h-32'} rounded-full bg-gray-200 flex items-center justify-center`}>
                <User className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400`} />
              </div>
              <div className={`${isMobile ? 'text-center' : 'flex-1'}`}>
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-2`}>{profileData.full_name}</h1>
                <div className={`${isMobile ? 'justify-center' : ''} flex items-center gap-2 text-gray-600 mb-2`}>
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.campus_location}</span>
                </div>
                
                {profileData.phone && (
                  <div className="text-sm text-gray-600 mb-4">
                    📞 {profileData.phone}
                  </div>
                )}
                
                {/* Different profile stats based on seller status */}
                <div className={`${isMobile ? 'justify-center' : ''} flex gap-6 mb-4`}>
                  {isSeller && (
                    <div className="text-center">
                      <div className="font-bold">{profileData.listings}</div>
                      <div className="text-sm text-gray-600">Listings</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="font-bold">{profileData.wishlist}</div>
                    <div className="text-sm text-gray-600">Wishlist</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">
                      {isSeller ? "Seller" : "Buyer"}
                    </div>
                    <div className="text-sm text-gray-600">Account Type</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  Member since {new Date(profileData.created_at).toLocaleDateString()}
                </div>
                
                {/* Quick actions */}
                <div className="mt-4 space-x-2">
                  <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "default"}
                    onClick={handleEditProfile}
                  >
                    <Settings className="w-4 h-4 mr-1" /> Edit Profile
                  </Button>
                  
                  {!isSeller && (
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      Become a Seller
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Different tabs based on seller status */}
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className={`grid w-full max-w-md mx-auto ${isSeller ? 'grid-cols-4' : 'grid-cols-4'}`}>
            {isSeller ? (
              <TabsTrigger value="listings">
                <Package className="w-4 h-4 mr-2" />
                <span className={isMobile ? "text-xs" : ""}>Listings</span>
              </TabsTrigger>
            ) : (
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                <span className={isMobile ? "text-xs" : ""}>History</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="wishlist">
              <Heart className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Wishlist</span>
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageCircle className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Messages</span>
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab (Sellers only) */}
          {isSeller && (
            <TabsContent value="listings" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Listings</h2>
                <Link to="/add-product">
                  <Button size={isMobile ? "sm" : "default"}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Listing
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {userListings.length > 0 ? (
                  userListings.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="mb-4">You haven't posted any listings yet</p>
                    <Link to="/add-product">
                      <Button variant="outline" size={isMobile ? "sm" : "default"}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          {/* Wishlist Tab (Both sellers and buyers) */}
          <TabsContent value="wishlist" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Wishlist</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {userWishlist.length > 0 ? (
                userWishlist.map(item => (
                  <ProductCard key={item.product_id} product={item.products} />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="mb-4">You haven't added any items to your wishlist yet</p>
                  <Link to="/studentmarketplace">
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Products
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Messages</h2>
            <MessageCenter />
          </TabsContent>
          
          {/* Orders Tab (Both sellers and buyers) */}
          <TabsContent value="orders" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Orders</h2>
            <OrderHistory />
          </TabsContent>
          
          {/* History Tab (Buyers only) */}
          {!isSeller && (
            <TabsContent value="history" className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Browsing History</h2>
              
              <div className="col-span-full text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Your browsing history will appear here</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
};

export default Profile;