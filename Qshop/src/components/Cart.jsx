import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initiateMpesaPayment } from '../Services/mpesaService';
import { toastSuccess, toastError, cartToasts } from '../utils/toastConfig';

const DELIVERY_FEE = 1; // 1 shilling for testing

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart, loading } = useCart();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleMpesaPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
  
    try {
      if (!phoneNumber.trim()) {
        toastError("Please enter a valid phone number");
        return;
      }
  
      const response = await initiateMpesaPayment(
        phoneNumber,
        parseInt(total + DELIVERY_FEE) // Using 1 shilling delivery fee
      );
  
      if (response.success) {
        toastSuccess(response.message || "Please check your phone for the M-Pesa prompt");
        setIsPaymentDialogOpen(false);
        setPhoneNumber('');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toastError(error.message || "Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromCart = (productId, productName) => {
    console.log(`Removing product: ${productId}, name: ${productName}`);
    removeFromCart(productId, productName);
    // Toast is now handled in the context
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    console.log(`Updating quantity for product: ${productId} to ${newQuantity}`);
    updateQuantity(productId, newQuantity);
    // Toast is now handled in the context
  };

  const handleClearCart = () => {
    clearCart();
    // Toast is now handled in the context
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-primary/5 dark:bg-gray-700 h-24 rounded-lg mb-4"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <>
        <Navbar />
        <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="text-center py-16">
            <h2 className="text-2xl font-serif font-bold mb-4 text-primary dark:text-gray-100">Your Cart is Empty</h2>
            <p className="text-primary/70 dark:text-gray-300 mb-8">Browse our products and add some items to your cart</p>
            <Link to="/studentmarketplace">
              <Button className="bg-secondary text-primary hover:bg-secondary/90 dark:text-gray-900">Continue Shopping</Button>
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
        {/* Mobile header */}
        {isMobile ? (
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-serif font-bold text-primary dark:text-gray-100">My Cart ({cart.length})</h1>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/5 text-primary dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-100">Clear All</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif dark:text-gray-100">Clear Cart</AlertDialogTitle>
                  <AlertDialogDescription className="text-primary/70 dark:text-gray-300">
                    Are you sure you want to remove all items from your cart?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" className="border-primary/20 hover:bg-primary/5 text-primary dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300">Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleClearCart}
                  >
                    Clear Cart
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <h1 className="text-2xl font-serif font-bold mb-6 text-primary dark:text-gray-100">Shopping Cart</h1>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div className="lg:col-span-2">
            {cart.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center space-x-4 border-b border-primary/10 dark:border-gray-700 py-4 ${isMobile ? 'flex-wrap' : ''}`}
              >
                <img 
                  src={item.products?.image_url || "/api/placeholder/100/100"} 
                  alt={item.products?.name} 
                  className={`w-20 h-20 md:w-24 md:h-24 object-cover rounded border border-primary/10 dark:border-gray-700 ${isMobile ? 'mb-2' : ''}`}
                />
                <div className={`flex-1 ${isMobile ? 'w-full' : ''}`}>
                  <Link 
                    to={`/product/${item.product_id}`}
                    className="font-serif font-semibold hover:text-secondary text-sm md:text-base text-primary dark:text-gray-100"
                  >
                    {item.products?.name}
                  </Link>
                  <p className="text-secondary dark:text-green-400 font-bold">KES {item.products?.price?.toLocaleString()}</p>
                  
                  {/* Mobile layout for quantity */}
                  {isMobile && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 border border-primary/20 dark:border-gray-600 rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                          onClick={() => handleUpdateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-primary dark:text-gray-300">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                        onClick={() => handleRemoveFromCart(item.product_id, item.products?.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Desktop layout for quantity */}
                {!isMobile && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                        onClick={() => handleUpdateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-primary dark:text-gray-300">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                      onClick={() => handleRemoveFromCart(item.product_id, item.products?.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            
            {/* Mobile back to shopping button */}
            {isMobile && (
              <div className="mt-4">
                <Link to="/studentmarketplace">
                  <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700">
                    <ArrowLeft className="h-4 w-4" />
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-primary/10 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-serif font-bold mb-4 text-primary dark:text-gray-100">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-primary/80 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>KES {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary/80 dark:text-gray-300">
                  <span>Delivery</span>
                  <span>KES {DELIVERY_FEE.toFixed(2)}</span>
                </div>
                <div className="border-t border-primary/10 dark:border-gray-700 pt-2 font-bold">
                  <div className="flex justify-between text-primary dark:text-gray-100">
                    <span>Total</span>
                    <span>KES {(total + DELIVERY_FEE).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* M-Pesa Payment Dialog */}
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mb-2 bg-secondary text-primary hover:bg-secondary/90 dark:text-white">Pay with M-Pesa</Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="w-full mb-2 bg-secondary dark:bg-green-600 text-primary dark:text-white hover:bg-secondary/90 dark:hover:bg-green-700">M-Pesa Payment</DialogTitle>
                    <DialogDescription className="text-primary/70 dark:text-gray-300">
                      Enter your phone number to receive the payment prompt
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleMpesaPayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-primary dark:text-gray-300">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g., 0712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        pattern="^(254|\+254|0)([7][0-9]{8})$"
                        className="w-full border-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <p className="text-sm text-primary/60 dark:text-gray-400">
                        Format: 0712345678 or 254712345678
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium text-primary dark:text-gray-300">Amount to Pay</div>
                      <div className="text-2xl font-bold text-secondary dark:text-green-400">
                        KES {(total + DELIVERY_FEE).toFixed(2)}
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mb-2 bg-secondary dark:bg-green-600 text-primary dark:text-white hover:bg-secondary/90 dark:hover:bg-green-700"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Pay Now"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Hide clear cart button on mobile as it's already in the header */}
              {!isMobile && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700">
                      Clear Cart
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-primary dark:text-gray-100">Clear Cart</AlertDialogTitle>
                      <AlertDialogDescription className="text-primary/70 dark:text-gray-300">
                        Are you sure you want to remove all items from your cart?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <Button variant="outline" className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700">Cancel</Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleClearCart}
                      >
                        Clear Cart
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
        
        {/* Desktop back and view cart buttons */}
        {!isMobile && (
          <div className="mt-6 flex justify-between">
            <Link to="/studentmarketplace">
              <Button variant="outline" className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700">Continue Shopping</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;