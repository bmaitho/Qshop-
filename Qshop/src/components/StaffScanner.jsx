// src/components/StaffScanner.jsx — door admission (staff/admin only).
// Uses the same lookup as before (event_tickets by ticket_token) and the
// admit_ticket RPC, which locks the row and caps admits at admits_count.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import HiveShell from './hive/HiveShell';
import HiveScanner from './hive/HiveScanner';
import useStaffGate from './hive/useStaffGate';
import { Gate } from './VendorRedeem';

const when = (ts) => (ts ? new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

async function lookupTicket(token) {
  const { data: t, error } = await supabase.from('event_tickets').select('*').eq('ticket_token', token).eq('payment_status', 'completed').maybeSingle();
  if (error) throw error;
  if (!t) return { kind: 'invalid', label: 'Invalid', title: 'No matching ticket', subtitle: 'Don’t admit.' };
  const [{ data: ev }, { data: person }] = await Promise.all([
    supabase.from('events').select('title, image_url').eq('id', t.event_id).maybeSingle(),
    t.user_id ? supabase.from('profiles').select('full_name, phone').eq('id', t.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const total = t.admits_count || 1;
  const used = t.admits_used || 0;
  const meta = [['Name', person?.full_name || t.guest_name || '—'], ['Tier', t.tier || '—'], ['Entries', `${used} of ${total} used`]];
  if (used >= total || (t.scanned && total === 1)) {
    return { kind: 'used', label: 'Already admitted', title: ev?.title || 'Ticket', subtitle: when(t.scanned_at), image: ev?.image_url, meta };
  }
  return { kind: 'ready', label: total > 1 ? `Group · admit ${used + 1} of ${total}` : 'Valid ticket', title: ev?.title || 'Ticket', image: ev?.image_url, meta, actionLabel: total > 1 ? `Admit 1 of ${total}` : 'Admit', raw: { t } };
}

async function admit(v) {
  const { data, error } = await supabase.rpc('admit_ticket', { p_ticket_id: v.raw.t.id, p_admits_to_use: 1 });
  if (error) throw error;
  const total = data.admits_count || 1;
  const used = data.admits_used || 0;
  const left = Math.max(total - used, 0);
  const meta = v.meta.map(([k, val]) => (k === 'Entries' ? [k, `${used} of ${total} used`] : [k, val]));
  return { ...v, kind: 'done', label: 'Admitted', subtitle: left > 0 ? `${left} more on this ticket — scan again` : 'Let them through', meta };
}

export default function StaffScanner() {
  const navigate = useNavigate();
  const gate = useStaffGate();
  const [count, setCount] = useState(0);
  const login = () => { sessionStorage.setItem('postLoginRedirect', '/staff/scanner'); navigate('/auth'); };
  return (
    <HiveShell>
      <Gate loading={gate.loading} user={gate.user} allowed={gate.isStaff} title="Door scanner" onLogin={login} />
      {!gate.loading && gate.user && gate.isStaff && (
        <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">DOOR · {(gate.profile?.full_name || gate.user.email || '').toUpperCase()}</p>
          <h1 className="hive-display hive-gold-text text-4xl font-extrabold mt-1">Admit</h1>
          <p className="text-white/50 text-sm mt-2 mb-6">Scan UniHive tickets. Little Events tickets are scanned with Little’s own app. {count > 0 && <span className="text-white/80">· {count} admitted this shift</span>}</p>
          <HiveScanner lookup={lookupTicket} act={admit} onCompleted={() => setCount((c) => c + 1)} hint="Scan a ticket QR" />
          <button onClick={() => navigate('/staff/redeem')} className="mt-6 w-full text-sm text-[#e7c65f]">Switch to stand redemption →</button>
        </div>
      )}
    </HiveShell>
  );
}
