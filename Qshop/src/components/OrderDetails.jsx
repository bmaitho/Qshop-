// src/components/OrderDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Star, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';
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

  // Rating Section Component for Order Items
  const OrderItemRatingSection = ({ orderItem, onRefresh }) => {
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(orderItem.buyer_rating || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [review, setReview] = useState(orderItem.buyer_review || '');
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const handleConfirmAndRate = async () => {
      if (rating === 0) {
        toast.warning('Please select a rating (1-5 stars)');
        return;
      }

      // ✅ Show custom dialog
      setShowConfirmDialog(true);
    };

    const executeConfirmation = async () => {
      setSubmitting(true);
      setShowConfirmDialog(false);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const backendUrl = import.meta.env.VITE_API_URL;
        
        console.log('Confirming delivery and triggering payment...');
        const paymentResponse = await fetch(
          `${backendUrl}/buyer-orders/${orderItem.id}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              rating: rating,
              review: review.trim() || null
            })
          }
        );

        const paymentResult = await paymentResponse.json();
        console.log('Payment result:', paymentResult);

        if (paymentResult.success) {
          toast.success('Delivery confirmed! Payment has been released to the seller. Thank you for your feedback!', {
            position: "top-center",
            autoClose: 3000,
          });
        } else {
          toast.success('Delivery confirmed and rated! Payment processing has been initiated.', {
            position: "top-center",
            autoClose: 3000,
          });
        }

        setShowRating(false);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error confirming delivery:', error);
        toast.error('Failed to confirm delivery: ' + error.message);
      } finally {
        setSubmitting(false);
      }
    };

    const handleUpdateRating = async () => {
      if (rating === 0) {
        toast.warning('Please select a rating (1-5 stars)');
        return;
      }

      setSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('order_items')
          .update({
            buyer_rating: rating,
            buyer_review: review.trim() || null
          })
          .eq('id', orderItem.id)
          .eq('buyer_user_id', user.id);

        if (error) throw error;

        toast.success('Rating updated successfully!', {
          position: "top-center",
          autoClose: 3000,
        });
        setShowRating(false);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error updating rating:', error);
        toast.error('Failed to update rating: ' + error.message);
      } finally {
        setSubmitting(false);
      }
    };

    // Don't show anything if not delivered yet
    if (orderItem.status !== 'delivered') {
      return null;
    }

    // Already confirmed - show current rating
    if (orderItem.buyer_confirmed && !showRating) {
      return (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900 dark:text-green-200">
              Delivery Confirmed
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Confirmed on {new Date(orderItem.buyer_confirmed_at).toLocaleDateString()}
          </div>

          {/* Show Rating */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Your rating:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= orderItem.buyer_rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Show Review if exists */}
          {orderItem.buyer_review && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              "{orderItem.buyer_review}"
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRating(true)}
            className="mt-2"
          >
            Edit Rating
          </Button>
        </div>
      );
    }

    // Need confirmation - show rating interface
    if (!showRating) {
      return (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Confirm Delivery & Rate Seller
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Please confirm that you received this item. Payment will be released to the seller after confirmation.
          </p>
          <Button
            onClick={() => setShowRating(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Confirm & Rate Seller
          </Button>
        </div>
      );
    }

    // Rating form
    return (
      <>
        {/* ✅ Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Confirm Delivery</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Confirm that you received this item? This will release payment to the seller.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeConfirmation}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Processing...' : 'OK'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-3">
            {orderItem.buyer_confirmed ? 'Update Your Rating' : 'Confirm Delivery & Rate'}
          </h4>

          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Rating (required) *
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Review Text */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this seller..."
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {review.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={orderItem.buyer_confirmed ? handleUpdateRating : handleConfirmAndRate}
              disabled={submitting || rating === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>Processing...</>
              ) : orderItem.buyer_confirmed ? (
                'Update Rating'
              ) : (
                'Confirm & Submit Rating'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRating(false);
                setRating(orderItem.buyer_rating || 0);
                setReview(orderItem.buyer_review || '');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>

          {!orderItem.buyer_confirmed && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              By confirming, you acknowledge receiving this item and payment will be released to the seller.
            </p>
          )}
        </div>
      </>
    );
  };

  useEffect(() => {
    fetchOrderDetails();
    getCurrentUser();
    
    const refreshInterval = setInterval(() => {
      refreshOrderDetails();
    }, 60000);
    
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
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

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

  const getBackNavigationPath = () => {
    if (location.state?.from === 'seller' || document.referrer.includes('/myshop')) {
      return '/myshop';
    }
    
    const isSellerOfOrder = orderItems.some(item => 
      currentUser && item.seller_id === currentUser.id
    );
    
    if (isSellerOfOrder) {
      return '/myshop';
    }
    
    return '/profile?tab=orders';
  };

  const getBackButtonText = () => {
    const isSellerContext = location.state?.from === 'seller' || 
                           document.referrer.includes('/myshop') ||
                           orderItems.some(item => currentUser && item.seller_id === currentUser.id);
    
    return isSellerContext ? 'Back to My Orders' : 'Back to Orders';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
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
    const statusColors = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };

    return (
      <Badge className={statusColors[status] || statusColors.pending}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400">Order not found</p>
          <Button 
            onClick={() => navigate('/profile?tab=orders')}
            className="mt-4"
          >
            Back to Orders
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(getBackNavigationPath())}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Order Details</h1>
              <p className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshOrderDetails}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order Date</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                  {order.payment_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <p className="font-medium text-lg">
                  KES {(order.amount && !isNaN(order.amount)) ? Number(order.amount).toFixed(2) : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="font-medium capitalize">{order.payment_method || 'M-Pesa'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Order Items</h2>
          
          {orderItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {item.products?.images?.[0] ? (
                      <img
                        src={item.products.images[0]}
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {item.products?.name || 'Product'}
                        </h3>
                        
                        {item.profiles && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Sold by:{' '}
                            <Link
                              to={`/shop/${item.profiles.id}`}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                            >
                              {item.profiles.shop_name || item.profiles.full_name || 'Seller'}
                            </Link>
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span>Quantity: {item.quantity}</span>
                          <span>•</span>
                          <span>KES {Number(item.price).toFixed(2)} each</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {getStatusIcon(item.status)}
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">Subtotal</p>
                        <p className="text-lg font-semibold">
                          KES {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {!item.buyer_confirmed && item.profiles && (
                      <div className="flex gap-2 mt-4">
                        <MessageDialog
                          recipientId={item.profiles.id}
                          recipientName={item.profiles.shop_name || item.profiles.full_name || 'Seller'}
                          orderId={item.id}
                          trigger={
                            <Button variant="outline" size="sm">
                              Message Seller
                            </Button>
                          }
                        />
                      </div>
                    )}

                    <OrderItemRatingSection 
                      orderItem={item} 
                      onRefresh={refreshOrderDetails}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delivery Info */}
        {(order.delivery_address || order.delivery_phone) && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
              <div className="space-y-2 text-sm">
                {order.delivery_address && (
                  <p><span className="font-medium">Address:</span> {order.delivery_address}</p>
                )}
                {order.delivery_phone && (
                  <p><span className="font-medium">Phone:</span> {order.delivery_phone}</p>
                )}
                {order.delivery_notes && (
                  <p><span className="font-medium">Notes:</span> {order.delivery_notes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <ReportIssueDialog orderId={order.id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default OrderDetails;