// src/components/FeaturedShops.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Store, AlertCircle } from 'lucide-react';

const FeaturedShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedShops();
  }, []);

  const fetchFeaturedShops = async () => {
    try {
      setLoading(true);
      
      // Fetch shops with a is_featured flag or high ratings
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (shopsError) throw shopsError;
      
      // For each shop, fetch a few products
      const shopsWithProducts = await Promise.all(
        shopsData.map(async (shop) => {
          // Fetch products for this shop
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', shop.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (productsError) console.error("Error fetching products for shop:", productsError);
          
          // Return shop with products
          return {
            ...shop,
            items: products || []
          };
        })
      );
      
      // Filter out shops with no products
      const filteredShops = shopsWithProducts.filter(shop => shop.items.length > 0);
      setShops(filteredShops);
    } catch (error) {
      console.error('Error fetching featured shops:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-primary/5 dark:bg-gray-700 h-60 rounded-t-lg"></div>
            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 border border-primary/10 dark:border-gray-700 rounded-b-lg">
              <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-1/2"></div>
              <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-24">
                    <div className="h-20 bg-primary/5 dark:bg-gray-600 rounded"></div>
                    <div className="h-2 mt-1 bg-primary/5 dark:bg-gray-600 rounded"></div>
                    <div className="h-2 mt-1 bg-primary/5 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-lg text-center">
        <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-400">Error loading shops: {error}</p>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <Store className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">No featured shops found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
};

const ShopCard = ({ shop }) => {
  const [followed, setFollowed] = useState(false);
  
  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFollowed(!followed);
    
    // Here you would implement the actual following functionality with Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (!followed) {
        // Add to followed shops
        await supabase
          .from('shop_follows')
          .insert([{ 
            user_id: user.id, 
            shop_id: shop.id,
            created_at: new Date().toISOString()
          }]);
      } else {
        // Remove from followed shops
        await supabase
          .from('shop_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('shop_id', shop.id);
      }
    } catch (error) {
      console.error('Error toggling shop follow:', error);
    }
  };
  
  return (
    <Link to={`/seller/${shop.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative">
          {/* Main Shop Banner */}
          <div className="h-60 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
            <img 
              src={shop.banner_url || "/api/placeholder/400/240"} 
              alt={shop.shop_name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/api/placeholder/400/240";
              }}
            />
            {/* Overlay with brand name */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 flex items-center justify-center">
              <h2 className="text-white/70 text-2xl font-bold">
                {(shop.shop_name || 'Shop').toUpperCase()}
              </h2>
            </div>
            
            {/* Follow Button */}
            <div className="absolute top-2 right-2" onClick={handleFollow}>
              <Button 
                variant={followed ? "default" : "outline"} 
                size="sm" 
                className={followed ? "bg-secondary text-primary hover:bg-secondary/90" : "bg-black/70 text-white hover:bg-black/90 border-white/20"}
              >
                {followed ? "Following" : "Follow"}
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-3">
          <h3 className="text-primary dark:text-gray-100 font-medium text-lg">{shop.shop_name}</h3>
          <div className="flex items-center text-primary/70 dark:text-gray-400 text-sm mb-3">
            <Star className="h-4 w-4 text-secondary mr-1" />
            <span>{shop.rating || '4.5'}</span>
            <span className="ml-1">({shop.review_count || '10'} reviews)</span>
          </div>
          
          {/* Product Previews */}
          {shop.items.length > 0 ? (
            <div className="flex space-x-3 mt-2 overflow-x-auto pb-2">
              {shop.items.map((item, index) => (
                <div key={index} className="w-24 flex-shrink-0">
                  <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img 
                      src={item.image_url || "/api/placeholder/96/80"} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/96/80";
                      }}
                    />
                  </div>
                  <p className="text-xs text-primary/80 dark:text-gray-300 truncate mt-1">{item.name}</p>
                  <p className="text-primary dark:text-gray-100 font-medium text-sm">KES {item.price?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-primary/60 dark:text-gray-400 py-4">
              No products available
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default FeaturedShops;