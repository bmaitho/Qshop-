import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageDialog from './MessageDialog';
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Search,
  FileText,
  MessageCircle
} from 'lucide-react';

const SellerOrdersDetail = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
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
      
      if (status === 'new') {
        query = query.eq('status', 'processing');
      } else if (status === 'shipped') {
        query = query.eq('status', 'shipped');
      } else if (status === 'delivered') {
        query = query.eq('status', 'delivered');
      } else if (status === 'all') {
      
      }
      
      if (searchQuery) {
        query = query.or(`orders.id.ilike.%${searchQuery}%`);
      }
      
      query = query.order('created_at', { foreignTable: 'orders', ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching seller orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderItemId, newStatus) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', orderItemId);
      
      if (error) throw error;
      
      fetchSellerOrders(activeTab);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSellerOrders(activeTab);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Orders</h2>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
        }}
      >
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="new" className="relative">
            New Orders
            {orders.filter(o => o.status === 'processing').length > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-orange-500">
                {orders.filter(o => o.status === 'processing').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shipped">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        {['new', 'shipped', 'delivered', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin w-8 h-8 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-gray-500">
                  {tab === 'new' 
                    ? "You don't have any new orders to fulfill" 
                    : tab === 'shipped'
                    ? "You don't have any orders in transit"
                    : tab === 'delivered'
                    ? "You don't have any delivered orders"
                    : "You don't have any orders yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((orderItem) => (
                  <div 
                    key={orderItem.id}
                    className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">
                          Order #{orderItem.orders?.id.substring(0, 8)}
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(orderItem.orders?.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={orderItem.status} />
                        {orderItem.status === 'processing' && (
                          <Button 
                            size="sm"
                            onClick={() => updateOrderStatus(orderItem.id, 'shipped')}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Mark as In Transit
                          </Button>
                        )}
                        {orderItem.status === 'shipped' && (
                          <Button 
                            size="sm"
                            onClick={() => updateOrderStatus(orderItem.id, 'delivered')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                        <img
                          src={orderItem.products?.image_url || "/api/placeholder/80/80"}
                          alt={orderItem.products?.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{orderItem.products?.name}</h3>
                        <p className="text-sm text-gray-500">
                          Quantity: {orderItem.quantity} × KES {orderItem.price_per_unit?.toLocaleString()}
                        </p>
                        <p className="font-bold text-lg mt-1">
                          Total: KES {orderItem.subtotal?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/seller/order/${orderItem.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <MessageDialog 
                          recipientId={orderItem.orders?.user_id}
                          productId={orderItem.product_id}
                          orderId={orderItem.order_id}
                          buttonText="Contact Buyer"
                          buttonVariant="outline"
                          buttonSize="sm"
                          productName={orderItem.products?.name}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'pending_payment':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Awaiting Payment</Badge>;
    case 'processing':
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Processing</Badge>;
    case 'shipped':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Transit</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="bg-green-100 text-green-800">Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
};


export default SellerOrdersDetail