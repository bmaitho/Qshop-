// src/components/VendorRedeem.jsx — redeem purchased Bar & Bites items.
// Staff/admin can redeem anything; partner members only their own brand
// (enforced server-side by lookup_entitlement / redeem_entitlement).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from './SupabaseClient';
import HiveShell from './hive/HiveShell';
import HiveScanner from './hive/HiveScanner';
import useStaffGate from './hive/useStaffGate';

const when = (ts) => (ts ? new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export async function lookupItem(token) {
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
  if (e.status === 'redeemed') return { kind: 'used', label: 'Already redeemed', title: e.product_name, subtitle: when(e.redeemed_at), image: e.image_url, meta };
  return { kind: 'ready', label: 'Ready to hand over', title: e.product_name, image: e.image_url, meta, actionLabel: `Redeem ×${e.quantity}`, raw: { token, e } };
}

export async function redeemItem(v) {
  const { data, error } = await supabase.rpc('redeem_entitlement', { p_qr_token: v.raw.token });
  if (error) throw error;
  return { ...v, kind: 'done', label: 'Redeemed', subtitle: `Hand it over · ${when(data.redeemed_at)}` };
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
  const login = () => { sessionStorage.setItem('postLoginRedirect', '/staff/redeem'); navigate('/auth'); };

  return (
    <HiveShell>
      <Gate loading={gate.loading} user={gate.user} allowed={allowed} title="Stand scanner" onLogin={login} />
      {!gate.loading && gate.user && allowed && (
        <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">{gate.isStaff ? 'ALL STANDS' : gate.partners.map((p) => p.name).join(' · ').toUpperCase()}</p>
          <h1 className="hive-display hive-gold-text text-4xl font-extrabold mt-1">Redeem</h1>
          <p className="text-white/50 text-sm mt-2 mb-6">Scan the buyer’s QR from their HIVE Wallet. {count > 0 && <span className="text-white/80">· {count} redeemed this shift</span>}</p>
          <HiveScanner lookup={lookupItem} act={redeemItem} onCompleted={() => setCount((c) => c + 1)} hint="Scan a Bar & Bites QR" />
        </div>
      )}
    </HiveShell>
  );
}
