import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Heart, Store } from 'lucide-react';
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
      {/* Top header with searches and cart */}
      <div className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="bg-white/30 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <Link to="/home" className="text-xl font-bold text-gray-800">
              UniHive
            </Link>
          </div>
          
          <div className="bg-white/30 backdrop-blur-md rounded-full p-2 shadow-lg">
            <Link to="/cart" className="relative">
              <ShoppingCart size={20} className="text-gray-800" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-transparent p-4">
        <div className="bg-white/30 backdrop-blur-md rounded-full shadow-lg flex justify-around items-center py-3 px-2">
          <Link 
            to="/home" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/home' 
                ? 'bg-white/50 text-orange-600' 
                : 'text-gray-600 hover:bg-white/20'
            }`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            to="/studentmarketplace" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/studentmarketplace' 
                ? 'bg-white/50 text-orange-600' 
                : 'text-gray-600 hover:bg-white/20'
            }`}
          >
            <Search size={20} />
            <span className="text-xs mt-1">Marketplace</span>
          </Link>
          
          <Link 
            to="/myshop" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/myshop' 
                ? 'bg-white/50 text-orange-600' 
                : 'text-gray-600 hover:bg-white/20'
            }`}
          >
            <Store size={20} />
            <span className="text-xs mt-1">My Shop</span>
          </Link>
          
          <Link 
            to="/wishlist" 
            className={`flex flex-col items-center rounded-full p-2 relative ${
              location.pathname === '/wishlist' 
                ? 'bg-white/50 text-orange-600' 
                : 'text-gray-600 hover:bg-white/20'
            }`}
          >
            <Heart size={20} />
            {wishlistItemCount > 0 && (
              <span className="absolute top-0 right-1 bg-orange-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {wishlistItemCount}
              </span>
            )}
            <span className="text-xs mt-1">Wishlist</span>
          </Link>
          
          <Link 
            to="/profile" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/profile' 
                ? 'bg-white/50 text-orange-600' 
                : 'text-gray-600 hover:bg-white/20'
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