// src/components/Checkout.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import PaymentSimulator from './PaymentSimulator';

const Checkout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*)
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    navigate(`/order-confirmation/${orderId}`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <p className="text-center">Order not found</p>
        </div>
      </>
    );
  }

  // If payment is already completed, redirect to confirmation
  if (order.payment_status === 'completed') {
    navigate(`/order-confirmation/${orderId}`);
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 mt-12">
        <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                  {item.products?.image_url && (
                     <img 
                       src={item.products.image_url} 
                       alt={item.products.name}
                       className="w-full h-full object-cover rounded"
                     />
                   )}
                 </div>
                 <div className="flex-1">
                   <h3 className="font-medium">{item.products?.name}</h3>
                   <p className="text-sm text-gray-500">
                     Quantity: {item.quantity}
                   </p>
                 </div>
                 <div className="text-right">
                   <p className="font-medium">KES {item.subtotal?.toFixed(2)}</p>
                 </div>
               </div>
             ))}
           </div>

           <div className="border-t mt-6 pt-4">
             <div className="flex justify-between mb-2">
               <span className="text-gray-600">Subtotal</span>
               <span>KES {order.amount?.toFixed(2)}</span>
             </div>
             <div className="flex justify-between mb-2">
               <span className="text-gray-600">Delivery</span>
               <span>KES 0.00</span>
             </div>
             <div className="flex justify-between font-bold">
               <span>Total</span>
               <span>KES {order.amount?.toFixed(2)}</span>
             </div>
           </div>
         </CardContent>
       </Card>

       <Card className="mb-6">
         <CardContent className="p-6">
           <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
           <div className="mb-4">
             <p className="text-sm text-gray-600 mb-2">
               An M-Pesa payment request has been sent to:
             </p>
             <p className="font-medium">{order.phone_number}</p>
           </div>
           
           <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
             <p className="text-sm">
               Please check your phone for the M-Pesa payment prompt and complete the payment.
               Once completed, your order will be processed.
             </p>
           </div>
           
           {/* Payment Simulator for development */}
           <PaymentSimulator 
             orderId={order.id} 
             amount={order.amount} 
             onSuccess={handlePaymentSuccess}
           />
         </CardContent>
       </Card>

       <div className="flex justify-between mt-8">
         <Button
           variant="outline"
           onClick={() => navigate('/studentmarketplace')}
         >
           Continue Shopping
         </Button>
         <Button
           onClick={() => fetchOrderDetails()}
         >
           Check Payment Status
         </Button>
       </div>
     </div>
   </>
 );
};

export default Checkout;