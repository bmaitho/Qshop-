// src/components/SellerOrderDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Truck, CheckCircle, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { updateOrderStatus } from '../utils/orderUtils';
import Navbar from './Navbar';

const SellerOrderDetail = () => {
  const { id } = useParams(); // order_item id
  const [orderItem, setOrderItem] = useState(null);
  const [order, setOrder] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updateInProgress, setUpdateInProgress] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Fetch the order item with related data
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders(*),
          products(*)
        `)
        .eq('id', id)
        .eq('seller_id', user.id) // Security check - only allow seller to see their own orders
        .single();
      
      if (itemError) throw itemError;
      setOrderItem(itemData);
      
      if (itemData?.orders) {
        setOrder(itemData.orders);
        
        // Fetch buyer info
        const { data: buyerData, error: buyerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', itemData.orders.user_id)
          .single();
        
        if (!buyerError) {
          setBuyer(buyerData);
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    setUpdateInProgress(true);
    
    try {
      const success = await updateOrderStatus(id, newStatus);
      if (success) {
        // Refresh the data after successful update
        fetchOrderDetails();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setUpdateInProgress(false);
    }
  };

  const sendMessageToBuyer = async () => {
    if (!message.trim()) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // If buyer object is missing or incomplete, try to fetch it again
      let buyerInfo = buyer;
      if (!buyer || (!buyer.full_name && !buyer.email)) {
        try {
          const { data: freshBuyerData, error: buyerError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', order.user_id)
            .maybeSingle();  // <-- Changed from single() to maybeSingle()
            
          if (freshBuyerData) {
            buyerInfo = freshBuyerData;
          } else if (buyerError) {
            console.warn(`Error fetching buyer profile: ${buyerError.message}`);
          } else {
            console.warn(`No profile found for buyer ID ${order.user_id}`);
          }
        } catch (e) {
          console.error('Error fetching buyer details:', e);
        }
      }
      
      // Get sender info from user metadata or fallback to user ID
      const userMetadata = user.user_metadata || {};
      
      // Get sender and recipient names with better fallbacks
      const senderName = userMetadata.full_name || user.email || 'Seller';
      
      // Build recipient name with strong fallbacks
      const recipientName = buyerInfo?.full_name || 
                            buyerInfo?.email || 
                            order?.user_id || 
                            'Buyer';
      
      console.log('Sending message to buyer with recipient name:', recipientName);
      
      // Create message record
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          recipient_id: buyerInfo?.id || order.user_id,
          product_id: orderItem.product_id,
          order_id: orderItem.order_id,
          order_item_id: orderItem.id,
          message: message.trim(),
          sender_name: senderName,
          recipient_name: recipientName
        }]);
  
      if (error) throw error;
      
      // Reset message field and show success message
      setMessage('');
      toast.success("Message sent successfully");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
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
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 my-8">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/myshop">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order #{order?.id.substring(0, 8)}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Summary - Left Column */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Order Details</h2>
                  <StatusBadge status={orderItem.status} />
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4 mb-4">
                  <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                    <img
                      src={orderItem.products?.image_url || "/api/placeholder/96/96"}
                      alt={orderItem.products?.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{orderItem.products?.name}</h3>
                    <p className="text-sm text-gray-500">Product ID: {orderItem.product_id}</p>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-gray-600">
                        Quantity: {orderItem.quantity} × KES {orderItem.price_per_unit?.toLocaleString()}
                      </p>
                      <p className="font-bold">
                        KES {orderItem.subtotal?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Date:</span>
                    <span>{new Date(order?.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="capitalize">{order?.payment_status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <span>M-Pesa</span>
                  </div>
                  {order?.mpesa_receipt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Receipt Number:</span>
                      <span>{order.mpesa_receipt}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Action Required</h2>
                
                {orderItem.status === 'processing' && (
                  <div className="space-y-4">
                    <p className="text-sm">This order is ready for shipment. Please update the status when you have shipped the item.</p>
                    <Button 
                      onClick={() => handleUpdateOrderStatus('shipped')}
                      className="w-full"
                      disabled={updateInProgress}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {updateInProgress ? "Updating..." : "Mark as Shipped"}
                    </Button>
                  </div>
                )}
                
                {orderItem.status === 'shipped' && (
                  <div className="space-y-4">
                    <p className="text-sm">This order has been shipped. Once the buyer has received it, you can mark it as delivered.</p>
                    <Button 
                      onClick={() => handleUpdateOrderStatus('delivered')}
                      className="w-full"
                      disabled={updateInProgress}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {updateInProgress ? "Updating..." : "Mark as Delivered"}
                    </Button>
                  </div>
                )}
                
                {orderItem.status === 'delivered' && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-green-700 text-sm">This order has been successfully delivered and is now complete.</p>
                  </div>
                )}
                
                {orderItem.status === 'cancelled' && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-700 text-sm">This order has been cancelled.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Message Buyer</h2>
                <Textarea
                  placeholder="Write a message to the buyer..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] mb-3"
                />
                <Button onClick={sendMessageToBuyer} className="w-full" disabled={!message.trim()}>
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Buyer Information - Right Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Buyer Information</h2>
                {buyer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {buyer.full_name ? buyer.full_name[0].toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{buyer.full_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">Customer</p>
                      </div>
                    </div>
                    
                    {buyer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{buyer.phone}</span>
                      </div>
                    )}
                    
                    {buyer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{buyer.email}</span>
                      </div>
                    )}
                    
                    {buyer.campus_location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{buyer.campus_location}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Buyer information not available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Status Timeline</h2>
                <div className="space-y-4">
                  <TimelineItem 
                    title="Order Placed" 
                    date={order?.created_at}
                    icon={<div className="w-4 h-4 bg-green-500 rounded-full" />}
                    completed={true}
                  />
                  <TimelineItem 
                    title="Payment Received" 
                    date={order?.updated_at}
                    icon={<div className="w-4 h-4 bg-green-500 rounded-full" />}
                    completed={order?.payment_status === 'completed'}
                  />
                  <TimelineItem 
                    title="Processing" 
                    date={null}
                    icon={<div className="w-4 h-4 bg-orange-500 rounded-full" />}
                    completed={['processing', 'shipped', 'delivered'].includes(orderItem.status)}
                  />
                  <TimelineItem 
                    title="Shipped"
                    date={null}
                    icon={<div className="w-4 h-4 bg-blue-500 rounded-full" />}
                    completed={['shipped', 'delivered'].includes(orderItem.status)}
                  />
                  <TimelineItem 
                    title="Delivered" 
                    date={null}
                    icon={<div className="w-4 h-4 bg-green-500 rounded-full" />}
                    completed={orderItem.status === 'delivered'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper component for status badges
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'pending_payment':
      return <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-xs font-medium">Awaiting Payment</div>;
    case 'processing':
      return <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-xs font-medium">Processing</div>;
    case 'shipped':
      return <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-medium">Shipped</div>;
    case 'delivered':
      return <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-medium">Delivered</div>;
    case 'cancelled':
      return <div className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-medium">Cancelled</div>;
    default:
      return <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-xs font-medium">{status}</div>;
  }
};

// Helper component for timeline items
const TimelineItem = ({ title, date, icon, completed }) => (
  <div className="flex items-start gap-3">
    <div className={`mt-1 ${completed ? 'opacity-100' : 'opacity-40'}`}>
      {icon}
    </div>
    <div className={completed ? 'opacity-100' : 'opacity-40'}>
      <p className="font-medium">{title}</p>
      {date && (
        <p className="text-xs text-gray-500">
          {new Date(date).toLocaleString()}
        </p>
      )}
    </div>
  </div>
);

export default SellerOrderDetail;