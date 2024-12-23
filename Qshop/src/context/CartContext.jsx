import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../components/SupabaseClient';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload
      };

    case 'ADD_TO_CART':
      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id);
      if (existingItemIndex >= 0) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += 1;
        return {
          ...state,
          items: updatedItems
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
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
  const [token, setToken] = useState(null);

  // Get token from sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      setToken(JSON.parse(storedToken));
    }

    // Listen for token changes
    const handleStorageChange = () => {
      const updatedToken = sessionStorage.getItem('token');
      if (updatedToken) {
        setToken(JSON.parse(updatedToken));
      } else {
        setToken(null);
        dispatch({ type: 'CLEAR_CART' });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch cart from Supabase when token changes
  useEffect(() => {
    const fetchCart = async () => {
      if (!token?.user?.id) return;

      try {
        const { data, error } = await supabase
          .from('cart')
          .select(`
            *,
            product:product_id (
              id,
              name,
              price,
              image_url,
              description,
              condition,
              location
            )
          `)
          .eq('user_id', token.user.id);

        if (error) throw error;

        const cartItems = data.map(item => ({
          ...item.product,
          quantity: item.quantity
        }));

        dispatch({ type: 'SET_CART', payload: cartItems });
      } catch (error) {
        console.error('Error fetching cart:', error);
        toast.error('Failed to load cart items');
      }
    };

    fetchCart();
  }, [token?.user?.id]);

  const addToCart = async (product) => {
    if (!token?.user?.id) {
      toast.error('Please login to add items to cart');
      return;
    }

    if (!product.id || !product.name || !product.price) {
      console.error('Invalid product data:', product);
      toast.error('Could not add item - missing product information');
      return;
    }

    try {
      // Optimistic update
      dispatch({ type: 'ADD_TO_CART', payload: product });

      const existingItem = state.items.find(item => item.id === product.id);
      const quantity = existingItem ? existingItem.quantity + 1 : 1;

      const { error } = await supabase
        .from('cart')
        .upsert({
          user_id: token.user.id,
          product_id: product.id,
          quantity
        });

      if (error) throw error;

      toast.success(`${product.name} added to cart`, {
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
      // Revert optimistic update
      const { data } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', token.user.id);
      dispatch({ type: 'SET_CART', payload: data || [] });
    }
  };

  const removeFromCart = async (productId) => {
    if (!token?.user?.id) return;

    try {
      // Find product name before removing
      const product = state.items.find(item => item.id === productId);
      
      // Optimistic update
      dispatch({ type: 'REMOVE_FROM_CART', payload: productId });

      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', token.user.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast.info(`${product?.name || 'Item'} removed from cart`, {
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item from cart');
      // Revert optimistic update
      const { data } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', token.user.id);
      dispatch({ type: 'SET_CART', payload: data || [] });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!token?.user?.id) return;

    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }

    try {
      // Optimistic update
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });

      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', token.user.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast.success('Cart updated', {
        position: "top-right",
        autoClose: 1000
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
      // Revert optimistic update
      const { data } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', token.user.id);
      dispatch({ type: 'SET_CART', payload: data || [] });
    }
  };

  const clearCart = async () => {
    if (!token?.user?.id) return;

    try {
      // Optimistic update
      dispatch({ type: 'CLEAR_CART' });

      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', token.user.id);

      if (error) throw error;

      toast.success('Cart cleared successfully', {
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
      // Revert optimistic update
      const { data } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', token.user.id);
      dispatch({ type: 'SET_CART', payload: data || [] });
    }
  };

  const total = state.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const value = {
    cart: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total
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