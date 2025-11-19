// src/components/SellerOrderDetail.jsx
// FIXED VERSION - Uses backend endpoint with commission calculation

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

      // Fetch buyer profile
      if (orderItemData.orders?.user_id) {
        const { data: buyerData, error: buyerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', orderItemData.orders.user_id)
          .single();

        if (!buyerError && buyerData) {
          setBuyer(buyerData);
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

  // ✅ NEW: Trigger payment via backend endpoint (with commission calculation)
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

  const handleContactBuyer = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingMessage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const buyerInfo = getDisplayInfo(buyer);
      const senderInfo = getDisplayInfo({ full_name: user.user_metadata?.full_name || user.email });
      
      // Create message record with order_item_id link
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          recipient_id: order.user_id,
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
  const canShip = orderItem.buyer_contacted && orderItem.buyer_agreed;
  const isDelivered = orderItem.status === 'delivered';
  const isShipped = orderItem.status === 'shipped';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/myshop')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Shop
      </Button>

      {/* Order Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{orderItem.products?.name}</h1>
              <p className="text-gray-500">Order ID: {orderItem.order_id?.slice(-8)}</p>
            </div>
            <Badge className={
              orderItem.status === 'delivered' ? 'bg-green-500' :
              orderItem.status === 'shipped' ? 'bg-blue-500' :
              'bg-yellow-500'
            }>
              {orderItem.status?.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* ✅ NEW: Commission & Earnings Breakdown */}
      {commissionInfo && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Your Earnings Breakdown
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Product Sale */}
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">
                  Product Sale ({orderItem.quantity}x @ KES {orderItem.products?.price})
                </span>
                <span className="font-semibold">
                  KES {commissionInfo.totalProductPrice?.toFixed(2)}
                </span>
              </div>
              
              {/* Platform Fee */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Platform Fee (Your Share)</span>
                  <p className="text-xs text-gray-400">
                    Split 50/50 with buyer - Total fee: KES {commissionInfo.platformFee?.toFixed(2)}
                  </p>
                </div>
                <span className="text-red-600 font-semibold">
                  -KES {commissionInfo.sellerFee?.toFixed(2)}
                </span>
              </div>
              
              {/* Your Payout */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-green-600">
                <span className="text-lg font-bold text-gray-900">
                  Your M-Pesa Payout
                </span>
                <span className="text-2xl font-bold text-green-600">
                  KES {commissionInfo.totalSellerPayout?.toFixed(2)}
                </span>
              </div>
              
              {/* Payment Status */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">Payment Status</p>
                    <p className="text-sm text-blue-700">
                      {orderItem.payment_status === 'completed' 
                        ? '✅ Paid to your M-Pesa' 
                        : orderItem.payment_status === 'processing'
                        ? '⏳ Payment processing...'
                        : isDelivered
                        ? '🔄 Will be processed automatically'
                        : '📦 Payment after delivery confirmation'}
                    </p>
                  </div>
                  {orderItem.payment_status === 'completed' && (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Order Details</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="font-semibold">{orderItem.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Product Price</p>
              <p className="font-semibold">KES {orderItem.products?.price}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="font-semibold">KES {orderItem.subtotal?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Order Date</p>
              <p className="font-semibold">
                {new Date(orderItem.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Information */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Buyer Information</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span>{buyerInfo.name}</span>
          </div>
          {buyer?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{buyer.phone}</span>
            </div>
          )}
          {buyer?.campus_location && (
            <div className="flex items-center gap-2">
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