import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { addToWishlist } = useWishlist();

  const handleRemoveFromCart = (itemId, itemName) => {
    try {
      removeFromCart(itemId);
      toast.success(`${itemName} removed from cart`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      toast.error('Failed to remove item from cart', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleMoveToWishlist = async (item) => {
    try {
      await addToWishlist(item);
      await removeFromCart(item.id);
      toast.info(`${item.name} moved to wishlist`, {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      toast.error('Failed to move item to wishlist', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleUpdateQuantity = (itemId, newQuantity, itemName) => {
    try {
      if (newQuantity >= 1) {
        updateQuantity(itemId, newQuantity);
        toast.success(`${itemName} quantity updated`, {
          position: "top-right",
          autoClose: 1000,
        });
      }
    } catch (error) {
      toast.error('Failed to update quantity', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared successfully', {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      toast.error('Failed to clear cart', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <ToastContainer />
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
          <p className="text-gray-600 mb-8">Browse our products and add some items to your cart</p>
          <Link to="/studentmarketplace">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart ({cart.length} items)</h1>
        <Button 
          variant="outline" 
          onClick={handleClearCart}
        >
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {cart.map((item) => (
            <div 
              key={item.id}
              className="flex items-center space-x-4 bg-white rounded-lg shadow p-4 mb-4"
            >
              <img 
                src={item.image_url || "/api/placeholder/200/200"}
                alt={item.name}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <Link 
                  to={`/product/${item.id}`}
                  className="font-semibold text-lg hover:text-orange-600"
                >
                  {item.name}
                </Link>
                <p className="text-lg font-bold text-orange-600">
                  KES {item.price?.toLocaleString()}
                </p>
                <div className="text-sm text-gray-600">
                  <p>Condition: {item.condition || 'Not specified'}</p>
                  <p>Location: {item.location || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleUpdateQuantity(
                      item.id, 
                      Math.max(1, (item.quantity || 1) - 1),
                      item.name
                    )}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">
                    {item.quantity || 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleUpdateQuantity(
                      item.id, 
                      (item.quantity || 1) + 1,
                      item.name
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <p className="font-medium">
                  Subtotal: KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                </p>

                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveToWishlist(item)}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFromCart(item.id, item.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} items)</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>KES 200.00</span>
              </div>
              <div className="border-t pt-2 font-bold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="text-orange-600">
                    KES {(total + 200).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-4"
              onClick={() => toast.info('Checkout functionality coming soon!', {
                position: "top-center"
              })}
            >
              Proceed to Checkout
            </Button>

            <p className="text-sm text-gray-600 text-center mt-4">
              Free delivery for orders above KES 2,000
            </p>

            <div className="flex flex-col space-y-2 mt-4 pt-4 border-t">
              <Link to="/studentmarketplace">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
              <Link to="/wishlist">
                <Button variant="ghost" className="w-full">
                  View Wishlist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;