import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Home, Search, User, Heart, Store, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
import { supabase } from '../components/SupabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const MobileNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  
  // Calculate total items
  const cartItemCount = cart?.length || 0;
  const wishlistItemCount = wishlist?.length || 0;
  
  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Clear session storage
      sessionStorage.removeItem('token');
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };
  
  return (
    <>
      {/* Top header with search and cart */}
      <div className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="bg-white/30 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <Link to="/home" className="text-xl font-bold text-gray-800">
              UniHive
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
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
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="bg-white/30 backdrop-blur-md rounded-full p-2 shadow-lg">
                  <LogOut size={20} className="text-gray-800" />
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out of your account?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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