import React, { useEffect, useState } from 'react';
import { User, MapPin, Package, Heart } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '../components/SupabaseClient';
import { ToastContainer } from 'react-toastify';
import { productToasts, wishlistToasts } from '../utils/toastConfig';
import 'react-toastify/dist/ReactToastify.css';
import ProductCard from './ProductCard';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('listings');
  const [profileData, setProfileData] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [userWishlist, setUserWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'listings') {
      fetchUserListings();
    } else if (activeTab === 'wishlist') {
      fetchUserWishlist();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

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
        ...profile,
        email: user.email,
        listings: listingsCount.count || 0,
        wishlist: wishlistCount.count || 0
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      productToasts.loadError();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      productToasts.loadError();
    }
  };

  const fetchUserWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      wishlistToasts.error();
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-32 rounded-lg mb-8"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToastContainer />
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{profileData.email}</h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{profileData.campus_location}</span>
              </div>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="font-bold">{profileData.listings}</div>
                  <div className="text-sm text-gray-600">Listings</div>
                </div>
                <div>
                  <div className="font-bold">{profileData.wishlist}</div>
                  <div className="text-sm text-gray-600">Wishlist</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Member since {new Date(profileData.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'listings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('listings')}
        >
          <Package className="w-4 h-4 mr-2" />
          Listings
        </Button>
        <Button
          variant={activeTab === 'wishlist' ? 'default' : 'outline'}
          onClick={() => setActiveTab('wishlist')}
        >
          <Heart className="w-4 h-4 mr-2" />
          Wishlist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'listings' ? 
          userListings.map(product => (
            <ProductCard key={product.id} product={product} />
          )) :
          userWishlist.map(item => (
            <ProductCard key={item.product_id} product={item.products} />
          ))
        }
      </div>
    </div>
  );
};

export default Profile;