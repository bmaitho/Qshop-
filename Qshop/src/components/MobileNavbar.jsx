import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Heart, Store, Moon, Sun, MessageCircle, Settings } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from './ThemeContext';
import { toast } from 'react-toastify';
import { supabase } from './SupabaseClient';
import { getUnreadMessageCount, subscribeToMessages } from '../utils/messagingUtils';

const MobileNavbar = () => {
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const cartItemCount = cart?.length || 0;
  const wishlistItemCount = wishlist?.length || 0;
  
  // Get current path for active state
  const pathname = window.location.pathname;
  
  // Define gold color style for consistent application
  const goldTextStyle = { color: '#ebc75c' };
  const goldIconStyle = { color: '#ebc75c' };

  // Handle message notifications
  useEffect(() => {
    let subscription = null;
    
    (async () => {
      try {
        const count = await getUnreadMessageCount();
        setUnreadMessages(count);
        
        subscription = await subscribeToMessages((newMessage) => {
          setUnreadMessages(prevCount => prevCount + 1);
        });
      } catch (error) {
        console.error("Error setting up message notifications:", error);
      }
    })();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <>
      {/* Top header - Logout moved to settings */}
      <div className="fixed top-1 left-0 w-full z-50 px-3 mobile-navbar-top">
        <div className="flex items-center justify-between">
          <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full px-3 py-1 shadow-lg border border-border/50 dark:border-border/50">
            <a href="/home" className="text-base font-bold unihive-logo" style={goldTextStyle}>
              UniHive
            </a>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={toggleTheme}
              className="theme-toggle bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={18} style={goldIconStyle} />
              ) : (
                <Moon size={18} style={goldIconStyle} />
              )}
            </button>
            
            <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50">
              <a href="/cart" className="relative cart-icon" aria-label="Cart">
                <ShoppingCart size={18} style={goldIconStyle} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary dark:text-primary text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>
            </div>
            
            <div className="bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50 dark:border-border/50">
              <a href="/profile?tab=messages" className="relative message-icon" aria-label="Messages">
                <MessageCircle size={18} style={goldIconStyle} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-2 left-0 w-full z-[100] p-2 mobile-navbar">
        <div className="mobile-navbar-content bg-card/95 dark:bg-card/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 dark:border-border/50 flex justify-around items-center py-1.5">
          <NavItem 
            href="/home"
            icon={Home}
            label="Home"
            id="nav-home"
            isActive={pathname === '/home'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/studentmarketplace"
            icon={Search}
            label="Shop"
            id="nav-shop"
            isActive={pathname === '/studentmarketplace'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/myshop"
            icon={Store}
            label="My Shop"
            id="nav-myshop"
            isActive={pathname === '/myshop'}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/wishlist"
            icon={Heart}
            label="Wishlist"
            id="nav-wishlist"
            isActive={pathname === '/wishlist'}
            badge={wishlistItemCount}
            goldStyle={goldIconStyle}
            textStyle={goldTextStyle}
          />
          
          <NavItem 
            href="/profile"
            icon={User}
            label="Account"
            id="nav-profile"
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
const NavItem = ({ 
  href, 
  icon: Icon, 
  label, 
  isActive, 
  badge, 
  goldStyle, 
  textStyle,
  id
}) => (
  <a 
    href={href} 
    id={id}
    className={`nav-item flex flex-col items-center px-2 py-1 rounded-full ${
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