import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
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

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-8">Browse our products and add some items to your cart</p>
            <Link to="/">
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
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cart.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center space-x-4 border-b py-4"
              >
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <Link 
                    to={`/product/${item.id}`}
                    className="font-semibold hover:text-orange-600"
                  >
                    {item.name}
                  </Link>
                  <p className="text-gray-600">KES {item.price}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>KES {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>KES 200.00</span>
                </div>
                <div className="border-t pt-2 font-bold">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>KES {(total + 200).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button className="w-full mb-2">Proceed to Checkout</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Clear Cart
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Cart</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove all items from your cart?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button 
                      variant="destructive" 
                      onClick={clearCart}
                    >
                      Clear Cart
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;