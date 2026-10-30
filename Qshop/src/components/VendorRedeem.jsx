// src/components/VendorRedeem.jsx — redeem purchased Bar & Bites items.
// Staff/admin can redeem anything; partner members only their own brand
// (enforced server-side by lookup_entitlement / redeem_entitlement).
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from './SupabaseClient';
import HiveShell from './hive/HiveShell';
import HiveScanner from './hive/HiveScanner';
import useStaffGate from './hive/useStaffGate';

const when = (ts) => (ts ? new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

// Builds the stand lookup/redeem pair. Whoever redeemed an item can undo it
// within 15 minutes; admins and the brand's owners can void and restore
// (all enforced server-side).
export function itemScanner({ canVoid }) {
  const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw error;
    return data;
  };

  const withActions = (v) => {
    const { e, token } = v.raw;
    const actions = [];
    if (!e.voided_at && e.status === 'redeemed') {
      actions.push({ label: 'Undo redeem', run: async () => { await rpc('undo_redeem', { p_qr_token: token }); return lookup(token); } });
    }
    if (canVoid && !e.voided_at) {
      actions.push({
        label: 'Void item', danger: true,
        run: async () => {
          const reason = window.prompt('Why are you voiding this item? (e.g. refunded, fraud)');
          if (reason === null) return null;
          await rpc('set_entitlement_void', { p_qr_token: token, p_void: true, p_reason: reason });
          return lookup(token);
        },
      });
    }
    if (canVoid && e.voided_at) {
      actions.push({ label: 'Restore item', run: async () => { await rpc('set_entitlement_void', { p_qr_token: token, p_void: false }); return lookup(token); } });
    }
    return { ...v, actions };
  };

  async function lookup(token) {
    const { data, error } = await supabase.rpc('lookup_entitlement', { p_qr_token: token });
    if (error) {
      if (/another partner/i.test(error.message)) return { kind: 'invalid', label: 'Not yours', title: 'Another brand’s item', subtitle: 'Send them to the right stand.' };
      throw error;
    }
    const e = Array.isArray(data) ? data[0] : data;
    if (!e) return { kind: 'invalid', label: 'Invalid', title: 'No matching item', subtitle: 'Don’t hand anything over.' };
    const meta = [['Quantity', `×${e.quantity}`]];
    if (e.partner_name) meta.push(['Stand', e.partner_name]);
    if (e.buyer_name) meta.push(['Buyer', e.buyer_name]);
    const base = { title: e.product_name, image: e.image_url, meta, raw: { token, e } };
    if (e.voided_at) return withActions({ ...base, kind: 'invalid', label: 'Voided', subtitle: `Don’t hand over${e.void_reason ? ` · ${e.void_reason}` : ''} · ${when(e.voided_at)}` });
    if (e.status === 'redeemed') return withActions({ ...base, kind: 'used', label: 'Already redeemed', subtitle: when(e.redeemed_at) });
    return withActions({ ...base, kind: 'ready', label: 'Ready to hand over', actionLabel: `Redeem ×${e.quantity}` });
  }

  async function redeem(v) {
    const data = await rpc('redeem_entitlement', { p_qr_token: v.raw.token });
    return withActions({ ...v, raw: { ...v.raw, e: { ...v.raw.e, status: data.status } }, kind: 'done', label: 'Redeemed', subtitle: `Hand it over · ${when(data.redeemed_at)}` });
  }

  return { lookup, redeem };
}

export function Gate({ loading, user, allowed, title, onLogin }) {
  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e7c65f]" /></div>;
  if (user && allowed) return null;
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center rounded-[28px] border border-white/10 bg-[#0e0809]/80 backdrop-blur-xl p-8">
        <div className="w-16 h-16 rounded-full border border-[#e7c65f]/40 flex items-center justify-center mx-auto"><Lock className="w-7 h-7 text-[#e7c65f]" /></div>
        <h1 className="hive-display hive-gold-text text-2xl font-bold mt-5">{title}</h1>
        <p className="text-white/55 text-sm mt-2">{user ? 'This account isn’t set up for scanning yet. Ask a UniHive admin to add you.' : 'Log in with your staff or partner account.'}</p>
        {!user && <button onClick={onLogin} className="mt-6 w-full hive-btn-gold rounded-full py-3.5 font-bold">Log in</button>}
      </div>
    </div>
  );
}

export default function VendorRedeem() {
  const navigate = useNavigate();
  const gate = useStaffGate();
  const [count, setCount] = useState(0);
  const allowed = gate.isStaff || gate.partners.length > 0;
  const canVoid = !!gate.profile?.is_admin || gate.partners.some((p) => p.role === 'owner');
  const { lookup, redeem } = useMemo(() => itemScanner({ canVoid }), [canVoid]);
  const login = () => { sessionStorage.setItem('postLoginRedirect', '/staff/redeem'); navigate('/auth'); };

  return (
    <HiveShell>
      <Gate loading={gate.loading} user={gate.user} allowed={allowed} title="Stand scanner" onLogin={login} />
      {!gate.loading && gate.user && allowed && (
        <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">{gate.isStaff ? 'ALL STANDS' : gate.partners.map((p) => p.name).join(' · ').toUpperCase()}</p>
          <h1 className="hive-display hive-gold-text text-4xl font-extrabold mt-1">Redeem</h1>
          <p className="text-white/50 text-sm mt-2 mb-6">Scan the buyer’s QR from their HIVE Wallet. {count > 0 && <span className="text-white/80">· {count} redeemed this shift</span>}</p>
          <HiveScanner lookup={lookup} act={redeem} onCompleted={() => setCount((c) => c + 1)} hint="Scan a Bar & Bites QR" />
        </div>
      )}
    </HiveShell>
  );
}
