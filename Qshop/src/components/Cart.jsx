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

      // ✅ STEP 1: Cancel stale pending orders (older than 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      await supabase
        .from('orders')
        .update({ 
          order_status: 'cancelled', 
          payment_status: 'cancelled' 
        })
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .lt('created_at', thirtyMinutesAgo);

      // ✅ STEP 2: Check for existing recent pending orders
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false });

      // ✅ STEP 3: Check if any existing order matches current cart
      const cartProductIds = cart.map(item => item.products.id).sort().join(',');
      const matchingOrder = existingOrders?.find(order => {
        const orderProductIds = order.order_items
          .map(item => item.product_id)
          .sort()
          .join(',');
        return orderProductIds === cartProductIds;
      });

      let orderId;

      if (matchingOrder) {
        // ✅ REUSE existing pending order
        orderId = matchingOrder.id;
        console.log('♻️ Reusing existing pending order:', orderId);
        toast.info('Resuming your pending order');
      } else {
        // ✅ CREATE new order
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
        orderId = orderResult.id;

        // Create order items with buyer_user_id
        const orderItems = cart.map(item => ({
          order_id: orderId,
          product_id: item.products.id,
          seller_id: item.products.seller_id,
          buyer_user_id: user.id,
          quantity: item.quantity,
          price_per_unit: item.products.price,
          subtotal: item.products.price * item.quantity,
          status: 'pending_payment'
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
        console.log('✅ Created new order:', orderId);
      }

      // Navigate to checkout (cart cleared after successful payment)
      navigate(`/checkout/${orderId}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to proceed to checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityUpdate = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    if (newQuantity > 99) {
      toast.warning('Maximum quantity is 99');
      return;
    }
    
    updateQuantity(productId, newQuantity);
  };

  const handleMoveToWishlist = async (item) => {
    try {
      setMovingToWishlist(prev => ({ ...prev, [item.products.id]: true }));
      
      if (isInWishlist(item.products.id)) {
        toast.info(`${item.products.name} is already in your wishlist`);
        removeFromCart(item.products.id, item.products.name);
        return;
      }
      
      await addToWishlist(item.products);
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
        
        <div className="flex justify-between items-center mb-6">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-primary dark:text-gray-100`}>
            Shopping Cart ({cart.length} items)
          </h1>
        </div>

        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'}`}>
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
                          'https://via.placeholder.com/100?text=No+Image' : 
                          item.products.image_url || 'https://via.placeholder.com/100?text=No+Image'
                        }
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(productId)}
                      />
                    </div>
                    
                    <div className={`flex-1 ${isMobile ? 'flex flex-col' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary dark:text-gray-100 mb-1">
                            {item.products.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            KES {item.products.price.toFixed(2)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex ${isMobile ? 'justify-between items-center w-full' : 'items-center space-x-4'}`}>
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 dark:hover:bg-gray-600"
                        onClick={() => handleQuantityUpdate(productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium text-primary dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 dark:hover:bg-gray-600"
                        onClick={() => handleQuantityUpdate(productId, item.quantity + 1)}
                        disabled={item.quantity >= 99}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <p className={`font-bold text-primary dark:text-gray-100 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        KES {(item.products.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from cart?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{item.products.name}" from your cart?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => removeFromCart(productId, item.products.name)}
                            >
                              Remove
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${
                          isInWishlist(productId)
                            ? 'text-red-500 hover:text-red-700'
                            : 'text-gray-400 hover:text-red-500'
                        } hover:bg-red-50 dark:hover:bg-red-900/20`}
                        onClick={() => handleMoveToWishlist(item)}
                        disabled={isMoving}
                      >
                        <Heart className={`h-5 w-5 ${isInWishlist(productId) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">Calculated at checkout</span>
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