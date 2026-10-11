import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Plus, Wallet, MapPin, Clock, CalendarDays, Sparkles, X, ArrowRight } from 'lucide-react';
import { supabase } from '../SupabaseClient';
import QRCode from '../QRCode';
import HiveShell, { useCountdown } from './HiveShell';
import MediaCarousel from './MediaCarousel';
import { CornerWeb } from './HiveTheme';
import Masonry from './Masonry';
import Portal from './Portal';
import {
  HIVE_SLUG, POSTERS, VIDEOS, LINEUP, BILLBOARD_SLIDES, PERKS, PARTNERS, BRANDS, brandOf, isWebbedCan, packagePoster,
} from './hiveMedia';

const TABS = [
  { key: 'shop', label: 'Bar & Bites' },
  { key: 'packs', label: 'Ticket Packs' },
  { key: 'night', label: 'The Night' },
];
const POLL_MS = 5000;
const MAX_POLLS = 40;
const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;

const describeItem = (item) => {
  if (item.item_type === 'ticket_tier') return `${item.quantity}× ${item.tier} entry`;
  if (item.item_type === 'product') return `${item.quantity}× ${item.event_products?.name || 'item'}`;
  if (item.item_type === 'wallet_credit') return `${ksh(item.wallet_credit_amount * item.quantity)} wallet credit`;
  return null;
};

function ProductPin({ product, onBuy, busy }) {
  const brand = BRANDS.find((b) => b.key === brandOf(product));
  return (
    <div className="group">
      <div className="hive-card">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" className="hive-card-img" />
        ) : (
          <div className="aspect-[3/4] flex flex-col items-center justify-center text-center p-5 bg-[radial-gradient(circle_at_50%_30%,#3a0a10,#07050a_70%)]">
            <span className="hive-accent text-white/50 text-sm">THE HIVE</span>
            <span className="hive-display hive-blood-glow text-[#ff2e3b] text-2xl font-bold leading-tight mt-1">{product.name}</span>
          </div>
        )}
        {isWebbedCan(product) && <CornerWeb size={130} flip className="hive-web-dark top-0 right-0 !opacity-80 !z-10" />}
        <span className="absolute top-2.5 left-2.5 z-20 rounded-full bg-black/65 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
          {ksh(product.price)}
        </span>
        <button
          onClick={() => onBuy(product)}
          disabled={busy}
          aria-label={`Get ${product.name}`}
          className="hive-touch-only absolute bottom-2.5 right-2.5 z-20 w-10 h-10 rounded-full hive-btn-blood items-center justify-center disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
        <div className="hive-card-reveal absolute inset-x-0 bottom-0 z-20 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={() => onBuy(product)}
            disabled={busy}
            className="w-full hive-btn-blood rounded-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {busy ? 'Paying…' : 'Get it'}
          </button>
        </div>
      </div>
      <div className="px-1 pt-2">
        <p className="text-[13px] sm:text-sm font-semibold text-white/90 leading-snug">{product.name}</p>
        {brand && <p className="text-[11px] text-white/40 mt-0.5">{brand.label}</p>}
      </div>
    </div>
  );
}

function EditorialPin({ item }) {
  return (
    <div className="hive-card">
      {item.type === 'video' ? (
        <video src={item.src} poster={item.poster} muted loop autoPlay playsInline preload="metadata" className="w-full h-auto block" />
      ) : (
        <img src={item.src} alt={item.caption} loading="lazy" decoding="async" className="hive-card-img" />
      )}
      {item.caption && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent">
          <p className="hive-accent text-white text-base leading-tight">{item.caption}</p>
        </div>
      )}
    </div>
  );
}

const EDITORIAL = [
  { at: 3, key: 'ed-master', type: 'image', src: POSTERS.master, caption: 'Everyone will be there', brand: 'all' },
  { at: 6, key: 'ed-countdown', type: 'video', ...VIDEOS.countdown, caption: 'The countdown is on', brand: 'all' },
  { at: 10, key: 'ed-faceA', type: 'image', src: POSTERS.faceBoardA, caption: 'Face & body paint at the Dome', brand: 'facepaint' },
  { at: 15, key: 'ed-afterdark', type: 'image', src: POSTERS.afterDark, caption: 'After dark, everything changes', brand: 'all' },
  { at: 20, key: 'ed-faceB', type: 'image', src: POSTERS.faceBoardB, caption: 'Go luminous — UV designs', brand: 'facepaint' },
];

