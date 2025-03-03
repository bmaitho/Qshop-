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
      {/* Top header with brand and cart */}
      <div className="fixed top-0 left-0 w-full z-50 h-16"> {/* Fixed height */}
        <div className="flex items-center justify-between p-4 bg-primary/90 backdrop-blur-md shadow-md h-full">
          <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/20">
            <Link to="/home" className="text-xl font-serif font-bold text-secondary">
              UniHive
            </Link>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-full p-2 shadow-lg border border-white/20">
            <Link to="/cart" className="relative">
              <ShoppingCart size={20} className="text-secondary" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-primary/10">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50 h-16 p-2"> {/* Fixed height and reduced padding */}
        <div className="bg-primary/90 backdrop-blur-lg rounded-full shadow-lg flex justify-around items-center py-2 px-2 border border-white/10 h-full">
          <Link 
            to="/home" 
            className={`flex flex-col items-center rounded-full p-1 transition-all duration-200 ${
              location.pathname === '/home' 
                ? 'bg-white/10 text-secondary' 
                : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <Home size={18} />
            <span className="text-xs">Home</span>
          </Link>
          
          <Link 
            to="/studentmarketplace" 
            className={`flex flex-col items-center rounded-full p-1 transition-all duration-200 ${
              location.pathname === '/studentmarketplace' 
                ? 'bg-white/10 text-secondary' 
                : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <Search size={18} />
            <span className="text-xs">Market</span>
          </Link>
          
          <Link 
            to="/myshop" 
            className={`flex flex-col items-center rounded-full p-1 transition-all duration-200 ${
              location.pathname === '/myshop' 
                ? 'bg-white/10 text-secondary' 
                : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <Store size={18} />
            <span className="text-xs">Shop</span>
          </Link>
          
          <Link 
            to="/wishlist" 
            className={`flex flex-col items-center rounded-full p-1 relative transition-all duration-200 ${
              location.pathname === '/wishlist' 
                ? 'bg-white/10 text-secondary' 
                : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <Heart size={18} />
            {wishlistItemCount > 0 && (
              <span className="absolute -top-1 right-0 bg-secondary text-primary text-xs rounded-full h-4 w-4 flex items-center justify-center border border-primary/10">
                {wishlistItemCount}
              </span>
            )}
            <span className="text-xs">Wishlist</span>
          </Link>
          
          <Link 
            to="/profile" 
            className={`flex flex-col items-center rounded-full p-1 transition-all duration-200 ${
              location.pathname === '/profile' 
                ? 'bg-white/10 text-secondary' 
                : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <User size={18} />
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default MobileNavbar;