// SellerOrders.jsx - Component to show in My Shop or Profile page
import React, { useState, useEffect } from 'react';
import { supabase } from '../components/SupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Search,
  FileText,
  MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchSellerOrders(activeTab);
  }, [activeTab]);
  
  const fetchSellerOrders = async (status) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Different query based on tab/status
      let query = supabase
        .from('order_items')
        .select(`
          *,
          orders(*),
          products(*)
        `)
        .eq('seller_id', user.id);
      
      // Filter by status
      if (status === 'new') {
        query = query.eq('status', 'processing');
      } else if (status === 'shipped') {
        query = query.eq('status', 'shipped');
      } else if (status === 'delivered') {
        query = query.eq('status', 'delivered');
      } else if (status === 'all') {
        // No additional filter
      }
      
      // Add search if provided
      if (searchQuery) {
        query = query.or(`orders.id.ilike.%${searchQuery}%`);
      }
      
      // Order by date
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
      
      // Refresh the orders
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
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
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
                    ? "You don't have any shipped orders"
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
                            Mark Shipped
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
                        <Link to={`/seller/order/${orderItem.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Contact Buyer
                        </Button>
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

// Helper component for status badges
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'pending_payment':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Awaiting Payment</Badge>;
    case 'processing':
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Processing</Badge>;
    case 'shipped':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Shipped</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="bg-green-100 text-green-800">Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
};

export default SellerOrders;