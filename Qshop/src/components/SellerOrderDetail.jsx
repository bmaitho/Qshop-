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
import { getCommunicationStatus, getDisplayInfo } from '../utils/communicationUtils';
import { toast } from 'react-toastify';
import Navbar from './Navbar';

// 🚧 TEMPORARY BYPASS FOR B2C TESTING - REMOVE WHEN MESSAGING IS FIXED
const DEV_MODE = true; // Set to false when messaging is working

const SellerOrderDetail = () => {
  const { id } = useParams(); // order_item id
  const [orderItem, setOrderItem] = useState(null);
  const [order, setOrder] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  // 🚧 BYPASS FUNCTION FOR TESTING
  const canMarkAsShipped = (orderItem) => {
    // Bypass for testing - remove this when messaging works
    if (DEV_MODE) {
      console.log('🚧 DEV MODE: Bypassing messaging check for B2C testing');
      return true;
    }
    
    // Original logic (restore when messaging is fixed)
    return orderItem?.buyer_contacted && orderItem?.buyer_agreed;
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Fetch the order item with related data including communication fields
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders(*),
          products(*)
        `)
        .eq('id', id)
        .eq('seller_id', user.id)
        .single();
      
      if (itemError) throw itemError;
      setOrderItem(itemData);
      
      if (itemData?.orders) {
        setOrder(itemData.orders);
        
        // Fetch buyer info with better error handling
        try {
          const { data: buyerData, error: buyerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', itemData.orders.user_id)
            .maybeSingle();
            
          if (buyerData) {
            setBuyer(buyerData);
          } else if (buyerError) {
            console.warn(`Error fetching buyer profile: ${buyerError.message}`);
          }
        } catch (e) {
          console.error('Error fetching buyer details:', e);
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
    // Check communication requirements before shipping
    if (newStatus === 'shipped' && !canMarkAsShipped(orderItem)) {
      toast.error('You must contact the buyer and get their agreement before shipping');
      return;
    }

    setUpdateInProgress(true);
    
    try {
      const success = await updateOrderStatus(id, newStatus);
      if (success) {
        toast.success(`Order marked as ${newStatus}`);
        fetchOrderDetails(); // Refresh data
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error('Failed to update order status');
    } finally {
      setUpdateInProgress(false);
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

  // 🚧 TESTING HELPER FUNCTIONS - REMOVE IN PRODUCTION
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

  const simulateMessageFlow = async () => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ 
          buyer_contacted: true,
          buyer_agreed: true 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("🚧 DEV: Simulated complete messaging flow");
      fetchOrderDetails();
    } catch (error) {
      console.error('Error simulating messaging:', error);
      toast.error('Failed to simulate messaging flow');
    }
  };

  const forceReadyToShip = async () => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ 
          buyer_contacted: true,
          buyer_agreed: true,
          status: 'ready_to_ship'
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("🚧 DEV: Forced order to ready-to-ship status");
      fetchOrderDetails();
    } catch (error) {
      console.error('Error forcing ready to ship:', error);
      toast.error('Failed to force ready to ship');
    }
  };

  // 🚧 TESTING BYPASS COMPONENT - REMOVE IN PRODUCTION
  const TestingBypassPanel = ({ orderItem }) => {
    if (!DEV_MODE) return null;
    
    return (
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <p className="text-orange-700 font-medium">🚧 Development Mode - B2C Testing</p>
          </div>
          <p className="text-orange-600 text-sm mb-3">
            Quick actions to bypass messaging system for B2C testing. Remove when messaging is fixed.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={simulateMessageFlow}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Simulate Complete Messaging
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={forceReadyToShip}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Force Ready to Ship
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={simulateBuyerResponse}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Simulate Buyer Agreement
            </Button>
          </div>
          <div className="mt-2 text-xs text-orange-600">
            Current Status: buyer_contacted={orderItem?.buyer_contacted?.toString()}, buyer_agreed={orderItem?.buyer_agreed?.toString()}
          </div>
        </CardContent>
      </Card>
    );
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
          
          {/* Communication Status Badge */}
          <Badge variant="outline" className={`
            ${commStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' : ''}
            ${commStatus.color === 'yellow' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}
            ${commStatus.color === 'green' ? 'border-green-500 text-green-700 bg-green-50' : ''}
          `}>
            {commStatus.text}
          </Badge>
        </div>

        {/* 🚧 TESTING BYPASS PANEL */}
        <TestingBypassPanel orderItem={orderItem} />

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

          {/* Communication & Actions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Communication & Actions</h2>
                
                {/* Status-based Action Section */}
                {commStatus.status === 'need_contact' && !DEV_MODE && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <p className="text-red-700 font-medium">Contact Required</p>
                      </div>
                      <p className="text-red-600 text-sm">
                        You must contact the buyer about shipping arrangements before you can mark this order as shipped.
                      </p>
                    </div>
                    
                    <Textarea
                      placeholder="Message the buyer about shipping arrangements..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    
                    <Button 
                      onClick={handleContactBuyer} 
                      className="w-full"
                      disabled={!message.trim() || sendingMessage}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {sendingMessage ? "Sending..." : "Contact Buyer"}
                    </Button>
                  </div>
                )}
                
                {commStatus.status === 'waiting_response' && !DEV_MODE && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-yellow-700 font-medium">Waiting for Buyer Response</p>
                      </div>
                      <p className="text-yellow-600 text-sm">
                        You've contacted the buyer. Waiting for them to confirm shipping arrangements.
                      </p>
                    </div>
                    
                    {/* Temporary button for testing - remove in production */}
                    <Button 
                      onClick={simulateBuyerResponse}
                      variant="outline"
                      className="w-full"
                    >
                      Simulate Buyer Agreement (Test Only)
                    </Button>
                  </div>
                )}
                
                {(commStatus.status === 'ready_to_ship' || DEV_MODE) && (
                  <div className="space-y-4">
                    {!DEV_MODE && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-green-700 font-medium">Ready to Ship</p>
                        </div>
                        <p className="text-green-600 text-sm">
                          The buyer has agreed to the shipping arrangements. You can now mark this order as shipped.
                        </p>
                      </div>
                    )}
                    
                    {DEV_MODE && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <p className="text-blue-700 font-medium">🚧 DEV MODE: Testing Enabled</p>
                        </div>
                        <p className="text-blue-600 text-sm">
                          Messaging check bypassed. You can now test the B2C shipping flow.
                        </p>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => handleUpdateOrderStatus('shipped')}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={updateInProgress}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {updateInProgress ? "Updating..." : "Mark as Shipped"}
                    </Button>
                  </div>
                )}
                
                {orderItem.status === 'shipped' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <p className="text-blue-700 font-medium">Order Shipped</p>
                    </div>
                    <p className="text-blue-600 text-sm">
                      This order has been shipped and is on its way to the buyer.
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