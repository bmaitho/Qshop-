import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Menu, 
  User,
  LogOut,
  Package,
  ChevronDown,
  Search,
  MessageCircle,
  HelpCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
import { supabase } from './SupabaseClient';
import { subscribeToMessages, getUnreadMessageCount } from '../utils/messagingUtils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MobileNavbar from './MobileNavbar';
import { useTutorial } from './RestartTutorialButton';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { restartTutorial } = useTutorial();
  
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      const user = JSON.parse(token);
      setUserData(user);
    }
    
    // Set up listener for screen size changes
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle message notifications
  useEffect(() => {
    let subscription = null;
    
    // Use an async IIFE (Immediately Invoked Function Expression)
    (async () => {
      try {
        // Get initial unread message count
        const count = await getUnreadMessageCount();
        setUnreadMessages(count);
        
        // Subscribe to new messages
        subscription = await subscribeToMessages((newMessage) => {
          // Update unread count when a new message is received
          setUnreadMessages(prevCount => prevCount + 1);
        });
      } catch (error) {
        console.error("Error setting up message notifications:", error);
      }
    })();
    
    // Clean up subscription when component unmounts
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // If we're on mobile, use MobileNavbar instead
  if (isMobile) {
    return <MobileNavbar />;
  }

  const handleLogout = async () => {
    try {
      // First make a copy of window.location to use after state is cleared
      const currentLocation = window.location.href;
      
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Define gold color style for consistent application
  const goldTextStyle = { color: '#ebc75c' };
  const goldIconStyle = { color: '#ebc75c' };

  const navLinks = [
    { name: 'Home', path: '/home' },
    { 
      name: 'Student Marketplace', 
      path: '/studentmarketplace',
      highlight: false
    },
    {
      name: 'My shop',
      path: '/myshop',
      className: 'shop-link' // Added class for tutorial targeting
    }
  ];

  const ProfileDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="profile-section relative h-10 w-10 rounded-full">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4" style={goldIconStyle} />
            </div>
            <ChevronDown className="h-4 w-4" style={goldIconStyle} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card dark:bg-card border-border dark:border-border" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData?.session?.user?.email || userData?.user?.email || 'User'}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border dark:bg-border" />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer flex items-center hover:bg-accent dark:hover:bg-accent">
            <User className="mr-2 h-4 w-4" style={goldIconStyle} />
            <span style={goldTextStyle}>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer flex items-center hover:bg-accent dark:hover:bg-accent">
            <Package className="mr-2 h-4 w-4" style={goldIconStyle} />
            <span style={goldTextStyle}>My Orders</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile?tab=settings" className="cursor-pointer flex items-center hover:bg-accent dark:hover:bg-accent">
            <Settings className="mr-2 h-4 w-4" style={goldIconStyle} />
            <span style={goldTextStyle}>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border dark:bg-border" />
        <DropdownMenuItem 
          className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="navbar fixed top-0 w-full bg-card dark:bg-card border-b border-border dark:border-border shadow-sm transition-colors duration-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold" style={goldTextStyle}>UniHive</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 main-nav">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`${link.className || ''} transition-colors font-medium`}
                style={goldTextStyle}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-4 nav-actions">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/profile?tab=messages" className="relative message-icon">
                    <Button variant="ghost" size="icon" className="hover:bg-accent dark:hover:bg-accent">
                      <MessageCircle className="h-5 w-5" style={goldIconStyle} />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadMessages}
                        </span>
                      )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Messages</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/wishlist" className="wishlist-icon relative">
                    <Button variant="ghost" size="icon" className="hover:bg-accent dark:hover:bg-accent">
                      <Heart className="h-5 w-5" style={goldIconStyle} />
                      {wishlist?.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-secondary dark:bg-secondary text-primary dark:text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {wishlist.length}
                        </span>
                      )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Wishlist</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/cart" className="cart-icon relative">
                    <Button variant="ghost" size="icon" className="hover:bg-accent dark:hover:bg-accent">
                      <ShoppingCart className="h-5 w-5" style={goldIconStyle} />
                      {cart?.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-secondary dark:bg-secondary text-primary dark:text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shopping Cart</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="tutorial-help hover:bg-accent dark:hover:bg-accent"
                    onClick={() => restartTutorial()}
                  >
                    <HelpCircle className="h-5 w-5" style={goldIconStyle} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tutorial</p>
                </TooltipContent>
              </Tooltip>
              
              {userData ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ProfileDropdown />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>User Profile</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link to="/">
                  <Button className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90">Sign In</Button>
                </Link>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;