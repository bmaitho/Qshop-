import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2 } from 'lucide-react';
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
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

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

  const handleRemoveFromCart = (itemId, itemName) => {
    removeFromCart(itemId);
    cartToasts.removeSuccess(itemName);
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    updateQuantity(itemId, newQuantity);
    cartToasts.updateSuccess();
  };

  const handleClearCart = () => {
    clearCart();
    cartToasts.clearSuccess();
  };

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
                    onClick={() => handleUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleRemoveFromCart(item.id, item.name)}
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
                  <span>KES {DELIVERY_FEE.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 font-bold">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>KES {(total + DELIVERY_FEE).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* M-Pesa Payment Dialog */}
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mb-2">Pay with M-Pesa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>M-Pesa Payment</DialogTitle>
                    <DialogDescription>
                      Enter your phone number to receive the payment prompt
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleMpesaPayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g., 0712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        pattern="^(254|\+254|0)([7][0-9]{8})$"
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">
                        Format: 0712345678 or 254712345678
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">Amount to Pay</div>
                      <div className="text-2xl font-bold">
                        KES {(total + DELIVERY_FEE).toFixed(2)}
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Pay Now"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

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
                      onClick={handleClearCart}
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