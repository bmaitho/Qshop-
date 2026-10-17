// Admin: The Buzz — review the agent's draft, test it, approve, send.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Send, Check, X, FlaskConical } from 'lucide-react';
import { supabase } from '../SupabaseClient';

const API = `${import.meta.env.VITE_API_URL}/buzz`;
const STATUS = { draft: 'Draft', approved: 'Approved', sending: 'Sending', sent: 'Sent', discarded: 'Discarded' };

export default function BuzzAdmin() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(null);
  const [state, setState] = useState({ campaigns: [], audience: 0, dailyCap: 0 });
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const call = useCallback(async (path, method = 'GET', body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }, []);

  const load = useCallback(async () => {
    const j = await call('/campaigns');
    setState(j);
    setActive((a) => j.campaigns.find((c) => c.id === a?.id) || j.campaigns[0] || null);
  }, [call]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      setOk(!!data?.is_admin);
      if (data?.is_admin) load().catch((e) => setNote(e.message));
    })();
  }, [navigate, load]);

  const run = (label, fn) => async () => {
    setBusy(label); setNote('');
    try { const msg = await fn(); if (msg) setNote(msg); await load(); } catch (e) { setNote(e.message); } finally { setBusy(''); }
  };

  if (ok === null) return <div className="min-h-screen flex items-center justify-center bg-[#07120a]"><Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" /></div>;
  if (!ok) return <div className="min-h-screen flex items-center justify-center bg-[#07120a] text-white/70">Admin access required.</div>;

  const btn = 'rounded-full px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40';
  return (
    <div className="min-h-screen bg-[#07120a] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-[11px] tracking-[0.4em] text-[#E7C65F]">ADMIN</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-1">The Buzz</h1>
        <p className="text-white/55 text-sm mt-2 max-w-2xl">
          The agent drafts an issue from what’s actually on UniHive (events, new shops and products). Nothing goes out until it’s approved.
          Approved issues send in daily batches of up to {state.dailyCap} to the {state.audience} people subscribed.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <button onClick={run('draft', async () => { await call('/draft', 'POST'); return 'New draft ready.'; })} disabled={!!busy} className={`${btn} bg-[#E7C65F] text-[#0D2B20]`}>
            {busy === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Write a new issue
          </button>
          <button onClick={run('followup', async () => { await call('/followup', 'POST', { kind: 'pre-party-thanks' }); return 'Thank-you draft ready for the pre-party RSVPs — preview it, send yourself a test, then approve.'; })} disabled={!!busy} className={`${btn} border border-[#E7C65F]/50 text-[#E7C65F]`}>
            {busy === 'followup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Thank pre-party RSVPs
          </button>
          <button onClick={run('send', async () => { const j = await call('/send', 'POST'); return j.note || `Sent ${j.sent}.`; })} disabled={!!busy} className={`${btn} border border-white/20`}>
            {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send today’s batch now
          </button>
        </div>
        {note && <p className="text-[#E7C65F] text-sm mt-3">{note}</p>}

        <div className="grid lg:grid-cols-[320px_1fr] gap-6 mt-8">
          <ul className="space-y-2">
            {state.campaigns.map((c) => (
              <li key={c.id}>
                <button onClick={() => setActive(c)} className={`w-full text-left rounded-2xl border p-4 ${active?.id === c.id ? 'border-[#E7C65F]/60 bg-white/[0.04]' : 'border-white/10 hover:border-white/25'}`}>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-[#E7C65F]">{STATUS[c.status]} · {c.written_by === 'claude' ? 'Agent' : c.written_by === 'team' ? 'Team' : 'Template'}</p>
                  <p className="text-white/50 text-[11px] mt-0.5">To: {c.audienceLabel} ({c.audienceSize})</p>
                  <p className="font-semibold mt-1 leading-snug">{c.subject}</p>
                  <p className="text-white/45 text-xs mt-1">{new Date(c.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}{c.sent_count ? ` · sent ${c.sent_count}` : ''}</p>
                </button>
              </li>
            ))}
            {!state.campaigns.length && <li className="text-white/50 text-sm">No issues yet — write one.</li>}
          </ul>
          <div>
            {active && (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={run('test', async () => { const j = await call(`/campaigns/${active.id}/test`, 'POST'); return `Test sent to ${j.to}.`; })} disabled={!!busy} className={`${btn} border border-white/20`}><FlaskConical className="w-4 h-4" /> Send me a test</button>
                  {active.status === 'draft' && (
                    <>
                      <button onClick={run('approve', async () => { if (!window.confirm(`Approve “${active.subject}” for ${active.audienceSize} people (${active.audienceLabel})?`)) return ''; await call(`/campaigns/${active.id}/status`, 'POST', { status: 'approved' }); return 'Approved — it goes out in the next daily batch.'; })} disabled={!!busy} className={`${btn} bg-emerald-500/20 text-emerald-200 border border-emerald-400/40`}><Check className="w-4 h-4" /> Approve</button>
                      <button onClick={run('discard', async () => { await call(`/campaigns/${active.id}/status`, 'POST', { status: 'discarded' }); return 'Discarded.'; })} disabled={!!busy} className={`${btn} border border-white/15 text-white/70`}><X className="w-4 h-4" /> Discard</button>
                    </>
                  )}
                </div>
                <iframe title="Preview" srcDoc={active.preview} sandbox="" className="w-full h-[78vh] rounded-2xl bg-[#07120a] border border-white/10" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
