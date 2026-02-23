// src/components/OrderDetails.jsx
// COMPLETE REWRITE — fixes:
// 1. shop_name removed from profiles join (column doesn't exist) — shops table joined separately
// 2. Full buyer-seller message thread shown inline with reply box
// 3. PickUp Mtaani tracking card with live refresh
// 4. Clear payment breakdown with M-Pesa receipt
// 5. Step-by-step fulfillment guide adapts to current status
// 6. Confirm delivery + rating section

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock, Star,
  MessageCircle, Send, RefreshCw, MapPin, CreditCard,
  AlertCircle, Phone
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import { sendMessageEmail } from '../utils/sendMessageEmail';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const TRACKING_LABELS = {
  pending_pickup: 'Waiting for seller to drop off',
  in_transit: 'In transit between agents',
  at_destination: 'Ready for pickup at your agent',
  delivered: 'Collected by recipient',
  cancelled: 'Cancelled',
};

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const StepProgress = ({ itemStatus }) => {
  const steps = ['Payment Confirmed', 'Seller Ships', 'In Transit', 'Delivered'];
  const current =
    itemStatus === 'delivered' ? 3 :
    itemStatus === 'shipped' ? 2 :
    itemStatus === 'processing' ? 1 : 0;

  return (
    <div className="flex items-start gap-0 w-full">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 56 }}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i < current  ? 'bg-green-600 border-green-600 text-white' :
                i === current ? 'bg-white dark:bg-gray-900 border-green-600 text-green-600 shadow-sm' :
                               'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 text-center leading-tight
              ${i <= current ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mt-3.5 transition-all ${i < current ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Message Thread ───────────────────────────────────────────────────────────

const MessageThread = ({ messages, currentUserId, orderItem, onNewMessage }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !orderItem) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [{ data: senderProfile }, { data: recipientProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
        supabase.from('profiles').select('full_name, email').eq('id', orderItem.seller_id).single(),
      ]);

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: orderItem.seller_id,
        message: text.trim(),
        sender_name: senderProfile?.full_name || senderProfile?.email || 'Buyer',
        recipient_name: recipientProfile?.full_name || recipientProfile?.email || 'Seller',
        order_item_id: orderItem.id,
        order_id: orderItem.order_id,
        product_id: orderItem.product_id,
        read: false,
      });
      if (error) throw error;

      // Buyer replying = buyer agreed
      if (!orderItem.buyer_agreed) {
        await supabase.from('order_items').update({ buyer_agreed: true }).eq('id', orderItem.id);
      }

      // 📧 Email notification to seller (fire-and-forget, never blocks UI)
      // senderProfile and recipientProfile were fetched at the top of handleSend
      sendMessageEmail({
        recipientId: orderItem.seller_id,
        senderName: senderProfile?.full_name || senderProfile?.email || 'Buyer',
        messageText: text.trim(),
        orderItemId: orderItem.id,
        orderId: orderItem.order_id,
        productId: orderItem.product_id,
      });

      setText('');
      onNewMessage();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isActive = orderItem?.status !== 'delivered' && !orderItem?.buyer_confirmed;

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No messages yet.</p>
          <p className="text-xs mt-1">The seller will contact you here to arrange delivery.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 py-1">
          {messages.map((msg) => {
            const mine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed
                  ${mine
                    ? 'bg-green-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                  <p>{msg.message}</p>
                  <p className={`text-[10px] mt-1 opacity-70`}>
                    {msg.sender_name} · {fmtDate(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {isActive && (
        <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Reply to seller..."
            rows={2}
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="sm"
            className="self-end bg-green-600 hover:bg-green-700 text-white h-9 w-9 p-0 rounded-xl flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── PickUp Mtaani Tracking ───────────────────────────────────────────────────

const TrackingCard = ({ order, onRefresh, trackingData, loading }) => {
  if (order.delivery_method !== 'pickup_mtaani') return null;

  const statusLabel = TRACKING_LABELS[order.pickup_mtaani_status]
    || order.pickup_mtaani_status
    || 'Waiting for update';

  const dotColor =
    order.pickup_mtaani_status === 'delivered'      ? 'bg-green-500' :
    order.pickup_mtaani_status === 'at_destination' ? 'bg-blue-500'  :
    order.pickup_mtaani_status === 'in_transit'     ? 'bg-amber-500' :
                                                      'bg-gray-300 dark:bg-gray-600';
  return (
    <Card className="border-blue-100 dark:border-blue-900/40 dark:bg-gray-800">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Truck className="h-4 w-4" /> PickUp Mtaani Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">

        {/* Pickup point */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3" /> Your Collection Point
          </p>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {order.pickup_mtaani_destination_name}
          </p>
          {order.pickup_mtaani_destination_address && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
              {order.pickup_mtaani_destination_address.trim()}
            </p>
          )}
          {order.pickup_mtaani_destination_town && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {order.pickup_mtaani_destination_town.trim()}
            </p>
          )}
        </div>

        {/* Tracking code */}
        {order.pickup_mtaani_tracking_code ? (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Tracking Code</p>
              <p className="font-mono font-bold text-base text-gray-900 dark:text-gray-100 tracking-widest">
                {order.pickup_mtaani_tracking_code}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 w-8 p-0">
              <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Tracking code will appear once the seller drops off your parcel.
          </div>
        )}

        {/* Status dot */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
          <p className="text-xs text-gray-600 dark:text-gray-400">{statusLabel}</p>
        </div>

        {/* Live parcel data if available */}
        {trackingData && (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1 border dark:border-gray-700">
            {['status', 'current_location', 'updated_at', 'estimated_delivery'].map((k) =>
              trackingData[k] ? (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-gray-700 dark:text-gray-300 text-right">{String(trackingData[k])}</span>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Delivery Confirm + Rating ────────────────────────────────────────────────

const ConfirmDelivery = ({ orderItem, onRefresh }) => {
  const [rating, setRating] = useState(orderItem.buyer_rating || 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(orderItem.buyer_review || '');
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (orderItem.buyer_confirmed) {
    return (
      <div className="flex items-center gap-2.5 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/40">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Delivery confirmed</p>
          {orderItem.buyer_rating && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">You rated this order {orderItem.buyer_rating}★</p>
          )}
        </div>
      </div>
    );
  }

  if (orderItem.status !== 'delivered') return null;

  const execute = async () => {
    if (rating === 0) return toast.warning('Please select a star rating first');
    setSubmitting(true);
    setConfirm(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/buyer-orders/${orderItem.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ rating, review: review.trim() || null }),
        }
      );
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success('Confirmed! Payment released to seller.');
      onRefresh();
    } catch (e) {
      toast.error(e.message || 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
        Have you received your item?
      </p>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-4">
        Confirm delivery to release payment to the seller. Only do this once you have your item.
      </p>

      {/* Stars */}
      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-7 w-7 cursor-pointer transition-colors ${
              s <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
          />
        ))}
        {rating > 0 && <span className="ml-2 text-sm text-amber-700 dark:text-amber-300 self-center">{rating}/5</span>}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Leave a review for the seller (optional)"
        rows={2}
        className="w-full text-sm px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none mb-3 focus:outline-none"
      />

      {!confirm ? (
        <Button
          onClick={() => setConfirm(true)}
          disabled={rating === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" /> Confirm I Received My Order
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-amber-800 dark:text-amber-200 text-center bg-amber-100 dark:bg-amber-900/40 rounded-lg p-2">
            This action is irreversible. Payment will be released to the seller immediately.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={execute}
              disabled={submitting}
            >
              {submitting ? 'Confirming...' : "Yes, release payment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    fetchAll();
  }, [orderId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders').select('*').eq('id', orderId).single();
      if (orderErr) throw orderErr;
      setOrder(orderData);

      // Order items — NO shop_name in profiles join
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select(`*, products(id, name, image_url, price), seller_profile:seller_id(id, full_name, email)`)
        .eq('order_id', orderId);
      if (itemsErr) throw itemsErr;

      // Shops joined separately (shops.id === seller_id)
      if (items && items.length > 0) {
        const sellerIds = [...new Set(items.map(i => i.seller_id))];
        const { data: shops } = await supabase.from('shops').select('id, shop_name').in('id', sellerIds);
        const shopMap = Object.fromEntries((shops || []).map(s => [s.id, s.shop_name]));
        const enriched = items.map(i => ({ ...i, shop_name: shopMap[i.seller_id] || null }));
        setOrderItems(enriched);

        // Fetch messages for first item
        if (enriched[0]?.id) fetchMessages(enriched[0].id);
      } else {
        setOrderItems([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (itemId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_item_id', itemId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleRefreshTracking = async () => {
    if (!order?.pickup_mtaani_tracking_code) return;
    setLoadingTracking(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pickup-mtaani/order/${orderId}/tracking`);
      const data = await res.json();
      if (data.success) {
        setTrackingData(data.parcelData);
        const { data: fresh } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (fresh) setOrder(fresh);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-gray-400" />
          <p className="text-gray-500 text-sm">Order not found</p>
          <Button variant="outline" onClick={() => navigate('/profile?tab=orders')}>Back to Orders</Button>
        </div>
      </>
    );
  }

  const item = orderItems[0];
  const productTotal = orderItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const deliveryFee = Number(order.delivery_fee || 0);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/profile?tab=orders')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> My Orders
            </button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-xs">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Order ID */}
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">Order</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              #{orderId.substring(0, 8).toUpperCase()}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtDate(order.created_at)}</p>
          </div>

          {/* Progress */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="px-4 py-4">
              <StepProgress itemStatus={item?.status || 'processing'} />
            </CardContent>
          </Card>

          {/* Items */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Items</p>
            <div className="space-y-3">
              {orderItems.map((oi) => {
                const sellerLabel = oi.shop_name || oi.seller_profile?.full_name || 'Seller';
                return (
                  <Card key={oi.id} className="dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {oi.products?.image_url ? (
                            <img src={oi.products.image_url} alt={oi.products.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{oi.products?.name || 'Product'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">by {sellerLabel}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Qty {oi.quantity} × {fmt(oi.price_per_unit)}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1.5
                            ${oi.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              oi.status === 'shipped'   ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              oi.status === 'processing'? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                          'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                            {oi.status === 'delivered'  && <CheckCircle className="h-3 w-3" />}
                            {oi.status === 'shipped'    && <Truck className="h-3 w-3" />}
                            {oi.status === 'processing' && <Clock className="h-3 w-3" />}
                            <span className="capitalize">{oi.status?.replace(/_/g, ' ') || 'Processing'}</span>
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-gray-400">Subtotal</p>
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{fmt(oi.subtotal)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Payment</p>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Products</span>
                  <span className="text-gray-800 dark:text-gray-200">{fmt(productTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Delivery · {order.delivery_method === 'pickup_mtaani' ? 'PickUp Mtaani' : 'Delivery'}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200">{fmt(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-gray-100">Total Paid</span>
                  <span className="text-green-700 dark:text-green-400 text-base">{fmt(order.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <CreditCard className="h-3.5 w-3.5" /> M-Pesa
                  </span>
                  {order.mpesa_receipt && (
                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                      {order.mpesa_receipt}
                    </span>
                  )}
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full
                    ${order.payment_status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 text-amber-700'}`}>
                    {order.payment_status === 'completed' ? 'Paid' : order.payment_status}
                  </span>
                </div>
                {order.phone_number && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-0.5">
                    <Phone className="h-3.5 w-3.5" /> Paid from {order.phone_number}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PickUp Mtaani Tracking */}
          {order.delivery_method === 'pickup_mtaani' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Delivery Tracking</p>
              <TrackingCard
                order={order}
                onRefresh={handleRefreshTracking}
                trackingData={trackingData}
                loading={loadingTracking}
              />
            </div>
          )}

          {/* What happens next guide */}
          {item && item.status !== 'delivered' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">What Happens Next</p>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                  {!item.buyer_contacted && (
                    <div className="flex gap-3 items-start">
                      <MessageCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        The seller will message you below to confirm delivery details.
                      </p>
                    </div>
                  )}
                  {item.buyer_contacted && !item.buyer_agreed && (
                    <div className="flex gap-3 items-start">
                      <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Reply to the seller below to confirm your delivery arrangement.
                      </p>
                    </div>
                  )}
                  {item.buyer_agreed && item.status === 'processing' && (
                    <div className="flex gap-3 items-start">
                      <Package className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        All confirmed — waiting for the seller to ship your order.
                      </p>
                    </div>
                  )}
                  {item.status === 'shipped' && (
                    <div className="flex gap-3 items-start">
                      <Truck className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {order.delivery_method === 'pickup_mtaani'
                          ? `Your parcel is on its way to ${order.pickup_mtaani_destination_name}. Check the tracking section above.`
                          : 'Your order has been shipped. Check messages for delivery updates.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Messages */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Messages with Seller</p>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <MessageThread
                  messages={messages}
                  currentUserId={currentUser?.id}
                  orderItem={item}
                  onNewMessage={() => item?.id && fetchMessages(item.id)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Confirm Delivery */}
          {item && (item.status === 'delivered' || item.buyer_confirmed) && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Confirm Delivery</p>
              <ConfirmDelivery orderItem={item} onRefresh={fetchAll} />
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default OrderDetails;