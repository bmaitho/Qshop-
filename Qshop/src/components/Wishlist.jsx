import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './Navbar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Wishlist = () => {
  const { addToCart } = useCart();
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (wishlist && wishlist.length > 0) {
      const initialQuantities = {};
      wishlist.forEach(item => {
        if (item?.products) {
          initialQuantities[item.products.id] = 1;
        }
      });
      setQuantities(initialQuantities);
    }
    setLoading(false);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [wishlist]);

  const handleRemoveFromWishlist = async (productId, productName) => {
    await removeFromWishlist(productId, productName);
  };

  const handleClearWishlist = async () => {
    await clearWishlist();
  };

  const handleMoveToCart = async (item) => {
    if (!item?.products) return;
    
    const quantity = quantities[item.products.id] || 1;
    const productWithQuantity = { 
      ...item.products, 
      quantity 
    };
    
    await addToCart(productWithQuantity);
    await removeFromWishlist(item.products.id, item.products.name);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity > 0) {
      setQuantities(prev => ({
        ...prev,
        [productId]: newQuantity
      }));
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg mb-4"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <>
        <Navbar />
        <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Your Wishlist is Empty</h2>
            <p className="text-gray-600 mb-8">Save items you'd like to purchase later</p>
            <Link to="/studentmarketplace">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
        <ToastContainer />
        
        {/* Header - different for mobile and desktop */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
            {isMobile ? `Wishlist (${wishlist.length})` : `My Wishlist (${wishlist.length} items)`}
          </h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size={isMobile ? "sm" : "default"}>
                Clear {isMobile ? "" : "Wishlist"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Wishlist</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove all items from your wishlist?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleClearWishlist}
                >
                  Clear Wishlist
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-4">
          {wishlist.map((item) => {
            if (!item?.products) return null;
            
            return (
              <div 
                key={item.id}
                className={`flex ${isMobile ? 'flex-col' : 'items-center space-x-4'} bg-white rounded-lg shadow p-4`}
              >
                <div className={`${isMobile ? 'w-full flex mb-3' : ''}`}>
                  <img 
                    src={item.products.image_url || "/api/placeholder/200/200"}
                    alt={item.products.name}
                    className={`${isMobile ? 'w-20 h-20 mr-3' : 'w-24 h-24'} object-cover rounded`}
                  />
                  
                  {isMobile && (
                    <div className="flex-1">
                      <Link 
                        to={`/product/${item.products.id}`}
                        className="font-semibold text-sm hover:text-orange-600 line-clamp-2"
                      >
                        {item.products.name}
                      </Link>
                      <p className="text-lg font-bold text-orange-600">
                        KES {item.products.price?.toLocaleString()}
                      </p>
                      {item.products.original_price && (
                        <p className="text-xs text-gray-500 line-through">
                          KES {item.products.original_price?.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Desktop view product info */}
                {!isMobile && (
                  <div className="flex-1">
                    <Link 
                      to={`/product/${item.products.id}`}
                      className="font-semibold text-lg hover:text-orange-600"
                    >
                      {item.products.name}
                    </Link>
                    <p className="text-xl font-bold text-orange-600">
                      KES {item.products.price?.toLocaleString()}
                    </p>
                    {item.products.original_price && (
                      <p className="text-sm text-gray-500 line-through">
                        KES {item.products.original_price?.toLocaleString()}
                      </p>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Condition: {item.products.condition}</p>
                      <p>Location: {item.products.location}</p>
                    </div>
                  </div>
                )}

                {/* Mobile view controls */}
                {isMobile && (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.products.id, (quantities[item.products.id] || 1) - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {quantities[item.products.id] || 1}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.products.id, (quantities[item.products.id] || 1) + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromWishlist(item.products.id, item.products.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleMoveToCart(item)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Move to Cart
                    </Button>
                  </div>
                )}

                {/* Desktop view controls */}
                {!isMobile && (
                  <div className="flex flex-col items-end space-y-3">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => updateQuantity(item.products.id, (quantities[item.products.id] || 1) - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {quantities[item.products.id] || 1}
                      </span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => updateQuantity(item.products.id, (quantities[item.products.id] || 1) + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleMoveToCart(item)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Move to Cart
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromWishlist(item.products.id, item.products.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom navigation buttons */}
        {isMobile ? (
          <div className="mt-4">
            <Link to="/studentmarketplace">
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
            <Link to="/cart">
              <Button size="sm" className="w-full flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                View Cart
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex justify-between">
            <Link to="/studentmarketplace">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
            <Link to="/cart">
              <Button>View Cart</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Wishlist;