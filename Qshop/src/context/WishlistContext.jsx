// WishlistContext.jsx - Optimized
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { supabase } from '../components/SupabaseClient';
import { wishlistToasts } from '../utils/toastConfig';

const WishlistContext = createContext();

const wishlistReducer = (state, action) => {
  switch (action.type) {
    case 'SET_WISHLIST':
      return {
        ...state,
        items: action.payload
      };
    case 'ADD_TO_WISHLIST':
      return {
        ...state,
        items: [...state.items, action.payload]
      };
    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(item => item.product_id !== action.payload)
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
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  // Add a local cache to speed up isInWishlist checks
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());

  // Initial load and auth change listener setup
  useEffect(() => {
    if (!isInitialized) {
      fetchWishlist();
      setIsInitialized(true);
    }

    // Set up auth state change listener for current tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchWishlist();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'CLEAR_WISHLIST' });
        setWishlistItemIds(new Set());
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isInitialized]);

  // Update the wishlistItemIds whenever state.items changes
  useEffect(() => {
    const ids = new Set();
    state.items.forEach(item => {
      ids.add(item.product_id);
      // Also add the id from product object if available
      if (item.products && item.products.id) {
        ids.add(item.products.id);
      }
    });
    setWishlistItemIds(ids);
  }, [state.items]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      
      // Check for token in session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'CLEAR_WISHLIST' });
        setWishlistItemIds(new Set());
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        dispatch({ type: 'CLEAR_WISHLIST' });
        setWishlistItemIds(new Set());
        return;
      }
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('*, products(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      
      dispatch({ type: 'SET_WISHLIST', payload: data || [] });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (product) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        wishlistToasts.error("Please login to add items to wishlist");
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        wishlistToasts.error("Authentication error");
        return;
      }

      // First check if already in wishlist using our fast local cache
      if (wishlistItemIds.has(product.id)) {
        wishlistToasts.addSuccess(product.name);
        return; // Already in wishlist, do nothing but show success toast
      }

      // Optimistically update UI first for immediate feedback
      const optimisticItem = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        product_id: product.id,
        products: product // Store the full product for UI display
      };
      
      dispatch({ 
        type: 'ADD_TO_WISHLIST', 
        payload: optimisticItem 
      });
      
      // Then add to database
      const { data, error } = await supabase
        .from('wishlist')
        .insert([{
          user_id: user.id,
          product_id: product.id
        }])
        .select('*, products(*)')
        .single();

      if (error) {
        // If error, revert optimistic update and refresh wishlist
        console.error('Error adding to wishlist:', error);
        fetchWishlist();
        throw error;
      }
      
      // Update with real data from server (replacing our optimistic entry)
      if (data) {
        // Remove the temporary optimistic item and add the real one
        dispatch({ 
          type: 'REMOVE_FROM_WISHLIST', 
          payload: product.id 
        });
        dispatch({ 
          type: 'ADD_TO_WISHLIST', 
          payload: data 
        });
      }
      
      // Show toast immediately after updating state
      wishlistToasts.addSuccess(product.name);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      wishlistToasts.error("Failed to add to wishlist");
    }
  };

  const removeFromWishlist = async (productId, productName) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Optimistically update local state first for immediate UI feedback
      dispatch({ 
        type: 'REMOVE_FROM_WISHLIST', 
        payload: productId 
      });
      
      // Show toast immediately
      if (productName) {
        wishlistToasts.removeSuccess(productName);
      } else {
        wishlistToasts.success("Item removed from wishlist");
      }
      
      // Then update database
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        // If there was an error, refresh the entire wishlist
        console.error('Error removing from wishlist:', error);
        fetchWishlist();
        throw error;
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      wishlistToasts.error("Failed to remove from wishlist");
    }
  };

  const clearWishlist = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Optimistically clear local state
      dispatch({ type: 'CLEAR_WISHLIST' });
      
      // Show toast immediately
      wishlistToasts.success("Wishlist cleared successfully");
      
      // Then clear database
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // If there was an error, refresh the entire wishlist
        fetchWishlist();
        throw error;
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      wishlistToasts.error("Failed to clear wishlist");
    }
  };

  const isInWishlist = (productId) => {
    // Use the faster Set-based lookup rather than array filtering
    return wishlistItemIds.has(productId);
  };

  const value = {
    wishlist: state.items,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    loading
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