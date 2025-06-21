import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
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
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [imageErrors, setImageErrors] = useState({});
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

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.products.id,
        seller_id: item.products.seller_id,
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
              
              return (
                <div 
                  key={item.id}
                  className={`flex ${isMobile ? 'flex-col' : 'items-center space-x-4'} bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-4 border border-primary/10 dark:border-gray-700`}
                >
                  <div className={`${isMobile ? 'w-full flex mb-3' : ''}`}>
                    <div className={`${isMobile ? 'w-20 h-20 mr-3' : 'w-24 h-24'} overflow-hidden rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0`}>
                      <img 
                        src={imageErrors[productId] ? "/api/placeholder/200/200" : (item.products.image_url || "/api/placeholder/200/200")}
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => handleImageError(productId)}
                      />
                    </div>
                    
                    {isMobile && (
                      <div className="flex-1">
                        <Link 
                          to={`/product/${productId}`}
                          className="font-semibold text-sm hover:text-orange-600 dark:hover:text-orange-500 line-clamp-2 text-primary dark:text-gray-100"
                        >
                          {item.products.name}
                        </Link>
                        <p className="text-lg font-bold text-secondary dark:text-green-400">
                          KES {item.products.price?.toLocaleString()}
                        </p>
                        {item.products.original_price && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
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
                        to={`/product/${productId}`}
                        className="font-semibold text-lg hover:text-orange-600 dark:hover:text-orange-500 text-primary dark:text-gray-100"
                      >
                        {item.products.name}
                      </Link>
                      <p className="text-xl font-bold text-secondary dark:text-green-400">
                        KES {item.products.price?.toLocaleString()}
                      </p>
                      {item.products.original_price && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          KES {item.products.original_price?.toLocaleString()}
                        </p>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <p>Condition: {item.products.condition}</p>
                        <p>Location: {item.products.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Mobile view controls */}
                  {isMobile && (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center border rounded-md border-primary/20 dark:border-gray-600">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                            onClick={() => updateQuantity(productId, Math.max(1, item.quantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm text-primary dark:text-gray-300">
                            {item.quantity}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                            onClick={() => updateQuantity(productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
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

                  {/* Desktop view controls */}
                  {!isMobile && (
                    <div className="flex flex-col items-end space-y-3">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                          onClick={() => updateQuantity(productId, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium text-primary dark:text-gray-300">
                          {item.quantity}
                        </span>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                          onClick={() => updateQuantity(productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex space-x-2">
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
                  <span>Subtotal</span>
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
                disabled={loading}
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;