// WishlistContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '../components/SupabaseClient';

const WishlistContext = createContext();

const wishlistReducer = (state, action) => {
  switch (action.type) {
    case 'SET_WISHLIST':
      return {
        ...state,
        items: action.payload
      };
    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: []
      };
    default:
      return state;
  }
};

export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const { toast } = useToast();

  useEffect(() => {
    // Initial wishlist fetch
    fetchWishlist();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh wishlist when user signs in or token is refreshed
        fetchWishlist();
      }
      if (event === 'SIGNED_OUT') {
        // Clear wishlist when user signs out
        dispatch({ type: 'CLEAR_WISHLIST' });
      }
    });

    // Clean up subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchWishlist = async () => {
    try {
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
      dispatch({ type: 'SET_WISHLIST', payload: data || [] });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const addToWishlist = async (product) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please login to add items to wishlist",
          variant: "destructive",
        });
        return;
      }

      // Check if already in wishlist
      if (isInWishlist(product.id)) {
        return;
      }

      const { error } = await supabase
        .from('wishlist')
        .insert([{
          user_id: user.id,
          product_id: product.id
        }]);

      if (error) throw error;
      
      fetchWishlist(); // Refresh wishlist
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      
      fetchWishlist(); // Refresh wishlist
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
    return state.items.some(item => item.product_id === productId);
  };

  const value = {
    wishlist: state.items,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};