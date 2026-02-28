// src/components/OrderDetails.jsx
// FIXED: Handles multiple order items (multiple sellers) with per-item messaging

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock, MessageCircle,
  Send, RefreshCw, MapPin, Phone, AlertCircle, Star, Flag, ChevronDown
} from 'lucide-react';
import Navbar from './Navbar';
import { sendMessageEmail } from '../utils/sendMessageEmail';

const API = import.meta.env.VITE_API_URL;
const fmt = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Step Progress ────────────────────────────────────────────────────────────

const StepProgress = ({ itemStatus }) => {
  const steps = ['Paid', 'Processing', 'Shipped', 'Delivered'];
  const statusMap = { processing: 1, shipped: 2, delivered: 3 };
  const current = statusMap[itemStatus] ?? 0;

  return (
    <div className="flex items-start justify-between gap-1">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i <= current
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
              {i <= current ? '✓' : i + 1}
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

      // Email notification (fire-and-forget)
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

const TrackingCard = ({ order, parcels = [], onRefresh, loading }) => {
  const hasParcels = parcels.length > 0;
  const multiSeller = parcels.length > 1;

  return (
    <Card className="border-blue-100 dark:border-blue-900/40 dark:bg-gray-800">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Truck className="h-4 w-4" /> PickUp Mtaani Delivery
          {multiSeller && (
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
              {parcels.length} parcels
            </span>
          )}
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

        {/* Per-seller parcel tracking */}
        {hasParcels ? (
          <div className="space-y-2">
            {parcels.map((parcel, idx) => {
              const statusColor =
                parcel.status === 'delivered'       ? 'bg-green-500' :
                parcel.status === 'at_destination'  ? 'bg-blue-500'  :
                parcel.status === 'in_transit'      ? 'bg-amber-500' : 'bg-gray-400';
              return (
                <div key={idx} className="rounded-xl border dark:border-gray-700 p-3 text-xs space-y-1">
                  {multiSeller && <p className="text-gray-400">From: {parcel.seller_name || `Seller ${idx + 1}`}</p>}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {parcel.tracking_code}
                    </span>
                    <span className={`${statusColor} text-white px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
                      {(parcel.status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>
                  {parcel.origin_name && <p className="text-gray-400">Origin: {parcel.origin_name}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">Tracking info will appear once parcels are created.</p>
        )}

        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Tracking'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Confirm Delivery ─────────────────────────────────────────────────────────

const ConfirmDelivery = ({ orderItem, onRefresh }) => {
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  if (orderItem.buyer_confirmed) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4 text-center text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" /> Delivery confirmed — payment released.
          {orderItem.buyer_rating && (
            <span className="ml-2 flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: orderItem.buyer_rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  const execute = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/buyer-orders/${orderItem.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rating: rating || undefined, review: review || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Delivery confirmed! Payment released.');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {!confirm ? (
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirm(true)}>
          <CheckCircle className="h-4 w-4 mr-2" /> Confirm Delivery & Release Payment
        </Button>
      ) : (
        <div className="space-y-3 p-4 border rounded-xl dark:border-gray-700">
          <p className="text-sm font-medium">Confirm you received this item?</p>

          {/* Star Rating */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                <Star className={`h-6 w-6 ${s <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Optional review..."
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none"
          />

          <p className="text-xs text-amber-600">
            Payment will be released to the seller immediately.
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

// ─── Report a Problem ─────────────────────────────────────────────────────────

const ReportProblem = ({ orderItem, order, currentUser }) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sellerLabel = orderItem.shop_name || orderItem.seller_profile?.full_name || 'Seller';
  const productName = orderItem.products?.name || 'Product';

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe your issue');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get buyer profile for the email
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Insert into issue_reports
      const { data: report, error } = await supabase
        .from('issue_reports')
        .insert({
          user_id: user.id,
          seller_id: orderItem.seller_id,
          product_id: orderItem.product_id,
          order_id: orderItem.order_id,
          order_item_id: orderItem.id,
          description: description.trim(),
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification to admin (fire-and-forget)
      const subtotal = Number(orderItem.subtotal || orderItem.price_per_unit * orderItem.quantity || 0);
      fetch(`${API}/email/order-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: report?.id?.substring(0, 8)?.toUpperCase(),
          buyerName: buyerProfile?.full_name || 'Unknown',
          buyerEmail: buyerProfile?.email || user.email,
          orderId: orderItem.order_id,
          orderItemId: orderItem.id,
          productName,
          sellerName: sellerLabel,
          description: description.trim(),
          orderAmount: `KES ${subtotal.toLocaleString()}`,
          orderStatus: orderItem.status,
        }),
      }).catch(() => {});

      toast.success('Complaint submitted — we\'ll look into it!');
      setDescription('');
      setSubmitted(true);
      setOpen(false);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Complaint submitted — our team will review it.</span>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors py-1"
        >
          <Flag className="h-3.5 w-3.5" />
          Report a problem with this order
        </button>
      ) : (
        <Card className="border-red-200 dark:border-red-900/40 dark:bg-gray-800">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Flag className="h-4 w-4" /> Report a Problem
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Product:</span> {productName}</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Seller:</span> {sellerLabel}</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Order:</span> #{(orderItem.order_id || '').substring(0, 8).toUpperCase()}</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Status:</span> {orderItem.status}</p>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail — e.g. wrong item, not delivered, damaged, seller not responding..."
              rows={4}
              className="w-full text-sm px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Your complaint will be sent directly to the UniHive team. We'll review it and get back to you.
            </p>

            <Button
              onClick={handleSubmit}
              disabled={!description.trim() || submitting}
              size="sm"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Per-Item Section (Messages + Status + Confirm) ───────────────────────────
// NEW: This component renders the messages, status, and confirm delivery
// for a SINGLE order item. The parent loops over all items.

const OrderItemSection = ({ item, order, currentUser, onRefresh }) => {
  const [messages, setMessages] = useState([]);

  const fetchMessages = async () => {
    if (!item?.id) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_item_id', item.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    fetchMessages();
  }, [item?.id]);

  const sellerLabel = item.shop_name || item.seller_profile?.full_name || 'Seller';

  return (
    <div className="space-y-4">
      {/* Seller header for multi-item orders */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {item.products?.name || 'Product'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">by {sellerLabel}</p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0
          ${item.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            item.status === 'shipped'   ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            item.status === 'processing'? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          {item.status || 'pending'}
        </span>
      </div>

      {/* What Happens Next (per item) */}
      {item.status !== 'delivered' && (
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
      )}

      {/* Messages with this seller */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Messages with {sellerLabel}
        </p>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <MessageThread
              messages={messages}
              currentUserId={currentUser?.id}
              orderItem={item}
              onNewMessage={fetchMessages}
            />
          </CardContent>
        </Card>
      </div>

      {/* Confirm Delivery (per item) */}
      {item && (item.status === 'delivered' || item.buyer_confirmed) && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Confirm Delivery</p>
          <ConfirmDelivery orderItem={item} onRefresh={onRefresh} />
        </div>
      )}

      {/* Report a Problem */}
      <ReportProblem orderItem={item} order={order} currentUser={currentUser} />
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingParcels, setTrackingParcels] = useState([]);

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

      // Load per-seller tracking parcels for pickup_mtaani orders
      if (orderData.delivery_method === 'pickup_mtaani') {
        try {
          const trackRes = await fetch(`${API}/pickup-mtaani/order/${orderId}/tracking`);
          const trackData = await trackRes.json();
          if (trackData.success && trackData.parcels) {
            setTrackingParcels(trackData.parcels);
          }
        } catch (e) {
          console.error('Failed to load tracking parcels:', e);
        }
      }

      // Order items
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select(`*, products(id, name, image_url, price), seller_profile:seller_id(id, full_name, email)`)
        .eq('order_id', orderId);
      if (itemsErr) throw itemsErr;

      if (items && items.length > 0) {
        const sellerIds = [...new Set(items.map(i => i.seller_id))];
        const { data: shops } = await supabase.from('shops').select('id, shop_name').in('id', sellerIds);
        const shopMap = Object.fromEntries((shops || []).map(s => [s.id, s.shop_name]));
        const enriched = items.map(i => ({ ...i, shop_name: shopMap[i.seller_id] || null }));
        setOrderItems(enriched);
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

  const handleRefreshTracking = async () => {
    setLoadingTracking(true);
    try {
      const res = await fetch(`${API}/pickup-mtaani/order/${orderId}/tracking`);
      const data = await res.json();
      if (data.success) {
        if (data.parcels && data.parcels.length > 0) {
          setTrackingParcels(data.parcels);
        }
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

  // Determine overall progress from the "worst" item status
  const overallStatus = orderItems.every(i => i.status === 'delivered') ? 'delivered'
    : orderItems.some(i => i.status === 'shipped') ? 'shipped'
    : 'processing';

  const productTotal = orderItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const hasMultipleItems = orderItems.length > 1;

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
              <StepProgress itemStatus={overallStatus} />
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
                              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                            {oi.status || 'pending'}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex-shrink-0">
                          {fmt(oi.subtotal)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Payment</p>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(productTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Delivery</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{fmt(productTotal + deliveryFee)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs pt-1">
                  <span className={`px-2 py-0.5 rounded-full font-medium
                    ${order.payment_status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-amber-100 text-amber-700'}`}>
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
                parcels={trackingParcels}
                onRefresh={handleRefreshTracking}
                loading={loadingTracking}
              />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              FIX: Per-item messaging, status & delivery confirmation
              Instead of only showing the first item's messages,
              we now loop over ALL order items.
              ════════════════════════════════════════════════════════════════════ */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              {hasMultipleItems ? 'Seller Communication' : 'Messages with Seller'}
            </p>

            <div className={`space-y-6 ${hasMultipleItems ? '' : ''}`}>
              {orderItems.map((oi) => (
                <div
                  key={oi.id}
                  className={hasMultipleItems
                    ? 'border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-4'
                    : ''
                  }
                >
                  <OrderItemSection
                    item={oi}
                    order={order}
                    currentUser={currentUser}
                    onRefresh={fetchAll}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default OrderDetails;