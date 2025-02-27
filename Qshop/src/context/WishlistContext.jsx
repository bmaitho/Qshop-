// WishlistContext.jsx
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
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isInitialized]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      
      // Check for token in session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'CLEAR_WISHLIST' });
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        dispatch({ type: 'CLEAR_WISHLIST' });
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

      // First check if already in wishlist locally
      if (isInWishlist(product.id)) {
        return; // Already in wishlist, do nothing
      }

      // Add to database
      const { data, error } = await supabase
        .from('wishlist')
        .insert([{
          user_id: user.id,
          product_id: product.id
        }])
        .select('*, products(*)')
        .single();

      if (error) throw error;
      
      // Optimistically update local state
      if (data) {
        dispatch({ 
          type: 'ADD_TO_WISHLIST', 
          payload: data 
        });
      }
      
      wishlistToasts.addSuccess(product.name);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      wishlistToasts.error();
    }
  };

  const removeFromWishlist = async (productId, productName) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Optimistically update local state first
      dispatch({ 
        type: 'REMOVE_FROM_WISHLIST', 
        payload: productId 
      });
      
      // Then update database
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        // If there was an error, refresh the entire wishlist
        fetchWishlist();
        throw error;
      }
      
      if (productName) {
        wishlistToasts.removeSuccess(productName);
      } else {
        wishlistToasts.success("Item removed from wishlist");
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      wishlistToasts.error();
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
      
      wishlistToasts.success("Wishlist cleared successfully");
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      wishlistToasts.error("Failed to clear wishlist");
    }
  };

  const isInWishlist = (productId) => {
    return state.items.some(item => 
      item.product_id === productId || 
      (item.products && item.products.id === productId)
    );
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