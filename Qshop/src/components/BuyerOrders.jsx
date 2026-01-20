// src/components/BuyerOrders.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Star, 
  Clock,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const BuyerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const backendUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${backendUrl}/api/buyer-orders?status=${statusFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderItemId, withRating = false) => {
    try {
      setConfirmingOrder(orderItemId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const backendUrl = import.meta.env.VITE_API_URL;
      
      const body = {};
      if (withRating && rating > 0) {
        body.rating = rating;
        if (review.trim()) {
          body.review = review.trim();
        }
      }

      const response = await fetch(
        `${backendUrl}/buyer-orders/${orderItemId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access_token}`
          },
          body: JSON.stringify(body)
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('Delivery confirmed! Payment has been released to the seller.');
        setRatingOrder(null);
        setRating(0);
        setReview('');
        fetchOrders(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setConfirmingOrder(null);
    }
  };

  const handleUpdateRating = async (orderItemId) => {
    try {
      if (rating === 0) {
        toast.error('Please select a rating');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const backendUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(
        `${backendUrl}/buyer-orders/${orderItemId}/rating`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access_token}`
          },
          body: JSON.stringify({
            rating,
            review: review.trim()
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('Rating updated successfully!');
        setRatingOrder(null);
        setRating(0);
        setReview('');
        fetchOrders();
      } else {
        toast.error(result.error || 'Failed to update rating');
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error('Failed to update rating');
    }
  };

  const getStatusBadge = (order) => {
    if (order.buyer_confirmed) {
      return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
    }
    
    const statusConfig = {
      'processing': { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
      'shipped': { label: 'Shipped', className: 'bg-purple-100 text-purple-800' },
      'delivered': { label: 'Delivered - Awaiting Confirmation', className: 'bg-amber-100 text-amber-800' },
      'cancelled': { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[order.status] || { label: order.status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusIcon = (status, confirmed) => {
    if (confirmed) return <CheckCircle className="h-5 w-5 text-green-600" />;
    
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-600" />;
      case 'delivered':
        return <Package className="h-5 w-5 text-amber-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const StarRating = ({ value, onChange, readonly = false }) => {
    const [hover, setHover] = useState(0);

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shop
        </Button>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-gray-600 mt-2">Track and manage your purchases</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All Orders' },
          { value: 'processing', label: 'Processing' },
          { value: 'shipped', label: 'Shipped' },
          { value: 'delivered', label: 'Delivered' }
        ].map(({ value, label }) => (
          <Button
            key={value}
            variant={statusFilter === value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(value)}
            className="whitespace-nowrap"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'all' 
                ? "You haven't made any purchases yet"
                : `No ${statusFilter} orders`}
            </p>
            <Button onClick={() => navigate('/')}>
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status, order.buyer_confirmed)}
                    <div>
                      <p className="font-semibold">
                        Order #{order.id.substring(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(order)}
                </div>
              </CardHeader>

              <CardContent>
                {/* Product Info */}
                <div className="flex gap-4 mb-4">
                  {order.products?.images?.[0] && (
                    <img
                      src={order.products.images[0]}
                      alt={order.products.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{order.products?.name}</h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {order.quantity}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      KSh {(order.price_per_unit * order.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Seller</p>
                  <p className="font-semibold">
                    {order.profiles?.full_name || 'UniHive Seller'}
                  </p>
                  {order.profiles?.campus_location && (
                    <p className="text-sm text-gray-600">
                      {order.profiles.campus_location}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {/* Contact Seller Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/messages?seller=${order.seller_id}&product=${order.product_id}`)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Seller
                  </Button>

                  {/* Confirm Delivery Button */}
                  {order.status === 'delivered' && !order.buyer_confirmed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setRatingOrder(order.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Rate
                    </Button>
                  )}

                  {/* View/Update Rating */}
                  {order.buyer_confirmed && order.buyer_rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Your rating:</span>
                      <StarRating value={order.buyer_rating} readonly />
                    </div>
                  )}
                </div>

                {/* Rating Modal */}
                {ratingOrder === order.id && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-3">
                      {order.buyer_confirmed ? 'Update Your Rating' : 'Confirm Delivery & Rate Seller'}
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Rating *
                        </label>
                        <StarRating 
                          value={rating} 
                          onChange={setRating}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Review (Optional)
                        </label>
                        <textarea
                          value={review}
                          onChange={(e) => setReview(e.target.value)}
                          placeholder="Share your experience with this seller..."
                          className="w-full p-2 border rounded-lg resize-none"
                          rows="3"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (order.buyer_confirmed) {
                              handleUpdateRating(order.id);
                            } else {
                              handleConfirmDelivery(order.id, true);
                            }
                          }}
                          disabled={confirmingOrder === order.id || rating === 0}
                        >
                          {confirmingOrder === order.id ? (
                            <>Processing...</>
                          ) : order.buyer_confirmed ? (
                            'Update Rating'
                          ) : (
                            'Confirm & Submit Rating'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRatingOrder(null);
                            setRating(0);
                            setReview('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Review Display */}
                {order.buyer_confirmed && order.buyer_review && ratingOrder !== order.id && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Your review:</p>
                    <p className="text-sm">{order.buyer_review}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRatingOrder(order.id);
                        setRating(order.buyer_rating);
                        setReview(order.buyer_review || '');
                      }}
                      className="mt-2"
                    >
                      Edit Rating
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;