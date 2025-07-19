// src/components/SellerOrders.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  FileText,
  Clock,
  MessageCircle,
  AlertTriangle
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
      
      let query = supabase
        .from('order_items')
        .select(`
          *,
          orders(*),
          products(*)
        `)
        .eq('seller_id', user.id);
      
      // Apply status filter
      if (status === 'new') {
        query = query.eq('status', 'processing');
      } else if (status === 'shipped') {
        query = query.eq('status', 'shipped');
      } else if (status === 'delivered') {
        query = query.eq('status', 'delivered');
      } else if (status === 'ready') {
        // Orders that are ready to ship (buyer contacted and agreed)
        query = query.eq('buyer_contacted', true).eq('buyer_agreed', true).neq('status', 'shipped');
      } else if (status === 'urgent') {
        // Orders that need contact and are older than 1 day
        query = query.eq('buyer_contacted', false).eq('status', 'processing');
      }
      // 'all' shows everything
      
      if (searchQuery) {
        query = query.or(`orders.id.ilike.%${searchQuery}%,products.name.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Apply smart sorting
      const sortedOrders = sortOrdersByPriority(data || []);
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

  const renderOrderCard = (orderItem) => {
    const commStatus = getCommunicationStatus(orderItem);
    const daysSince = getDaysSinceOrder(orderItem.created_at);
    const urgency = getOrderUrgency(orderItem);
    
    return (
      <Card key={orderItem.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-lg">{orderItem.products?.name}</h3>
                
                {/* Communication Status Badge */}
                <Badge variant="outline" className={`
                  ${commStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' : ''}
                  ${commStatus.color === 'yellow' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}
                  ${commStatus.color === 'green' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                  ${commStatus.color === 'blue' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                `}>
                  {commStatus.emoji} {commStatus.label}
                </Badge>
                
                {/* Urgency Indicator */}
                {urgency.level === 'urgent' && (
                  <Badge variant="destructive" className="bg-red-600 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {urgency.label}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>Order #{orderItem.orders?.id?.slice(-8)} • {daysSince} days ago</p>
                <p>Quantity: {orderItem.quantity} • KES {orderItem.subtotal?.toLocaleString()}</p>
                <p>Payment: <span className="capitalize">{orderItem.orders?.payment_status}</span></p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                KES {orderItem.subtotal?.toLocaleString()}
              </div>
              <StatusBadge status={orderItem.status} />
            </div>
          </div>
          
          {/* Action Section */}
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="text-sm">
              <span className="text-gray-600">Next Action: </span>
              <span className={`font-medium ${
                commStatus.color === 'red' ? 'text-red-600' : 
                commStatus.color === 'yellow' ? 'text-yellow-600' : 
                commStatus.color === 'green' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {commStatus.action}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/seller/orders/${orderItem.id}`)}
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                Details
              </Button>
              
              <MessageDialog 
                recipientId={orderItem.orders?.user_id}
                productId={orderItem.product_id}
                orderId={orderItem.order_id}
                buttonText="Message"
                buttonVariant="outline"
                buttonSize="sm"
                productName={orderItem.products?.name}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const counts = getTabCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Orders</h2>
        <div className="text-sm text-gray-600">
          {orders.length} orders total
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search by order ID or product name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* Tabs with Smart Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="all" className="flex items-center gap-1">
            All
            {counts.all > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="urgent" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Urgent
            {counts.urgent > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {counts.urgent}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="ready" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Ready
            {counts.ready > 0 && (
              <Badge variant="default" className="ml-1 text-xs bg-green-600">
                {counts.ready}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="new" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
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
                    <CardContent className="p-4">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    {status === 'all' && 'You have no orders yet.'}
                    {status === 'urgent' && 'No urgent orders requiring immediate attention.'}
                    {status === 'ready' && 'No orders ready to ship.'}
                    {status === 'new' && 'No new orders to process.'}
                    {status === 'shipped' && 'No shipped orders.'}
                    {status === 'delivered' && 'No delivered orders.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary for filtered views */}
                {status === 'urgent' && orders.filter(o => !o.buyer_contacted && o.status === 'processing').length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <h3 className="font-medium text-red-800">
                            {orders.filter(o => !o.buyer_contacted && o.status === 'processing').length} Urgent Orders
                          </h3>
                          <p className="text-sm text-red-600">
                            These orders need immediate contact with buyers before shipping.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {status === 'ready' && orders.filter(o => o.buyer_contacted && o.buyer_agreed && o.status !== 'shipped').length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-medium text-green-800">
                            {orders.filter(o => o.buyer_contacted && o.buyer_agreed && o.status !== 'shipped').length} Ready to Ship
                          </h3>
                          <p className="text-sm text-green-600">
                            Buyers have agreed to shipping arrangements. You can mark these as shipped.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Orders List */}
                {orders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    'pending_payment': { label: 'Awaiting Payment', color: 'bg-gray-100 text-gray-800' },
    'processing': { label: 'Processing', color: 'bg-orange-100 text-orange-800' },
    'shipped': { label: 'In Transit', color: 'bg-blue-100 text-blue-800' },
    'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-800' },
    'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <Badge variant="outline" className={`${config.color} border-transparent`}>
      {config.label}
    </Badge>
  );
};

export default SellerOrders;