// ✅ COMPLETE Checkout.jsx WITH DELIVERY OPTIONS
// This is the FULL file - replace your entire Checkout.jsx with this

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, PhoneCall, MapPin, Truck, User } from 'lucide-react';
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import { initiateMpesaPayment, checkPaymentStatus } from '../Services/mpesaService';
import { toast } from 'react-toastify';
import { useCart } from '../context/CartContext';
import DeliveryOptionsSelector from './DeliveryOptionsSelector'; // ← NEW IMPORT

const Checkout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [pollingActive, setPollingActive] = useState(false);
  const pollingInterval = useRef(null);

  // Delivery agreement state
  const [agreedToDelivery, setAgreedToDelivery] = useState(false);
  
  // ✅ NEW: Delivery options state
  const [deliveryInfo, setDeliveryInfo] = useState(null);

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
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      
      if (orderData.phone_number) {
        setPhoneNumber(orderData.phone_number);
      }
      
      if (orderData.checkout_request_id) {
        setCheckoutRequestId(orderData.checkout_request_id);
        setPaymentStatus(orderData.payment_status || 'pending');
        
        if (orderData.payment_status === 'pending') {
          setPollingActive(true);
        }
      }

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

  const startStatusPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    let pollCount = 0;
    const maxPolls = 60;

    pollingInterval.current = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        clearInterval(pollingInterval.current);
        setPollingActive(false);
        setPaymentStatus('timeout');
        setPaymentMessage('Payment verification timed out. Please check your M-Pesa messages.');
        return;
      }

      try {
        const result = await checkPaymentStatus(checkoutRequestId);

        if (result.ResultCode === '0') {
          clearInterval(pollingInterval.current);
          setPollingActive(false);
          setPaymentStatus('completed');
          setPaymentMessage('Payment successful!');
          
          await supabase
            .from('orders')
            .update({
              payment_status: 'completed',
              order_status: 'new',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          clearCart();
          
          setTimeout(() => {
            navigate(`/order-confirmation/${orderId}`);
          }, 2000);
        } else if (result.ResultCode && result.ResultCode !== '0') {
          clearInterval(pollingInterval.current);
          setPollingActive(false);
          setPaymentStatus('failed');
          setPaymentMessage(result.ResultDesc || 'Payment failed');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);
  };

  const handlePayment = async () => {
    try {
      // ✅ Validate delivery info selected
      if (!deliveryInfo || deliveryInfo.requires_shop_selection) {
        toast.error('Please select a delivery method and shop location (if required)');
        return;
      }

      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }

      if (!agreedToDelivery) {
        toast.error('Please agree to coordinate delivery with the seller');
        return;
      }

      setProcessing(true);

      // ✅ Update order with delivery info BEFORE payment
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          phone_number: phoneNumber,
          delivery_method: deliveryInfo.delivery_method,
          selected_shop_location_id: deliveryInfo.selected_shop_location_id,
          delivery_fee: deliveryInfo.delivery_fee || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      const paymentResult = await initiateMpesaPayment(
        phoneNumber,
        order.amount,
        orderId
      );

      if (paymentResult.success) {
        setCheckoutRequestId(paymentResult.CheckoutRequestID);
        setPaymentStatus('processing');
        setPaymentMessage('Payment request sent to your phone. Please enter your M-Pesa PIN.');
        setPollingActive(true);

        await supabase
          .from('orders')
          .update({
            checkout_request_id: paymentResult.CheckoutRequestID,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
      } else {
        throw new Error(paymentResult.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setPaymentMessage(error.message || 'Payment initiation failed. Please try again.');
      toast.error('Payment initiation failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusColorClass = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
      case 'timeout':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-gray-500">Loading checkout...</p>
          </div>
        </div>
      </>
    );
  }

  if (!order || orderItems.length === 0) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Order Not Found</AlertTitle>
            <AlertDescription className="text-red-700">
              Unable to find order details. Please return to your cart and try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate('/cart')} className="dark:bg-primary dark:text-white">
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
        <h1 className="text-2xl font-bold mb-6 text-primary dark:text-gray-100">Complete Your Payment</h1>

        {/* Order Summary */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Order Summary</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0">
                      {item.products?.image_url && (
                        <img 
                          src={item.products.image_url} 
                          alt={item.products.name}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-primary dark:text-gray-100">{item.products?.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        KES {(item.price_per_unit * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-primary dark:text-gray-300">
                <span>Subtotal</span>
                <span>KES {order.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2 text-gray-600 dark:text-gray-300">
                <span>Delivery</span>
                <span>KES {deliveryInfo?.delivery_fee?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between font-bold text-primary dark:text-gray-100">
                <span>Total</span>
                <span>KES {((order.amount || 0) + (deliveryInfo?.delivery_fee || 0)).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ NEW: Delivery Options Selector */}
        <DeliveryOptionsSelector 
          orderItems={orderItems}
          onDeliverySelected={setDeliveryInfo}
        />

        {/* Delivery Agreement */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Delivery Arrangement</h2>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="delivery-agreement"
                  checked={agreedToDelivery}
                  onCheckedChange={setAgreedToDelivery}
                />
                <div className="flex-1">
                  <Label htmlFor="delivery-agreement" className="text-base font-medium text-primary dark:text-gray-100">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 mr-2" />
                      Arrange Delivery with Seller
                    </div>
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    I agree to coordinate delivery details directly with the seller after payment is completed.
                  </p>
                </div>
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
               paymentStatus === 'completed' ? 'Payment Successful' :
               paymentStatus === 'timeout' ? 'Payment Timeout' : 'Payment Failed'}
            </AlertTitle>
            <AlertDescription className="ml-2">
              {paymentMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Section */}
        {paymentStatus === 'pending' && (
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Payment Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <div className="flex space-x-2 mt-1">
                    <PhoneCall className="w-5 h-5 text-gray-400 mt-2" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="254712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={processing}
                      className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Enter the phone number to receive the M-Pesa payment prompt
                  </p>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing || !phoneNumber || !agreedToDelivery || !deliveryInfo || deliveryInfo.requires_shop_selection}
                  className="w-full bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>Pay KES {((order.amount || 0) + (deliveryInfo?.delivery_fee || 0)).toFixed(2)}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStatus === 'completed' && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-400">Redirecting to order confirmation...</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Checkout;