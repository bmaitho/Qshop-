import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '../components/SupabaseClient';

const USER_ID = '4d070188-d06e-4897-91c7-6e9797bd6bca';
const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', USER_ID);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wishlist items",
        variant: "destructive",
      });
    }
  };

  const addToWishlist = async (product) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .insert([{
          user_id: USER_ID,
          product_id: product.id
        }]);

      if (error) throw error;
      await fetchWishlist();
      toast({
        title: "Added to wishlist",
        description: `${product.name} has been added to your wishlist`
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add item to wishlist",
        variant: "destructive",
      });
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', USER_ID)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchWishlist();
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist"
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      });
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.product_id === productId);
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist
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