import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, CreditCard, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './Navbar';
import { supabase } from '../components/SupabaseClient';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [imageErrors, setImageErrors] = useState({});
  const [movingToWishlist, setMovingToWishlist] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageError = (productId) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      if (cart.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      // Create order without clearing cart - let Supabase generate the UUID
      const orderData = {
        user_id: user.id,
        amount: total,
        payment_status: 'pending',
        order_status: 'pending_payment',
        created_at: new Date().toISOString()
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderResult.id;

      // ✅ FIXED: Create order items WITH buyer_user_id
      const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.products.id,
        seller_id: item.products.seller_id,
        buyer_user_id: user.id,  // ← ADDED THIS LINE!
        quantity: item.quantity,
        price_per_unit: item.products.price,
        subtotal: item.products.price * item.quantity,
        status: 'pending_payment'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Navigate to checkout WITHOUT clearing cart
      // Cart will only be cleared after successful payment
      navigate(`/checkout/${orderId}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to proceed to checkout');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced quantity update with better UX
  const handleQuantityUpdate = (productId, newQuantity) => {
    // Prevent going below 1
    if (newQuantity < 1) return;
    
    // Optional: Add maximum quantity limit
    if (newQuantity > 99) {
      toast.warning('Maximum quantity is 99');
      return;
    }
    
    updateQuantity(productId, newQuantity);
  };

  // Move item from cart to wishlist
  const handleMoveToWishlist = async (item) => {
    try {
      setMovingToWishlist(prev => ({ ...prev, [item.products.id]: true }));
      
      // Check if already in wishlist
      if (isInWishlist(item.products.id)) {
        toast.info(`${item.products.name} is already in your wishlist`);
        // Still remove from cart
        removeFromCart(item.products.id, item.products.name);
        return;
      }
      
      // Add to wishlist
      await addToWishlist(item.products);
      
      // Remove from cart
      removeFromCart(item.products.id, item.products.name);
      
      toast.success(`${item.products.name} moved to wishlist`);
      
    } catch (error) {
      console.error('Error moving to wishlist:', error);
      toast.error('Failed to move item to wishlist');
    } finally {
      setMovingToWishlist(prev => ({ ...prev, [item.products.id]: false }));
    }
  };

  if (cart.length === 0) {
    return (
      <>
        <Navbar />
        <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-primary dark:text-gray-100">Your Cart is Empty</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Discover amazing products and add them to your cart</p>
            <Link to="/studentmarketplace">
              <Button className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-secondary dark:text-primary">Continue Shopping</Button>
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
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-primary dark:text-gray-100`}>
            Shopping Cart ({cart.length} items)
          </h1>
        </div>

        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'}`}>
          {/* Cart Items */}
          <div className={`${isMobile ? '' : 'lg:col-span-2'} space-y-4`}>
            {cart.map((item) => {
              if (!item?.products) return null;
              const productId = item.products.id;
              const isMoving = movingToWishlist[productId];
              
              return (
                <div 
                  key={item.id}
                  className={`flex ${isMobile ? 'flex-col' : 'items-center space-x-4'} bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-4 border border-primary/10 dark:border-gray-700 ${isMoving ? 'opacity-50' : ''}`}
                >
                  <div className={`${isMobile ? 'w-full flex mb-3' : ''}`}>
                    <div className={`${isMobile ? 'w-20 h-20 mr-3' : 'w-24 h-24'} overflow-hidden rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0`}>
                      <img 
                        src={imageErrors[productId] ? 
                          'https://via.placeholder.com/150?text=No+Image' : 
                          item.products.image_url
                        }
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(productId)}
                      />
                    </div>

                    <div className="flex-1">
                      <Link to={`/product/${productId}`}>
                        <h3 className="font-semibold text-primary dark:text-gray-100 hover:underline">
                          {item.products.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        KES {item.products.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  {!isMobile && (
                    <div className="flex items-center space-x-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-primary/20 dark:border-gray-600 rounded">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary dark:text-gray-300"
                          onClick={() => handleQuantityUpdate(productId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-primary dark:text-gray-100">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary dark:text-gray-300"
                          onClick={() => handleQuantityUpdate(productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Subtotal */}
                      <p className="font-semibold min-w-[100px] text-right text-primary dark:text-gray-100">
                        KES {(item.products.price * item.quantity).toFixed(2)}
                      </p>

                      {/* Wishlist button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                        onClick={() => handleMoveToWishlist(item)}
                        disabled={isMoving}
                      >
                        <Heart className={`h-4 w-4 ${isInWishlist(productId) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                      </Button>
                      
                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                        onClick={() => removeFromCart(productId, item.products.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </Button>
                    </div>
                  )}

                  {/* Mobile Layout */}
                  {isMobile && (
                    <div className="space-y-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                        <div className="flex items-center border border-primary/20 dark:border-gray-600 rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary dark:text-gray-300"
                            onClick={() => handleQuantityUpdate(productId, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-4 text-primary dark:text-gray-100">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary dark:text-gray-300"
                            onClick={() => handleQuantityUpdate(productId, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <p className="font-semibold text-primary dark:text-gray-100">
                          KES {(item.products.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300"
                          onClick={() => handleMoveToWishlist(item)}
                          disabled={isMoving}
                        >
                          <Heart className={`h-4 w-4 mr-2 ${isInWishlist(productId) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                          Wishlist
                        </Button>
                        
                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                          onClick={() => removeFromCart(productId, item.products.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className={`${isMobile ? 'order-first' : ''}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-6 border border-primary/10 dark:border-gray-700 sticky top-4">
              <h3 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Order Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-primary dark:text-gray-300">
                  <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>KES {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary dark:text-gray-300">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="border-t border-primary/10 dark:border-gray-700 pt-2">
                  <div className="flex justify-between font-bold text-lg text-primary dark:text-gray-100">
                    <span>Total</span>
                    <span>KES {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full mb-3 bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading ? "Processing..." : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceed to Checkout
                  </>
                )}
              </Button>
              
              <Link to="/studentmarketplace">
                <Button variant="outline" className="w-full border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Continue Shopping
                </Button>
              </Link>
              
              {/* Quick stats */}
              <div className="mt-4 pt-4 border-t border-primary/10 dark:border-gray-700">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Items in cart:</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Total quantity:</span>
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;