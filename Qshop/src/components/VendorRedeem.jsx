// src/components/VendorRedeem.jsx
//
// Vendor-facing scanner for redeeming purchased HIVE package items
// (products / wallet-credit entitlements bought as part of a package).
// Deliberately separate from StaffScanner.jsx/admit_ticket — this is a
// vendor fulfilling a purchased item, not entry/admission control, and
// operates on event_entitlements + redeem_entitlement, never event_tickets.
//
// Scaffolding (auth gate, CDN QR loader, debounce, verdict modal) is a
// direct adaptation of StaffScanner.jsx so staff only need to learn one
// scanning UX. Gated the same way (is_staff || is_admin) — there is no
// separate vendor role in the schema yet.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, CameraOff, CheckCircle, XCircle, Lock, LogOut, Loader2, ScanLine, Package,
} from 'lucide-react';
import { supabase } from './SupabaseClient';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ELEMENT_ID = 'unihive-vendor-scanner-region';

const extractToken = (decoded) => {
  if (!decoded) return null;
  const trimmed = String(decoded).trim();
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(uuidRegex);
  return match ? match[0].toLowerCase() : null;
};

const VendorRedeem = () => {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState('checking'); // checking | not_authed | not_staff | ok
  const [staffUser, setStaffUser] = useState(null);
  const [authError, setAuthError] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef(null);
  const lastDecodeRef = useRef({ token: null, ts: 0 });
  const busyRef = useRef(false);

  // verdict: null | { kind: 'fresh'|'used'|'invalid'|'error'|'redeeming'|'redeemed', entitlement? }
  const [verdict, setVerdict] = useState(null);
  const [shiftCount, setShiftCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Timed out: ${label}`)), ms)),
      ]);

    const stuckTimer = setTimeout(() => {
      if (!cancelled) setAuthError('Taking longer than expected. Check your connection and tap retry.');
    }, 8000);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData?.session?.user || null;

        if (!user) {
          const { data: userData } = await withTimeout(supabase.auth.getUser(), 10000, 'auth check');
          user = userData?.user || null;
        }

        if (cancelled) return;
        if (!user) { setAuthState('not_authed'); return; }

        const { data: profile, error: profileErr } = await withTimeout(
          supabase.from('profiles').select('id, full_name, email, is_admin, is_staff').eq('id', user.id).maybeSingle(),
          10000,
          'profile lookup'
        );
        if (cancelled) return;
        if (profileErr) throw profileErr;

        if (!profile?.is_staff && !profile?.is_admin) {
          setStaffUser({ id: user.id, name: profile?.full_name || user.email });
          setAuthState('not_staff');
          return;
        }
        setStaffUser({ id: user.id, name: profile.full_name || user.email });
        setAuthState('ok');
      } catch (err) {
        if (cancelled) return;
        console.error('Auth check failed:', err);
        setAuthError(err?.message || 'Could not verify your account. Tap retry.');
      } finally {
        clearTimeout(stuckTimer);
      }
    })();

    return () => { cancelled = true; clearTimeout(stuckTimer); };
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState ? scannerRef.current.getState() : null;
        if (state === 2 || scannerRef.current.isScanning) await scannerRef.current.stop();
        scannerRef.current.clear?.();
      } catch (e) { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleDecode = useCallback(async (decodedText) => {
    const token = extractToken(decodedText);
    const now = Date.now();
    if (!token) return;
    if (busyRef.current) return;
    if (lastDecodeRef.current.token === token && now - lastDecodeRef.current.ts < 2000) return;
    lastDecodeRef.current = { token, ts: now };
    busyRef.current = true;

    try {
      const { data: entitlement, error: lookupErr } = await supabase
        .from('event_entitlements')
        .select('*')
        .eq('qr_token', token)
        .maybeSingle();

      if (lookupErr) { setVerdict({ kind: 'error', error: lookupErr.message }); return; }
      if (!entitlement) { setVerdict({ kind: 'invalid' }); return; }

      if (entitlement.status === 'redeemed') {
        setVerdict({ kind: 'used', entitlement });
        return;
      }

      setVerdict({ kind: 'fresh', entitlement });
    } catch (err) {
      console.error('Decode handler error:', err);
      setVerdict({ kind: 'error', error: err.message || 'Unknown error' });
    } finally {
      setTimeout(() => { busyRef.current = false; }, 800);
    }
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError('');
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (vw, vh) => { const size = Math.floor(Math.min(vw, vh) * 0.75); return { width: size, height: size }; },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => { handleDecode(decodedText); },
        () => { /* ignore per-frame failures */ }
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

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const redeemOne = async () => {
    if (!verdict?.entitlement) return;
    setVerdict((v) => ({ ...v, kind: 'redeeming' }));
    try {
      const { data, error } = await supabase.rpc('redeem_entitlement', {
        p_qr_token: verdict.entitlement.qr_token,
      });
      if (error) {
        setVerdict((v) => ({ ...v, kind: 'error', error: error.message || 'Redeem failed' }));
        return;
      }
      setShiftCount((c) => c + 1);
      setVerdict((v) => ({ ...v, kind: 'redeemed', entitlement: data }));
    } catch (err) {
      setVerdict((v) => ({ ...v, kind: 'error', error: err.message || 'Redeem failed' }));
    }
  };

  const dismissVerdict = () => { setVerdict(null); lastDecodeRef.current = { token: null, ts: 0 }; };
  const goLogin = () => { sessionStorage.setItem('postLoginRedirect', '/staff/redeem'); navigate('/auth'); };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D2B20] text-white p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F] mb-4" />
        <p className="text-white/70 text-sm">Verifying staff account…</p>
        {authError && (
          <div className="mt-6 w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
            <p className="text-red-200 text-sm mb-3">{authError}</p>
            <button onClick={() => window.location.reload()} className="bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-2.5 px-6 rounded-xl text-sm">
              Retry
            </button>
            <button onClick={goLogin} className="block w-full mt-3 text-white/60 hover:text-white text-xs py-2">
              Or log in again
            </button>
          </div>
        )}
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
            <p className="text-blue-200/70 text-sm">Sign in to redeem items</p>
          </div>
          <div className="p-6">
            <button onClick={goLogin} className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-3.5 rounded-xl">
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
              {staffUser?.name} — this account is not authorised to redeem items.
              Ask an admin to grant you staff access.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <button onClick={async () => { await supabase.auth.signOut(); goLogin(); }} className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl">
              Sign out & log in as staff
            </button>
            <button onClick={() => navigate('/home')} className="w-full text-white/50 hover:text-white text-sm py-2">
              Back to UniHive
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <div className="sticky top-0 z-10 bg-[#0D2B20]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#E7C65F] leading-tight">Vendor Redeem</h1>
            <p className="text-white/40 text-xs">{staffUser?.name}</p>
          </div>
          <button onClick={async () => { await stopScanner(); await supabase.auth.signOut(); navigate('/auth'); }} className="text-white/40 hover:text-white p-2" title="Sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-[#E7C65F]">{shiftCount}</p>
          <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Redeemed this shift</p>
        </div>

        <div className="bg-black rounded-3xl overflow-hidden border border-white/10 relative aspect-square">
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/60">
              <ScanLine className="w-16 h-16 text-[#E7C65F] mb-4" />
              <p className="text-white/80 mb-1 font-semibold">Camera off</p>
              <p className="text-white/40 text-sm mb-4">Tap below to start scanning items</p>
              {scannerError && <p className="text-red-300 text-xs mb-3 max-w-xs">{scannerError}</p>}
              <button onClick={startScanner} className="bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-3 px-6 rounded-xl flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Start camera
              </button>
            </div>
          )}
          {scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 aspect-square border-2 border-[#E7C65F]/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
        </div>

        {scanning && (
          <button onClick={stopScanner} className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
            <CameraOff className="w-4 h-4" /> Stop camera
          </button>
        )}

        <details className="bg-white/5 border border-white/10 rounded-2xl">
          <summary className="cursor-pointer p-4 text-white/60 text-sm">Can't scan? Enter token manually</summary>
          <div className="p-4 pt-0">
            <ManualTokenEntry onSubmit={(t) => handleDecode(t)} />
          </div>
        </details>
      </div>

      {verdict && <VerdictModal verdict={verdict} onRedeem={redeemOne} onDismiss={dismissVerdict} />}
    </div>
  );
};

const ManualTokenEntry = ({ onSubmit }) => {
  const [val, setVal] = useState('');
  const submit = () => { if (val.trim()) onSubmit(val.trim()); setVal(''); };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Paste entitlement token (UUID)"
        className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 font-mono"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button onClick={submit} className="bg-[#E7C65F] text-[#0D2B20] font-semibold px-4 rounded-lg text-sm">
        Look up
      </button>
    </div>
  );
};

const VerdictModal = ({ verdict, onRedeem, onDismiss }) => {
  const { kind, entitlement, error } = verdict;

  const formatRedeemedAt = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const bg =
    kind === 'fresh' ? 'bg-emerald-600' :
    kind === 'redeeming' ? 'bg-emerald-600' :
    kind === 'redeemed' ? 'bg-green-600' :
    kind === 'used' ? 'bg-yellow-600' :
    'bg-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${bg} text-white`}>
        <div className="p-6 text-center">
          {kind === 'fresh' && (
            <>
              <Package className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">ITEM READY</h2>
            </>
          )}
          {kind === 'redeeming' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-3 animate-spin" />
              <h2 className="text-2xl font-bold">Redeeming…</h2>
            </>
          )}
          {kind === 'redeemed' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">REDEEMED ✓</h2>
              <p className="text-white/80 mt-2">Hand it over</p>
            </>
          )}
          {kind === 'used' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">ALREADY REDEEMED</h2>
              <p className="text-white/80 mt-2 text-sm">Redeemed {formatRedeemedAt(entitlement?.redeemed_at)}</p>
            </>
          )}
          {kind === 'invalid' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-3xl font-extrabold tracking-tight">INVALID</h2>
              <p className="text-white/80 mt-2 text-sm">No matching entitlement. Don't hand anything over.</p>
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

        {entitlement && ['fresh', 'redeeming', 'redeemed', 'used'].includes(kind) && (
          <div className="bg-black/30 p-5 space-y-3">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Item</p>
              <p className="font-semibold text-lg">{entitlement.product_name}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs uppercase tracking-wider">Quantity</p>
              <p className="font-semibold">{entitlement.quantity}</p>
            </div>
          </div>
        )}

        <div className="p-4 bg-black/20 space-y-2">
          {kind === 'fresh' && (
            <button onClick={onRedeem} className="w-full bg-white text-emerald-700 font-extrabold py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> REDEEM — HAND OVER
            </button>
          )}
          <button onClick={onDismiss} disabled={kind === 'redeeming'} className="w-full bg-white/15 hover:bg-white/25 text-white font-medium py-3 rounded-2xl disabled:opacity-50">
            {kind === 'fresh' ? 'Cancel' : 'Scan next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorRedeem;
