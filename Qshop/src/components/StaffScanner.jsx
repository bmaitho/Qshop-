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
  // Server-side, staff-only lookup that returns only what the door needs.
  const { data, error } = await supabase.rpc('lookup_event_ticket', { p_token: token });
  if (error) throw error;
  const t = Array.isArray(data) ? data[0] : data;
  if (!t) return { kind: 'invalid', label: 'Invalid', title: 'No matching pass', subtitle: 'Don’t admit.' };
  const total = t.admits_count || 1;
  const used = t.admits_used || 0;
  const meta = [['Name', t.holder || '—'], ['Pass', t.tier || '—'], ['Entries', `${used} of ${total} used`]];
  if (t.event_date && new Date(`${t.event_date}T23:59:59+03:00`) < new Date(Date.now() - 6 * 3600000)) {
    return { kind: 'invalid', label: 'Expired', title: t.event_title || 'Pass', subtitle: 'This pass was for a past event.', image: t.event_image, meta };
  }
  if (used >= total) {
    return { kind: 'used', label: 'Already admitted', title: t.event_title || 'Pass', subtitle: when(t.scanned_at), image: t.event_image, meta };
  }
  return { kind: 'ready', label: total > 1 ? `Group · admit ${used + 1} of ${total}` : 'Valid pass', title: t.event_title || 'Pass', image: t.event_image, meta, actionLabel: total > 1 ? `Admit 1 of ${total}` : 'Admit', raw: { t } };
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
          <p className="text-white/50 text-sm mt-2 mb-6">Scan UniHive passes (free RSVPs and UniHive tickets). Little Events tickets are scanned with Little’s own app. {count > 0 && <span className="text-white/80">· {count} admitted this shift</span>}</p>
          <HiveScanner lookup={lookupTicket} act={admit} onCompleted={() => setCount((c) => c + 1)} hint="Scan a ticket QR" />
          <button onClick={() => navigate('/staff/redeem')} className="mt-6 w-full text-sm text-[#e7c65f]">Switch to stand redemption →</button>
        </div>
      )}
    </HiveShell>
  );
}
