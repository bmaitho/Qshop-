// src/components/FeaturedShops.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Star, AlertCircle, Heart } from 'lucide-react';

const FeaturedShops = () => {
  const navigate = useNavigate();
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
        .limit(6);
      
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-60 rounded-t-lg"></div>
            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
              <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-24">
                    <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="h-2 mt-1 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="h-2 mt-1 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} navigate={navigate} />
      ))}
    </div>
  );
};

const ShopCard = ({ shop, navigate }) => {
  const [followed, setFollowed] = useState(false);
  
  const handleFollow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFollowed(!followed);
    // Here you would implement the actual following functionality with Supabase
  };
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-xl transition-all duration-300 border-none bg-black cursor-pointer group"
      onClick={() => navigate(`/seller/${shop.id}`)}
    >
      <div className="relative">
        {/* Main Shop Banner */}
        <div className="h-60 overflow-hidden">
          <img 
            src={shop.banner_url || "/api/placeholder/400/240"} 
            alt={shop.shop_name} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/api/placeholder/400/240";
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#113b1e] via-[#113b1e]/60 to-transparent opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent"></div>
          
          {/* Follow Button */}
          <div className="absolute top-2 right-2 z-10" onClick={handleFollow}>
            <Button 
              variant="outline"
              size="sm" 
              className={followed 
                ? "bg-[#e7c65f] text-[#113b1e] hover:bg-[#e7c65f]/90 border-[#e7c65f]" 
                : "bg-black/50 text-white hover:bg-[#e7c65f] hover:text-[#113b1e] border-white/30"}
            >
              {followed ? (
                <>
                  <Heart className="h-4 w-4 mr-1 fill-[#113b1e] text-[#113b1e]" />
                  Following
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Shop Name */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-serif text-xl font-bold mb-2 text-white group-hover:text-[#e7c65f] transition-colors drop-shadow-lg">
            {shop.shop_name || "Featured Shop"}
          </h3>
          <div className="flex items-center text-white text-sm mb-1">
            <Star className="h-4 w-4 text-[#e7c65f] mr-1" />
            <span>{shop.rating || '4.5'}</span>
            <span className="ml-1">({shop.review_count || '10'} reviews)</span>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4 bg-[#0a2412]">
        {/* Product Previews */}
        {shop.items.length > 0 ? (
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {shop.items.map((item, index) => (
              <div key={index} className="w-24 flex-shrink-0">
                <div className="h-20 bg-gray-800 rounded-lg overflow-hidden">
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
                <p className="text-xs text-gray-300 truncate mt-1">{item.name}</p>
                <p className="text-[#e7c65f] font-medium text-sm">KES {item.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-2">
            No products available
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedShops;