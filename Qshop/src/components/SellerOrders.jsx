// src/components/SellerOrders.jsx
// Complete rewrite — action-first, mobile-optimised, self-explaining

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  ArrowRight,
  Inbox,
  ShoppingBag
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const getDaysSince = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const formatTimeAgo = (dateStr) => {
  const days = getDaysSince(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const formatAmount = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

// Derive the single "next action" for a processing order
const getAction = (item) => {
  if (item.status === 'shipped') return { type: 'shipped' };
  if (item.status === 'delivered') return { type: 'delivered' };
  if (!item.buyer_contacted) return { type: 'contact' };
  if (item.buyer_contacted && !item.buyer_agreed) return { type: 'waiting' };
  if (item.buyer_contacted && item.buyer_agreed) return { type: 'ship' };
  return { type: 'contact' };
};

// ─── Section header ──────────────────────────────────────────────────────────

const SectionHeader = ({ label, count, icon: Icon, accent }) => (
  <div className={`flex items-center gap-2 px-1 mb-3 mt-6 first:mt-0`}>
    <Icon className={`h-4 w-4 ${accent}`} />
    <span className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
      {label}
    </span>
    {count > 0 && (
      <span className={`ml-auto text-xs font-bold ${accent}`}>{count}</span>
    )}
  </div>
);

// ─── Message bottom sheet ────────────────────────────────────────────────────

const MessageSheet = ({ orderItem, onClose, onSent }) => {
  const [text, setText] = useState(
    `Hi, your order for "${orderItem.products?.name || 'your item'}" is confirmed. Where should I deliver it?`
  );
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get buyer profile
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', orderItem.buyer_user_id)
        .single();

      const senderName = senderProfile?.full_name || senderProfile?.email || 'Seller';
      const recipientName = buyerProfile?.full_name || buyerProfile?.email || 'Buyer';

      // Insert message
      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: orderItem.buyer_user_id,
        message: text.trim(),
        sender_name: senderName,
        recipient_name: recipientName,
        order_item_id: orderItem.id,
        product_id: orderItem.product_id,
        read: false
      });

      // Mark buyer as contacted
      await supabase
        .from('order_items')
        .update({ buyer_contacted: true })
        .eq('id', orderItem.id);

      toast.success('Message sent — waiting for buyer reply');
      onSent();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0a1f14] rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-emerald-900 p-4 pb-24 animate-in slide-in-from-bottom duration-200" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-emerald-800 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Message buyer
            </p>
            <p className="text-xs text-gray-500 dark:text-emerald-400 mt-0.5">
              Re: {orderItem.products?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 text-gray-400 dark:text-emerald-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full text-sm resize-none bg-gray-50 dark:bg-emerald-950/50 border-gray-200 dark:border-emerald-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-emerald-600 rounded-xl mb-3 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
          placeholder="Type your message..."
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-full bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-xl h-12"
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? 'Sending…' : 'Send & mark as contacted'}
        </Button>
      </div>
    </>
  );
};

// ─── Confirm agreement sheet ─────────────────────────────────────────────────

const AgreementSheet = ({ orderItem, onClose, onConfirmed }) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await supabase
        .from('order_items')
        .update({ buyer_agreed: true })
        .eq('id', orderItem.id);
      toast.success('Confirmed — you can now mark as shipped');
      onConfirmed();
      onClose();
    } catch (err) {
      toast.error('Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0a1f14] rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-emerald-900 p-4 pb-24" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-emerald-800 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Did the buyer reply?
            </p>
            <p className="text-xs text-gray-500 dark:text-emerald-400 mt-0.5">
              Confirm they agreed to pickup / delivery details
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Only confirm this after the buyer has responded in chat and agreed to the delivery plan.
          </p>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-xl h-12"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {confirming ? 'Confirming…' : 'Yes, buyer agreed — unlock shipping'}
        </Button>
      </div>
    </>
  );
};

// ─── Ship confirmation sheet ─────────────────────────────────────────────────

