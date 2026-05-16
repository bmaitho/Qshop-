import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Users,
  Lock, LogOut, Loader2, ScanLine, RotateCcw, ShieldCheck
} from 'lucide-react';
import { supabase } from './SupabaseClient';

// html5-qrcode loaded from CDN — avoids adding a dependency for an MVP.
const HTML5_QRCODE_CDN = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

const SCANNER_ELEMENT_ID = 'unihive-scanner-region';

// Pull a UUID v4 token out of whatever the QR contained.
// QR codes encode `${origin}/verify-ticket/<uuid>` but we accept a bare UUID too.
const extractToken = (decoded) => {
  if (!decoded) return null;
  const trimmed = String(decoded).trim();
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(uuidRegex);
  return match ? match[0].toLowerCase() : null;
};

const StaffScanner = () => {
  const navigate = useNavigate();

  // Auth gate
  const [authState, setAuthState] = useState('checking'); // checking | not_authed | not_staff | ok
  const [staffUser, setStaffUser] = useState(null);

  // Scanner state
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef(null);
  const lastDecodeRef = useRef({ token: null, ts: 0 });
  const busyRef = useRef(false);

  // Verdict card state
  // verdict: null | { kind: 'fresh'|'used'|'invalid'|'error'|'admitting'|'admitted', ticket?, event?, attendee?, error?, admittedThisTap? }
  const [verdict, setVerdict] = useState(null);

  // Shift counter (in-memory, resets on page reload)
  const [shiftStats, setShiftStats] = useState({ admits: 0, tickets: 0 });

  // ─── Auth check ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState('not_authed');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_admin, is_staff')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_staff && !profile?.is_admin) {
        setStaffUser({ id: user.id, name: profile?.full_name || user.email });
        setAuthState('not_staff');
        return;
      }
      setStaffUser({
        id: user.id,
        name: profile.full_name || user.email,
        email: profile.email || user.email,
      });
      setAuthState('ok');
    })();
  }, []);

  // ─── Load html5-qrcode from CDN ──────────────────────────────
  useEffect(() => {
    if (authState !== 'ok') return;
    if (window.Html5Qrcode) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector(`script[src="${HTML5_QRCODE_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = HTML5_QRCODE_CDN;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScannerError('Failed to load scanner. Check your connection.');
    document.body.appendChild(script);
  }, [authState]);

  // ─── Scanner lifecycle ───────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState ? scannerRef.current.getState() : null;
        // 2 = SCANNING in html5-qrcode enum
        if (state === 2 || scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear?.();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleDecode = useCallback(async (decodedText) => {
    // Debounce: same QR within 2s gets ignored
    const token = extractToken(decodedText);
    const now = Date.now();
    if (!token) return;
    if (busyRef.current) return;
    if (lastDecodeRef.current.token === token && now - lastDecodeRef.current.ts < 2000) return;
    lastDecodeRef.current = { token, ts: now };
    busyRef.current = true;

    try {
      // Look up ticket
      const { data: ticket, error: ticketErr } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('ticket_token', token)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (ticketErr) {
        setVerdict({ kind: 'error', error: ticketErr.message });
        return;
      }

      if (!ticket) {
        setVerdict({ kind: 'invalid' });
        return;
      }

      // Parallel fetch event + attendee
      const [{ data: event }, { data: attendee }] = await Promise.all([
        supabase.from('events').select('id, title, event_date, event_time, venue').eq('id', ticket.event_id).maybeSingle(),
        supabase.from('profiles').select('full_name, email, phone').eq('id', ticket.user_id).maybeSingle(),
      ]);

      const admitsCount = ticket.admits_count || 1;
      const admitsUsed = ticket.admits_used || 0;

      if (admitsUsed >= admitsCount || ticket.scanned) {
        setVerdict({ kind: 'used', ticket, event, attendee });
        return;
      }

      setVerdict({ kind: 'fresh', ticket, event, attendee });
    } catch (err) {
      console.error('Decode handler error:', err);
      setVerdict({ kind: 'error', error: err.message || 'Unknown error' });
    } finally {
      // Release the lock a bit later so rapid duplicate decodes are squashed
      setTimeout(() => { busyRef.current = false; }, 800);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!window.Html5Qrcode) {
      setScannerError('Scanner library not loaded yet.');
      return;
    }
    setScannerError('');
    try {
      const scanner = new window.Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' }, // back camera preferred
        {
          fps: 10,
          qrbox: (vw, vh) => {
            const size = Math.floor(Math.min(vw, vh) * 0.75);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => { handleDecode(decodedText); },
        () => { /* per-frame scan failures: ignore */ }
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner start failed:', err);
      setScannerError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Enable it in your browser settings.'
          : (err?.message || 'Could not start camera.')
      );
      setScanning(false);
    }
  }, [handleDecode]);

  // Stop scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // ─── Admit action ────────────────────────────────────────────
  const admitOne = async () => {
    if (!verdict?.ticket) return;
    setVerdict((v) => ({ ...v, kind: 'admitting' }));
    try {
      const { data, error } = await supabase.rpc('admit_ticket', {
        p_ticket_id: verdict.ticket.id,
        p_admits_to_use: 1,
      });

      if (error) {
        setVerdict((v) => ({ ...v, kind: 'error', error: error.message || 'Admit failed' }));
        return;
      }

      // RPC returns the updated ticket row
      const updated = data;
      const admitsCount = updated.admits_count || 1;
      const admitsUsed = updated.admits_used || 0;
      const fullyAdmitted = admitsUsed >= admitsCount;

      // Update shift stats
      setShiftStats((s) => ({
        admits: s.admits + 1,
        tickets: s.tickets + (fullyAdmitted ? 1 : 0),
      }));

      setVerdict((v) => ({
        ...v,
        kind: 'admitted',
        ticket: updated,
        admittedThisTap: 1,
      }));
    } catch (err) {
      setVerdict((v) => ({ ...v, kind: 'error', error: err.message || 'Admit failed' }));
    }
  };

  const dismissVerdict = () => {
    setVerdict(null);
    lastDecodeRef.current = { token: null, ts: 0 };
  };

  // ─── Auth gates ──────────────────────────────────────────────
  const goLogin = () => {
    sessionStorage.setItem('postLoginRedirect', '/staff/scanner');
    navigate('/auth');
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" />
      </div>
    );
  }

  if (authState === 'not_authed') {
    return (
      <div className="min-h-screen bg-[#0D2B20] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-8 text-center bg-blue-500/10">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-12 h-12 text-blue-300" />
            </div>
            <h2 className="text-2xl font-bold text-blue-200 mb-1">STAFF LOGIN</h2>
            <p className="text-blue-200/70 text-sm">Sign in to scan tickets</p>
          </div>
          <div className="p-6">
            <button
              onClick={goLogin}
              className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-3.5 rounded-xl"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'not_staff') {
    return (
      <div className="min-h-screen bg-[#0D2B20] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-8 text-center bg-red-500/10">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-12 h-12 text-red-300" />
            </div>
            <h2 className="text-2xl font-bold text-red-200 mb-1">STAFF ONLY</h2>
            <p className="text-red-200/70 text-sm mt-2">
              {staffUser?.name} — this account is not authorised to scan tickets.
              Ask an admin to grant you staff access.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={async () => { await supabase.auth.signOut(); goLogin(); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl"
            >
              Sign out & log in as staff
            </button>
            <button
              onClick={() => navigate('/home')}
              className="w-full text-white/50 hover:text-white text-sm py-2"
            >
              Back to UniHive
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main scanner UI ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0D2B20]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#E7C65F] leading-tight">UniHive Scanner</h1>
            <p className="text-white/40 text-xs">{staffUser?.name}</p>
          </div>
          <button
            onClick={async () => { await stopScanner(); await supabase.auth.signOut(); navigate('/auth'); }}
            className="text-white/40 hover:text-white p-2"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Shift counter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{shiftStats.admits}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Admits this shift</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-[#E7C65F]">{shiftStats.tickets}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Tickets completed</p>
          </div>
        </div>

        {/* Scanner viewport */}
        <div className="bg-black rounded-3xl overflow-hidden border border-white/10 relative aspect-square">
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

          {/* Overlay when not scanning */}
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/60">
              <ScanLine className="w-16 h-16 text-[#E7C65F] mb-4" />
              <p className="text-white/80 mb-1 font-semibold">Camera off</p>
              <p className="text-white/40 text-sm mb-4">Tap below to start scanning tickets</p>
              {scannerError && (
                <p className="text-red-300 text-xs mb-3 max-w-xs">{scannerError}</p>
              )}
              <button
                onClick={startScanner}
                disabled={!scriptLoaded}
                className="bg-[#E7C65F] hover:bg-[#d4b550] disabled:opacity-50 text-[#0D2B20] font-bold py-3 px-6 rounded-xl flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {scriptLoaded ? 'Start camera' : 'Loading scanner…'}
              </button>
            </div>
          )}

          {/* Aiming reticle when scanning */}
          {scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 aspect-square border-2 border-[#E7C65F]/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>

        {/* Stop / restart */}
        {scanning && (
          <button
            onClick={stopScanner}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            <CameraOff className="w-4 h-4" />
            Stop camera
          </button>
        )}

        {/* Manual entry fallback */}
        <details className="bg-white/5 border border-white/10 rounded-2xl">
          <summary className="cursor-pointer p-4 text-white/60 text-sm">
            Can't scan? Enter token manually
          </summary>
          <div className="p-4 pt-0">
            <ManualTokenEntry onSubmit={(t) => handleDecode(t)} />
          </div>
        </details>
      </div>

      {/* Verdict modal */}
      {verdict && (
        <VerdictModal
          verdict={verdict}
          onAdmit={admitOne}
          onDismiss={dismissVerdict}
        />
      )}
    </div>
  );
};

// ─── Manual token entry (fallback if QR is damaged) ────────────
const ManualTokenEntry = ({ onSubmit }) => {
  const [val, setVal] = useState('');
  const submit = () => {
    if (val.trim()) onSubmit(val.trim());
    setVal('');
  };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Paste ticket token (UUID)"
        className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 font-mono"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button
        onClick={submit}
        className="bg-[#E7C65F] text-[#0D2B20] font-semibold px-4 rounded-lg text-sm"
      >
        Look up
      </button>
    </div>
  );
};

// ─── Verdict modal ─────────────────────────────────────────────
const VerdictModal = ({ verdict, onAdmit, onDismiss }) => {
  const { kind, ticket, event, attendee, error } = verdict;

  const admitsCount = ticket?.admits_count || 1;
  const admitsUsed = ticket?.admits_used || 0;
  const remaining = Math.max(admitsCount - admitsUsed, 0);
  const isGroup = admitsCount > 1;

  const formatScannedAt = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const bg =
    kind === 'fresh' ? 'bg-emerald-600' :
    kind === 'admitting' ? 'bg-emerald-600' :
    kind === 'admitted' ? 'bg-green-600' :
    kind === 'used' ? 'bg-yellow-600' :
    'bg-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${bg} text-white animate-[slideUp_0.2s_ease-out]`}>
        {/* Header */}
        <div className="p-6 text-center">
          {kind === 'fresh' && (
            <>
              <ShieldCheck className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">FRESH TICKET</h2>
              {isGroup && (
                <p className="text-white/90 mt-2 text-lg font-semibold">
                  Admit {admitsUsed + 1} of {admitsCount}
                </p>
              )}
            </>
          )}
          {kind === 'admitting' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-3 animate-spin" />
              <h2 className="text-2xl font-bold">Admitting…</h2>
            </>
          )}
          {kind === 'admitted' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">ADMITTED ✓</h2>
              {isGroup && (
                <p className="text-white/90 mt-2 text-lg font-semibold">
                  {admitsUsed} of {admitsCount} used
                  {remaining > 0 && ` — ${remaining} still allowed`}
                </p>
              )}
              {!isGroup && (
                <p className="text-white/80 mt-2">Let them through</p>
              )}
            </>
          )}
          {kind === 'used' && (
            <>
              <AlertTriangle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">ALREADY USED</h2>
              {isGroup ? (
                <p className="text-white/90 mt-2 text-lg font-semibold">
                  All {admitsCount} entries used
                </p>
              ) : (
                <p className="text-white/80 mt-2 text-sm">
                  Scanned {formatScannedAt(ticket?.scanned_at)}
                </p>
              )}
            </>
          )}
          {kind === 'invalid' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">INVALID</h2>
              <p className="text-white/80 mt-2 text-sm">No matching ticket. Don't admit.</p>
            </>
          )}
          {kind === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">ERROR</h2>
              <p className="text-white/80 mt-2 text-sm">{error || 'Something went wrong'}</p>
            </>
          )}
        </div>

        {/* Ticket details — only on positive identification */}
        {ticket && event && ['fresh', 'admitting', 'admitted', 'used'].includes(kind) && (
          <div className="bg-black/30 p-5 space-y-3">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Event</p>
              <p className="font-semibold text-lg">{event.title}</p>
            </div>
            {attendee && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Attendee</p>
                <p className="font-medium">{attendee.full_name || ticket.guest_name || 'Unknown'}</p>
                {attendee.phone && <p className="text-white/60 text-sm">{attendee.phone}</p>}
              </div>
            )}
            {ticket.tier && (
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-xs uppercase tracking-wider">Tier</p>
                <p className="font-semibold">{ticket.tier}</p>
              </div>
            )}
            {isGroup && (
              <div className="flex items-center gap-2 bg-black/30 rounded-xl p-3">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Group ticket • {admitsUsed} / {admitsCount} entries used
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-black/20 space-y-2">
          {kind === 'fresh' && (
            <button
              onClick={onAdmit}
              className="w-full bg-white text-emerald-700 font-extrabold py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {isGroup ? `ADMIT 1 OF ${admitsCount}` : 'ADMIT — LET IN'}
            </button>
          )}
          {kind === 'admitted' && isGroup && remaining > 0 && (
            <button
              onClick={onAdmit}
              className="w-full bg-white text-emerald-700 font-bold py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Admit one more ({remaining} left)
            </button>
          )}
          <button
            onClick={onDismiss}
            disabled={kind === 'admitting'}
            className="w-full bg-white/15 hover:bg-white/25 text-white font-medium py-3 rounded-2xl disabled:opacity-50"
          >
            {kind === 'fresh' ? 'Cancel' : 'Scan next'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StaffScanner;
