// src/components/OrderConfirmation.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Download, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';

const OrderConfirmation = () => {
  const { orderId } = useParams();
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

  const printOrder = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
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

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 mt-12">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been received.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Order #{orderId.substring(0, 8)}
          </p>
        </div>

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
            <h2 className="text-lg font-semibold mb-4">Payment Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Payment Method</p>
                <p>M-Pesa</p>
              </div>
              <div>
                <p className="text-gray-600">Payment Status</p>
                <p className="capitalize">{order.payment_status}</p>
              </div>
              <div>
                <p className="text-gray-600">Transaction ID</p>
                <p>{order.mpesa_receipt || 'Pending'}</p>
              </div>
              <div>
                <p className="text-gray-600">Date</p>
                <p>{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={printOrder}
          >
            <Download className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
          <Link to="/studentmarketplace" className="flex-1">
            <Button className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default OrderConfirmation;