function BrandShelf({ products, active, onPick }) {
  const counts = useMemo(() => {
    const c = {};
    products.forEach((p) => { const k = brandOf(p); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [products]);
  return (
    <div data-noswipe className="hive-snap-x hive-noscroll flex gap-3 overflow-x-auto px-3 sm:px-6 lg:px-10 scroll-px-3 sm:scroll-px-6 lg:scroll-px-10 pb-1">
      {BRANDS.filter((b) => counts[b.key]).map((b) => (
        <button
          key={b.key}
          onClick={() => onPick(active === b.key ? 'all' : b.key)}
          className={`relative shrink-0 w-[72vw] sm:w-[320px] h-[190px] sm:h-[220px] rounded-[22px] overflow-hidden text-left transition-all ${
            active === b.key ? 'ring-2 ring-[#e7c65f] ring-offset-2 ring-offset-[#07050a]' : ''
          }`}
        >
          <img src={b.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${b.tint} via-black/55 to-transparent opacity-95`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
          <div className="relative h-full flex flex-col justify-end p-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50">Shop</span>
            <span className="hive-display text-white text-lg sm:text-xl font-bold leading-tight">{b.label}</span>
            <span className="text-xs text-white/50 mt-1">{counts[b.key]} item{counts[b.key] === 1 ? '' : 's'}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function Hero({ onShop, onPacks }) {
  const c = useCountdown();
  return (
    <section className="relative h-[78svh] min-h-[540px] max-h-[900px] w-full overflow-hidden">
      <video
        src={VIDEOS.recap.src}
        poster={VIDEOS.recap.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050a] via-[#07050a]/55 to-[#07050a]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_100%,rgba(195,18,31,0.45),transparent_70%)]" />

      <div className="relative h-full flex flex-col justify-end px-4 sm:px-8 lg:px-14 pb-10 sm:pb-14">
        <p className="text-[11px] sm:text-xs tracking-[0.45em] text-white/60 font-semibold">UNIHIVE PRESENTS</p>
        <h1 className="hive-display hive-gold-text font-extrabold leading-[0.9] text-[13.5vw] sm:text-[12vw] lg:text-[9rem] xl:text-[10.5rem] whitespace-nowrap">THE HIVE</h1>
        <p className="hive-accent text-2xl sm:text-4xl text-white/85 -mt-1 sm:-mt-3">— No Going Home —</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-white/75">
          <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#e7c65f]" /> Fri 30 Oct</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#e7c65f]" /> 6PM till late</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#e7c65f]" /> Sarakasi Dome, Nairobi</span>
          <span className="rounded-full border border-[#ff2e3b]/60 text-[#ff2e3b] px-2.5 py-0.5 text-xs font-bold">18+</span>
        </div>

        {!c.done && (
          <div className="flex gap-2 sm:gap-3 mt-6">
            {[['Days', c.days], ['Hrs', c.hours], ['Min', c.mins], ['Sec', c.secs]].map(([l, v]) => (
              <div key={l} className="w-16 sm:w-20 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur py-2 text-center">
                <div className="hive-display text-2xl sm:text-3xl font-bold text-white tabular-nums">{String(v).padStart(2, '0')}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/45">{l}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-7">
          <button onClick={onShop} className="hive-btn-blood rounded-full px-6 py-3.5 text-sm font-bold flex items-center gap-2">
            Shop the night <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onPacks} className="rounded-full px-6 py-3.5 text-sm font-bold border border-white/25 bg-white/5 backdrop-blur hover:bg-white/10">
            Ticket packs
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">In partnership with</span>
          {PARTNERS.map((name, i) => (
            <span key={name} className="flex items-center gap-4 text-xs sm:text-sm font-semibold tracking-wide text-white/75">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-[#ff2e3b]" />}
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PackCard({ pkg, onPick }) {
  const items = (pkg.event_package_items || []).map(describeItem).filter(Boolean);
  return (
    <div className="hive-card group min-h-[420px] sm:min-h-[460px] flex flex-col justify-end">
      <img src={packagePoster(pkg)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050a] via-[#07050a]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#07050a] via-[#07050a]/95 to-transparent" />
      <div className="relative p-5 sm:p-6">
        {pkg.featured && (
          <span className="inline-block mb-3 rounded-full bg-[#e7c65f] text-[#1a0f05] text-[10px] font-extrabold tracking-widest px-2.5 py-1">FEATURED</span>
        )}
        <h3 className="hive-display text-white text-2xl sm:text-[1.7rem] font-bold leading-tight">{pkg.name}</h3>
        {pkg.description && <p className="text-white/65 text-sm mt-1.5 leading-relaxed">{pkg.description}</p>}
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {items.map((t) => (
              <span key={t} className="rounded-full bg-white/10 border border-white/10 backdrop-blur px-2.5 py-1 text-[11px] text-white/85">{t}</span>
            ))}
          </div>
        ) : (
          <p className="hive-accent text-white/50 mt-3">Details dropping soon.</p>
        )}
        <div className="flex items-center justify-between gap-3 mt-5">
          <span className="hive-display hive-gold-text text-2xl font-bold">{ksh(pkg.base_price)}</span>
          <button onClick={() => onPick(pkg)} className="hive-btn-gold rounded-full px-5 py-2.5 text-sm font-bold">
            Get this pack
          </button>
        </div>
      </div>
    </div>
  );
}

function LineupCard({ act }) {
  return (
    <div className="relative shrink-0 w-[72vw] sm:w-[320px] aspect-[4/5] rounded-[22px] overflow-hidden bg-black">
      {act.video ? (
        <video src={act.video.src} poster={act.poster} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <img src={act.poster} alt={`${act.name} — ${act.role}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">{act.role}</span>
    </div>
  );
}

function SectionTitle({ kicker, title, children }) {
  return (
    <div className="flex items-end justify-between gap-4 px-3 sm:px-6 lg:px-10 mb-4 sm:mb-5">
      <div>
        {kicker && <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-[#ff7a1a] font-semibold">{kicker}</p>}
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold mt-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function HiveEventPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'shop';
  const contentRef = useRef(null);
  const firstRender = useRef(true);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [filter, setFilter] = useState('all');

  const [buyingId, setBuyingId] = useState(null);
  const [toast, setToast] = useState('');
  const [entitlement, setEntitlement] = useState(null);

  const [pkg, setPkg] = useState(null);
  const [phone, setPhone] = useState('');
  const [pkgStep, setPkgStep] = useState('idle');
  const [pkgError, setPkgError] = useState('');
  const pollRef = useRef(null);

  const setTab = useCallback((key) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', key); return n; }), [setParams]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [tab]);

  const loadBalance = useCallback(async (eventId, userId) => {
    const { data } = await supabase.from('event_wallet_balances').select('balance').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
    setBalance(data?.balance ?? 0);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('slug', HIVE_SLUG).maybeSingle();
      if (!ev) { setLoading(false); return; }
      setEvent(ev);
      const [{ data: pk }, { data: pr }, { data: { user: u } }] = await Promise.all([
        supabase.from('event_packages').select('*, event_package_items(*, event_products(name))').eq('event_id', ev.id).eq('status', 'active').order('display_order'),
        supabase.from('event_products').select('*').eq('event_id', ev.id).eq('active', true).order('display_order'),
        supabase.auth.getUser(),
      ]);
      setPackages(pk || []);
      setProducts(pr || []);
      setUser(u || null);
      if (u) {
        loadBalance(ev.id, u.id);
        const { data: prof } = await supabase.from('profiles').select('phone').eq('id', u.id).maybeSingle();
        if (prof?.phone) setPhone(prof.phone);
      }
      setLoading(false);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadBalance]);

  const goLogin = () => {
    sessionStorage.setItem('postLoginRedirect', `/events/${HIVE_SLUG}?tab=${tab}`);
    navigate('/auth');
  };

  const buyProduct = async (product) => {
    if (!user) return goLogin();
    setBuyingId(product.id);
    try {
      const { data: wallet } = await supabase.from('event_wallets').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle();
      if (!wallet || (balance ?? 0) < Number(product.price)) {
        setToast(`Top up your HIVE Wallet to get ${product.name} (${ksh(product.price)}).`);
        return;
      }
      const { data, error } = await supabase.rpc('wallet_debit_for_purchase', {
        p_wallet_id: wallet.id, p_product_name: product.name, p_amount: product.price, p_quantity: 1, p_vendor_id: product.seller_id || null,
      });
      if (error) throw error;
      setEntitlement(data);
      loadBalance(event.id, user.id);
    } catch (err) {
      setToast(err.message?.includes('Insufficient') ? 'Not enough in your wallet — top up first.' : err.message || 'Purchase failed');
    } finally {
      setBuyingId(null);
    }
  };

  const startPkgPolling = (purchaseId) => {
    let n = 0;
    pollRef.current = setInterval(async () => {
      n += 1;
      if (n > MAX_POLLS) {
        clearInterval(pollRef.current);
        setPkgError('Payment timed out. If you were charged, contact support.');
        setPkgStep('failed');
        return;
      }
      const { data } = await supabase.from('event_package_purchases').select('status').eq('id', purchaseId).maybeSingle();
      if (data?.status === 'confirmed') { clearInterval(pollRef.current); setPkgStep('success'); }
      else if (data?.status === 'failed') { clearInterval(pollRef.current); setPkgError('Payment was declined or cancelled.'); setPkgStep('failed'); }
    }, POLL_MS);
  };

  const payPackage = async () => {
    if (!user) return goLogin();
    if (!phone.trim()) { setPkgError('Enter the M-Pesa number to pay with.'); return; }
    setPkgStep('processing');
    setPkgError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return goLogin();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/packages/${pkg.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) { setPkgError(body?.error || `Purchase failed (HTTP ${res.status})`); setPkgStep('failed'); return; }
      startPkgPolling(body.purchaseId);
    } catch (err) {
      setPkgError(err.message || 'Network error');
      setPkgStep('failed');
    }
  };

  const closePkg = () => { if (pollRef.current) clearInterval(pollRef.current); setPkg(null); setPkgStep('idle'); setPkgError(''); };

  // Swipe between tabs on touch, ignoring gestures that start inside carousels.
  const touch = useRef(null);
  const onTouchStart = (e) => {
    if (e.target.closest('[data-noswipe]')) { touch.current = null; return; }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    const i = TABS.findIndex((t) => t.key === tab);
    const next = TABS[i + (dx < 0 ? 1 : -1)];
    if (next) setTab(next.key);
  };

  const shopItems = useMemo(() => {
    const list = products.filter((p) => filter === 'all' || brandOf(p) === filter).map((p) => ({ kind: 'product', key: p.id, product: p }));
    EDITORIAL.filter((e) => e.brand === 'all' ? filter === 'all' : (filter === 'all' || filter === e.brand))
      .forEach((e) => list.splice(Math.min(e.at, list.length), 0, { kind: 'editorial', key: e.key, item: e }));
    return list;
  }, [products, filter]);

  if (loading) {
    return (
      <HiveShell>
        <div className="h-[70vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e7c65f]" /></div>
      </HiveShell>
    );
  }

  return (
    <HiveShell>
      <Hero onShop={() => setTab('shop')} onPacks={() => setTab('packs')} />

      <div ref={contentRef} className="scroll-mt-[108px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex justify-center px-3 pt-8 pb-6">
          <div className="inline-flex p-1 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all ${
                  tab === t.key ? 'hive-btn-blood' : 'text-white/55 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'shop' && (
          <div className="hive-fade-in">
            <SectionTitle kicker="Pay from your HIVE Wallet · redeem at the stand" title="Bar & Bites">
              <button
                onClick={() => (user ? navigate(`/events/${HIVE_SLUG}/wallet`) : goLogin())}
                className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm"
              >
                <Wallet className="w-4 h-4 text-[#e7c65f]" />
                {user ? <>{ksh(balance)} <span className="text-white/40">· Top up</span></> : 'Log in for your wallet'}
              </button>
            </SectionTitle>
            <BrandShelf products={products} active={filter} onPick={setFilter} />
            <div className="flex gap-2 overflow-x-auto hive-noscroll px-3 sm:px-6 lg:px-10 py-5" data-noswipe>
              {[{ key: 'all', label: 'Everything' }, ...BRANDS].map((b) => (
                <button
                  key={b.key}
                  onClick={() => setFilter(b.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-[13px] font-semibold border transition-colors ${
                    filter === b.key ? 'bg-white text-black border-white' : 'border-white/15 text-white/70 hover:border-white/40'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="px-3 sm:px-6 lg:px-10 pb-16">
              <Masonry
                items={shopItems}
                render={(it) => it.kind === 'product'
                  ? <ProductPin product={it.product} onBuy={buyProduct} busy={buyingId === it.product.id} />
                  : <EditorialPin item={it.item} />}
              />
            </div>
          </div>
        )}

        {tab === 'packs' && (
          <div className="hive-fade-in pb-16">
            <SectionTitle kicker="Entry + drinks + wallet credit, one payment" title="Ticket Packs" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 px-3 sm:px-6 lg:px-10">
              {packages.map((p) => <PackCard key={p.id} pkg={p} onPick={(x) => { setPkg(x); setPkgStep('idle'); setPkgError(''); }} />)}
            </div>
            <p className="text-center text-white/40 text-xs mt-8 px-6">
              Bought a ticket on Little Events?{' '}
              <button onClick={() => navigate(`/claim/${HIVE_SLUG}`)} className="text-[#e7c65f] underline underline-offset-4">Claim it here</button>{' '}
              to unlock your wallet and perks.
            </p>
          </div>
        )}

        {tab === 'night' && (
          <div className="hive-fade-in pb-16 space-y-14">
            <section data-noswipe>
              <SectionTitle kicker="Swipe the billboard" title="Tonight on the Dome" />
              <MediaCarousel slides={BILLBOARD_SLIDES} mode="reel" />
            </section>

            <section>
              <SectionTitle kicker="On the decks · On stage" title="The Lineup" />
              <div data-noswipe className="hive-snap-x hive-noscroll flex gap-3 sm:gap-4 overflow-x-auto px-3 sm:px-6 lg:px-10 scroll-px-3 sm:scroll-px-6 lg:scroll-px-10">
                {LINEUP.map((a) => <LineupCard key={a.name} act={a} />)}
              </div>
            </section>

            <section className="px-3 sm:px-6 lg:px-10">
              <div className="relative rounded-[22px] overflow-hidden">
                <img src={POSTERS.bannerWide} alt="Everyone will be there" loading="lazy" className="w-full h-auto block min-h-[160px] object-cover" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {PERKS.map((p) => (
                  <div key={p.title} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-5">
                    <Sparkles className="w-5 h-5 text-[#e7c65f]" />
                    <p className="hive-display text-white font-bold mt-3">{p.title}</p>
                    <p className="text-white/55 text-sm mt-1 leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle kicker="300 · 500 · 650 at the paint station" title="Face & Body Paint Lookbook" />
              <div className="px-3 sm:px-6 lg:px-10">
                <Masonry
                  items={[
                    'facepaint-luminous', 'facepaint-look-devil-neon', 'facepaint-look-spider', 'facepaint-basic',
                    'facepaint-look-jester-neon', 'facepaint-face-body', 'facepaint-look-webbed', 'facepaint-look-spider-eye', 'facepaint-look-bones',
                  ].map((k) => ({ key: k, src: `/hive/products/${k}.webp` }))}
                  render={(it) => (
                    <div className="hive-card"><img src={it.src} alt="Face paint look" loading="lazy" className="hive-card-img" /></div>
                  )}
                />
              </div>
            </section>

            <section>
              <SectionTitle kicker="Real nights · real people" title="Hive Photo Booth">
                <button onClick={() => navigate('/hive/booth')} className="text-sm text-[#e7c65f] shrink-0">See all →</button>
              </SectionTitle>
              <div data-noswipe className="hive-snap-x hive-noscroll flex gap-3 overflow-x-auto px-3 sm:px-6 lg:px-10 scroll-px-3 sm:scroll-px-6 lg:scroll-px-10">
                {[VIDEOS.btsReel, ...['ngh158', 'ngh242', 'ngh023', 'ngh202', 'euph025', 'ngh065', 'euph033', 'ngh251'].map((k) => `/hive/booth/${k}.webp`)].map((m, i) => (
                  <button key={i} onClick={() => navigate('/hive/booth')} className="relative shrink-0 w-[46vw] sm:w-[240px] aspect-[3/4] rounded-[20px] overflow-hidden bg-black">
                    {typeof m === 'string'
                      ? <img src={m} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      : <video src={m.src} poster={m.poster} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="px-3 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div className="hive-card"><img src={POSTERS.vendors} alt="Call for vendors" loading="lazy" className="hive-card-img" /></div>
              <div className="hive-card"><video src={VIDEOS.behind.src} poster={VIDEOS.behind.poster} muted loop autoPlay playsInline preload="metadata" className="w-full h-full object-cover block" /></div>
            </section>
          </div>
        )}
      </div>

      {tab === 'shop' && user && (
        <button
          onClick={() => navigate(`/events/${HIVE_SLUG}/wallet`)}
          className="sm:hidden fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 rounded-full bg-[#07050a]/90 border border-[#e7c65f]/40 backdrop-blur-xl px-4 py-2.5 text-sm shadow-2xl"
        >
          <Wallet className="w-4 h-4 text-[#e7c65f]" /> {ksh(balance)} <span className="text-white/40">· Top up</span>
        </button>
      )}

      {toast && (<Portal>
        <div className="fixed inset-x-3 bottom-[140px] sm:bottom-8 sm:left-auto sm:right-8 sm:w-[380px] z-[120] rounded-2xl bg-[#1a0b0d] border border-[#c3121f]/50 p-4 shadow-2xl hive-fade-in">
          <div className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-[#ff2e3b] shrink-0 mt-0.5" />
            <p className="text-sm text-white/85 flex-1">{toast}</p>
            <button onClick={() => setToast('')} aria-label="Dismiss"><X className="w-4 h-4 text-white/50" /></button>
          </div>
          <button onClick={() => navigate(`/events/${HIVE_SLUG}/wallet`)} className="mt-3 w-full hive-btn-gold rounded-full py-2.5 text-sm font-bold">
            Top up wallet
          </button>
        </div>
        </Portal>)}

      {entitlement && (<Portal>
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[26px] border border-white/10 bg-[#0e0809] p-6 text-center hive-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="hive-display text-white text-xl font-bold mt-3">{entitlement.product_name}</p>
            <p className="text-white/55 text-sm mt-1">Paid from your wallet. Show this at the stand.</p>
            <div className="bg-white p-4 rounded-2xl inline-block mt-5">
              <QRCode value={entitlement.qr_token} size={190} fgColor="#000000" bgColor="#ffffff" />
            </div>
            <button onClick={() => setEntitlement(null)} className="mt-6 w-full hive-btn-gold rounded-full py-3 font-bold">Done</button>
          </div>
        </div>
        </Portal>)}

      {pkg && (<Portal>
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden border border-white/10 bg-[#0e0809] hive-fade-in">
            <div className="relative h-40">
              <img src={packagePoster(pkg)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0809] to-transparent" />
              <button onClick={closePkg} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 pt-2 space-y-4">
              {pkgStep === 'idle' && (
                <>
                  <div>
                    <p className="hive-display text-white text-2xl font-bold">{pkg.name}</p>
                    <p className="hive-display hive-gold-text text-xl font-bold mt-1">{ksh(pkg.base_price)}</p>
                  </div>
                  {!user ? (
                    <button onClick={goLogin} className="w-full hive-btn-gold rounded-full py-3.5 font-bold">Log in to continue</button>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-white/45 mb-2">M-Pesa number</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" className="hive-input" />
                      </div>
                      {pkgError && <p className="text-[#ff6b74] text-sm">{pkgError}</p>}
                      <button onClick={payPackage} className="w-full hive-btn-blood rounded-full py-3.5 font-bold">Pay {ksh(pkg.base_price)}</button>
                    </>
                  )}
                </>
              )}
              {pkgStep === 'processing' && (
                <div className="text-center py-8 space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#e7c65f] mx-auto" />
                  <p className="text-white/70 text-sm">Check your phone and enter your M-Pesa PIN…</p>
                </div>
              )}
              {pkgStep === 'success' && (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                  <p className="hive-display text-white text-xl font-bold">You're in.</p>
                  <p className="text-white/55 text-sm">Your entry QR is in My Tickets; drinks and credit are in your wallet.</p>
                  <button onClick={() => navigate('/my-tickets')} className="w-full hive-btn-gold rounded-full py-3.5 font-bold">View my tickets</button>
                </div>
              )}
              {pkgStep === 'failed' && (
                <div className="text-center py-6 space-y-4">
                  <XCircle className="w-14 h-14 text-[#ff2e3b] mx-auto" />
                  <p className="text-white/70 text-sm">{pkgError || 'Payment failed.'}</p>
                  <button onClick={() => setPkgStep('idle')} className="w-full rounded-full py-3.5 font-bold border border-white/20">Try again</button>
                </div>
              )}
            </div>
          </div>
        </div>
        </Portal>)}
    </HiveShell>
  );
}
