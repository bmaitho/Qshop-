// Shared QR scanner (door admission, vendor/partner redemption).
// lookup(token) → verdict { kind: 'ready'|'used'|'invalid'|'error', title,
// subtitle, image, meta: [[label, value]], note, actionLabel, raw }
// act(verdict) → verdict after the action (kind 'done' or 'error').
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Loader2, CheckCircle2, XCircle, AlertTriangle, Keyboard } from 'lucide-react';
import Portal from './Portal';

const REGION = 'hive-scanner-region';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export const tokenFrom = (text) => (String(text || '').match(UUID) || [null])[0]?.toLowerCase() || null;

function Corners() {
  const c = 'absolute w-10 h-10 border-[#e7c65f]';
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative w-[72%] aspect-square">
        <span className={`${c} top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl`} />
        <span className={`${c} top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl`} />
        <span className={`${c} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl`} />
        <span className={`${c} bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl`} />
        <span className="absolute inset-x-4 h-px bg-gradient-to-r from-transparent via-[#ff2e3b] to-transparent hive-scanline" />
      </div>
    </div>
  );
}

function Verdict({ v, onAct, onClose, busy }) {
  const tone = {
    ready: ['from-emerald-500/25', 'text-emerald-300', CheckCircle2],
    done: ['from-emerald-500/30', 'text-emerald-300', CheckCircle2],
    used: ['from-amber-500/25', 'text-amber-300', AlertTriangle],
    invalid: ['from-[#c3121f]/35', 'text-[#ff8a92]', XCircle],
    error: ['from-[#c3121f]/35', 'text-[#ff8a92]', XCircle],
  }[v.kind] || ['from-white/10', 'text-white', AlertTriangle];
  const [grad, color, Icon] = tone;
  return (
    <Portal>
      <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={busy ? undefined : onClose}>
        <div className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden border border-white/10 bg-[#0d0809] hive-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className={`relative bg-gradient-to-b ${grad} to-transparent px-6 pt-7 pb-5`}>
            <div className="flex items-start gap-4">
              {v.image ? (
                <img src={v.image} alt="" className="w-20 h-20 rounded-2xl object-cover bg-white/5 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0"><Icon className={`w-7 h-7 ${color}`} /></div>
              )}
              <div className="min-w-0">
                <p className={`text-[11px] font-bold tracking-[0.3em] uppercase ${color}`}>{v.label}</p>
                <p className="hive-display text-white text-xl font-bold leading-tight mt-1">{v.title}</p>
                {v.subtitle && <p className="text-white/55 text-sm mt-1">{v.subtitle}</p>}
              </div>
            </div>
          </div>
          {(v.meta?.length > 0 || v.note) && (
            <div className="px-6 pb-2 space-y-2">
              {v.meta?.map(([k, val]) => (
                <div key={k} className="flex justify-between text-sm"><span className="text-white/45">{k}</span><span className="text-white/90 text-right">{val}</span></div>
              ))}
              {v.note && <p className="text-white/50 text-xs pt-1">{v.note}</p>}
            </div>
          )}
          <div className="p-6 pt-4 space-y-2.5">
            {v.kind === 'ready' && v.actionLabel && (
              <button onClick={onAct} disabled={busy} className="w-full hive-btn-gold rounded-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {v.actionLabel}
              </button>
            )}
            <button onClick={onClose} disabled={busy} className="w-full rounded-full py-3 font-semibold border border-white/15 text-white/80 disabled:opacity-50">
              {v.kind === 'ready' ? 'Cancel' : 'Scan next'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function HiveScanner({ lookup, act, onCompleted, hint = 'Point at the QR code' }) {
  const scanner = useRef(null);
  const busyRef = useRef(false);
  const last = useRef({ t: null, at: 0 });
  const [on, setOn] = useState(false);
  const [err, setErr] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);

  const stop = useCallback(async () => {
    try { if (scanner.current?.isScanning) await scanner.current.stop(); scanner.current?.clear?.(); } catch { /* already stopped */ }
    scanner.current = null;
    setOn(false);
  }, []);
  useEffect(() => () => { stop(); }, [stop]);

  const handle = useCallback(async (text) => {
    const t = tokenFrom(text);
    const now = Date.now();
    if (!t || busyRef.current) return;
    if (last.current.t === t && now - last.current.at < 2500) return;
    last.current = { t, at: now };
    busyRef.current = true;
    try { setVerdict(await lookup(t)); }
    catch (e) { setVerdict({ kind: 'error', label: 'Error', title: 'Lookup failed', subtitle: e.message }); }
    finally { setTimeout(() => { busyRef.current = false; }, 600); }
  }, [lookup]);

  const start = async () => {
    setErr('');
    try {
      const s = new Html5Qrcode(REGION, { verbose: false });
      scanner.current = s;
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const z = Math.floor(Math.min(w, h) * 0.72); return { width: z, height: z }; } }, handle, () => {});
      setOn(true);
    } catch (e) {
      setErr(/Permission|NotAllowed/i.test(e?.message || e) ? 'Camera permission denied — allow it in your browser settings.' : (e?.message || 'Could not start the camera.'));
      setOn(false);
    }
  };

  const doAct = async () => {
    setBusy(true);
    try {
      const v = await act(verdict);
      setVerdict(v);
      if (v.kind === 'done') onCompleted?.(v);
    } catch (e) {
      setVerdict((x) => ({ ...x, kind: 'error', label: 'Error', subtitle: e.message }));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full rounded-[28px] overflow-hidden bg-black border border-white/10">
        <div id={REGION} className="w-full h-full [&_video]:object-cover [&_video]:!w-full [&_video]:!h-full" />
        {on ? <Corners /> : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[radial-gradient(circle_at_50%_40%,rgba(195,18,31,0.25),transparent_65%)]">
            <div className="w-16 h-16 rounded-full border border-[#e7c65f]/40 flex items-center justify-center mb-4"><Camera className="w-7 h-7 text-[#e7c65f]" /></div>
            <p className="text-white/85 font-semibold">{hint}</p>
            {err && <p className="text-[#ff8a92] text-xs mt-2 max-w-xs">{err}</p>}
            <button onClick={start} className="mt-5 hive-btn-gold rounded-full px-6 py-3 text-sm font-bold">Start camera</button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {on && (
          <button onClick={stop} className="flex-1 rounded-full py-2.5 text-sm border border-white/15 text-white/75 flex items-center justify-center gap-2">
            <CameraOff className="w-4 h-4" /> Stop camera
          </button>
        )}
        <button onClick={() => setShowManual((x) => !x)} className="flex-1 rounded-full py-2.5 text-sm border border-white/15 text-white/75 flex items-center justify-center gap-2">
          <Keyboard className="w-4 h-4" /> Enter code
        </button>
      </div>
      {showManual && (
        <form onSubmit={(e) => { e.preventDefault(); last.current = { t: null, at: 0 }; handle(manual); setManual(''); }} className="flex gap-2 hive-fade-in">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste or type the code" className="hive-input font-mono text-sm" />
          <button className="hive-btn-gold rounded-full px-5 text-sm font-bold shrink-0">Check</button>
        </form>
      )}
      {verdict && <Verdict v={verdict} busy={busy} onAct={doAct} onClose={() => { setVerdict(null); last.current = { t: null, at: 0 }; }} />}
    </div>
  );
}
