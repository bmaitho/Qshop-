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

  useEffect(() => {
    // Initial wishlist fetch
    fetchWishlist();

    // Listen for auth changes
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === null) {
        fetchWishlist();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Set up auth state change listener for current tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
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
      window.removeEventListener('storage', handleStorageChange);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      // Check for token in session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'CLEAR_WISHLIST' });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        dispatch({ type: 'CLEAR_WISHLIST' });
        setLoading(false);
        return;
      }

      console.log('Fetching wishlist for user:', user.id);
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('*, products(*)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching wishlist:', error);
        throw error;
      }
      
      console.log('Wishlist data:', data);
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

      // Check if item already exists in wishlist
      const { data: existingItem, error: checkError } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingItem) {
        console.log('Item already in wishlist', existingItem);
        return; // Item already in wishlist, do nothing
      }

      console.log('Adding to wishlist:', { user_id: user.id, product_id: product.id });
      
      const { error } = await supabase
        .from('wishlist')
        .insert([{
          user_id: user.id,
          product_id: product.id
        }]);

      if (error) throw error;
      
      // Fetch updated wishlist
      await fetchWishlist();
      
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

      console.log('Removing from wishlist:', { user_id: user.id, product_id: productId });
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      
      // Fetch updated wishlist
      await fetchWishlist();
      
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

      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      dispatch({ type: 'CLEAR_WISHLIST' });
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