// src/components/StaffScanner.jsx — door admission (staff/admin only).
// Uses the same lookup as before (event_tickets by ticket_token) and the
// admit_ticket RPC, which locks the row and caps admits at admits_count.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import HiveShell from './hive/HiveShell';
import HiveScanner from './hive/HiveScanner';
import useStaffGate from './hive/useStaffGate';
import { Gate } from './VendorRedeem';

const when = (ts) => (ts ? new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

// Builds the door lookup/admit pair. Accepts UniHive pass QRs and imported
// Little tickets (QR or Payment Key); anything else is rejected. Scanners can
// undo a mistaken admit; admins can also void a pass and restore it.
export function ticketScanner({ isAdmin }) {
  const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw error;
    return data;
  };

  const withActions = (v) => {
    const t = v.raw.t;
    const actions = [];
    if (!t.voided_at && (t.admits_used || 0) > 0) {
      actions.push({ label: 'Undo last entry', run: async () => { await rpc('undo_admit', { p_ticket_id: t.id }); return lookup(v.raw.token); } });
    }
    if (isAdmin && !t.voided_at) {
      actions.push({
        label: 'Void pass', danger: true,
        run: async () => {
          const reason = window.prompt('Why are you voiding this pass? (e.g. refunded, resold, fraud)');
          if (reason === null) return null;
          await rpc('set_ticket_void', { p_ticket_id: t.id, p_void: true, p_reason: reason });
          return lookup(v.raw.token);
        },
      });
    }
    if (isAdmin && t.voided_at) {
      actions.push({ label: 'Restore pass', run: async () => { await rpc('set_ticket_void', { p_ticket_id: t.id, p_void: false }); return lookup(v.raw.token); } });
    }
    return { ...v, actions };
  };

  async function lookup(token) {
    // Server-side lookup that returns only what the door needs, and nothing
    // for unknown, unpaid or not-imported tickets.
    let data;
    try {
      data = await rpc('lookup_event_pass', { p_code: token });
    } catch (e) {
      if (/not scanning/i.test(e.message)) return { kind: 'invalid', label: 'Wrong event', title: 'Pass for another event', subtitle: 'Don’t admit.' };
      throw e;
    }
    const t = Array.isArray(data) ? data[0] : data;
    if (!t) return { kind: 'invalid', label: 'Not verified', title: 'No matching paid ticket', subtitle: 'Don’t admit. Little tickets must be imported into UniHive first.' };
    const total = t.admits_count || 1;
    const used = t.admits_used || 0;
    const meta = [['Name', t.holder || '—'], ['Pass', t.tier || '—'], ['Entries', `${used} of ${total} used`], ['Sold on', t.source === 'little' ? 'Little' : 'UniHive']];
    const base = { title: t.event_title || 'Pass', image: t.event_image, meta, raw: { t, token } };
    if (t.voided_at) {
      return withActions({ ...base, kind: 'invalid', label: 'Voided', subtitle: `Don’t admit${t.void_reason ? ` · ${t.void_reason}` : ''} · ${when(t.voided_at)}` });
    }
    if (t.event_date && new Date(`${t.event_date}T23:59:59+03:00`) < new Date(Date.now() - 6 * 3600000)) {
      return { ...base, kind: 'invalid', label: 'Expired', subtitle: 'This pass was for a past event.' };
    }
    if (used >= total) {
      return withActions({ ...base, kind: 'used', label: 'Already admitted', subtitle: when(t.scanned_at) });
    }
    return withActions({ ...base, kind: 'ready', label: total > 1 ? `Group · admit ${used + 1} of ${total}` : 'Valid pass', actionLabel: total > 1 ? `Admit 1 of ${total}` : 'Admit' });
  }

  async function admit(v) {
    const data = await rpc('admit_ticket', { p_ticket_id: v.raw.t.id, p_admits_to_use: 1 });
    const total = data.admits_count || 1;
    const used = data.admits_used || 0;
    const left = Math.max(total - used, 0);
    const meta = v.meta.map(([k, val]) => (k === 'Entries' ? [k, `${used} of ${total} used`] : [k, val]));
    return withActions({ ...v, raw: { ...v.raw, t: { ...v.raw.t, admits_used: used } }, kind: 'done', label: 'Admitted', subtitle: left > 0 ? `${left} more on this ticket — scan again` : 'Let them through', meta });
  }

  return { lookup, admit };
}

export default function StaffScanner() {
  const navigate = useNavigate();
  const gate = useStaffGate();
  const [count, setCount] = useState(0);
  const isAdmin = !!gate.profile?.is_admin;
  // Brand staff can scan their event's door too (checked again server-side).
  const allowed = gate.isStaff || gate.partners.length > 0;
  const { lookup, admit } = useMemo(() => ticketScanner({ isAdmin }), [isAdmin]);
  const login = () => { sessionStorage.setItem('postLoginRedirect', '/staff/scanner'); navigate('/auth'); };
  return (
    <HiveShell>
      <Gate loading={gate.loading} user={gate.user} allowed={allowed} title="Door scanner" onLogin={login} />
      {!gate.loading && gate.user && allowed && (
        <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">DOOR · {(gate.profile?.full_name || gate.user.email || '').toUpperCase()}</p>
          <h1 className="hive-display hive-gold-text text-4xl font-extrabold mt-1">Admit</h1>
          <p className="text-white/50 text-sm mt-2 mb-6">Scan UniHive passes and Little tickets. For a Little ticket without a readable QR, tap Enter code and type its Payment Key. Tickets that aren’t verified are rejected. {count > 0 && <span className="text-white/80">· {count} admitted this shift</span>}</p>
          <HiveScanner allowText lookup={lookup} act={admit} onCompleted={() => setCount((c) => c + 1)} hint="Scan a ticket QR" />
          <button onClick={() => navigate('/staff/redeem')} className="mt-6 w-full text-sm text-[#e7c65f]">Switch to stand redemption →</button>
        </div>
      )}
    </HiveShell>
  );
}
