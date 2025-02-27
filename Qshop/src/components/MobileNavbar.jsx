import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Menu, Heart, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const MobileNavbar = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  
  // Calculate total items
  const cartItemCount = cart?.length || 0;
  const wishlistItemCount = wishlist?.length || 0;
  
  return (
    <>
      {/* Top header with search and cart */}
      <div className="fixed top-0 left-0 w-full bg-orange-600 text-white z-50">
        <div className="flex items-center justify-between p-2">
          <Link to="/home" className="text-xl font-bold">
            UniHive
          </Link>
          
          <div className="flex items-center">
            <Link to="/cart" className="relative ml-2">
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center">
          <Link 
            to="/home" 
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/home' ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            to="/studentmarketplace" 
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/studentmarketplace' ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            <Search size={20} />
            <span className="text-xs mt-1">Marketplace</span>
          </Link>
          
          <Link 
            to="/myshop" 
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/myshop' ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            <Store size={20} />
            <span className="text-xs mt-1">My Shop</span>
          </Link>
          
          <Link 
            to="/wishlist" 
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/wishlist' ? 'text-orange-600' : 'text-gray-600'
            } relative`}
          >
            <Heart size={20} />
            {wishlistItemCount > 0 && (
              <span className="absolute top-0 right-2 bg-orange-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {wishlistItemCount}
              </span>
            )}
            <span className="text-xs mt-1">Wishlist</span>
          </Link>
          
          <Link 
            to="/profile" 
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/profile' ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            <User size={20} />
            <span className="text-xs mt-1">Account</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default MobileNavbar;