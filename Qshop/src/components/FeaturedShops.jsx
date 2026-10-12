// src/components/FeaturedShops.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Store, AlertCircle } from 'lucide-react';
import Masonry from './hive/Masonry';
import HiveShare from './hive/HiveShare';
import { getBannerUrl, getThumbnailUrl } from '../utils/ImageUtils';

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
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(18);
      
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, index) => (
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
    <Masonry phoneCols={1} maxCols={4} items={shops.map((s) => ({ ...s, key: s.id }))} render={(shop) => <ShopCard shop={shop} />} />
  );
};

const ShopCard = ({ shop }) => {
  const [followed, setFollowed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  const showImageBanner = Boolean(shop.banner_url) && !bannerFailed;
  
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
    <Link to={`/seller/${shop.id}`} className="group block">
      <div className="relative overflow-hidden rounded-[22px] bg-[#0b1a10] shadow-sm transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_22px_50px_-24px_rgba(17,59,30,0.6)]">
        {showImageBanner ? (
          <img
            src={shop.banner_url}
            alt={shop.shop_name}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto max-h-[440px] min-h-[180px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center px-6 text-center bg-[radial-gradient(120%_90%_at_30%_10%,#1d4a24,#071209_70%)]">
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.12em] uppercase text-[#d8b85a]">{shop.shop_name || 'Shop'}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <HiveShare path={`/seller/${shop.id}`} title={`${shop.shop_name} on UniHive`} text="Check out this shop." />
        </div>
        <button
          onClick={handleFollow}
          className={`absolute top-3 right-3 rounded-full px-3.5 py-1.5 text-xs font-bold backdrop-blur transition-colors ${followed ? 'bg-[#e7c65f] text-[#113b1e]' : 'bg-black/50 text-white border border-white/20 hover:bg-black/70'}`}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-serif text-white text-xl font-bold leading-tight drop-shadow">{shop.shop_name}</h3>
          <p className="flex items-center gap-1 text-white/75 text-xs mt-1">
            <Star className="h-3.5 w-3.5 text-[#e7c65f] fill-[#e7c65f]" /> {shop.rating || '4.5'} · {shop.review_count || '10'} reviews
          </p>
        </div>
      </div>
      {shop.items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {shop.items.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={item.image_url || '/api/placeholder/96/80'}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = '/api/placeholder/96/80'; }}
              />
            </div>
          ))}
        </div>
      )}
    </Link>
  );
};

export default FeaturedShops;