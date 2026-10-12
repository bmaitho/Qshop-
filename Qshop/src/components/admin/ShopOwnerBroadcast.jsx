// Admin: email every active shop owner (preview + recipient count first).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Send, Eye } from 'lucide-react';
import { supabase } from '../SupabaseClient';

const DEFAULTS = {
  subject: 'Traffic is coming to your UniHive store',
  heading: 'Get your store ready.',
  message: 'THE HIVE: No Going Home is bringing a wave of new visitors to UniHive. Make sure your store is ready for them: refresh your banner, add clear photos, check your prices and mark anything sold out.',
};

export default function ShopOwnerBroadcast() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState(DEFAULTS);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      setOk(!!data?.is_admin);
    })();
  }, [navigate]);

  const call = async (dryRun) => {
    setBusy(true); setResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/broadcast/shop-owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...form, dryRun }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || `HTTP ${res.status}`);
      if (dryRun) setPreview(body);
      else { setResult(`Sent to ${body.sent} shop owner${body.sent === 1 ? '' : 's'}${body.failed ? ` · ${body.failed} failed` : ''}.`); setPreview(null); }
    } catch (e) { setResult(e.message); } finally { setBusy(false); }
  };

  const send = () => {
    if (!preview) return;
    if (window.confirm(`Email ${preview.count} shop owners now? This can't be undone.`)) call(false);
  };

  if (ok === null) return <div className="min-h-screen flex items-center justify-center bg-[#0D2B20]"><Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" /></div>;
  if (!ok) return <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white/70">Admin access required.</div>;

  const field = 'w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white';
  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-[#E7C65F] uppercase flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Admin</p>
            <h1 className="font-serif text-3xl font-bold mt-1">Email all shop owners</h1>
            <p className="text-white/55 text-sm mt-2">Goes to every active store’s owner. Preview first — nothing sends until you confirm.</p>
          </div>
          <label className="block text-xs text-white/50">Subject<input className={`${field} mt-1`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
          <label className="block text-xs text-white/50">Heading<input className={`${field} mt-1`} value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} /></label>
          <label className="block text-xs text-white/50">Message<textarea rows={6} className={`${field} mt-1`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
          <div className="flex gap-3">
            <button onClick={() => call(true)} disabled={busy} className="flex-1 rounded-full border border-white/20 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview & count
            </button>
            <button onClick={send} disabled={busy || !preview} className="flex-1 rounded-full bg-[#E7C65F] text-[#0D2B20] py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
              <Send className="w-4 h-4" /> {preview ? `Send to ${preview.count}` : 'Send'}
            </button>
          </div>
          {preview && <p className="text-sm text-white/60">{preview.count} recipients · e.g. {preview.sample.join(', ')}</p>}
          {result && <p className="text-sm text-[#E7C65F]">{result}</p>}
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[480px]">
          {preview ? <iframe title="Email preview" srcDoc={preview.preview} className="w-full h-[720px] bg-white" sandbox="" /> : (
            <div className="h-full min-h-[480px] flex items-center justify-center text-white/40 text-sm">Preview appears here</div>
          )}
        </div>
      </div>
    </div>
  );
}
