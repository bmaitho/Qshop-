
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
        orderItemsQuery = orderItemsQuery.eq('buyer_contacted', true).eq('buyer_agreed', true).neq('status', 'shipped');
      } else if (status === 'urgent') {
        orderItemsQuery = orderItemsQuery.eq('buyer_contacted', false).eq('status', 'processing');
      }
      
      const { data: orderItems, error: itemsError } = await orderItemsQuery;
      
      if (itemsError) throw itemsError;
      
      if (!orderItems || orderItems.length === 0) {
        setOrders([]);
        return;
      }
      
      // Apply search filter
      let filteredItems = orderItems;
      if (searchQuery) {
        filteredItems = orderItems.filter(item => 
          item.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      const sortedOrders = sortOrdersByPriority(filteredItems);
      setOrders(sortedOrders);
      
    } catch (error) {
      console.error('Error fetching seller orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSellerOrders(activeTab);
  };

  const getTabCounts = () => {
    return {
      all: orders.length,
      urgent: orders.filter(order => 
        !order.buyer_contacted && order.status === 'processing'
      ).length,
      ready: orders.filter(order => 
        order.buyer_contacted && order.buyer_agreed && order.status !== 'shipped'
      ).length,
      new: orders.filter(order => order.status === 'processing').length,
      shipped: orders.filter(order => order.status === 'shipped').length,
      delivered: orders.filter(order => order.status === 'delivered').length,
    };
  };

  const getUrgencyLevel = (orderItem) => {
    const daysSince = getDaysSinceOrder(orderItem.created_at);
    const isProcessing = orderItem.status === 'processing';
    const notContacted = !orderItem.buyer_contacted;
    
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
    
    return { level: 'normal', label: 'NORMAL', color: 'bg-gray-500', pulse: false };
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
        className={`mb-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-l-4 ${
          urgency.level === 'critical' ? 'border-l-red-600 bg-red-50/50' :
          urgency.level === 'high' ? 'border-l-orange-500 bg-orange-50/50' :
          urgency.level === 'medium' ? 'border-l-yellow-500 bg-yellow-50/50' :
          urgency.level === 'ready' ? 'border-l-green-600 bg-green-50/50' :
          urgency.level === 'waiting' ? 'border-l-blue-500 bg-blue-50/50' :
          'border-l-gray-300'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Product Image Placeholder */}
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-500" />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {orderItem.products?.name || 'Unknown Product'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
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
                className="text-gray-600 hover:text-gray-900"
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
                  buttonClassName="text-blue-600 hover:text-blue-900 p-2"
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
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Value</p>
                <p className="font-semibold">KES {orderItem.subtotal}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Quantity</p>
                <p className="font-semibold">{orderItem.quantity}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Age</p>
                <p className="font-semibold">
                  {daysSince === 0 ? 'Today' : `${daysSince} days`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Order ID</p>
                <p className="font-mono text-xs font-semibold">
                  #{orderItem.order_id.slice(-8)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className={`p-4 rounded-lg border-2 border-dashed ${
            urgency.level === 'critical' ? 'border-red-300 bg-red-50' :
            urgency.level === 'high' ? 'border-orange-300 bg-orange-50' :
            urgency.level === 'medium' ? 'border-yellow-300 bg-yellow-50' :
            urgency.level === 'ready' ? 'border-green-300 bg-green-50' :
            urgency.level === 'waiting' ? 'border-blue-300 bg-blue-50' :
            'border-gray-300 bg-gray-50'
          }`}>
            
            {/* Critical/High Urgency */}
            {(urgency.level === 'critical' || urgency.level === 'high') && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${urgency.level === 'critical' ? 'bg-red-600' : 'bg-orange-500'}`}>
                    <Flame className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${urgency.level === 'critical' ? 'text-red-800' : 'text-orange-800'}`}>
                      {urgency.level === 'critical' ? '🚨 URGENT: Contact Buyer Now!' : '⚡ High Priority Order'}
                    </h4>
                    <p className={`text-sm ${urgency.level === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-500">
                    <Timer className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Contact Buyer Today</h4>
                    <p className="text-sm text-yellow-600">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-600">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">✅ Ready to Ship!</h4>
                    <p className="text-sm text-green-600">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Waiting for Buyer</h4>
                    <p className="text-sm text-blue-600">
                      Message sent - waiting for buyer confirmation
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Normal/Shipped/Delivered */}
            {['normal', 'shipped', 'delivered'].includes(urgency.level) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-500">
                    {getStatusIcon()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 capitalize">{orderItem.status}</h4>
                    <p className="text-sm text-gray-600">
                      {orderItem.status === 'delivered' ? 'Order completed successfully' :
                       orderItem.status === 'shipped' ? 'Package in transit' :
                       'New order - contact buyer to arrange shipping'}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                  variant="outline"
                  size="sm"
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
          <h2 className="text-3xl font-bold text-gray-900">Order Management</h2>
          <p className="text-gray-600 mt-1">
            Track and manage your sales with smart priority sorting
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{orders.length}</span> total orders
          </div>
          
          {counts.urgent > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
              <Flame className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {counts.urgent} urgent
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by order ID or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* Smart Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            All
            {counts.all > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="urgent" className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            Urgent
            {counts.urgent > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs animate-pulse">
                {counts.urgent}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="ready" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Ready
            {counts.ready > 0 && (
              <Badge className="ml-1 text-xs bg-green-600">
                {counts.ready}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="new" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Processing
            {counts.new > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {counts.new}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="shipped" className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Shipped
            {counts.shipped > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {counts.shipped}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="delivered" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Delivered
            {counts.delivered > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {counts.delivered}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        {['all', 'urgent', 'ready', 'new', 'shipped', 'delivered'].map((status) => (
          <TabsContent key={status} value={status} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
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
                  <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-600">
                          <Flame className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-800 text-lg">🚨 Urgent Action Required</h4>
                          <p className="text-red-700 mt-1">
                            You have {orders.filter(o => !o.buyer_contacted && o.status === 'processing').length} orders 
                            waiting for buyer contact. Quick response improves customer satisfaction!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {status === 'ready' && orders.filter(o => o.buyer_contacted && o.buyer_agreed && o.status !== 'shipped').length > 0 && (
                  <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-600">
                          <Zap className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-800 text-lg">✅ Ready to Ship!</h4>
                          <p className="text-green-700 mt-1">
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