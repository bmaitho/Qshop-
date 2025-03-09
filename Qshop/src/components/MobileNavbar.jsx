import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Heart, Store, Moon, Sun } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from './ThemeContext';

const MobileNavbar = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  
  // Calculate total items
  const cartItemCount = cart?.length || 0;
  const wishlistItemCount = wishlist?.length || 0;
  
  // Define gold color style for consistent application
  const goldTextStyle = { color: '#ebc75c' };
  const goldIconStyle = { color: '#ebc75c' };
  
  return (
    <>
      {/* Top header with logo, theme toggle and cart */}
      <div className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-border/50 dark:border-border/50">
            <Link to="/home" className="text-xl font-bold" style={goldTextStyle}>
              UniHive
            </Link>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={toggleTheme}
              className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-2 shadow-lg border border-border/50 dark:border-border/50"
            >
              {theme === 'dark' ? (
                <Sun size={20} style={goldIconStyle} />
              ) : (
                <Moon size={20} style={goldIconStyle} />
              )}
            </button>
            
            <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-2 shadow-lg border border-border/50 dark:border-border/50">
              <Link to="/cart" className="relative">
                <ShoppingCart size={20} style={goldIconStyle} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-secondary text-primary dark:text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-transparent p-4">
        <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full shadow-lg border border-border/50 dark:border-border/50 flex justify-around items-center py-3 px-2">
          <Link 
            to="/home" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/home' 
                ? 'bg-background/80 dark:bg-background/80' 
                : 'hover:bg-background/20 dark:hover:bg-background/20'
            }`}
          >
            <Home size={20} style={goldIconStyle} />
            <span className="text-xs mt-1" style={goldTextStyle}>Home</span>
          </Link>
          
          <Link 
            to="/studentmarketplace" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/studentmarketplace' 
                ? 'bg-background/80 dark:bg-background/80' 
                : 'hover:bg-background/20 dark:hover:bg-background/20'
            }`}
          >
            <Search size={20} style={goldIconStyle} />
            <span className="text-xs mt-1" style={goldTextStyle}>Marketplace</span>
          </Link>
          
          <Link 
            to="/myshop" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/myshop' 
                ? 'bg-background/80 dark:bg-background/80' 
                : 'hover:bg-background/20 dark:hover:bg-background/20'
            }`}
          >
            <Store size={20} style={goldIconStyle} />
            <span className="text-xs mt-1" style={goldTextStyle}>My Shop</span>
          </Link>
          
          <Link 
            to="/wishlist" 
            className={`flex flex-col items-center rounded-full p-2 relative ${
              location.pathname === '/wishlist' 
                ? 'bg-background/80 dark:bg-background/80' 
                : 'hover:bg-background/20 dark:hover:bg-background/20'
            }`}
          >
            <Heart size={20} style={goldIconStyle} />
            {wishlistItemCount > 0 && (
              <span className="absolute top-0 right-1 bg-secondary text-primary dark:text-primary text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {wishlistItemCount}
              </span>
            )}
            <span className="text-xs mt-1" style={goldTextStyle}>Wishlist</span>
          </Link>
          
          <Link 
            to="/profile" 
            className={`flex flex-col items-center rounded-full p-2 ${
              location.pathname === '/profile' 
                ? 'bg-background/80 dark:bg-background/80' 
                : 'hover:bg-background/20 dark:hover:bg-background/20'
            }`}
          >
            <User size={20} style={goldIconStyle} />
            <span className="text-xs mt-1" style={goldTextStyle}>Account</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default MobileNavbar;