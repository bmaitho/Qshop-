import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../components/SupabaseClient';
import { wishlistToasts, productToasts } from '../utils/toastConfig';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      setToken(JSON.parse(storedToken));
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!token) return;
    
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          products:product_id (
            id,
            name,
            price,
            original_price,
            image_url,
            description,
            condition,
            location
          )
        `)
        .eq('user_id', token.user.id);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      productToasts.loadError();
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback((productId) => {
    return wishlist.some(item => item.products?.id === productId);
  }, [wishlist]);

  const addToWishlist = async (product) => {
    if (!token) {
      wishlistToasts.error("Please login to add items to wishlist");
      return;
    }

    try {
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: token.user.id,
          product_id: product.id
        })
        .select(`
          id,
          products:product_id (*)
        `)
        .single();

      if (error) throw error;
      
      await fetchWishlist(); // Refresh wishlist
      wishlistToasts.addSuccess(product.name);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      wishlistToasts.error();
    }
  };

  const removeFromWishlist = async (productId, productName) => {
    if (!token) return;

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .match({ 
          user_id: token.user.id,
          product_id: productId 
        });

      if (error) throw error;
      
      await fetchWishlist(); // Refresh wishlist
      wishlistToasts.removeSuccess(productName);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      wishlistToasts.error();
    }
  };

  const toggleWishlist = async (product) => {
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id, product.name);
    } else {
      await addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};