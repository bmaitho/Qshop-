// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Menu, 
  User,
  LogOut,
  Settings,
  Package,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/components/ui/use-toast';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // For demo purposes, we'll set this to true by default
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user] = useState({
    name: "John Doe",
    email: "john@example.com",
    avatar: "/api/placeholder/32/32"
  });

  const handleLogout = () => {
    setIsAuthenticated(false);
    toast({
      title: "Logged out successfully",
      duration: 2000
    });
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    {
      name: 'Categories',
      children: [
        {
          name: 'Electronics',
          path: '/category/electronics',
          icon: '💻',
        },
        {
          name: 'Books',
          path: '/category/books',
          icon: '📚',
        },
        {
          name: 'Furniture',
          path: '/category/furniture',
          icon: '🪑',
        },
        {
          name: 'Clothing',
          path: '/category/clothing',
          icon: '👕',
        },
      ],
    },
    { name: 'Student Marketplace', path: '/marketplace' },
  ];

  const ProfileDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/my-listings" className="cursor-pointer flex items-center">
            <Package className="mr-2 h-4 w-4" />
            <span>My Listings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-600 cursor-pointer focus:text-red-600" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold text-primary">QShop</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              if (link.children) {
                return (
                  <div key={link.name} className="relative group">
                    <button className="text-gray-600 hover:text-primary transition-colors">
                      {link.name}
                    </button>
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                      {link.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.path}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-2">{child.icon}</span>
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/wishlist">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/cart">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <Link to="/cart">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-4">
                  {isAuthenticated && (
                    <div className="flex items-center space-x-2 p-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  )}
                  {navLinks.map((link) => {
                    if (link.children) {
                      return (
                        <div key={link.name} className="space-y-2">
                          <div className="font-semibold">{link.name}</div>
                          <div className="pl-4 space-y-2">
                            {link.children.map((child) => (
                              <Link
                                key={child.name}
                                to={child.path}
                                className="flex items-center text-gray-600 hover:text-primary transition-colors py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                <span className="mr-2">{child.icon}</span>
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={link.name}
                        to={link.path}
                        className="text-gray-600 hover:text-primary transition-colors py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.name}
                      </Link>
                    );
                  })}
                  <div className="border-t pt-4">
                    <Link to="/wishlist" className="flex items-center space-x-2 py-2">
                      <Heart className="h-5 w-5" />
                      <span>Wishlist</span>
                    </Link>
                    {isAuthenticated ? (
                      <>
                        <Link to="/my-listings" className="flex items-center space-x-2 py-2">
                          <Package className="h-5 w-5" />
                          <span>My Listings</span>
                        </Link>
                        <Link to="/settings" className="flex items-center space-x-2 py-2">
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 text-red-500 py-2 w-full"
                        >
                          <LogOut className="h-5 w-5" />
                          <span>Logout</span>
                        </button>
                      </>
                    ) : (
                      <Link to="/login" className="flex items-center space-x-2 py-2">
                        <User className="h-5 w-5" />
                        <span>Sign In</span>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;