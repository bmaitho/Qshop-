// src/components/Checkout.jsx
// ✅ FIXED: Properly checks for mpesa_receipt before confirming payment completion
// ✅ FIXED: Added validation to ensure receipt exists before moving to next step
// ✅ FIXED: Extended polling to wait for receipt to be saved

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, PhoneCall, Truck } from 'lucide-react';
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import { initiateMpesaPayment } from '../Services/mpesaService';
import { toast } from 'react-toastify';
import { useCart } from '../context/CartContext';
import DeliveryOptionsSelector from './DeliveryOptionsSelector';
import { createPickupMtaaniParcel } from '../utils/pickupMtaaniHelper';

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
  const [mpesaReceipt, setMpesaReceipt] = useState(''); // ✅ Track receipt separately

  // ✅ Track whether payment has been initiated to guard delivery selector
  const paymentInitiated = useRef(false);

  // Delivery states
  const [agreedToDelivery, setAgreedToDelivery] = useState(false);
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
    if (!pollingActive && pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [pollingActive]);

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
      
      // ✅ If order already has receipt, set it
      if (orderData.mpesa_receipt) {
        setMpesaReceipt(orderData.mpesa_receipt);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(
            name,
            price
          ),
          seller:seller_id(
            full_name,
            email
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData);

      if (orderData.phone_number) {
        setPhoneNumber(orderData.phone_number);
      }

    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ GUARD — skip DB writes if payment has already been initiated
  const handleDeliverySelected = async (info) => {
    setDeliveryInfo(info);

    if (paymentInitiated.current) {
      console.log('⚠️ Payment already initiated — skipping delivery DB update');
      return;
    }

    if (!info || !orderId) return;

    const productSubtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const deliveryFee = info.delivery_fee || 0;
    const newTotal = productSubtotal + deliveryFee;

    const updateData = {
      delivery_method: info.delivery_method,
      delivery_fee: deliveryFee,
      amount: newTotal,
      pickup_mtaani_destination_id: null,
      pickup_mtaani_destination_name: null,
      pickup_mtaani_destination_address: null,
      pickup_mtaani_destination_town: null,
      pickup_mtaani_business_id: null,
      updated_at: new Date().toISOString()
    };

    if (info.delivery_method === 'pickup_mtaani') {
      updateData.pickup_mtaani_destination_id = info.pickup_mtaani_destination_id || null;
      updateData.pickup_mtaani_destination_name = info.pickup_mtaani_destination_name || null;
      updateData.pickup_mtaani_destination_address = info.pickup_mtaani_destination_address || null;
      updateData.pickup_mtaani_destination_town = info.pickup_mtaani_destination_town || null;
      updateData.pickup_mtaani_business_id = info.pickup_mtaani_business_id || null;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('Error saving delivery selection:', error);
    }
  };

  // ✅ CRITICAL FIX: Poll payment status and wait for mpesa_receipt
  const startStatusPolling = () => {
    let pollCount = 0;
    const maxPolls = 60; // Extended to 3 minutes at 3s intervals

    pollingInterval.current = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        clearInterval(pollingInterval.current);
        setPollingActive(false);
        setPaymentStatus('timeout');
        setPaymentMessage('Payment request timed out. Please check your M-Pesa messages.');
        return;
      }

      try {
        // ✅ Read payment_status and mpesa_receipt directly from the orders table
        const { data: orderRow, error: dbError } = await supabase
          .from('orders')
          .select('payment_status, mpesa_receipt, order_status')
          .eq('id', orderId)
          .single();

        if (dbError) {
          console.error('Error polling order status:', dbError);
          return;
        }

        console.log(`Poll #${pollCount}: payment_status=${orderRow.payment_status}, receipt=${orderRow.mpesa_receipt}`);

        // ✅ Check if payment is completed AND we have a receipt
        if (orderRow.payment_status === 'completed') {
          
          // ✅ CRITICAL: Verify that we actually have a receipt code
          if (orderRow.mpesa_receipt) {
            // Store the receipt
            setMpesaReceipt(orderRow.mpesa_receipt);
            
            // Clear polling
            clearInterval(pollingInterval.current);
            setPollingActive(false);
            setPaymentStatus('completed');
            setPaymentMessage(`Payment successful! Receipt: ${orderRow.mpesa_receipt}. Processing your order...`);

            // Update order_items status
            await supabase
              .from('order_items')
              .update({ status: 'processing' })
              .eq('order_id', orderId);

            // Create PickUp Mtaani parcel if needed
            if (deliveryInfo?.delivery_method === 'pickup_mtaani') {
              setPaymentMessage('Payment successful! Creating delivery booking...');
              try {
                const parcelResult = await createPickupMtaaniParcel(orderId);
                if (parcelResult.success && !parcelResult.skipped) {
                  toast.success(`Delivery booked! Tracking code: ${parcelResult.trackingCode}`);
                } else if (!parcelResult.success) {
                  console.warn('Failed to create parcel:', parcelResult.error);
                  toast.warning('Order paid but delivery booking failed. Please contact support.');
                }
              } catch (parcelError) {
                console.error('Parcel creation error:', parcelError);
              }
            }

            clearCart();

            // ✅ Navigate after showing receipt
            setTimeout(() => {
              navigate(`/order-confirmation/${orderId}`);
            }, 3000);
          } else {
            // Payment is marked completed but no receipt yet - keep polling
            console.log('Payment completed but waiting for receipt code...');
            setPaymentMessage('Payment confirmed! Recording transaction details...');
          }

        } else if (orderRow.payment_status === 'failed') {
          clearInterval(pollingInterval.current);
          setPollingActive(false);
          setPaymentStatus('failed');
          setPaymentMessage('Payment failed. Please try again.');
        }
        // If still 'pending', keep polling

      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);
  };

  const handlePayment = async () => {
    try {
      if (!deliveryInfo) {
        toast.error('Please select a delivery method');
        return;
      }

      if (deliveryInfo.delivery_method === 'pickup_mtaani') {
        if (deliveryInfo.requires_pickup_point_selection) {
          toast.error('Please select a PickUp Mtaani pickup point');
          return;
        }
        const totalAmount = (order?.amount || 0) + (deliveryInfo.delivery_fee || 0);
        if (totalAmount < 200) {
          toast.error('Minimum order value for PickUp Mtaani delivery is KES 200');
          return;
        }
      }

      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }

      if (!agreedToDelivery) {
        toast.error('Please agree to the delivery arrangement');
        return;
      }

      setProcessing(true);
      paymentInitiated.current = true;

      const productSubtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
      const deliveryFee = deliveryInfo.delivery_fee || 0;
      const totalAmount = productSubtotal + deliveryFee;

      const updateData = {
        phone_number: phoneNumber,
        delivery_method: deliveryInfo.delivery_method,
        delivery_fee: deliveryFee,
        amount: totalAmount,
        pickup_mtaani_destination_id: null,
        pickup_mtaani_destination_name: null,
        pickup_mtaani_destination_address: null,
        pickup_mtaani_destination_town: null,
        pickup_mtaani_business_id: null,
        updated_at: new Date().toISOString()
      };

      if (deliveryInfo.delivery_method === 'pickup_mtaani') {
        updateData.pickup_mtaani_destination_id = deliveryInfo.pickup_mtaani_destination_id || null;
        updateData.pickup_mtaani_destination_name = deliveryInfo.pickup_mtaani_destination_name || null;
        updateData.pickup_mtaani_destination_address = deliveryInfo.pickup_mtaani_destination_address || null;
        updateData.pickup_mtaani_destination_town = deliveryInfo.pickup_mtaani_destination_town || null;
        updateData.pickup_mtaani_business_id = deliveryInfo.pickup_mtaani_business_id || null;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) throw updateError;

      const paymentResult = await initiateMpesaPayment(
        phoneNumber,
        totalAmount,
        orderId
      );

      if (paymentResult.success) {
        const reqId = paymentResult.data?.CheckoutRequestID || paymentResult.CheckoutRequestID;
        setCheckoutRequestId(reqId);
        setPaymentStatus('processing');
        setPaymentMessage('Payment request sent to your phone. Please enter your M-Pesa PIN.');
        setPollingActive(true);
        startStatusPolling();
      } else {
        throw new Error(paymentResult.error || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setPaymentStatus('failed');
      setPaymentMessage(error.message || 'Payment failed');
      paymentInitiated.current = false;
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing': return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
      case 'timeout': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusColorClass = () => {
    switch (paymentStatus) {
      case 'processing': return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case 'completed': return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'failed':
      case 'timeout': return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      default: return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200';
    }
  };

  const productSubtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const displayTotal = productSubtotal + (deliveryInfo?.delivery_fee || 0);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Order not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Complete Your Payment
          </h1>

          {/* Order Summary */}
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Order Summary</h2>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.products?.name} (x{item.quantity})
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      KES {item.subtotal}
                    </span>
                  </div>
                ))}

                {deliveryInfo && deliveryInfo.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm border-t pt-2 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Delivery Fee ({deliveryInfo.delivery_method === 'pickup_mtaani' ? 'PickUp Mtaani' : 'Delivery'})
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      KES {deliveryInfo.delivery_fee}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-semibold border-t pt-2 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-gray-900 dark:text-gray-100">KES {displayTotal}</span>
                </div>
              </div>
              
              {/* ✅ Show receipt if available */}
              {mpesaReceipt && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-300 font-mono">
                    M-Pesa Receipt: {mpesaReceipt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <DeliveryOptionsSelector
            orderItems={orderItems}
            onDeliverySelected={handleDeliverySelected}
          />

          {/* Phone Number */}
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    M-Pesa Phone Number
                  </div>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  disabled={processing || paymentStatus === 'completed'}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your M-Pesa number in the format 254XXXXXXXXX
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Agreement */}
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="delivery-agreement"
                  checked={agreedToDelivery}
                  onCheckedChange={setAgreedToDelivery}
                  disabled={processing || paymentStatus === 'completed'}
                />
                <div className="flex-1">
                  <Label htmlFor="delivery-agreement" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                    I understand the delivery arrangement
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {deliveryInfo?.delivery_method === 'pickup_mtaani'
                      ? 'You will receive tracking information after payment. Seller will drop the parcel at their nearest PickUp Mtaani agent.'
                      : 'You agree to coordinate delivery details with the seller after payment is completed.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          {paymentStatus !== 'pending' && paymentMessage && (
            <Alert className={`mb-6 ${getStatusColorClass()}`}>
              {getStatusIcon()}
              <AlertTitle className="ml-2">
                {paymentStatus === 'processing' ? 'Payment Processing' :
                 paymentStatus === 'completed' ? 'Payment Successful' :
                 paymentStatus === 'timeout' ? 'Request Timeout' : 'Payment Failed'}
              </AlertTitle>
              <AlertDescription className="ml-7">{paymentMessage}</AlertDescription>
            </Alert>
          )}

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            disabled={processing || pollingActive || paymentStatus === 'completed' || !deliveryInfo || !agreedToDelivery}
            className="w-full"
            size="lg"
          >
            {processing || pollingActive ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {paymentStatus === 'processing' && !mpesaReceipt ? 'Waiting for payment...' : 'Processing...'}
              </>
            ) : paymentStatus === 'completed' ? (
              'Payment Completed'
            ) : (
              `Pay KES ${displayTotal}`
            )}
          </Button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment.
          </p>
        </div>
      </div>
    </>
  );
};

export default Checkout;