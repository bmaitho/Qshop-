// CartContext.jsx - OPTIMIZED for speed
// Key fixes:
// 1. Cached user auth - no repeated getUser() calls
// 2. Debounced quantity updates - rapid clicks don't hammer DB
// 3. True optimistic updates - UI updates BEFORE DB calls
// 4. Memoized total calculation
// 5. Reduced re-renders with useCallback

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../components/SupabaseClient';
import { cartToasts } from '../utils/toastConfig';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return { ...state, items: action.payload };
    case 'ADD_TO_CART':
      return { ...state, items: [...state.items, action.payload] };
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
      return { ...state, items: state.items.filter(item => item.product_id !== action.payload) };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // ✅ CACHE: Store user reference to avoid repeated getUser() calls
  const cachedUserRef = useRef(null);
  // ✅ DEBOUNCE: Track pending quantity updates
  const pendingQuantityUpdates = useRef({});
  const quantityTimers = useRef({});

  // ✅ Helper: Get cached user (fast) or fetch fresh (only when needed)
  const getCachedUser = useCallback(async () => {
    // Check session token first (instant)
    const token = sessionStorage.getItem('token');
    if (!token) {
      cachedUserRef.current = null;
      return null;
    }
    
    // Return cached user if available
    if (cachedUserRef.current) {
      return cachedUserRef.current;
    }
    
    // Fetch and cache
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        cachedUserRef.current = null;
        return null;
      }
      cachedUserRef.current = user;
      return user;
    } catch {
      cachedUserRef.current = null;
      return null;
    }
  }, []);

  // Initial load and auth change listener
  useEffect(() => {
    if (!isInitialized) {
      fetchCart();
      setIsInitialized(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        cachedUserRef.current = null; // Clear cache on new sign in
        fetchCart();
      } else if (event === 'SIGNED_OUT') {
        cachedUserRef.current = null;
        dispatch({ type: 'CLEAR_CART' });
      }
    });

    return () => {
      subscription?.unsubscribe();
      // Clear all pending timers on unmount
      Object.values(quantityTimers.current).forEach(clearTimeout);
    };
  }, [isInitialized]);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      
      const user = await getCachedUser();
      if (!user) {
        dispatch({ type: 'CLEAR_CART' });
        return;
      }

      const { data, error } = await supabase
        .from('cart')
        .select('*, products(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      dispatch({ type: 'SET_CART', payload: data || [] });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [getCachedUser]);

  // ✅ FAST addToCart - optimistic UI update first, then DB
  const addToCart = useCallback(async (product) => {
    try {
      const user = await getCachedUser();
      if (!user) {
        cartToasts.error("Please login to add items to cart");
        return;
      }

      const quantity = product.quantity || 1;
      const existingItem = state.items.find(item => item.product_id === product.id);

      if (existingItem) {
        // ✅ Update quantity - optimistic first
        const newQuantity = existingItem.quantity + quantity;
        dispatch({
          type: 'UPDATE_QUANTITY',
          payload: { productId: product.id, quantity: newQuantity }
        });

        cartToasts.addSuccess(`${product.name} (quantity updated to ${newQuantity})`);

        // DB update in background
        const { error } = await supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (error) {
          console.error('Error updating cart quantity:', error);
          fetchCart(); // Rollback on error
        }
      } else {
        // ✅ New item - create optimistic entry IMMEDIATELY
        const optimisticItem = {
          id: `temp_${Date.now()}`,
          user_id: user.id,
          product_id: product.id,
          quantity: quantity,
          products: product
        };

        dispatch({ type: 'ADD_TO_CART', payload: optimisticItem });
        cartToasts.addSuccess(product.name);

        // DB insert in background
        const { data, error } = await supabase
          .from('cart')
          .insert([{
            user_id: user.id,
            product_id: product.id,
            quantity: quantity
          }])
          .select('*, products(*)')
          .single();

        if (error) {
          console.error('Error adding to cart:', error);
          fetchCart(); // Rollback on error
        } else if (data) {
          // Replace optimistic item with real data (has real id)
          dispatch({ type: 'REMOVE_FROM_CART', payload: product.id });
          dispatch({ type: 'ADD_TO_CART', payload: data });
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      cartToasts.error();
    }
  }, [state.items, getCachedUser, fetchCart]);

  // ✅ DEBOUNCED updateQuantity - rapid clicks batch into single DB call
  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }

    // ✅ Instant UI update
    dispatch({
      type: 'UPDATE_QUANTITY',
      payload: { productId, quantity }
    });

    // ✅ Debounce the DB call (300ms) - rapid +/- clicks become one call
    if (quantityTimers.current[productId]) {
      clearTimeout(quantityTimers.current[productId]);
    }

    pendingQuantityUpdates.current[productId] = quantity;

    quantityTimers.current[productId] = setTimeout(async () => {
      try {
        const user = await getCachedUser();
        if (!user) return;

        const finalQuantity = pendingQuantityUpdates.current[productId];
        delete pendingQuantityUpdates.current[productId];
        delete quantityTimers.current[productId];

        const { error } = await supabase
          .from('cart')
          .update({ quantity: finalQuantity })
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) {
          console.error('Error updating quantity:', error);
          fetchCart(); // Rollback on error
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
        fetchCart();
      }
    }, 300);
  }, [getCachedUser, fetchCart]);

  // ✅ FAST removeFromCart - optimistic
  const removeFromCart = useCallback(async (productId, productName) => {
    try {
      // ✅ Instant UI removal
      dispatch({ type: 'REMOVE_FROM_CART', payload: productId });

      if (productName) {
        cartToasts.removeSuccess(productName);
      } else {
        cartToasts.success("Item removed from cart");
      }

      const user = await getCachedUser();
      if (!user) return;

      // DB delete in background
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        console.error('Error removing from cart:', error);
        fetchCart(); // Rollback on error
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      cartToasts.error("Failed to remove item from cart");
      fetchCart();
    }
  }, [getCachedUser, fetchCart]);

  // ✅ FAST clearCart - optimistic
  const clearCart = useCallback(async () => {
    try {
      // ✅ Instant UI clear
      dispatch({ type: 'CLEAR_CART' });
      cartToasts.success("Cart cleared successfully");

      const user = await getCachedUser();
      if (!user) return;

      // DB delete in background
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        fetchCart();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      cartToasts.error("Failed to clear cart");
      fetchCart();
    }
  }, [getCachedUser, fetchCart]);

  // ✅ MEMOIZED total - only recalculates when items actually change
  const total = useMemo(() => {
    return state.items.reduce((sum, item) => {
      const itemPrice = item.products?.price || 0;
      return sum + (itemPrice * item.quantity);
    }, 0);
  }, [state.items]);

  // ✅ MEMOIZED context value - prevents unnecessary re-renders
  const value = useMemo(() => ({
    cart: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    loading
  }), [state.items, addToCart, removeFromCart, updateQuantity, clearCart, total, loading]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};