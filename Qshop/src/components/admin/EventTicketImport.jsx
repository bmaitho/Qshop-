// src/components/admin/EventTicketImport.jsx
//
// Admin tool: import ticket sales from an external platform (e.g. Little
// Events) for a given UniHive event. Source data arrives as screenshots,
// not clean exports, so this works from pasted text rather than a file
// upload — paste whatever you can select/copy from the partner's admin
// table, one row per line, and the parser below handles tabs, commas, or
// multiple spaces as the column separator.
//
// This deliberately never grants entry or touches check-in state — it
// only creates the ticket record so an attendee can later claim it via
// the claim flow. See backend/controllers/eventTicketImportController.js
// for the full safety notes.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, AlertTriangle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { supabase } from '../SupabaseClient';

const EXPECTED_COLUMNS = ['name', 'phone', 'email', 'tier', 'amount_paid', 'payment_method', 'purchased_at'];

const COLUMN_HINT =
  'Name, Phone, Email, Ticket type, Amount, Payment method, Date — in that order, one ticket per line.';

/** Split one pasted line into columns, tolerant of tabs, commas, or 2+ spaces. */
const splitRow = (line) => {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (line.includes(',')) return line.split(',').map((c) => c.trim());
  return line.split(/ {2,}/).map((c) => c.trim());
};

const parsePastedTickets = (raw) => {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const cols = splitRow(line);
    const [name, phone, email, tier, amount, payment_method, purchased_at] = cols;

    const errors = [];
    if (!name) errors.push('missing name');
    if (!tier) errors.push('missing ticket type');
    const amount_paid = Number(String(amount || '').replace(/[^0-9.]/g, ''));
    if (!amount || Number.isNaN(amount_paid)) errors.push('amount is not a number');
    if (!phone && !email) errors.push('needs phone or email (required to claim later)');

    return {
      row: i + 1,
      raw: line,
      name: name || '',
      phone: phone || '',
      email: email || '',
      tier: tier || '',
      amount_paid: Number.isNaN(amount_paid) ? 0 : amount_paid,
      payment_method: payment_method || '',
      purchased_at: purchased_at || '',
      errors,
    };
  });
};

export default function EventTicketImport() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('little');
  const [externalReference, setExternalReference] = useState('');
  const [pasted, setPasted] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { navigate('/home'); return; }
      setIsAdmin(true);
      setAuthChecked(true);
    }
    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .order('event_date', { ascending: false });
      setEvents(data || []);
    })();
  }, [isAdmin]);

  const handlePasteChange = useCallback((text) => {
    setPasted(text);
    setResult(null);
    setSubmitError('');
    setParsedRows(text.trim() ? parsePastedTickets(text) : []);
  }, []);

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (!eventId) { setSubmitError('Pick an event first.'); return; }
    if (validRows.length === 0) { setSubmitError('No valid rows to import.'); return; }

    setSubmitting(true);
    setSubmitError('');
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const backendUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${backendUrl}/admin/events/${eventId}/import-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          source_platform: sourcePlatform,
          external_reference: externalReference || undefined,
          tickets: validRows.map((r) => ({
            name: r.name,
            phone: r.phone || undefined,
            email: r.email || undefined,
            tier: r.tier,
            amount_paid: r.amount_paid,
            payment_method: r.payment_method || undefined,
            purchased_at: r.purchased_at || undefined,
          })),
        }),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        setSubmitError(body?.error || `Import failed (HTTP ${response.status})`);
        if (body?.details && Array.isArray(body.details)) {
          setSubmitError(`${body.error}: ${body.details.join('; ')}`);
        }
        return;
      }

      setResult(body);
      setPasted('');
      setParsedRows([]);
    } catch (err) {
      setSubmitError(err.message || 'Network error during import');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-white/70">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#E7C65F]">Import external ticket sales</h1>
          <p className="text-white/50 text-sm mt-1">
            Creates ticket records so attendees can later claim their UniHive benefits.
            This never marks anyone as checked in — entry stays the external platform's job.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Event</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select an event…</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} — {e.event_date}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Source platform</label>
              <input
                type="text"
                value={sourcePlatform}
                onChange={(e) => setSourcePlatform(e.target.value)}
                placeholder="e.g. little"
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
              External reference (optional — e.g. Little's show/event ID)
            </label>
            <input
              type="text"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              placeholder="Shared across this whole batch, not unique per ticket"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
              Paste rows — {COLUMN_HINT}
            </label>
            <textarea
              value={pasted}
              onChange={(e) => handlePasteChange(e.target.value)}
              rows={8}
              placeholder={'Cherice Shael  254706768994  mecerecherice@gmail.com  Regular x2  1600  MPESA  30 May 26 00:29'}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 font-mono"
            />
          </div>
        </div>

        {parsedRows.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {validRows.length} ready
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> {invalidRows.length} need fixing
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {parsedRows.map((r) => (
                <div
                  key={r.row}
                  className={`text-xs rounded-lg px-3 py-2 border ${
                    r.errors.length ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-black/20'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{r.name || '(no name)'}</span>
                    <span className="text-white/50">{r.tier} · {r.amount_paid || '—'}</span>
                  </div>
                  {r.errors.length > 0 && (
                    <div className="text-amber-300 mt-1">{r.errors.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-200 text-sm">
            {submitError}
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-200 text-sm">
            Imported {result.imported} ticket{result.imported === 1 ? '' : 's'}
            {result.skipped > 0 && ` — skipped ${result.skipped} already imported`} for {result.event}.
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={submitting || validRows.length === 0 || !eventId}
          className="w-full bg-[#E7C65F] hover:bg-[#d4b550] disabled:opacity-40 disabled:cursor-not-allowed text-[#0D2B20] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {submitting ? 'Importing…' : `Import ${validRows.length || ''} ticket${validRows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
