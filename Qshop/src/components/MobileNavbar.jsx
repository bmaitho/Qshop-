import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Heart, Store, Moon, Sun, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from './ThemeContext';
import { toast } from 'react-toastify';
import { supabase } from './SupabaseClient';

const MobileNavbar = () => {
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const cartItemCount = cart?.length || 0;
  const wishlistItemCount = wishlist?.length || 0;
  
  // Get current path for active state
  const pathname = window.location.pathname;
  
  // Define gold color style for consistent application
  const goldTextStyle = { color: '#ebc75c' };
  const goldIconStyle = { color: '#ebc75c' };

  const handleLogout = async () => {
    try {
      // Clear session storage BEFORE signing out from Supabase
      sessionStorage.removeItem('token');
      localStorage.removeItem('sb-vycftqpspmxdohfbkqjb-auth-token');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Force a complete page reload to clear all state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
      // Even on error, try to redirect
      window.location.href = '/auth';
    }
  };
  
  return (
    <>
      {/* Top header */}
      <div className="fixed top-1 left-0 w-full z-50 px-3">
        <div className="flex items-center justify-between">
          <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full px-3 py-1 shadow-lg border border-border/50 dark:border-border/50">
            <a href="/home" className="text-base font-bold" style={goldTextStyle}>
              UniHive
            </a>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={toggleTheme}
              className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={18} style={goldIconStyle} />
              ) : (
                <Moon size={18} style={goldIconStyle} />
              )}
            </button>
            
            <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50">
              <a href="/cart" className="relative" aria-label="Cart">
                <ShoppingCart size={18} style={goldIconStyle} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary dark:text-primary text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>
            </div>
            
            <button 
              onClick={handleLogout}
              className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50"
              aria-label="Log out"
            >
              <LogOut size={18} style={goldIconStyle} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation - increased z-index and adjusted padding */}
      <div className="fixed bottom-2 left-0 w-full z-[100] p-2">
        <div className="bg-card/95 dark:bg-card/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 dark:border-border/50 flex justify-around items-center py-1.5">
          <NavItem 
            href="/home"
            icon={Home}
            label="Home"
            isActive={pathname === '/home'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/studentmarketplace"
            icon={Search}
            label="Shop"
            isActive={pathname === '/studentmarketplace'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/myshop"
            icon={Store}
            label="My Shop"
            isActive={pathname === '/myshop'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/wishlist"
            icon={Heart}
            label="Wishlist"
            isActive={pathname === '/wishlist'}
            badge={wishlistItemCount}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/profile"
            icon={User}
            label="Account"
            isActive={pathname === '/profile'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
        </div>
      </div>
    </>
  );
};

// Separate NavItem component for cleaner code
const NavItem = ({ href, icon: Icon, label, isActive, badge, goldStyle, textStyle }) => (
  <a 
    href={href} 
    className={`flex flex-col items-center px-2 py-1 rounded-full ${
      isActive ? 'bg-background/80 dark:bg-background/80' : ''
    }`}
    aria-label={label}
  >
    <div className="relative">
      <Icon size={16} style={goldStyle} />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-secondary text-primary dark:text-primary text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
    <span className="text-[10px] mt-0.5" style={textStyle}>{label}</span>
  </a>
);

export default MobileNavbar;