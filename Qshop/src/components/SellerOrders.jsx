// src/components/SellerOrders.jsx
// FIXED VERSION - Improved color contrast for tabs
// Changed inactive tab text from green to white/gray for better readability

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  FileText,
  Clock,
  MessageCircle,
  AlertTriangle,
  Zap,
  Timer,
  ShipIcon,
  DollarSign,
  Calendar,
  User,
  Phone,
  ArrowRight,
  Flame
} from 'lucide-react';
import MessageDialog from './MessageDialog';
import { 
  sortOrdersByPriority, 
  getCommunicationStatus, 
  getDaysSinceOrder, 
  getOrderUrgency,
  getDisplayInfo 
} from '../utils/communicationUtils';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchSellerOrders(activeTab);
  }, [activeTab]);
  
  const fetchSellerOrders = async (status) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      let orderItemsQuery = supabase
        .from('order_items')
        .select(`
          *,
          products(*)
        `)
        .eq('seller_id', user.id);
      
      // Apply status filters
      if (status === 'new') {
        orderItemsQuery = orderItemsQuery.eq('status', 'processing');
      } else if (status === 'shipped') {
        orderItemsQuery = orderItemsQuery.eq('status', 'shipped');
      } else if (status === 'delivered') {
        orderItemsQuery = orderItemsQuery.eq('status', 'delivered');
      } else if (status === 'ready') {
        orderItemsQuery = orderItemsQuery
          .eq('status', 'processing')
          .eq('buyer_contacted', true)
          .eq('buyer_agreed', true);
      } else if (status === 'urgent') {
        orderItemsQuery = orderItemsQuery.eq('status', 'processing');
      }
      
      const { data: orderItemsData, error: orderItemsError } = await orderItemsQuery
        .order('created_at', { ascending: false });
      
      if (orderItemsError) throw orderItemsError;
      
      // Further filter urgent orders on the client side if needed
      let ordersData = orderItemsData || [];
      if (status === 'urgent') {
        ordersData = ordersData.filter(item => {
          const daysSince = getDaysSinceOrder(item.created_at);
          const notContacted = !item.buyer_contacted;
          return notContacted && daysSince >= 1;
        });
      }
      
      // Sort orders by priority
      const sortedOrders = sortOrdersByPriority(ordersData);
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching seller orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search logic here if needed
  };
  
  const getTabCounts = () => {
    return {
      all: orders.filter(() => true).length,
      urgent: orders.filter(item => {
        const daysSince = getDaysSinceOrder(item.created_at);
        const notContacted = !item.buyer_contacted;
        return item.status === 'processing' && notContacted && daysSince >= 1;
      }).length,
      ready: orders.filter(item => 
        item.status === 'processing' && 
        item.buyer_contacted && 
        item.buyer_agreed
      ).length,
      new: orders.filter(item => item.status === 'processing').length,
      shipped: orders.filter(item => item.status === 'shipped').length,
      delivered: orders.filter(item => item.status === 'delivered').length,
    };
  };

  const getUrgencyLevel = (orderItem) => {
    const daysSince = getDaysSinceOrder(orderItem.created_at);
    const notContacted = !orderItem.buyer_contacted;
    const isProcessing = orderItem.status === 'processing';
    
    if (isProcessing && notContacted) {
      if (daysSince >= 3) return { level: 'critical', label: 'CRITICAL', color: 'bg-red-600', pulse: true };
      if (daysSince >= 2) return { level: 'high', label: 'HIGH', color: 'bg-orange-500', pulse: true };
      if (daysSince >= 1) return { level: 'medium', label: 'MEDIUM', color: 'bg-yellow-500', pulse: false };
    }
    
    if (orderItem.buyer_contacted && orderItem.buyer_agreed) {
      return { level: 'ready', label: 'READY TO SHIP', color: 'bg-green-600', pulse: false };
    }
    
    if (orderItem.buyer_contacted && !orderItem.buyer_agreed) {
      return { level: 'waiting', label: 'WAITING', color: 'bg-blue-500', pulse: false };
    }
    
    return { level: 'normal', label: 'NORMAL', color: 'bg-emerald-700', pulse: false };
  };

  const renderOrderCard = (orderItem) => {
    const commStatus = getCommunicationStatus(orderItem);
    const daysSince = getDaysSinceOrder(orderItem.created_at);
    const urgency = getUrgencyLevel(orderItem);
    const buyerUserId = orderItem.buyer_user_id;
    
    const getStatusIcon = () => {
      switch (orderItem.status) {
        case 'processing': return <Package className="h-4 w-4" />;
        case 'shipped': return <Truck className="h-4 w-4" />;
        case 'delivered': return <CheckCircle className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
      }
    };

    const getUrgencyIcon = () => {
      switch (urgency.level) {
        case 'critical': return <Flame className="h-4 w-4" />;
        case 'high': return <AlertTriangle className="h-4 w-4" />;
        case 'medium': return <Timer className="h-4 w-4" />;
        case 'ready': return <Zap className="h-4 w-4" />;
        default: return null;
      }
    };
    
    return (
      <Card 
        key={orderItem.id} 
        className={`mb-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] bg-emerald-950/30 dark:bg-emerald-950/50 ${
          urgency.level === 'critical' ? 'bg-red-900/20' :
          urgency.level === 'high' ? 'bg-orange-900/20' :
          urgency.level === 'medium' ? 'bg-yellow-900/20' :
          urgency.level === 'ready' ? 'bg-green-900/20' :
          urgency.level === 'waiting' ? 'bg-blue-900/20' :
          ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Product Image Placeholder */}
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-emerald-300" />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg text-gray-100">
                  {orderItem.products?.name || 'Unknown Product'}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs border-emerald-700 text-emerald-300">
                    {getStatusIcon()}
                    <span className="ml-1 capitalize">{orderItem.status}</span>
                  </Badge>
                  
                  {/* Urgency Badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${urgency.color} ${urgency.pulse ? 'animate-pulse' : ''}`}>
                    {getUrgencyIcon()}
                    <span>{urgency.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800/50"
              >
                <FileText className="h-4 w-4" />
              </Button>
              
              {buyerUserId && (
                <MessageDialog 
                  recipientId={buyerUserId}
                  productId={orderItem.product_id}
                  orderId={orderItem.order_id}
                  orderItemId={orderItem.id}
                  buttonText=""
                  buttonVariant="ghost"
                  buttonSize="sm"
                  buttonClassName="text-blue-400 hover:text-blue-300 hover:bg-emerald-800/50 p-2"
                  productName={orderItem.products?.name}
                />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-emerald-400">Value</p>
                <p className="font-semibold text-gray-100">KES {orderItem.subtotal}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs text-emerald-400">Quantity</p>
                <p className="font-semibold text-gray-100">{orderItem.quantity}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-xs text-emerald-400">Age</p>
                <p className="font-semibold text-gray-100">
                  {daysSince === 0 ? 'Today' : `${daysSince} days`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              <div>
                <p className="text-xs text-emerald-400">Order ID</p>
                <p className="font-mono text-xs font-semibold text-gray-100">
                  #{orderItem.order_id.slice(-8)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className={`p-4 rounded-lg border-2 border-dashed ${
            urgency.level === 'critical' ? 'border-red-400 bg-red-950/40' :
            urgency.level === 'high' ? 'border-orange-400 bg-orange-950/40' :
            urgency.level === 'medium' ? 'border-yellow-400 bg-yellow-950/40' :
            urgency.level === 'ready' ? 'border-green-400 bg-green-950/40' :
            urgency.level === 'waiting' ? 'border-blue-400 bg-blue-950/40' :
            'border-emerald-600 bg-emerald-950/40'
          }`}>
            
            {/* Critical/High Urgency */}
            {(urgency.level === 'critical' || urgency.level === 'high') && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${urgency.level === 'critical' ? 'bg-red-600' : 'bg-orange-500'}`}>
                    <Flame className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${urgency.level === 'critical' ? 'text-red-300' : 'text-orange-300'}`}>
                      {urgency.level === 'critical' ? '🚨 URGENT: Contact Buyer Now!' : '⚡ High Priority Order'}
                    </h4>
                    <p className={`text-sm ${urgency.level === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>
                      {urgency.level === 'critical' 
                        ? `This order is ${daysSince} days old and needs immediate attention!`
                        : `Order placed ${daysSince} days ago - contact buyer soon`
                      }
                    </p>
                  </div>
                </div>
                
                {buyerUserId && (
                  <MessageDialog 
                    recipientId={buyerUserId}
                    productId={orderItem.product_id}
                    orderId={orderItem.order_id}
                    orderItemId={orderItem.id}
                    buttonText="Contact Now"
                    buttonVariant="default"
                    buttonSize="sm"
                    buttonClassName={`${urgency.level === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} text-white font-medium`}
                    productName={orderItem.products?.name}
                  />
                )}
              </div>
            )}

            {/* Medium Urgency */}
            {urgency.level === 'medium' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-500">
                    <Timer className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-300">Contact Buyer Today</h4>
                    <p className="text-sm text-yellow-400">
                      Order from yesterday - reach out to arrange shipping
                    </p>
                  </div>
                </div>
                
                {buyerUserId && (
                  <MessageDialog 
                    recipientId={buyerUserId}
                    productId={orderItem.product_id}
                    orderId={orderItem.order_id}
                    orderItemId={orderItem.id}
                    buttonText="Contact Buyer"
                    buttonVariant="default"
                    buttonSize="sm"
                    buttonClassName="bg-yellow-500 hover:bg-yellow-600 text-white"
                    productName={orderItem.products?.name}
                  />
                )}
              </div>
            )}

            {/* Ready to Ship */}
            {urgency.level === 'ready' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-600">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">✅ Ready to Ship!</h4>
                    <p className="text-sm text-gray-200">
                      Buyer confirmed - you can mark this as shipped
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Ship Now
                </Button>
              </div>
            )}

            {/* Waiting for Response */}
            {urgency.level === 'waiting' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Waiting for Buyer</h4>
                    <p className="text-sm text-yellow-300">
                      Message sent - waiting for buyer confirmation
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                  variant="outline"
                  size="sm"
                  className="border-blue-400 text-blue-300 hover:bg-blue-950/50"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Normal/Shipped/Delivered */}
            {['normal'].includes(urgency.level) && (
              <div className="flex items-center justify-between pt-2 border-t border-emerald-800">
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">
                    {orderItem.status === 'delivered' ? 'Order completed successfully' :
                     orderItem.status === 'shipped' ? 'Package in transit' :
                     'New order - contact buyer to arrange shipping'}
                  </p>
                </div>
                
                <Button
                  onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-300 hover:bg-emerald-900/50"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const counts = getTabCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-100">Order Management</h2>
          <p className="text-emerald-400 mt-1">
            Track and manage your sales 
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-emerald-400">
            <span className="font-semibold text-gray-100">{orders.length}</span> total orders
          </div>
          
          {counts.urgent > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/40 rounded-full border border-red-600">
              <Flame className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">
                {counts.urgent} urgent
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 h-4 w-4" />
          <Input
            placeholder="Search by order ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-emerald-950/50 border-emerald-700 text-gray-100 placeholder:text-emerald-600"
          />
        </div>
        <Button type="submit" variant="outline" className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/50">
          Search
        </Button>
      </form>

      {/* Smart Tabs - Mobile Responsive - FIXED COLOR CONTRAST */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex min-w-full md:grid md:grid-cols-6 w-full bg-emerald-950/50">
            {/* All Tab - Fixed for both light and dark modes */}
            <TabsTrigger 
              value="all" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-emerald-800 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Package className="h-3 w-3" />
              <span className="hidden sm:inline">All</span>
              {counts.all > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-emerald-700 text-emerald-100">
                  {counts.all}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Urgent Tab */}
            <TabsTrigger 
              value="urgent" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-red-900/50 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Flame className="h-3 w-3" />
              <span className="hidden sm:inline">Urgent</span>
              {counts.urgent > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs animate-pulse">
                  {counts.urgent}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Ready Tab */}
            <TabsTrigger 
              value="ready" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-green-900/50 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">Ready</span>
              {counts.ready > 0 && (
                <Badge className="ml-1 text-xs bg-green-600">
                  {counts.ready}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Processing Tab */}
            <TabsTrigger 
              value="new" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-emerald-800 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Processing</span>
              {counts.new > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-emerald-700 text-emerald-100">
                  {counts.new}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Shipped Tab */}
            <TabsTrigger 
              value="shipped" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-emerald-800 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Truck className="h-3 w-3" />
              <span className="hidden sm:inline">Shipped</span>
              {counts.shipped > 0 && (
                <Badge variant="outline" className="ml-1 text-xs border-emerald-600 text-emerald-300">
                  {counts.shipped}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Delivered Tab */}
            <TabsTrigger 
              value="delivered" 
              className="flex items-center gap-1 whitespace-nowrap data-[state=active]:bg-emerald-800 data-[state=active]:text-white text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <CheckCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Delivered</span>
              {counts.delivered > 0 && (
                <Badge variant="outline" className="ml-1 text-xs border-emerald-600 text-emerald-300">
                  {counts.delivered}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        {['all', 'urgent', 'ready', 'new', 'shipped', 'delivered'].map((status) => (
          <TabsContent key={status} value={status} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-emerald-950/30">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-6 bg-emerald-800/50 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-emerald-800/50 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-emerald-800/50 rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card className="bg-emerald-950/30 border-emerald-700">
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">No orders found</h3>
                  <p className="text-emerald-400 max-w-md mx-auto">
                    {status === 'all' && 'You have no orders yet. Once customers start buying, they\'ll appear here.'}
                    {status === 'urgent' && 'No urgent orders! All your orders are up to date.'}
                    {status === 'ready' && 'No orders ready to ship right now.'}
                    {status === 'new' && 'No new orders to process at the moment.'}
                    {status === 'shipped' && 'No shipped orders currently.'}
                    {status === 'delivered' && 'No delivered orders yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Priority Banners */}
                {status === 'urgent' && orders.filter(o => !o.buyer_contacted && o.status === 'processing').length > 0 && (
                  <Card className="border-red-600 bg-gradient-to-r from-red-950/50 to-orange-950/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-600">
                          <Flame className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-300 text-lg">🚨 Urgent Action Required</h4>
                          <p className="text-red-400 mt-1">
                            You have {orders.filter(o => !o.buyer_contacted && o.status === 'processing').length} orders 
                            waiting for buyer contact. Quick response improves customer satisfaction and gets you paid instantly when the buyer confirms!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {status === 'ready' && orders.filter(o => o.buyer_contacted && o.buyer_agreed && o.status !== 'shipped').length > 0 && (
                  <Card className="border-green-600 bg-gradient-to-r from-green-950/50 to-emerald-950/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-600">
                          <Zap className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-300 text-lg">✅ Ready to Ship!</h4>
                          <p className="text-green-400 mt-1">
                            {orders.filter(o => o.buyer_contacted && o.buyer_agreed && o.status !== 'shipped').length} orders 
                            are confirmed and ready for shipping. Mark them as shipped once sent!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Orders List */}
                <div className="space-y-4">
                  {orders.map(renderOrderCard)}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SellerOrders;