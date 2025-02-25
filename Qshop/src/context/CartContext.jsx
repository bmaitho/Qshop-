// CartContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { supabase } from '../components/SupabaseClient';
import { cartToasts } from '../utils/toastConfig';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial cart fetch
    fetchCart();

    // Listen for auth changes across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === null) {
        fetchCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Set up auth state change listener for current tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change in cart context:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh cart when user signs in or token is refreshed
        fetchCart();
      }
      if (event === 'SIGNED_OUT') {
        // Clear cart when user signs out
        dispatch({ type: 'CLEAR_CART' });
      }
    });

    // Clean up subscription
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      // Check for token in session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'CLEAR_CART' });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        dispatch({ type: 'CLEAR_CART' });
        setLoading(false);
        return;
      }

      console.log('Fetching cart for user:', user.id);
      
      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cart:', error);
        throw error;
      }
      
      console.log('Cart data:', data);
      dispatch({ type: 'SET_CART', payload: data || [] });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        cartToasts.error("Please login to add items to cart");
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        cartToasts.error("Authentication error");
        return;
      }

      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (checkError) throw checkError;

      const quantity = product.quantity || 1;

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        const { error } = await supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Add new item
        const { error } = await supabase
          .from('cart')
          .insert([{
            user_id: user.id,
            product_id: product.id,
            quantity: quantity
          }]);

        if (error) throw error;
      }

      await fetchCart(); // Refresh cart
      cartToasts.addSuccess(product.name);
    } catch (error) {
      console.error('Error adding to cart:', error);
      cartToasts.error();
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      if (quantity === 0) {
        await removeFromCart(productId);
        return;
      }

      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart();
      cartToasts.success("Cart updated");
    } catch (error) {
      console.error('Error updating quantity:', error);
      cartToasts.error("Failed to update quantity");
    }
  };

  const removeFromCart = async (productId, productName) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart();
      
      if (productName) {
        cartToasts.removeSuccess(productName);
      } else {
        cartToasts.success("Item removed from cart");
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      cartToasts.error("Failed to remove item from cart");
    }
  };

  const clearCart = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      dispatch({ type: 'CLEAR_CART' });
      cartToasts.success("Cart cleared successfully");
    } catch (error) {
      console.error('Error clearing cart:', error);
      cartToasts.error("Failed to clear cart");
    }
  };

  const total = state.items.reduce((sum, item) => {
    const itemPrice = item.products?.price || 0;
    return sum + (itemPrice * item.quantity);
  }, 0);

  const value = {
    cart: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    loading
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};