const ShipSheet = ({ orderItem, onClose, onShipped }) => {
  const [shipping, setShipping] = useState(false);

  const handleShip = async () => {
    setShipping(true);
    try {
      await supabase
        .from('order_items')
        .update({ status: 'shipped' })
        .eq('id', orderItem.id);
      toast.success('Order marked as shipped!');
      onShipped();
      onClose();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setShipping(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0a1f14] rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-emerald-900 p-4 pb-24" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-emerald-800 rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
            <Truck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Confirm shipment
            </p>
            <p className="text-xs text-gray-500 dark:text-emerald-400">{orderItem.products?.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-emerald-300 mb-4">
          Only tap this after you have handed over / sent the item. The buyer will be notified and asked to confirm receipt.
        </p>

        <Button
          onClick={handleShip}
          disabled={shipping}
          className="w-full bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-xl h-12"
        >
          <Truck className="h-4 w-4 mr-2" />
          {shipping ? 'Updating…' : 'Yes, I\'ve shipped this order'}
        </Button>
      </div>
    </>
  );
};

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard = ({ item, onActionComplete, navigate }) => {
  const action = getAction(item);
  const [activeSheet, setActiveSheet] = useState(null); // 'message' | 'agree' | 'ship'
  const [expanded, setExpanded] = useState(false);

  const productName = item.products?.name || 'Unknown product';
  const qty = item.quantity || 1;
  const amount = formatAmount((item.price_per_unit || 0) * qty);
  const timeAgo = formatTimeAgo(item.created_at);
  const orderId = item.id?.slice(0, 8);

  // Card left border colour by action type
  const borderMap = {
    contact: 'border-l-emerald-300 dark:border-l-emerald-600',
    waiting: 'border-l-blue-400',
    ship:    'border-l-emerald-500',
    shipped: 'border-l-gray-300 dark:border-l-emerald-800',
    delivered: 'border-l-gray-200 dark:border-l-emerald-900',
  };

  // Product image or placeholder
  const imgSrc = item.products?.images?.[0];

  return (
    <>
      <Card className={`
        border-l-4 ${borderMap[action.type] || 'border-l-gray-200'}
        bg-white dark:bg-emerald-950/40
        border border-gray-100 dark:border-emerald-900/60
        shadow-sm hover:shadow-md transition-shadow duration-150
        overflow-hidden
      `}>
        <CardContent className="p-0">
          {/* Main row */}
          <div className="flex items-center gap-3 p-3">
            {/* Product image */}
            <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-emerald-900/50 overflow-hidden flex-shrink-0">
              {imgSrc ? (
                <img src={imgSrc} alt={productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-gray-400 dark:text-emerald-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">
                {productName}
              </p>
              <p className="text-xs text-gray-500 dark:text-emerald-400 mt-0.5">
                {qty}× · {amount}
              </p>
              <p className="text-xs text-gray-400 dark:text-emerald-600 mt-0.5">
                #{orderId} · {timeAgo}
              </p>
            </div>

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 text-gray-400 dark:text-emerald-500 flex-shrink-0"
            >
              {expanded
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Action strip */}
          {action.type === 'contact' && (
            <div className="px-3 pb-3">
              <Button
                onClick={() => setActiveSheet('message')}
                className="w-full h-10 bg-white hover:bg-emerald-50 dark:bg-transparent dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500 dark:border-emerald-600 text-sm font-semibold rounded-xl"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message buyer to arrange delivery
              </Button>
            </div>
          )}

          {action.type === 'waiting' && (
            <div className="px-3 pb-3 flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <span className="text-xs text-blue-700 dark:text-blue-300 leading-tight">
                  Waiting for buyer to reply
                </span>
              </div>
              <Button
                onClick={() => setActiveSheet('agree')}
                variant="outline"
                className="h-auto px-3 py-2 text-xs border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl"
              >
                They replied
              </Button>
            </div>
          )}

          {action.type === 'ship' && (
            <div className="px-3 pb-3">
              <Button
                onClick={() => setActiveSheet('ship')}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl"
              >
                <Truck className="h-4 w-4 mr-2" />
                Mark as shipped
              </Button>
            </div>
          )}

          {action.type === 'shipped' && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-emerald-900/20 rounded-xl">
                <Truck className="h-4 w-4 text-gray-400 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 dark:text-emerald-400">
                  Shipped — waiting for buyer to confirm receipt
                </span>
              </div>
            </div>
          )}

          {action.type === 'delivered' && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-emerald-900/30 rounded-xl">
                <CheckCircle className="h-4 w-4 text-gray-400 dark:text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-gray-400 dark:text-emerald-500">
                  Delivered · Payment released
                </span>
              </div>
            </div>
          )}

          {/* Expanded detail */}
          {expanded && (
            <div className="px-3 pb-3 border-t border-gray-100 dark:border-emerald-900/50 pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-emerald-600">Order ID</p>
                  <p className="font-mono text-gray-700 dark:text-emerald-300">#{orderId}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-emerald-600">Amount</p>
                  <p className="font-semibold text-gray-700 dark:text-emerald-300">{amount}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-emerald-600">Placed</p>
                  <p className="text-gray-700 dark:text-emerald-300">
                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-emerald-600">Qty</p>
                  <p className="text-gray-700 dark:text-emerald-300">{qty}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/seller/orders/${item.id}`)}
                className="w-full text-xs text-gray-500 dark:text-emerald-400 hover:text-gray-700 dark:hover:text-emerald-200 h-8 mt-1"
              >
                View full details <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheets */}
      {activeSheet === 'message' && (
        <MessageSheet
          orderItem={item}
          onClose={() => setActiveSheet(null)}
          onSent={onActionComplete}
        />
      )}
      {activeSheet === 'agree' && (
        <AgreementSheet
          orderItem={item}
          onClose={() => setActiveSheet(null)}
          onConfirmed={onActionComplete}
        />
      )}
      {activeSheet === 'ship' && (
        <ShipSheet
          orderItem={item}
          onClose={() => setActiveSheet(null)}
          onShipped={onActionComplete}
        />
      )}
    </>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white dark:bg-emerald-950/40 border border-gray-100 dark:border-emerald-900/60 rounded-lg p-3 flex gap-3 animate-pulse">
    <div className="w-14 h-14 bg-gray-100 dark:bg-emerald-900/50 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-3 bg-gray-100 dark:bg-emerald-900/50 rounded w-2/3" />
      <div className="h-2.5 bg-gray-100 dark:bg-emerald-900/50 rounded w-1/3" />
      <div className="h-8 bg-gray-100 dark:bg-emerald-900/40 rounded-xl w-full mt-2" />
    </div>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ filter }) => {
  const messages = {
    needs_action: { icon: Inbox, title: 'All caught up', body: 'No orders need your attention right now.' },
    in_progress: { icon: Truck, title: 'Nothing in transit', body: 'Orders you\'ve shipped will appear here.' },
    done: { icon: CheckCircle, title: 'No completed orders yet', body: 'Delivered orders will show here.' },
    search: { icon: Search, title: 'No results', body: 'Try a different order ID or product name.' },
    all: { icon: ShoppingBag, title: 'No orders yet', body: 'When buyers purchase your products, orders will appear here.' },
  };
  const { icon: Icon, title, body } = messages[filter] || messages.all;
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="w-14 h-14 bg-gray-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-400 dark:text-emerald-600" />
      </div>
      <p className="font-semibold text-gray-700 dark:text-emerald-300 text-sm">{title}</p>
      <p className="text-xs text-gray-400 dark:text-emerald-600 mt-1 max-w-xs">{body}</p>
    </div>
  );
};

// ─── Filter pill ─────────────────────────────────────────────────────────────

const FilterPill = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150
      ${active
        ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-sm'
        : 'bg-gray-100 dark:bg-emerald-900/40 text-gray-600 dark:text-emerald-400 hover:bg-gray-200 dark:hover:bg-emerald-900'}
    `}
  >
    {children}
    {count > 0 && (
      <span className={`
        inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
        ${active ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'}
      `}>
        {count}
      </span>
    )}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SellerOrders = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('needs_action');
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Derived groups ──────────────────────────────────────────────────────

  const filtered = search.trim()
    ? allOrders.filter(o =>
        o.id?.toLowerCase().includes(search.toLowerCase()) ||
        o.products?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : allOrders;

  // Needs action: processing orders only (contact / waiting / ship)
  const needsAction = filtered.filter(o =>
    ['processing', 'pending'].includes(o.status) && o.status !== 'delivered'
  );

  // Sort needs_action: ship-ready first, then contact needed, then waiting
  const sortedNeedsAction = [...needsAction].sort((a, b) => {
    const priority = (item) => {
      if (item.buyer_contacted && item.buyer_agreed) return 0;   // ship — top
      if (!item.buyer_contacted) return 1;                        // contact needed
      return 2;                                                    // waiting
    };
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at); // oldest first within group
  });

  // In progress: shipped (awaiting buyer confirmation)
  const inProgress = filtered.filter(o => o.status === 'shipped');

  // Done: delivered
  const done = filtered.filter(o => o.status === 'delivered');

  const counts = {
    needs_action: needsAction.length,
    in_progress: inProgress.length,
    done: done.length,
  };

  // ── What to render based on filter ─────────────────────────────────────

  const getVisible = () => {
    if (search.trim()) return filtered; // searching — show all
    if (filter === 'needs_action') return sortedNeedsAction;
    if (filter === 'in_progress') return inProgress;
    if (filter === 'done') return done;
    return filtered;
  };

  const visible = getVisible();

  // Grouped render for "all" view (no search active)
  const renderGrouped = () => (
    <div className="space-y-1">
      {/* Needs action */}
      {sortedNeedsAction.length > 0 && (
        <>
          <SectionHeader
            label="Needs your action"
            count={sortedNeedsAction.length}
            icon={Clock}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <div className="space-y-2">
            {sortedNeedsAction.map(item => (
              <OrderCard key={item.id} item={item} onActionComplete={fetchOrders} navigate={navigate} />
            ))}
          </div>
        </>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <>
          <SectionHeader
            label="In transit"
            count={inProgress.length}
            icon={Truck}
            accent="text-blue-600 dark:text-blue-400"
          />
          <div className="space-y-2">
            {inProgress.map(item => (
              <OrderCard key={item.id} item={item} onActionComplete={fetchOrders} navigate={navigate} />
            ))}
          </div>
        </>
      )}

      {/* Done — collapsible */}
      {done.length > 0 && (
        <>
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 px-1 mt-6 w-full text-left"
          >
            <CheckCircle className="h-4 w-4 text-gray-400 dark:text-emerald-700" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-700">
              Completed
            </span>
            <span className="text-xs text-gray-400 dark:text-emerald-700 ml-1">({done.length})</span>
            {showDone
              ? <ChevronUp className="h-3 w-3 text-gray-400 ml-auto" />
              : <ChevronDown className="h-3 w-3 text-gray-400 ml-auto" />}
          </button>
          {showDone && (
            <div className="space-y-2 mt-3">
              {done.map(item => (
                <OrderCard key={item.id} item={item} onActionComplete={fetchOrders} navigate={navigate} />
              ))}
            </div>
          )}
        </>
      )}

      {/* True empty */}
      {sortedNeedsAction.length === 0 && inProgress.length === 0 && done.length === 0 && (
        <EmptyState filter="all" />
      )}
    </div>
  );

  // Flat render for filtered / search views
  const renderFlat = () => (
    <div className="space-y-2">
      {visible.length === 0
        ? <EmptyState filter={search.trim() ? 'search' : filter} />
        : visible.map(item => (
            <OrderCard key={item.id} item={item} onActionComplete={fetchOrders} navigate={navigate} />
          ))
      }
    </div>
  );

  const isGrouped = !search.trim() && filter === 'needs_action' && !['in_progress', 'done'].includes(filter);
  const showGrouped = !search.trim(); // show grouped layout whenever no search active

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#061209]">
      <div className="max-w-lg mx-auto px-3 pt-4 pb-24">

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-emerald-600" />
          <Input
            placeholder="Search by order ID or product…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9 h-11 bg-white dark:bg-emerald-950/50 border-gray-200 dark:border-emerald-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-emerald-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter pills — only when no search */}
        {!search.trim() && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 hide-scrollbar">
            <FilterPill
              active={filter === 'needs_action'}
              onClick={() => setFilter('needs_action')}
              count={counts.needs_action}
            >
              To do
            </FilterPill>
            <FilterPill
              active={filter === 'in_progress'}
              onClick={() => setFilter('in_progress')}
              count={counts.in_progress}
            >
              In transit
            </FilterPill>
            <FilterPill
              active={filter === 'done'}
              onClick={() => setFilter('done')}
              count={counts.done}
            >
              Done
            </FilterPill>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : showGrouped && filter === 'needs_action' ? (
          renderGrouped()
        ) : (
          renderFlat()
        )}
      </div>
    </div>
  );
};

export default SellerOrders;