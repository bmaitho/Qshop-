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
import DeliveryOptionsSelector from './DeliveryOptionsSelector';
import { createPickupMtaaniParcel } from '../utils/pickupMtaaniHelper';
import { img } from '../utils/ImageUtils';

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
  
  // Delivery states (from version 2)
  const [agreedToDelivery, setAgreedToDelivery] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  
  // Track whether payment has been initiated to guard delivery selector
  const paymentInitiated = useRef(false);

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

  // Status polling effect (KEEPING VERSION 1 LOGIC - WORKING)
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
      
      if (orderData.phone_number) {
        setPhoneNumber(orderData.phone_number);
      }
      
      if (orderData.checkout_request_id) {
        setCheckoutRequestId(orderData.checkout_request_id);
        setPaymentStatus(orderData.payment_status || 'pending');
        
        if (orderData.payment_status === 'pending') {
          setPollingActive(true);
        } else if (orderData.payment_status === 'completed') {
          clearCart();
          navigate(`/order-confirmation/${orderId}`);
        }
      }

      // Fetch order items with product and seller information
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*),
          profiles:seller_id(id, full_name, campus_location, is_seller, created_at, email:public_email, phone:public_phone)
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

  // KEEPING VERSION 1 POLLING LOGIC (WORKING)
  const startStatusPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    checkPaymentStatusFromAPI();
    
    pollingInterval.current = setInterval(() => {
      checkPaymentStatusFromAPI();
    }, 5000);
  };

  // KEEPING VERSION 1 PAYMENT STATUS CHECK (WORKING)
  const checkPaymentStatusFromAPI = async () => {
    try {
      const response = await checkPaymentStatus(checkoutRequestId);
      
      if (response.success) {
        const { paymentStatus: newStatus, receipt } = response.data.data;
        
        setPaymentStatus(newStatus);
        
        if (newStatus === 'completed' || newStatus === 'failed') {
          setPollingActive(false);
          
          if (newStatus === 'completed') {
            setPaymentMessage(`Payment successful! M-Pesa receipt: ${receipt}`);
            toast.success('Payment completed successfully!');
            
            // Create PickUp Mtaani parcel if needed (new feature from version 2)
            if (deliveryInfo?.delivery_method === 'pickup_mtaani') {
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

  // New function from version 2 for handling delivery selection
  const handleDeliverySelected = async (info) => {
    setDeliveryInfo(info);

    if (paymentInitiated.current) {
      console.log('Payment already initiated — skipping delivery DB update');
      return;
    }

    if (!info || !orderId || info.requires_pickup_point_selection) return;

    try {
      await saveDelivery(info);
    } catch (error) {
      console.error('Error saving delivery selection:', error);
    }
  };

  // The backend sets delivery and recomputes the order total (item prices
  // from the database, PickUp Mtaani fee calculated server-side).
  const saveDelivery = async (info, phone) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/buyer-orders/checkout/${orderId}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        deliveryMethod: info.delivery_method,
        destinationId: info.pickup_mtaani_destination_id || null,
        phoneNumber: phone || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.error || 'Could not update delivery');
    setOrder((o) => (o ? { ...o, amount: json.amount, delivery_fee: json.deliveryFee } : o));
    return json;
  };

  // Modified handleInitiatePayment to include delivery info from version 2
  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!agreedToDelivery) {
      toast.error('Please confirm delivery arrangements');
      return;
    }

    // Validate delivery selection
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
    
    setProcessing(true);
    paymentInitiated.current = true;
    setPaymentMessage('');
    
    try {
      // Save delivery and get the server-calculated total; M-Pesa is charged
      // the stored order amount, not this number.
      const { amount: totalAmount } = await saveDelivery(deliveryInfo, phoneNumber);

      // KEEPING VERSION 1 PAYMENT INITIATION (WORKING)
      const response = await initiateMpesaPayment(
        phoneNumber,
        totalAmount,
        orderId,
        `Order #${orderId.substring(0, 8)}`
      );

      if (response.success) {
        const checkoutId = response.data?.data?.CheckoutRequestID;
        
        if (checkoutId) {
          setCheckoutRequestId(checkoutId);
          setPaymentStatus('processing');
          setPaymentMessage('Payment request sent. Please check your phone for the M-Pesa prompt.');
          toast.info('Please check your phone for the M-Pesa prompt');
          
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
      paymentInitiated.current = false;
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
        return 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case 'completed':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'failed':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
    }
  };

  // Calculate total with delivery fee
  const productSubtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const displayTotal = productSubtotal + (deliveryInfo?.delivery_fee || 0);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <Alert variant="destructive" className="dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="dark:text-red-200">Error</AlertTitle>
            <AlertDescription className="dark:text-red-300">
              Order not found. Please return to your cart and try again.
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

        {/* Order Summary with Location Info - from version 1 */}
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
                          src={img(item.products.image_url, 96)} 
                          alt={item.products.name}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-primary dark:text-gray-100">{item.products?.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quantity: {item.quantity} × KES {item.price_per_unit?.toLocaleString()}
                      </p>
                      
                      {/* Location Information */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                          <span>Product Location: {item.products?.location || 'Not specified'}</span>
                        </div>
                        {item.profiles && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <User className="w-4 h-4 mr-1 text-gray-500" />
                            <span>Seller: {item.profiles.full_name || 'Anonymous'}</span>
                            {item.profiles.campus_location && (
                              <span className="ml-2">({item.profiles.campus_location})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary dark:text-gray-100">KES {item.subtotal?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-4">
              <div className="flex justify-between mb-2 text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>KES {productSubtotal.toFixed(2)}</span>
              </div>
              {deliveryInfo && deliveryInfo.delivery_fee > 0 && (
                <div className="flex justify-between mb-2 text-gray-600 dark:text-gray-300">
                  <span>Delivery Fee ({deliveryInfo.delivery_method === 'pickup_mtaani' ? 'PickUp Mtaani' : 'Delivery'})</span>
                  <span>KES {deliveryInfo.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-primary dark:text-gray-100">
                <span>Total</span>
                <span>KES {displayTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Options - from version 2 */}
        <DeliveryOptionsSelector
          orderItems={orderItems}
          onDeliverySelected={handleDeliverySelected}
        />

        {/* Delivery Agreement - updated from version 2 */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Delivery Arrangement</h2>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="delivery-agreement"
                  checked={agreedToDelivery}
                  onCheckedChange={setAgreedToDelivery}
                  disabled={processing || paymentStatus === 'completed'}
                />
                <div className="flex-1">
                  <Label htmlFor="delivery-agreement" className="text-base font-medium text-primary dark:text-gray-100">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 mr-2" />
                      {deliveryInfo?.delivery_method === 'pickup_mtaani' 
                        ? 'I agree to PickUp Mtaani delivery terms' 
                        : 'Arrange Delivery with Seller'}
                    </div>
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {deliveryInfo?.delivery_method === 'pickup_mtaani'
                      ? 'You will receive tracking information after payment. Seller will drop the parcel at their nearest PickUp Mtaani agent.'
                      : 'I agree to coordinate delivery details directly with the seller after payment is completed.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Alert - from version 1 */}
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

        {/* Payment Details - from version 1 with version 2 improvements */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Payment Details</h2>
            <form onSubmit={handleInitiatePayment}>
              <div className="mb-4">
                <Label htmlFor="phone" className="mb-2 block text-primary dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    Phone Number (M-Pesa)
                  </div>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 07XXXXXXXX or 2547XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                  disabled={processing || paymentStatus === 'processing' || paymentStatus === 'completed'}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter the phone number registered with M-Pesa (format: 07XX or 2547XX)
                </p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
                <p className="text-sm flex items-start text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                  <span>
                    You will receive an M-Pesa payment prompt on your phone.
                    Please enter your PIN to complete the payment.
                  </span>
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                disabled={processing || paymentStatus === 'processing' || paymentStatus === 'completed' || !deliveryInfo || !agreedToDelivery}
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
                  `Pay KES ${displayTotal.toFixed(2)}`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/studentmarketplace')}
            className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => fetchOrderDetails()}
            disabled={processing}
            variant="outline"
            className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Refresh Status
          </Button>
        </div>
      </div>
    </>
  );
};

export default Checkout;