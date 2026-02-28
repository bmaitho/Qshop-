// src/components/SellerOrderDetail.jsx
// FIXED VERSION - Uses backend endpoint with commission calculation
// ✅ FIXED: buyer_user_id error in handleContactBuyer

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  MessageCircle,
  DollarSign,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Clock,
  Star
} from 'lucide-react';
import { getDisplayInfo } from '../utils/communicationUtils';
import { sendMessageEmail } from '../utils/sendMessageEmail';

const SellerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [orderItem, setOrderItem] = useState(null);
  const [order, setOrder] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [commissionInfo, setCommissionInfo] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  useEffect(() => {
    // Calculate commission when order item loads
    if (orderItem && orderItem.products) {
      calculateCommission();
    }
  }, [orderItem]);

  const calculateCommission = async () => {
    if (!orderItem || !orderItem.products) return;

    try {
      // Call backend to get commission calculation
      const backendUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${backendUrl}/mpesa/orders/calculate-commission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pricePerUnit: orderItem.products.price,
          quantity: orderItem.quantity
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCommissionInfo(result.commission);
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      // Fallback calculation if backend fails
      const price = orderItem.products.price;
      const quantity = orderItem.quantity;
      const estimatedFee = price * 0.05; // Rough estimate
      
      setCommissionInfo({
        totalProductPrice: price * quantity,
        sellerFee: estimatedFee * quantity,
        totalSellerPayout: (price - estimatedFee) * quantity,
        platformFee: estimatedFee * 2 * quantity
      });
    }
  };


  const handleConfirmBuyerAgreement = async () => {
  try {
    setUpdateInProgress(true);
    
    const { error } = await supabase
      .from('order_items')
      .update({ buyer_agreed: true })
      .eq('id', id);

    if (error) throw error;
    
    toast.success('Buyer agreement confirmed! You can now ship the order.');
    fetchOrderDetails(); // Refresh data
    
  } catch (error) {
    console.error('Error updating buyer agreement:', error);
    toast.error('Failed to confirm agreement');
  } finally {
    setUpdateInProgress(false);
  }
};
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch order item with all relations
      const { data: orderItemData, error: orderItemError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*),
          orders!fk_order_items_order_id(*)
        `)
        .eq('id', id)
        .single();

      if (orderItemError) throw orderItemError;
      
      setOrderItem(orderItemData);
      setOrder(orderItemData.orders);

      // ✅ FIX: Fetch buyer profile using buyer_user_id from order_items
      if (orderItemData.buyer_user_id) {
        const { data: buyerData, error: buyerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', orderItemData.buyer_user_id)
          .single();

        if (!buyerError && buyerData) {
          setBuyer(buyerData);
        } else {
          console.warn('Failed to fetch buyer profile:', buyerError);
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    setUpdateInProgress(true);
    
    try {
      // Update status in database
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Order marked as ${newStatus}`);

      // If marked as delivered, trigger automatic payment via backend
      if (newStatus === 'delivered') {
        await triggerAutomaticPayment();
      }
      
      fetchOrderDetails(); // Refresh data
      
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error('Failed to update order status');
    } finally {
      setUpdateInProgress(false);
    }
  };

  // ✅ Trigger payment via backend endpoint (with commission calculation)
  const triggerAutomaticPayment = async () => {
    try {
      setPaymentProcessing(true);
      
      const backendUrl = import.meta.env.VITE_API_URL;
      
      // ✅ Call the backend endpoint that handles commission calculation
      const response = await fetch(`${backendUrl}/mpesa/orders/trigger-payment/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Payment processing initiated! Seller will receive funds via M-Pesa.');
        
        // Show commission info if available
        if (result.data && result.data.commission) {
          console.log('Commission breakdown:', result.data.commission);
        }
      } else {
        toast.error(`Payment failed: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Payment trigger error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // ✅ FIXED: handleContactBuyer now uses orderItem.buyer_user_id instead of order.user_id
  const handleContactBuyer = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // ✅ FIX: Check if orderItem and buyer_user_id exist
    if (!orderItem || !orderItem.buyer_user_id) {
      toast.error('Cannot send message - buyer information is missing');
      console.error('OrderItem data is invalid:', { orderItem });
      return;
    }

    setSendingMessage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to send messages');
        return;
      }
      
      const buyerInfo = getDisplayInfo(buyer);
      const senderInfo = getDisplayInfo({ full_name: user.user_metadata?.full_name || user.email });
      
      // ✅ FIX: Use orderItem.buyer_user_id instead of order.user_id
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          recipient_id: orderItem.buyer_user_id,  // ✅ Changed from order.user_id
          product_id: orderItem.product_id,
          order_id: orderItem.order_id,
          order_item_id: orderItem.id,
          message: message.trim(),
          sender_name: senderInfo.name,
          recipient_name: buyerInfo.name
        }]);

      if (messageError) throw messageError;

      // Update order item to mark buyer as contacted
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ buyer_contacted: true })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send email notification to buyer (fire-and-forget)
      sendMessageEmail({
        recipientId: orderItem.buyer_user_id,
        senderName: senderInfo.name,
        messageText: message.trim(),
        orderItemId: orderItem.id,
        orderId: orderItem.order_id,
        productId: orderItem.product_id,
      });

      setMessage('');
      toast.success("Message sent successfully! Waiting for buyer response.");
      fetchOrderDetails();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!orderItem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const buyerInfo = buyer ? getDisplayInfo(buyer) : { name: 'Unknown Buyer', initials: '??' };
  const isShipped = orderItem.status === 'shipped';
  const isDelivered = orderItem.status === 'delivered';
  const canShip = orderItem.buyer_contacted && orderItem.buyer_agreed;

  const getStatusBadge = (status) => {
    const variants = {
      'processing': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-amber-100 text-amber-800',
      'delivered': 'bg-green-100 text-green-800',
    };
    
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/myshop', { state: { defaultTab: 'orders' }})}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <Badge className={getStatusBadge(orderItem.status)}>
          {orderItem.status?.toUpperCase()}
        </Badge>
      </div>

      {/* Order Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-2xl font-bold">Order Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Info */}
          <div className="flex gap-4">
            {orderItem.products?.images?.[0] && (
              <img
                src={orderItem.products.images[0]}
                alt={orderItem.products.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{orderItem.products?.name}</h3>
              <p className="text-gray-600">Quantity: {orderItem.quantity}</p>
              <p className="text-lg font-bold text-primary">
                KES {(orderItem.products?.price * orderItem.quantity).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Commission Info */}
          {commissionInfo && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Payment Breakdown</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Total:</span>
                  <span className="font-medium">KES {commissionInfo.totalProductPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee:</span>
                  <span className="font-medium">- KES {commissionInfo.sellerFee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 text-lg font-bold text-green-600">
                  <span>Your Payout:</span>
                  <span>KES {commissionInfo.totalSellerPayout?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Ordered: {new Date(orderItem.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-500" />
              <span>Order ID: {orderItem.id.slice(0, 8)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Buyer Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-semibold text-primary">{buyerInfo.initials}</span>
            </div>
            <span className="font-medium">{buyerInfo.name}</span>
          </div>
          
          {buyer?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{buyer.phone}</span>
            </div>
          )}
          
          {buyer?.campus_location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{buyer.campus_location}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PickUp Mtaani Drop-off Instructions — reads from orderItem (per-seller) */}
      {order?.delivery_method === 'pickup_mtaani' && (
        <Card className="mb-6 border-2 border-blue-300 dark:border-blue-700">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Truck className="h-5 w-5" />
              📦 PickUp Mtaani — Drop-off Required
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop-off location — from orderItem (this seller's origin) or fallback to order */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-2">
                Your Drop-off Point
              </p>
              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {orderItem.pickup_mtaani_origin_name || order.pickup_mtaani_origin_name || 'Pending — check back soon'}
              </p>
              {(orderItem.pickup_mtaani_origin_address || order.pickup_mtaani_origin_address) && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {orderItem.pickup_mtaani_origin_address || order.pickup_mtaani_origin_address}
                </p>
              )}
            </div>

            {/* Tracking code — from orderItem (this seller's parcel) or fallback to order */}
            {(orderItem.pickup_mtaani_tracking_code || order.pickup_mtaani_tracking_code) ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-semibold mb-1">
                  Your Tracking Code
                </p>
                <p className="font-mono font-bold text-2xl text-green-800 dark:text-green-200 tracking-widest">
                  {orderItem.pickup_mtaani_tracking_code || order.pickup_mtaani_tracking_code}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Share this with the PickUp Mtaani agent when dropping off
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-center">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⏳ Tracking code will appear here shortly...
                </p>
              </div>
            )}

            {/* Destination info */}
            {order.pickup_mtaani_destination_name && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Buyer's Collection Point
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {order.pickup_mtaani_destination_name}
                </p>
                {order.pickup_mtaani_destination_town && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.pickup_mtaani_destination_town}
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>⚠️ Instructions:</strong>
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1 ml-4 list-disc">
                <li>Package the item securely</li>
                <li>Take it to <strong>{orderItem.pickup_mtaani_origin_name || order.pickup_mtaani_origin_name || 'your nearest PickUp Mtaani agent'}</strong></li>
                <li>Give the agent tracking code: <strong>{orderItem.pickup_mtaani_tracking_code || order.pickup_mtaani_tracking_code || 'pending'}</strong></li>
                <li>Please drop off within <strong>48 hours</strong></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communication Section */}
      {!isDelivered && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Contact Buyer</h3>
            {!orderItem.buyer_contacted && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                You must contact the buyer before shipping
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Send a message to the buyer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleContactBuyer}
              disabled={sendingMessage}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>

              {orderItem.buyer_contacted && !orderItem.buyer_agreed && (
  <>
    <p className="text-sm text-blue-600 text-center">
      Waiting for buyer confirmation...
    </p>
    <div className="pt-2">
      <p className="text-xs text-gray-600 mb-2 text-center">
        Once the buyer agrees to pickup/delivery in messages:
      </p>
      <Button 
        onClick={handleConfirmBuyerAgreement}
        disabled={updateInProgress}
        variant="outline"
        className="w-full"
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Confirm Buyer Has Agreed
      </Button>
    </div>
  </>
)}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6 space-y-3">
          {!isShipped && !isDelivered && (
            <Button
              onClick={() => handleUpdateOrderStatus('shipped')}
              disabled={!canShip || updateInProgress}
              className="w-full"
              variant={canShip ? "default" : "secondary"}
            >
              <Truck className="h-4 w-4 mr-2" />
              {canShip ? 'Mark as Shipped' : 'Contact buyer first'}
            </Button>
          )}

          {isShipped && !isDelivered && (
            <Button
              onClick={() => handleUpdateOrderStatus('delivered')}
              disabled={updateInProgress || paymentProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {paymentProcessing ? 'Processing Payment...' : 'Mark as Delivered'}
            </Button>
          )}

          {isDelivered && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-900">Order Delivered</p>
              <p className="text-sm text-green-700">
                Payment {orderItem.payment_status === 'completed' ? 'completed' : 'processing'}
              </p>
            </div>
          )}

          {/* Buyer Confirmation Status */}
          {orderItem.status === 'delivered' && (
            <div className="mt-4 p-4 rounded-lg border">
              {!orderItem.buyer_confirmed ? (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Awaiting Buyer Confirmation
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Payment will be released once the buyer confirms delivery
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-200">
                        Delivery Confirmed by Buyer
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Confirmed on {new Date(orderItem.buyer_confirmed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Display Rating */}
                  {orderItem.buyer_rating && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Buyer Rating:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= orderItem.buyer_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold">
                          {orderItem.buyer_rating} / 5
                        </span>
                      </div>

                      {/* Display Review */}
                      {orderItem.buyer_review && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Review:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "{orderItem.buyer_review}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Status */}
                  {orderItem.payment_status && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Payment Status:</p>
                      <Badge className={
                        orderItem.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : orderItem.payment_status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {orderItem.payment_status === 'completed' && 'Payment Sent'}
                        {orderItem.payment_status === 'processing' && 'Processing Payment'}
                        {orderItem.payment_status === 'pending' && 'Payment Pending'}
                        {!['completed', 'processing', 'pending'].includes(orderItem.payment_status) && orderItem.payment_status}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerOrderDetail;