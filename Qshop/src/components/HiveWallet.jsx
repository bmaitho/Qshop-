// src/components/HiveWallet.jsx
//
// Event wallet: balance, M-Pesa top-up (POST /api/wallet/:eventId/topup),
// and every purchased item with its redeemable QR. Accepts an event id
// or slug in the URL; the backend always receives the resolved UUID.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, QrCode, ChevronDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from './SupabaseClient';
import QRCode from './QRCode';
import HiveShell from './hive/HiveShell';
import { HIVE_SLUG } from './hive/hiveMedia';
import useHiveCart from './hive/useHiveCart';
import { CartPanel } from './hive/HiveCart';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 40;
const QUICK = [500, 1000, 2000, 5000];
const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;

export default function HiveWallet() {
  const { eventId: param } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [balance, setBalance] = useState(null);
  const [items, setItems] = useState([]);
  const [txns, setTxns] = useState([]);
  const [openQr, setOpenQr] = useState(null);

  const [amount, setAmount] = useState(search.get('topup') && Number(search.get('topup')) > 0 ? String(Math.ceil(Number(search.get('topup')))) : '1000');
  const [products, setProducts] = useState([]);
  const cartApi = useHiveCart(event?.id);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef(null);
  const topupRef = useRef(null);

  const load = useCallback(async (ev, u) => {
    const [{ data: bal }, { data: ents }, { data: wallet }] = await Promise.all([
      supabase.from('event_wallet_balances').select('balance').eq('event_id', ev.id).eq('user_id', u.id).maybeSingle(),
      supabase.from('event_entitlements').select('*').eq('event_id', ev.id).eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('event_wallets').select('id').eq('event_id', ev.id).eq('user_id', u.id).maybeSingle(),
    ]);
    setBalance(bal?.balance ?? 0);
    setItems(ents || []);
    if (wallet) {
      const { data: t } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(15);
      setTxns(t || []);
    }
    return bal?.balance ?? 0;
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        sessionStorage.setItem('postLoginRedirect', window.location.pathname);
        navigate('/auth');
        return;
      }
      setUser(u);
      const col = param && UUID_RE.test(param) ? 'id' : 'slug';
      let { data: ev } = await supabase.from('events').select('id, title, slug').eq(col, param || HIVE_SLUG).maybeSingle();
      if (!ev) ({ data: ev } = await supabase.from('events').select('id, title, slug').eq('slug', HIVE_SLUG).maybeSingle());
      setEvent(ev);
      if (ev) {
        const { data: pr } = await supabase.from('event_products').select('*').eq('event_id', ev.id).eq('active', true);
        setProducts(pr || []);
      }
      const { data: prof } = await supabase.from('profiles').select('phone').eq('id', u.id).maybeSingle();
      if (prof?.phone) setPhone(prof.phone);
      if (ev) load(ev, u);
    })();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [param, navigate, load]);

  const topUp = async () => {
    const value = Number(amount);
    if (!value || value <= 0) { setErrorMsg('Enter a valid amount.'); return; }
    if (!phone.trim()) { setErrorMsg('Enter the M-Pesa number to pay with.'); return; }
    setStep('processing');
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/wallet/${event.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount: value, phoneNumber: phone }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) { setErrorMsg(body?.error || `Top-up failed (HTTP ${res.status})`); setStep('failed'); return; }

      const start = balance ?? 0;
      let n = 0;
      pollingRef.current = setInterval(async () => {
        n += 1;
        if (n > MAX_POLL_ATTEMPTS) {
          clearInterval(pollingRef.current);
          setErrorMsg('Payment timed out. If you were charged, contact support.');
          setStep('failed');
          return;
        }
        const now = await load(event, user);
        if (Number(now) !== Number(start)) { clearInterval(pollingRef.current); setStep('success'); }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setErrorMsg(err.message || 'Network error starting top-up');
      setStep('failed');
    }
  };

  const unused = items.filter((i) => i.status !== 'redeemed');
  const used = items.filter((i) => i.status === 'redeemed');

  return (
    <HiveShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12">
        <div className="space-y-6">
          <div>
            <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">PAY AT EVERY STAND</p>
            <h1 className="hive-display hive-gold-text text-4xl sm:text-5xl font-extrabold mt-1">HIVE Wallet</h1>
          </div>

          <div className="relative aspect-[1.6/1] rounded-[28px] overflow-hidden border border-[#e7c65f]/20 bg-[#120607] shadow-[0_40px_80px_-30px_rgba(195,18,31,0.6)]">
            <img src="/hive/media/wristband.webp" alt="THE HIVE wristband" className="absolute inset-0 w-full h-full object-cover scale-[1.15] object-[50%_42%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
            <div className="relative h-full flex flex-col justify-between p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="text-[10px] uppercase tracking-[0.35em] text-white/60">HIVE Wallet</span>
                <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">Fri 30 Oct</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Balance</p>
                {balance === null ? (
                  <div className="h-12 w-48 rounded-lg hive-shimmer mt-1" />
                ) : (
                  <p className="hive-display text-white text-4xl sm:text-5xl font-bold tabular-nums mt-1 drop-shadow">{ksh(balance)}</p>
                )}
                <p className="text-xs text-white/45 mt-2">{user?.email}</p>
              </div>
            </div>
          </div>

          <div ref={topupRef} className="rounded-[26px] border border-white/10 bg-[#0e0809]/80 backdrop-blur-xl p-5 sm:p-6 scroll-mt-32">
            {step === 'idle' && (
              <div className="space-y-4">
                <p className="hive-display text-white text-lg font-bold">Top up with M-Pesa</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(String(q))}
                      className={`rounded-full py-2 text-xs sm:text-sm font-bold border transition-colors ${String(q) === amount ? 'bg-white text-black border-white' : 'border-white/15 text-white/70'}`}
                    >
                      {q.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (KSh)" className="hive-input" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="M-Pesa number, 07XX XXX XXX" className="hive-input" />
                {errorMsg && <p className="text-[#ff6b74] text-sm">{errorMsg}</p>}
                <button onClick={topUp} disabled={!event} className="w-full hive-btn-blood rounded-full py-3.5 font-bold disabled:opacity-50">
                  Top up {amount ? ksh(amount) : ''}
                </button>
              </div>
            )}
            {step === 'processing' && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#e7c65f] mx-auto" />
                <p className="text-white/70 text-sm">Check your phone and enter your M-Pesa PIN…</p>
              </div>
            )}
            {step === 'success' && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-white font-bold">Top-up confirmed — {ksh(balance)}</p>
                <button onClick={() => navigate(`/events/${event?.slug || HIVE_SLUG}?tab=shop`)} className="w-full hive-btn-gold rounded-full py-3 font-bold">Spend it at the bar</button>
              </div>
            )}
            {step === 'failed' && (
              <div className="text-center py-6 space-y-4">
                <XCircle className="w-12 h-12 text-[#ff2e3b] mx-auto" />
                <p className="text-white/70 text-sm">{errorMsg || 'Top-up failed.'}</p>
                <button onClick={() => setStep('idle')} className="w-full rounded-full py-3 font-bold border border-white/20">Try again</button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {cartApi.count > 0 && (
            <section className="rounded-[26px] border border-[#c3121f]/30 bg-[#140809]/80 p-5 sm:p-6">
              <h2 className="hive-display text-white text-xl font-bold mb-4">Your cart</h2>
              <CartPanel
                cartApi={cartApi}
                products={products}
                balance={balance}
                user={user}
                onLogin={() => navigate('/auth')}
                onDone={() => event && user && load(event, user)}
                onTopUp={(n) => { setAmount(String(n)); setStep('idle'); topupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
              />
            </section>
          )}
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="hive-display text-white text-2xl font-bold">My HIVE items</h2>
              <span className="text-xs text-white/40">{unused.length} ready to redeem</span>
            </div>
            {unused.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/15 p-8 text-center">
                <p className="hive-accent text-white/60 text-lg">Nothing here yet.</p>
                <button onClick={() => navigate(`/events/${event?.slug || HIVE_SLUG}?tab=shop`)} className="mt-4 hive-btn-gold rounded-full px-5 py-2.5 text-sm font-bold">
                  Browse bar & bites
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unused.map((it) => (
                  <div key={it.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] overflow-hidden">
                    <button onClick={() => setOpenQr(openQr === it.id ? null : it.id)} className="w-full flex items-center gap-3 p-4 text-left">
                      <div className="w-10 h-10 rounded-xl bg-[#c3121f]/20 flex items-center justify-center shrink-0"><QrCode className="w-5 h-5 text-[#ff2e3b]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{it.product_name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</p>
                        <p className="text-xs text-white/40">Tap to show QR at the stand</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${openQr === it.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openQr === it.id && (
                      <div className="pb-5 flex justify-center hive-fade-in">
                        <div className="bg-white p-3 rounded-2xl"><QRCode value={it.qr_token} size={180} fgColor="#000000" bgColor="#ffffff" /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {used.length > 0 && <p className="text-xs text-white/35 mt-3">{used.length} already redeemed</p>}
          </section>

          {txns.length > 0 && (
            <section>
              <h2 className="hive-display text-white text-xl font-bold mb-3">Activity</h2>
              <div className="rounded-[18px] border border-white/10 divide-y divide-white/5">
                {txns.map((t) => {
                  const credit = t.type === 'topup' || t.type === 'refund';
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      {credit ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-[#ff6b74]" />}
                      <div className="flex-1">
                        <p className="text-sm text-white/85 capitalize">{t.type}</p>
                        <p className="text-[11px] text-white/35">{new Date(t.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })} · {t.status}</p>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${credit ? 'text-emerald-400' : 'text-white/80'}`}>
                        {credit ? '+' : '−'}{ksh(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </HiveShell>
  );
}
