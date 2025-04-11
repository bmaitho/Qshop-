import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, PhoneCall } from 'lucide-react';
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import { initiateMpesaPayment, checkPaymentStatus } from '../Services/mpesaService';
import { toast } from 'react-toastify';

const Checkout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, completed, failed
  const [paymentMessage, setPaymentMessage] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [pollingActive, setPollingActive] = useState(false);
  const pollingInterval = useRef(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // Status polling effect
  useEffect(() => {
    if (pollingActive && checkoutRequestId) {
      startStatusPolling();
    } else if (!pollingActive && pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [pollingActive, checkoutRequestId]);

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
      
      // If the order already has a phone number, use it as default
      if (orderData.phone_number) {
        setPhoneNumber(orderData.phone_number);
      }
      
      // If the order has a checkout request ID, set it and check status
      if (orderData.checkout_request_id) {
        setCheckoutRequestId(orderData.checkout_request_id);
        setPaymentStatus(orderData.payment_status || 'pending');
        
        // If payment is still pending, start polling for status
        if (orderData.payment_status === 'pending') {
          setPollingActive(true);
        }
        // If payment completed or failed, redirect accordingly
        else if (orderData.payment_status === 'completed') {
          navigate(`/order-confirmation/${orderId}`);
        }
      }

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
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = () => {
    // Clear any existing interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Check immediately once
    checkPaymentStatusFromAPI();
    
    // Then set up polling every 5 seconds
    pollingInterval.current = setInterval(() => {
      checkPaymentStatusFromAPI();
    }, 5000); // Check every 5 seconds
  };

  const checkPaymentStatusFromAPI = async () => {
    try {
      const response = await checkPaymentStatus(checkoutRequestId);
      
      if (response.success) {
        const { paymentStatus: newStatus, receipt } = response.data.data;
        
        setPaymentStatus(newStatus);
        
        // If payment completed or failed, stop polling
        if (newStatus === 'completed' || newStatus === 'failed') {
          setPollingActive(false);
          
          if (newStatus === 'completed') {
            setPaymentMessage(`Payment successful! M-Pesa receipt: ${receipt}`);
            toast.success('Payment completed successfully!');
            
            // Navigate to confirmation after a short delay
            setTimeout(() => {
              navigate(`/order-confirmation/${orderId}`);
            }, 2000);
          } else {
            setPaymentMessage('Payment failed. Please try again.');
            toast.error('Payment failed. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    
    setProcessing(true);
    setPaymentMessage('');
    
    try {
      const response = await initiateMpesaPayment(
        phoneNumber,
        parseInt(order.amount),
        orderId,
        `Order #${orderId.substring(0, 8)}`
      );

      if (response.success) {
        // Extract checkout request ID
        const checkoutId = response.data?.data?.CheckoutRequestID;
        
        if (checkoutId) {
          setCheckoutRequestId(checkoutId);
          setPaymentStatus('processing');
          setPaymentMessage('Payment request sent. Please check your phone for the M-Pesa prompt.');
          toast.info('Please check your phone for the M-Pesa prompt');
          
          // Start polling for status updates
          setPollingActive(true);
        } else {
          throw new Error('No checkout request ID received');
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('failed');
      setPaymentMessage(error.message || 'Failed to initiate payment. Please try again.');
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <PhoneCall className="h-6 w-6 text-blue-500" />;
    }
  };

  const getStatusColorClass = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'completed':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'failed':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Order not found. Please return to your cart and try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate('/cart')}>
              Return to Cart
            </Button>
          </div>
        </div>
      </>
    );
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

        {/* Payment Status Alert */}
        {paymentStatus !== 'pending' && paymentMessage && (
          <Alert className={`mb-6 ${getStatusColorClass()}`}>
            {getStatusIcon()}
            <AlertTitle className="ml-2">
              {paymentStatus === 'processing' ? 'Payment Processing' : 
               paymentStatus === 'completed' ? 'Payment Successful' : 'Payment Failed'}
            </AlertTitle>
            <AlertDescription>
              {paymentMessage}
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
            <form onSubmit={handleInitiatePayment}>
              <div className="mb-4">
                <Label htmlFor="phone" className="mb-2 block">Phone Number (M-Pesa)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 07XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full"
                  disabled={processing || paymentStatus === 'processing' || paymentStatus === 'completed'}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-yellow-600" />
                  <span>
                    You will receive an M-Pesa payment prompt on your phone.
                    Please enter your PIN to complete the payment.
                  </span>
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={processing || paymentStatus === 'processing' || paymentStatus === 'completed'}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : paymentStatus === 'processing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for M-Pesa...
                  </>
                ) : paymentStatus === 'completed' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Payment Complete
                  </>
                ) : (
                  `Pay KES ${order.amount?.toFixed(2)}`
                )}
              </Button>
            </form>
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
            disabled={processing}
          >
            Refresh Status
          </Button>
        </div>
      </div>
    </>
  );
};

export default Checkout;