// src/components/OrderHistory.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '../components/SupabaseClient';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Shipped</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
        <Link to="/studentmarketplace" className="text-blue-600 hover:text-blue-800 font-medium">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link to={`/orders/${order.id}`} key={order.id}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.order_status)}
                    <h3 className="font-medium">Order #{order.id.substring(0, 8)}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">KES {order.amount?.toFixed(2)}</div>
                    <div className="mt-1">{getStatusBadge(order.order_status)}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default OrderHistory;