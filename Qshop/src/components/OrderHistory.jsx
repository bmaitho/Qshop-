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

      // ✅ Fetch ORDERS table with order_items nested
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!fk_order_items_order_id(
            *,
            products(*)
          )
        `)
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

  const getStatusIcon = (order) => {
    // Check overall order status
    const allDelivered = order.order_items?.every(item => item.status === 'delivered');
    const anyShipped = order.order_items?.some(item => item.status === 'shipped');
    const anyProcessing = order.order_items?.some(item => item.status === 'processing');

    if (allDelivered) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (anyShipped) {
      return <Truck className="h-5 w-5 text-purple-500" />;
    } else if (anyProcessing) {
      return <Package className="h-5 w-5 text-blue-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = (order) => {
    // Check if all items are delivered and confirmed
    const allDelivered = order.order_items?.every(item => item.status === 'delivered');
    const allConfirmed = order.order_items?.every(item => item.buyer_confirmed);
    
    if (allDelivered && allConfirmed) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Completed
        </Badge>
      );
    } else if (allDelivered && !allConfirmed) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Awaiting Confirmation
        </Badge>
      );
    }
    
    // Check payment status
    if (order.payment_status === 'completed') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Processing
        </Badge>
      );
    } else if (order.payment_status === 'pending') {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending Payment
        </Badge>
      );
    }
    
    return <Badge variant="outline">Unknown</Badge>;
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
      {orders.map((order) => {
        const firstItem = order.order_items?.[0];
        const itemCount = order.order_items?.length || 0;
        
        return (
          <Link to={`/orders/${order.id}`} key={order.id}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {firstItem?.products?.images?.[0] && (
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={firstItem.products.images[0]}
                          alt={firstItem.products.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order)}
                        <h3 className="font-medium">
                          {firstItem?.products?.name || 'Order'} 
                          {itemCount > 1 && ` +${itemCount - 1} more`}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Order #{order.id?.substring(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        KES {order.amount ? Number(order.amount).toFixed(2) : '0.00'}
                      </div>
                      <div className="mt-1">{getStatusBadge(order)}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default OrderHistory;