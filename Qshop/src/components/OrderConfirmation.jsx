import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Download, ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
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
      toast.error('Failed to load order information');
    } finally {
      setLoading(false);
    }
  };

  const printOrder = () => {
    window.print();
  };

  const copyReceiptNumber = () => {
    if (order?.mpesa_receipt) {
      navigator.clipboard.writeText(order.mpesa_receipt).then(() => {
        setIsCopied(true);
        toast.success('Receipt number copied to clipboard');
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 3000);
      });
    }
  };

  // Format date for better display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
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
                <Badge variant="outline" className={
                  order.payment_status === 'completed' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : order.payment_status === 'pending'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }>
                  {order.payment_status === 'completed' ? 'Paid' : 
                   order.payment_status === 'pending' ? 'Pending' : 
                   'Failed'}
                </Badge>
              </div>
              
              {order.mpesa_receipt && (
                <div className="col-span-2 mt-2">
                  <p className="text-gray-600">Transaction ID / Receipt</p>
                  <div className="flex items-center mt-1">
                    <p className="font-mono">{order.mpesa_receipt}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={copyReceiptNumber}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                          >
                            {isCopied ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCopied ? 'Copied!' : 'Copy receipt number'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-gray-600">Date</p>
                <p>{formatDate(order.payment_date || order.created_at)}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Phone Number</p>
                <p>{order.phone_number || 'Not available'}</p>
              </div>
            </div>
            
            {order.payment_status === 'pending' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                <p className="text-yellow-800">
                  Your payment is still being processed. We will update the status once confirmed.
                </p>
              </div>
            )}
            
            {order.payment_status === 'failed' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                <p className="text-red-800">
                  Payment failed: {order.payment_error || 'An error occurred during payment processing'}
                </p>
                <p className="mt-2">
                  <Link to={`/checkout/${orderId}`}>
                    <Button size="sm" variant="outline">
                      Try Payment Again
                    </Button>
                  </Link>
                </p>
              </div>
            )}
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