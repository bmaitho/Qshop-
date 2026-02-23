// src/components/SellerOrders.jsx
// UniHive brand colours: dark green #0D2B20, gold #E7C65F
// Merged: local theme + correct DB fields + email notifications

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';
import { sendMessageEmail } from '../utils/sendMessageEmail';
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  Clock,
  MessageCircle,
  ChevronDown,
  X,
  Send,
  Inbox,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatTimeAgo = (dateStr) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// Robust — checks all possible DB field names
const formatAmount = (item) => {
  const raw =
    item.total_price ??
    item.total_amount ??
    (item.unit_price != null && item.quantity != null
      ? item.unit_price * item.quantity
      : null) ??
    (item.price_per_unit != null && item.quantity != null
      ? item.price_per_unit * item.quantity
      : null) ??
    item.price ??
    item.amount ??
    0;
  return `KSh ${Number(raw).toLocaleString()}`;
};

const getAction = (item) => {
  if (item.status === 'shipped')   return 'shipped';
  if (item.status === 'delivered') return 'delivered';
  if (!item.buyer_contacted)       return 'contact';
  if (!item.buyer_agreed)          return 'waiting';
  return 'ship';
};

// ─── Filter pill ──────────────────────────────────────────────────────────────

const FilterPill = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
    style={active
      ? { backgroundColor: '#E7C65F', color: '#0D2B20' }
      : { backgroundColor: 'rgba(231,198,95,0.08)', color: 'rgba(231,198,95,0.55)', border: '1px solid rgba(231,198,95,0.2)' }
    }
  >
    {children}
    {count > 0 && (
      <span
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
        style={active
          ? { backgroundColor: 'rgba(13,43,32,0.25)', color: '#0D2B20' }
          : { color: '#E7C65F' }
        }
      >
        {count}
      </span>
    )}
  </button>
);

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader = ({ label, count, icon: Icon }) => (
  <div className="flex items-center gap-2 px-1 mb-3 mt-2 first:mt-0">
    <Icon className="h-4 w-4" style={{ color: '#E7C65F' }} />
    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#E7C65F' }}>
      {label}
    </span>
    {count > 0 && (
      <span className="ml-auto text-xs font-bold" style={{ color: '#E7C65F' }}>{count}</span>
    )}
  </div>
);

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard = ({ item, onActionComplete }) => {
  const navigate = useNavigate();
  const action = getAction(item);
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(
    `Hi, your order for "${item.products?.name || 'your item'}" is confirmed. How would you like to receive it?`
  );

  const shortId = `#${item.id?.slice(0, 8)}`;
  const qty = item.quantity || 1;
  const amount = formatAmount(item);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch sender profile for name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Fetch buyer profile for name
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', item.buyer_user_id)
        .single();

      const senderName = senderProfile?.full_name || senderProfile?.email || 'Seller';
      const recipientName = buyerProfile?.full_name || buyerProfile?.email || 'Buyer';

      // Insert message with correct DB field names
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: item.buyer_user_id,
        message: msg.trim(),
        sender_name: senderName,
        recipient_name: recipientName,
        order_item_id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        read: false,
      });
      if (error) throw error;

      await supabase.from('order_items').update({ buyer_contacted: true }).eq('id', item.id);

      // 📧 Email notification to buyer (fire-and-forget)
      sendMessageEmail({
        recipientId: item.buyer_user_id,
        senderName,
        messageText: msg.trim(),
        orderItemId: item.id,
        orderId: item.order_id,
        productId: item.product_id,
      });

      toast.success('Message sent!');
      setExpanded(false);
      onActionComplete?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTheyReplied = async () => {
    await supabase.from('order_items').update({ buyer_agreed: true }).eq('id', item.id);
    toast.success('Great! You can now mark as shipped.');
    onActionComplete?.();
  };

  const handleMarkShipped = async () => {
    await supabase.from('order_items').update({ status: 'shipped' }).eq('id', item.id);
    toast.success('Order marked as shipped!');
    onActionComplete?.();
  };

  const renderActionBar = () => {
    if (action === 'contact') return (
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
        style={{ backgroundColor: 'rgba(231,198,95,0.12)', color: '#E7C65F', border: '1px solid rgba(231,198,95,0.25)' }}
      >
        <MessageCircle className="h-4 w-4" />
        Message buyer to arrange delivery
      </button>
    );

    if (action === 'waiting') return (
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 py-3 px-3 rounded-xl"
          style={{ backgroundColor: 'rgba(231,198,95,0.06)', border: '1px solid rgba(231,198,95,0.15)' }}
        >
          <Clock className="h-4 w-4 shrink-0" style={{ color: 'rgba(231,198,95,0.6)' }} />
          <span className="text-sm font-medium" style={{ color: 'rgba(231,198,95,0.6)' }}>
            Waiting for buyer to reply
          </span>
        </div>
        <button
          onClick={handleTheyReplied}
          className="px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{ backgroundColor: '#E7C65F', color: '#0D2B20' }}
        >
          They replied
        </button>
      </div>
    );

    if (action === 'ship') return (
      <button
        onClick={handleMarkShipped}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
        style={{ backgroundColor: '#E7C65F', color: '#0D2B20' }}
      >
        <Truck className="h-4 w-4" />
        Mark as Shipped
      </button>
    );

    if (action === 'shipped') return (
      <div
        className="flex items-center gap-2 py-3 px-4 rounded-xl"
        style={{ backgroundColor: 'rgba(231,198,95,0.06)', border: '1px solid rgba(231,198,95,0.15)' }}
      >
        <Truck className="h-4 w-4 shrink-0" style={{ color: 'rgba(231,198,95,0.5)' }} />
        <span className="text-sm font-medium" style={{ color: 'rgba(231,198,95,0.6)' }}>
          Shipped — waiting for buyer to confirm receipt
        </span>
      </div>
    );

    if (action === 'delivered') return (
      <div
        className="flex items-center gap-2 py-2.5 px-4 rounded-xl"
        style={{ backgroundColor: 'rgba(231,198,95,0.1)', border: '1px solid rgba(231,198,95,0.25)' }}
      >
        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#E7C65F' }} />
        <span className="text-sm font-semibold" style={{ color: '#E7C65F' }}>Delivered ✓</span>
      </div>
    );
  };

  return (
    <div
      className="rounded-2xl overflow-hidden mb-3 transition-all"
      style={{ backgroundColor: '#132d20', border: '1px solid rgba(231,198,95,0.12)' }}
    >
      {/* Card header — tappable → detail page */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer active:opacity-80"
        onClick={() => navigate(`/seller/orders/${item.id}`)}
      >
        {/* Icon badge */}
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{ backgroundColor: 'rgba(231,198,95,0.1)' }}
        >
          <Package className="h-5 w-5" style={{ color: '#E7C65F' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate leading-tight">
            {item.products?.name || 'Product'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-white/40 text-xs">{qty}×</span>
            <span className="text-sm font-bold" style={{ color: '#E7C65F' }}>{amount}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
            >
              {shortId}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              {formatTimeAgo(item.created_at)}
            </span>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* Action bar */}
      <div className="px-4 pb-4">
        {renderActionBar()}
      </div>

      {/* Message compose — inline expand */}
      {expanded && (
        <div
          className="border-t p-4"
          style={{ borderColor: 'rgba(231,198,95,0.15)', backgroundColor: '#0a2218' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: '#E7C65F' }}
              >
                Message Buyer
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Re: {item.products?.name}
              </p>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>

          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={3}
            className="w-full rounded-xl text-white text-sm p-3 resize-none focus:outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(231,198,95,0.2)',
              caretColor: '#E7C65F',
              lineHeight: '1.5',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(231,198,95,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(231,198,95,0.2)'}
          />

          <p className="text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {msg.length} chars
          </p>

          <button
            onClick={handleSend}
            disabled={sending || !msg.trim()}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 active:scale-95"
            style={{ backgroundColor: '#E7C65F', color: '#0D2B20' }}
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send & Mark as Contacted'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div
    className="rounded-2xl p-4 mb-3 flex gap-3 animate-pulse"
    style={{ backgroundColor: '#132d20', border: '1px solid rgba(231,198,95,0.08)' }}
  >
    <div className="w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: 'rgba(231,198,95,0.07)' }} />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-3 rounded-md w-2/3" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <div className="h-3 rounded-md w-1/3" style={{ backgroundColor: 'rgba(231,198,95,0.1)' }} />
      <div className="h-10 rounded-xl w-full mt-1" style={{ backgroundColor: 'rgba(231,198,95,0.06)' }} />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SellerOrders = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('needs_action');
  const [search, setSearch] = useState('');

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

  const filtered = search.trim()
    ? allOrders.filter(o =>
        o.id?.toLowerCase().includes(search.toLowerCase()) ||
        o.products?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : allOrders;

  const needsAction = filtered
    .filter(o => ['processing', 'pending'].includes(o.status))
    .sort((a, b) => {
      const p = i => {
        if (i.buyer_contacted && i.buyer_agreed) return 0;
        if (!i.buyer_contacted) return 1;
        return 2;
      };
      return p(a) - p(b) || new Date(a.created_at) - new Date(b.created_at);
    });

  const inTransit = filtered.filter(o => o.status === 'shipped');
  const done      = filtered.filter(o => o.status === 'delivered');

  const visibleOrders =
    filter === 'needs_action' ? needsAction :
    filter === 'in_transit'   ? inTransit :
    done;

  const sectionIcon  = filter === 'needs_action' ? Clock : filter === 'in_transit' ? Truck : CheckCircle;
  const sectionLabel =
    filter === 'needs_action' ? 'Needs Your Action' :
    filter === 'in_transit'   ? 'In Transit' :
    'Completed';

  const emptyLabel =
    filter === 'needs_action' ? 'All caught up' :
    filter === 'in_transit'   ? 'Nothing in transit' :
    'No completed orders yet';

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0D2B20' }}>

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3 backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(13,43,32,0.97)',
          borderBottom: '1px solid rgba(231,198,95,0.1)',
        }}
      >
        <h1 className="text-white text-xl font-bold mb-3">Orders</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: 'rgba(231,198,95,0.35)' }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or product…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(231,198,95,0.15)',
              caretColor: '#E7C65F',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(231,198,95,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(231,198,95,0.15)'}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          <FilterPill
            active={filter === 'needs_action'}
            onClick={() => setFilter('needs_action')}
            count={needsAction.length}
          >
            To do
          </FilterPill>
          <FilterPill
            active={filter === 'in_transit'}
            onClick={() => setFilter('in_transit')}
            count={inTransit.length}
          >
            In transit
          </FilterPill>
          <FilterPill
            active={filter === 'done'}
            onClick={() => setFilter('done')}
            count={done.length}
          >
            Done
          </FilterPill>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4">
        {loading ? (
          <div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(231,198,95,0.07)' }}
            >
              <Inbox className="h-8 w-8" style={{ color: 'rgba(231,198,95,0.25)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'rgba(231,198,95,0.35)' }}>
              {emptyLabel}
            </p>
          </div>
        ) : (
          <>
            <SectionHeader label={sectionLabel} count={visibleOrders.length} icon={sectionIcon} />
            {visibleOrders.map(item => (
              <OrderCard key={item.id} item={item} onActionComplete={fetchOrders} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default SellerOrders;