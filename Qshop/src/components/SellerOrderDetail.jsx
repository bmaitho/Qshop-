// src/components/SellerOrderDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, CheckCircle, AlertCircle, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { updateOrderStatus } from '../utils/orderUtils';
import { canMarkAsShipped, getCommunicationStatus, getDisplayInfo } from '../utils/communicationUtils';
import { toast } from 'react-toastify';
import Navbar from './Navbar';

const SellerOrderDetail = () => {
  const { id } = useParams(); // order_item id
  const [orderItem, setOrderItem] = useState(null);
  const [order, setOrder] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [logs, setLogs] = useState([]);

  // Helper function to add logs
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    setLogs(prev => [...prev.slice(-4), logEntry]); // Keep last 5 logs
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      addLog(`Fetching order details for ID: ${id}`, 'info');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Fetch the order item with related data including communication fields
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!order_items_order_id_fkey(*),
          products(*)
        `)
        .eq('id', id)
        .eq('seller_id', user.id)
        .single();
      
      if (itemError) throw itemError;
      setOrderItem(itemData);
      addLog(`✅ Order item loaded with status: ${itemData.status}`, 'success');
      
      if (itemData?.orders) {
        setOrder(itemData.orders);
        addLog(`✅ Order data loaded: ${itemData.orders.id}`, 'success');
        
        // Fetch buyer info with better error handling
        try {
          const { data: buyerData, error: buyerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', itemData.orders.user_id)
            .maybeSingle();
            
          if (buyerData) {
            setBuyer(buyerData);
            addLog(`✅ Buyer info loaded: ${buyerData.full_name || buyerData.email}`, 'success');
          } else if (buyerError) {
            console.warn(`Error fetching buyer profile: ${buyerError.message}`);
            addLog(`⚠️ Buyer profile error: ${buyerError.message}`, 'warning');
          }
        } catch (e) {
          console.error('Error fetching buyer details:', e);
          addLog(`❌ Error fetching buyer: ${e.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      addLog(`❌ Error fetching order details: ${error.message}`, 'error');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    addLog(`Starting status update to: ${newStatus}`, 'info');
    setUpdateInProgress(true);
    
    try {
      // Update status in Supabase first
      addLog(`Updating order status in database to: ${newStatus}`, 'info');
      
      const { data, error } = await supabase
        .from('order_items')
        .update({ 
          status: newStatus,
          ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {})
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      addLog(`✅ Database updated successfully`, 'success');
      toast.success(`Order marked as ${newStatus}`);

      // If marked as delivered, trigger B2C payment manually
      if (newStatus === 'delivered') {
        addLog(`🎯 Status is DELIVERED - triggering B2C payment...`, 'success');
        await triggerB2CPayment();
      }
      
      addLog(`Refreshing order details...`, 'info');
      fetchOrderDetails(); // Refresh data
      
    } catch (error) {
      console.error("Error updating order status:", error);
      addLog(`❌ Error updating status: ${error.message}`, 'error');
      toast.error('Failed to update order status');
    } finally {
      setUpdateInProgress(false);
      addLog(`Status update process completed`, 'info');
    }
  };

  // Function to manually trigger B2C payment
  const triggerB2CPayment = async () => {
    try {
      addLog(`Getting seller profile for B2C payment...`, 'info');
      
      // Get seller profile (current user)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: sellerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (profileError || !sellerProfile?.phone) {
        throw new Error('Seller phone number not found in profile');
      }

      addLog(`Seller phone: ${sellerProfile.phone}`, 'info');
      
      // Prepare B2C payment data
      const paymentData = {
        phoneNumber: sellerProfile.phone,
        amount: orderItem.quantity * orderItem.price, // Total amount
        orderId: order.id,
        orderItemId: orderItem.id,
        sellerId: user.id,
        remarks: `Payment for order ${order.id}`
      };

      addLog(`Calling B2C API with data: ${JSON.stringify(paymentData)}`, 'info');

      // Call the B2C API
      const response = await fetch('/api/mpesa/b2c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (response.ok) {
        addLog(`✅ B2C API Success: ${result.message}`, 'success');
        addLog(`Transaction ID: ${result.transactionId}`, 'success');
        toast.success(`B2C Payment initiated! Transaction ID: ${result.transactionId || 'N/A'}`);
      } else {
        addLog(`❌ B2C API Error: ${result.error}`, 'error');
        toast.error(`B2C Failed: ${result.error}`);
      }

    } catch (error) {
      addLog(`❌ B2C Trigger Error: ${error.message}`, 'error');
      toast.error(`B2C Error: ${error.message}`);
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
          order_item_id: orderItem.id, // Link to specific order item
          message: message.trim(),
          sender_name: senderInfo.name,
          recipient_name: buyerInfo.name
        }]);

      if (messageError) throw messageError;

      // Update order item to mark buyer as contacted
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ 
          buyer_contacted: true,
          // Don't update buyer_agreed here - wait for buyer response
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      setMessage('');
      toast.success("Message sent successfully! Waiting for buyer response.");
      fetchOrderDetails(); // Refresh to show updated status
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Simulate buyer response for testing (remove in production)
  const simulateBuyerResponse = async () => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ buyer_agreed: true })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Buyer agreed! You can now ship the order.");
      fetchOrderDetails();
    } catch (error) {
      console.error('Error simulating buyer response:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 my-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 w-1/2 mb-6 rounded"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  if (!orderItem) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 my-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
            <p className="mb-4">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link to="/myshop">
              <Button>Back to My Shop</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const commStatus = getCommunicationStatus(orderItem);
  const buyerInfo = getDisplayInfo(buyer);

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/myshop" className="flex items-center text-primary hover:text-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
          
          {/* 🚧 B2C Testing Notice */}
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            🚧 B2C Testing Mode
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Information */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                <div className="space-y-4">
                  {orderItem.products?.images && orderItem.products.images.length > 0 && (
                    <img 
                      src={orderItem.products.images[0]} 
                      alt={orderItem.products.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  <div>
                    <h3 className="font-medium text-lg">{orderItem.products?.name}</h3>
                    <p className="text-gray-600 mt-1">{orderItem.products?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-2 font-medium">{orderItem.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="ml-2 font-medium">KES {orderItem.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium">KES {orderItem.quantity * orderItem.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Order Status:</span>
                      <span className="ml-2 capitalize">{orderItem.status}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Buyer Information */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Buyer Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{buyerInfo.name}</span>
                  </div>
                  
                  {buyerInfo.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{buyerInfo.phone}</span>
                    </div>
                  )}
                  
                  {buyerInfo.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{buyerInfo.email}</span>
                    </div>
                  )}
                  
                  {buyerInfo.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{buyerInfo.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions & Status */}
          <div className="space-y-6">
            {/* 🚧 Simplified Actions for B2C Testing */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                
                {orderItem.status === 'processing' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <p className="text-orange-700 font-medium">🚧 Testing Mode</p>
                      </div>
                      <p className="text-orange-600 text-sm">
                        Messaging requirements bypassed for B2C testing. You can mark as shipped directly.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => handleUpdateOrderStatus('shipped')}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={updateInProgress}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {updateInProgress ? "Updating..." : "🚧 Mark as Shipped (Test)"}
                    </Button>
                  </div>
                )}

                {orderItem.status === 'shipped' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <p className="text-blue-700 font-medium">Order Shipped</p>
                      </div>
                      <p className="text-blue-600 text-sm">
                        Order is shipped. Mark as delivered to trigger B2C payment to seller.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => handleUpdateOrderStatus('delivered')}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={updateInProgress}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {updateInProgress ? "Updating..." : "🚧 Mark as Delivered (Triggers B2C)"}
                    </Button>
                  </div>
                )}

                {orderItem.status === 'delivered' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-green-700 font-medium">Order Delivered</p>
                    </div>
                    <p className="text-green-600 text-sm">
                      This order has been successfully delivered to the buyer.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Information</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Date:</span>
                    <span>{new Date(order?.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-xs">{order?.id}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="capitalize">{order?.payment_status}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Status:</span>
                    <span className="capitalize">{orderItem.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            {order?.delivery_option && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Method:</span>
                      <span className="capitalize">{order.delivery_option}</span>
                    </div>
                    
                    {order.delivery_address && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Address:</span>
                        <span>{order.delivery_address}</span>
                      </div>
                    )}
                    
                    {order.delivery_instructions && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Instructions:</span>
                        <span>{order.delivery_instructions}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerOrderDetail;