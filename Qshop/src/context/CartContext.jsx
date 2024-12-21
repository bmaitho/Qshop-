// CartContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../components/SupabaseClient';
import { useToast } from "@/components/ui/use-toast";

const USER_ID = '4d070188-d06e-4897-91c7-6e9797bd6bca';
const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const { data, error } = await supabase
        .from('cart')
        .select('*, product:products(*)')
        .eq('user_id', USER_ID);

      if (error) throw error;
      setCart(data || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cart items",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (product) => {
    try {
      // First check if the item exists in the cart
      const { data: existingCartItem } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('product_id', product.id)
        .single();

      if (existingCartItem) {
        // Update quantity of existing item
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: existingCartItem.quantity + 1 })
          .eq('user_id', USER_ID)
          .eq('product_id', product.id);

        if (updateError) throw updateError;
      } else {
        // Add new item
        const { error: insertError } = await supabase
          .from('cart')
          .insert([{
            user_id: USER_ID,
            product_id: product.id,
            quantity: 1
          }]);

        if (insertError) throw insertError;
      }

      await fetchCart();
      toast({
        title: "Success",
        description: `${product.name} ${existingCartItem ? 'quantity updated' : 'added to cart'}`
      });
    } catch (error) {
      console.error('Error managing cart:', error);
      toast({
        title: "Error",
        description: "Failed to update cart",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', USER_ID)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', USER_ID)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart();
      toast({
        title: "Success",
        description: "Item removed from cart"
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', USER_ID);

      if (error) throw error;
      setCart([]);
      toast({
        title: "Success",
        description: "Cart cleared successfully"
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  const total = cart.reduce((sum, item) => {
    const itemPrice = item.product?.price || 0;
    return sum + (itemPrice * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};