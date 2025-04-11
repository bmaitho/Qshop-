import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2, ArrowLeft, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';

const DELIVERY_FEE = 0; // Set to 0 for now, can be changed later

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart, loading } = useCart();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    fetchUserProfile();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUser(user);
      
      // Get user profile for phone number if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
        
      if (profile?.phone) {
        setPhoneNumber(profile.phone);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const createOrder = async () => {
    if (!currentUser) {
      toast.error("Please log in to complete your order");
      return null;
    }
    
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return null;
    }
    
    try {
      setIsCreatingOrder(true);
      
      // Group cart items by seller
      const itemsBySeller = {};
      
      cart.forEach(item => {
        const sellerId = item.products.seller_id;
        if (!itemsBySeller[sellerId]) {
          itemsBySeller[sellerId] = [];
        }
        itemsBySeller[sellerId].push(item);
      });
      
      // Calculate total amount
      const orderAmount = total + DELIVERY_FEE;
      
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: currentUser.id,
          amount: orderAmount,
          payment_status: 'pending',
          order_status: 'pending_payment',
          phone_number: phoneNumber
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items for each cart item
      const orderItems = [];
      
      cart.forEach(item => {
        orderItems.push({
          order_id: order.id,
          product_id: item.product_id,
          seller_id: item.products.seller_id,
          quantity: item.quantity,
          price_per_unit: item.products.price,
          subtotal: item.products.price * item.quantity,
          status: 'pending_payment'
        });
      });
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Clear cart
      await clearCart();
      
      // Return the created order
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
      return null;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCheckout = async () => {
    const order = await createOrder();
    
    if (order) {
      // Redirect to checkout page with the order ID
      navigate(`/checkout/${order.id}`);
    }
  };

  const handleRemoveFromCart = (productId, productName) => {
    removeFromCart(productId, productName);
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    updateQuantity(productId, newQuantity);
  };

  const handleClearCart = () => {
    clearCart();
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
              <Button className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-[#ebc75c]">
                Continue Shopping
              </Button>
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

              {/* Checkout Button */}
              <Button 
                className="w-full mb-2 bg-secondary text-primary hover:bg-secondary/90 dark:text-white"
                onClick={handleCheckout}
                disabled={isCreatingOrder}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </Button>

              {/* Alert if user is not logged in */}
              {!currentUser && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Not logged in</AlertTitle>
                  <AlertDescription>
                    Please log in to complete your purchase.
                  </AlertDescription>
                </Alert>
              )}

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