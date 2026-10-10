// src/components/admin/EventTicketImport.jsx
//
// Admin tool: update UniHive's record of ticket sales made through Little
// Events (the only external ticketing partner right now — hardcoded on
// purpose, not a generic multi-platform importer). Accepts Little's own
// .xlsx export directly, or a pasted table as a fallback for days when
// only a screenshot is available.
//
// This deliberately never grants entry or touches check-in state — it
// only creates/updates the ticket record so an attendee can later claim
// their UniHive benefits via the claim flow. See
// backend/controllers/eventTicketImportController.js for the full safety
// notes, especially why "Attended" from the export is never imported.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, AlertTriangle, CheckCircle2, Loader2, Lock, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../SupabaseClient';

const SOURCE_PLATFORM = 'little';

// Real Little Events export column order:
//   Client, Client Mobile, Customer Email, Payment Key, Ticket type,
//   Paid, Payment Method, Date, Discount Code, Attended
// Discount Code is ignored. Attended is read and immediately discarded —
// it is NEVER imported as UniHive check-in state; entry stays Little's
// authority, always.
const parseRowCells = (cols) => {
  const [name, phone, email, paymentKey, tier, amount, payment_method, purchased_at] = cols.map((c) =>
    c === undefined || c === null ? '' : String(c).trim()
  );

  const errors = [];
  if (!name) errors.push('missing name');
  if (!tier) errors.push('missing ticket type');
  const amount_paid = Number(String(amount || '').replace(/[^0-9.]/g, ''));
  if (!amount || Number.isNaN(amount_paid)) errors.push('amount is not a number');
  if (!phone && !email) errors.push('needs phone or email (required to claim later)');

  return {
    name, phone, email,
    tier,
    amount_paid: Number.isNaN(amount_paid) ? 0 : amount_paid,
    payment_method,
    purchased_at,
    external_reference: paymentKey || '',
    errors,
  };
};

/** Split one pasted line into columns, tolerant of tabs, commas, or 2+ spaces. */
const splitRow = (line) => {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(',')) return line.split(',');
  return line.split(/ {2,}/);
};

const parsePastedTickets = (raw) => {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => ({ row: i + 1, raw: line, ...parseRowCells(splitRow(line)) }));
};

const looksLikeHeaderRow = (cols) => {
  const first = String(cols[0] || '').trim().toLowerCase();
  return first === 'client' || first === 'name';
};

const parseWorkbookTickets = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  const dataRows = rows.filter((cols) => cols.some((c) => String(c).trim() !== ''));
  const body = dataRows.length && looksLikeHeaderRow(dataRows[0]) ? dataRows.slice(1) : dataRows;

  return body.map((cols, i) => ({ row: i + 1, raw: cols.join(' | '), ...parseRowCells(cols) }));
};

export default function EventTicketImport() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [pasted, setPasted] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [fileError, setFileError] = useState('');
  const [fileName, setFileName] = useState('');
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

  const resetResults = () => { setResult(null); setSubmitError(''); };

  const handleFile = useCallback(async (file) => {
    resetResults();
    setFileError('');
    setFileName(file.name);
    setPasted('');
    try {
      const buffer = await file.arrayBuffer();
      setParsedRows(parseWorkbookTickets(buffer));
    } catch (err) {
      setFileError(`Could not read "${file.name}": ${err.message}`);
      setParsedRows([]);
    }
  }, []);

  const handlePasteChange = useCallback((text) => {
    resetResults();
    setFileError('');
    setFileName('');
    setPasted(text);
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
          source_platform: SOURCE_PLATFORM,
          tickets: validRows.map((r) => ({
            name: r.name,
            phone: r.phone || undefined,
            email: r.email || undefined,
            tier: r.tier,
            amount_paid: r.amount_paid,
            payment_method: r.payment_method || undefined,
            purchased_at: r.purchased_at || undefined,
            external_reference: r.external_reference || undefined,
          })),
        }),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        setSubmitError(body?.error || `Update failed (HTTP ${response.status})`);
        if (body?.details && Array.isArray(body.details)) {
          setSubmitError(`${body.error}: ${body.details.join('; ')}`);
        }
        return;
      }

      setResult(body);
      setPasted('');
      setFileName('');
      setParsedRows([]);
    } catch (err) {
      setSubmitError(err.message || 'Network error during update');
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
          <h1 className="text-xl font-bold text-[#E7C65F]">Update ticket sales — Little Events</h1>
          <p className="text-white/50 text-sm mt-1">
            Keeps UniHive in sync with sales made through Little. This never marks anyone as
            checked in — entry stays Little's job.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
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
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
              Little Events sales export (.xlsx)
            </label>
            <label className="flex items-center gap-3 border border-dashed border-white/20 rounded-lg px-4 py-6 cursor-pointer hover:border-[#E7C65F]/50 transition-colors">
              <FileSpreadsheet className="w-6 h-6 text-white/40 shrink-0" />
              <div className="text-sm">
                <span className="text-[#E7C65F] font-medium">Choose the sales .xlsx</span>
                <span className="text-white/40"> — downloaded straight from Little, no edits needed</span>
                {fileName && <p className="text-white/70 mt-1">{fileName}</p>}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {fileError && <p className="text-red-300 text-sm mt-2">{fileError}</p>}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-white/50">No file handy? Paste rows instead</summary>
            <textarea
              value={pasted}
              onChange={(e) => handlePasteChange(e.target.value)}
              rows={6}
              placeholder={'Cherice Shael  254706768994  mecerecherice@gmail.com  1791264331576  Regular  1600  MPESA  30 May 26'}
              className="w-full mt-2 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 font-mono"
            />
          </details>
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
            Updated {result.imported} ticket{result.imported === 1 ? '' : 's'}
            {result.skipped > 0 && ` — skipped ${result.skipped} already up to date`} for {result.event}.
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={submitting || validRows.length === 0 || !eventId}
          className="w-full bg-[#E7C65F] hover:bg-[#d4b550] disabled:opacity-40 disabled:cursor-not-allowed text-[#0D2B20] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {submitting ? 'Updating…' : `Update ${validRows.length || ''} ticket${validRows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
