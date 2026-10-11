// UniHive brand billboard — full-bleed real event media, a few words per
// slide, and a rotating tip line along the bottom (loading-screen style).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { VIDEOS, BOOTH, HIVE_SLUG } from './hiveMedia';
import './hive.css';

const { b } = BOOTH;

export const UNIHIVE_SLIDES = [
  { kicker: 'Now booking · Fri 30 Oct', title: 'No Going Home.', body: 'Halloween at Sarakasi Dome — tickets, drinks and bites, all on UniHive.', media: { type: 'video', ...VIDEOS.btsReel }, cta: { label: 'Enter the Hive', to: `/events/${HIVE_SLUG}` } },
  { kicker: 'The culture', title: 'Built by us. For us.', body: 'A marketplace and a movement, run by the people in it.', media: { type: 'image', src: b('euph025') } },
  { kicker: 'THE HIVE: EUPHORIA', title: "We don't do quiet.", body: 'Relive Euphoria — then come make the next one.', media: { type: 'video', ...VIDEOS.euphoriaReel }, cta: { label: 'Relive it', to: '/hive/booth' } },
  { kicker: 'Why UniHive', title: 'Pay safe. Get paid.', body: 'M-Pesa checkout. Sellers are paid once the buyer confirms delivery.', media: { type: 'image', src: b('euph033') } },
  { kicker: 'Student prices', title: 'Less spend. More living.', body: 'Deals from people who get your budget.', media: { type: 'image', src: b('ngh193') } },
  { kicker: 'Respect the Hive', title: 'Everyone belongs here.', body: 'Zero tolerance for harassment, scams or hate. Look out for each other.', media: { type: 'image', src: b('ngh202') } },
  { kicker: 'How it works', title: 'Find it. Pay it. Pick it up.', body: 'Shop, pay with M-Pesa, collect at a PickUp Mtaani point near you.', media: { type: 'image', src: b('ngh158') } },
  { kicker: 'Sell on UniHive', title: 'Your shop, live today.', body: 'Open a shop, list your products, and reach the whole Hive.', media: { type: 'image', src: b('ngh241') }, cta: { label: 'Open your shop', to: '/myshop' } },
  { kicker: 'Explore', title: 'Goods & The Buzz.', body: 'Shop the marketplace — or catch what’s happening next.', media: { type: 'video', ...VIDEOS.euphoriaWide }, cta: { label: 'See The Buzz', to: '/services' } },
];

export const UNIHIVE_TIPS = [
  'Top up your HIVE Wallet before the night — skip the bar queue.',
  'Bought on Little Events? Claim your ticket to unlock wallet and perks.',
  'Always pay through UniHive — never send money to a seller directly.',
  'Sellers get paid when you confirm delivery, so confirm only once it’s in your hands.',
  'Collect orders at PickUp Mtaani points across Nairobi.',
  'Respect the Hive: no harassment, no scams, no exceptions.',
  'Find yourself in the Hive Photo Booth after every event.',
  'Open your shop in minutes from “My shop”.',
];

const AUTO_MS = 7000;
const TIP_MS = 4500;

function Media({ media, active }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);
  if (media.type === 'video') {
    return <video ref={ref} src={media.src} poster={media.poster} muted loop playsInline preload={active ? 'auto' : 'none'} className="absolute inset-0 w-full h-full object-cover" />;
  }
  return <img src={media.src} alt="" loading={active ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover" />;
}

export default function UniHiveBillboard({ slides = UNIHIVE_SLIDES, tips = UNIHIVE_TIPS, height = 'h-[78svh] min-h-[520px] max-h-[860px]', compact = false, className = '', children }) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [tip, setTip] = useState(0);
  const pausedUntil = useRef(0);
  const touch = useRef(null);

  const go = useCallback((d) => setI((x) => (x + d + slides.length) % slides.length), [slides.length]);
  const pause = () => { pausedUntil.current = Date.now() + 15000; };

  useEffect(() => {
    const t = setInterval(() => { if (Date.now() > pausedUntil.current && !document.hidden) go(1); }, AUTO_MS);
    return () => clearInterval(t);
  }, [go]);
  useEffect(() => {
    const t = setInterval(() => setTip((x) => (x + 1) % tips.length), TIP_MS);
    return () => clearInterval(t);
  }, [tips.length]);

  const s = slides[i];

  return (
    <section
      className={`relative w-full overflow-hidden bg-black text-white ${height} ${className}`}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, t: Date.now() }; }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const quick = Date.now() - touch.current.t < 300;
        touch.current = null;
        if (Math.abs(dx) > 50) { pause(); go(dx < 0 ? 1 : -1); return; }
        if (quick && !e.target.closest('button, a')) {
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.changedTouches[0].clientX - r.left;
          if (x < r.width * 0.25) { pause(); go(-1); } else if (x > r.width * 0.75) { pause(); go(1); }
        }
      }}
    >
      {slides.map((sl, k) => (
        <div key={k} className={`absolute inset-0 transition-opacity duration-1000 ${k === i ? 'opacity-100' : 'opacity-0'}`} aria-hidden={k !== i}>
          {Math.abs(k - i) <= 1 || (i === 0 && k === slides.length - 1) || (i === slides.length - 1 && k === 0) ? <Media media={sl.media} active={k === i} /> : null}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />

      <div className={`relative h-full flex flex-col justify-end ${compact ? 'px-5 sm:px-8 pb-20' : 'px-5 sm:px-10 lg:px-16 pb-24 sm:pb-28'}`}>
        <div key={i} className="max-w-3xl hive-fade-in">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-[#e7c65f] font-semibold">{s.kicker}</p>
          <h2 className={`font-serif font-bold leading-[0.95] mt-3 tracking-tight ${compact ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-[13vw] sm:text-7xl lg:text-8xl'}`}>{s.title}</h2>
          <p className={`text-white/75 mt-3 max-w-xl leading-relaxed ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-xl'}`}>{s.body}</p>
          {s.cta && (
            <button onClick={() => navigate(s.cta.to)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-3 text-sm font-bold hover:bg-[#e7c65f] transition-colors">
              {s.cta.label} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>

      <button onClick={() => { pause(); go(-1); }} aria-label="Previous" className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 border border-white/15 backdrop-blur items-center justify-center hover:bg-black/60">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => { pause(); go(1); }} aria-label="Next" className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 border border-white/15 backdrop-blur items-center justify-center hover:bg-black/60">
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/55 backdrop-blur-md">
        <div className="flex items-center gap-4 px-5 sm:px-10 lg:px-16 h-14">
          <span className="shrink-0 text-[10px] font-extrabold tracking-[0.3em] text-black bg-[#e7c65f] rounded px-1.5 py-0.5">TIP</span>
          <p key={tip} className="flex-1 min-w-0 truncate text-xs sm:text-sm text-white/80 hive-fade-in">{tips[tip]}</p>
        </div>
      </div>
    </section>
  );
}
