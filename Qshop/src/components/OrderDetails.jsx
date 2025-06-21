// src/components/OrderDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import MessageDialog from './MessageDialog';
import ReportIssueDialog from './ReportIssueDialog';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
    getCurrentUser();
    
    // Optional: Set up an interval to refresh the order data periodically
    const refreshInterval = setInterval(() => {
      refreshOrderDetails();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [orderId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

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

      // Fetch order items with seller information and their current status
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*),
          profiles:seller_id(*)
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh order data
  const refreshOrderDetails = async () => {
    try {
      setRefreshing(true);
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error refreshing order details:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Context-aware navigation function
  const getBackNavigationPath = () => {
    // Check if user came from seller dashboard (myshop)
    if (location.state?.from === 'seller' || document.referrer.includes('/myshop')) {
      return '/myshop';
    }
    
    // Check if current user is the seller of any items in this order
    const isSellerOfOrder = orderItems.some(item => 
      currentUser && item.seller_id === currentUser.id
    );
    
    if (isSellerOfOrder) {
      return '/myshop';
    }
    
    // Default to user profile orders
    return '/profile?tab=orders';
  };

  const getBackButtonText = () => {
    // Check if user came from seller dashboard or is seller of items
    const isSellerContext = location.state?.from === 'seller' || 
                           document.referrer.includes('/myshop') ||
                           orderItems.some(item => currentUser && item.seller_id === currentUser.id);
    
    return isSellerContext ? 'Back to My Shop' : 'Back to Orders';
  };

  // Function to determine status step for progress bar
  const getStatusStep = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  // Get the overall status based on the most common item status
  const getOverallStatus = () => {
    if (!orderItems.length) return order?.order_status || 'pending';
    
    // Count occurrences of each status
    const statusCounts = orderItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    
    // Find the most common status
    let maxCount = 0;
    let mostCommonStatus = order?.order_status || 'pending';
    
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonStatus = status;
      }
    }
    
    return mostCommonStatus;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
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
          <p className="text-center text-primary dark:text-gray-100">Order not found</p>
        </div>
      </>
    );
  }

  const currentStatus = getStatusStep(getOverallStatus());

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 mt-12 mb-16">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(getBackNavigationPath())}
              className="dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {getBackButtonText()}
            </Button>
            <h1 className="text-xl font-bold text-primary dark:text-gray-100">
              Order #{orderId.substring(0, 8)}
            </h1>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshOrderDetails}
            disabled={refreshing}
            className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Order Status Timeline */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Order Status</h2>
            
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute left-0 top-6 w-full h-1 bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(currentStatus / 3) * 100}%` }}
                ></div>
              </div>
              
              {/* Status points */}
              <div className="flex justify-between relative">
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${currentStatus >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary dark:text-gray-100">Confirmed</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${currentStatus >= 1 ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary dark:text-gray-100">Processing</p>
                </div>
                
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${currentStatus >= 2 ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                    <Truck className="h-6 w-6" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary dark:text-gray-100">Shipped</p>
                </div>
                
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${currentStatus >= 3 ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary dark:text-gray-100">Delivered</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Items</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0">
                    {item.products?.image_url && (
                      <img 
                        src={item.products.image_url} 
                        alt={item.products.name}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-primary dark:text-gray-100">{item.products?.name}</h3>
                      <p className="font-medium text-primary dark:text-gray-100">KES {item.subtotal?.toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Quantity: {item.quantity} × KES {item.price_per_unit}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Location: {item.products?.location || 'Not specified'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-primary dark:text-gray-300">
                        Seller: {item.profiles?.full_name || 'Unknown seller'}
                      </p>
                      <Badge className="dark:bg-gray-700 dark:text-gray-100">{item.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary dark:text-gray-100">Payment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Payment Method</p>
                <p className="text-primary dark:text-gray-100">M-Pesa</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Payment Status</p>
                <p className="capitalize text-primary dark:text-gray-100">{order.payment_status}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Transaction ID</p>
                <p className="text-primary dark:text-gray-100">{order.mpesa_receipt || 'Pending'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Phone Number</p>
                <p className="text-primary dark:text-gray-100">{order.phone_number}</p>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-primary dark:text-gray-100">KES {order.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                <span className="text-primary dark:text-gray-100">KES 0.00</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-primary dark:text-gray-100">Total</span>
                <span className="text-primary dark:text-gray-100">KES {order.amount?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-4">
          {/* Use the seller ID from the first order item (assuming all items in an order are from the same seller) */}
          {orderItems.length > 0 && (
            <>
              <MessageDialog 
                recipientId={orderItems[0].seller_id}
                orderId={orderId}
                productId={orderItems[0].product_id}
                buttonText="Contact Seller"
                buttonVariant="outline"
                buttonClassName="flex-1"
                productName={orderItems[0].products?.name}
              />
              
              <ReportIssueDialog 
                sellerId={orderItems[0].seller_id}
                orderId={orderId}
                productId={orderItems[0].product_id}
                buttonText="Report Issue"
                buttonVariant="default"
                buttonClassName="flex-1"
                productName={orderItems[0].products?.name}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderDetails;