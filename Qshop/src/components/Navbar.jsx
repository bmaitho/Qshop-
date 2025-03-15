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
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
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
import MobileNavbar from './MobileNavbar';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // If we're on mobile, use MobileNavbar instead
  if (isMobile) {
    return <MobileNavbar />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setUserData(null);
    toast.success('Logged out successfully');
    navigate('/auth');
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
      path: '/myshop'
    }
  ];

  const ProfileDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
            <p className="text-sm font-medium leading-none">{userData?.email}</p>
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
            <span style={goldTextStyle}>My Listings</span>
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
    <nav className="bg-card dark:bg-card border-b border-border dark:border-border shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold" style={goldTextStyle}>UniHive</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="transition-colors font-medium"
                style={goldTextStyle}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            
            <Link to="/wishlist" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-accent dark:hover:bg-accent">
                <Heart className="h-5 w-5" style={goldIconStyle} />
                {wishlist?.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary dark:bg-secondary text-primary dark:text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-accent dark:hover:bg-accent">
                <ShoppingCart className="h-5 w-5" style={goldIconStyle} />
                {cart?.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary dark:bg-secondary text-primary dark:text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </Link>
            {userData ? (
              <ProfileDropdown />
            ) : (
              <Link to="/">
                <Button className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;