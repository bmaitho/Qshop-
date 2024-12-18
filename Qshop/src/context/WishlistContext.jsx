// WishlistContext.jsx
import React, { createContext, useContext, useReducer } from 'react';
import { useToast } from "@/components/ui/use-toast";

const WishlistContext = createContext();

const wishlistReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_WISHLIST':
      if (state.items.find(item => item.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        items: [...state.items, action.payload]
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    default:
      return state;
  }
};

export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const { toast } = useToast();

  const value = {
    wishlist: state.items,
    addToWishlist: (product) => {
      dispatch({ type: 'ADD_TO_WISHLIST', payload: product });
      toast({
        title: "Added to wishlist",
        description: `${product.name} has been added to your wishlist`
      });
    },
    removeFromWishlist: (productId) => {
      dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist"
      });
    },
    isInWishlist: (productId) => state.items.some(item => item.id === productId)
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