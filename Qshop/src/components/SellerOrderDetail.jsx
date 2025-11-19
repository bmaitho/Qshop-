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
  AlertCircle
} from 'lucide-react';
import { getDisplayInfo } from '../utils/communicationUtils';

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
      const response = await fetch(`${backendUrl}/orders/calculate-commission`, {
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
      const response = await fetch(`${backendUrl}/orders/trigger-payment/${id}`, {
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
          onClick={() => navigate('/seller/orders')}
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
              <p className="text-sm text-blue-600 text-center">
                Waiting for buyer confirmation...
              </p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerOrderDetail;