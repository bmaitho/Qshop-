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
    case 'ADD_TO_CART':
      return {
        ...state,
        items: [...state.items, action.payload]
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item => 
          item.product_id === action.payload.productId 
            ? { ...item, quantity: action.payload.quantity } 
            : item
        )
      };
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.product_id !== action.payload)
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initial load and auth change listener setup
  useEffect(() => {
    if (!isInitialized) {
      fetchCart();
      setIsInitialized(true);
    }

    // Set up auth state change listener for current tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchCart();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'CLEAR_CART' });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isInitialized]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      
      // Check for token in session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'CLEAR_CART' });
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        dispatch({ type: 'CLEAR_CART' });
        return;
      }

      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
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
  
      const quantity = product.quantity || 1;
      
      // Check if already in cart (local state check first for speed)
      const existingItem = state.items.find(item => item.product_id === product.id);
      
      if (existingItem) {
        // Update quantity locally first
        const newQuantity = existingItem.quantity + quantity;
        dispatch({ 
          type: 'UPDATE_QUANTITY', 
          payload: { 
            productId: product.id, 
            quantity: newQuantity 
          } 
        });
        
        // Then update in database
        const { error } = await supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);
  
        if (error) {
          // If there was an error, refresh the entire cart
          fetchCart();
          throw error;
        }
  
        // Always show toast for existing items
        cartToasts.addSuccess(`${product.name} (quantity updated to ${newQuantity})`);
      } else {
        // Insert into database
        const { data, error } = await supabase
          .from('cart')
          .insert([{
            user_id: user.id,
            product_id: product.id,
            quantity: quantity
          }])
          .select('*, products(*)')
          .single();
  
        if (error) throw error;
        
        // Optimistically update local state
        if (data) {
          dispatch({ 
            type: 'ADD_TO_CART', 
            payload: data 
          });
        }
  
        // Show toast for new items
        cartToasts.addSuccess(product.name);
      }
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

      // Update locally first for immediate feedback
      dispatch({ 
        type: 'UPDATE_QUANTITY', 
        payload: { 
          productId, 
          quantity 
        } 
      });
      
      // Then update database
      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        // If there was an error, refresh the entire cart
        fetchCart();
        throw error;
      }
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

      // Update locally first for immediate feedback
      dispatch({ 
        type: 'REMOVE_FROM_CART', 
        payload: productId 
      });
      
      // Then update database
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        // If there was an error, refresh the entire cart
        fetchCart();
        throw error;
      }
      
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

      // Clear locally first for immediate feedback
      dispatch({ type: 'CLEAR_CART' });
      
      // Then clear database
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // If there was an error, refresh the entire cart
        fetchCart();
        throw error;
      }
      
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