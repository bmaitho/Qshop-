// UniHive brand billboard — full-bleed real event media, a few words per
// slide, and a rotating tip line along the bottom (loading-screen style).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { VIDEOS, BOOTH, HIVE_SLUG } from './hiveMedia';
import './hive.css';

const { b } = BOOTH;

// Home billboard. At most three slides carry event media; the rest put
// storefronts, products and partners first. Mosaic slides are filled with
// live shop banners / product photos passed in by the page.
const PARTNER_SHOTS = ['/hive/products/smirnoff-vodka-webs.webp', '/hive/products/redbull-webs.webp', '/hive/products/shawarma.png', '/hive/products/smirnoff-ice-black.png', '/hive/products/hive-cup-fang.webp', '/hive/products/smirnoff-ice-pineapple.png'];

export const buildHomeSlides = ({ banners = [], products = [] } = {}) => {
  const shopMosaic = banners.length >= 3 ? banners : products;
  const productMosaic = products.length >= 3 ? products : banners;
  return [
    { kicker: 'UniHive presents · Fri 30 Oct · 6PM–4AM', title: 'No Going Home.', body: 'THE HIVE at Sarakasi Dome — drinks, bites and partner experiences on UniHive. Tickets on Little.', media: { type: 'video', ...VIDEOS.btsReel }, cta: { label: 'Enter the Hive', to: `/events/${HIVE_SLUG}` } },
    { kicker: 'Storefronts', title: 'Shops worth following.', body: 'Real businesses, built by people in the Hive. Discover them, back them, buy from them.', media: shopMosaic.length >= 3 ? { type: 'mosaic', srcs: shopMosaic } : { type: 'image', src: PARTNER_SHOTS[3] }, cta: { label: 'Start shopping', to: '/studentmarketplace' } },
    { kicker: 'No scams. No stress.', title: 'Shop with confidence.', body: 'Pay with M-Pesa on UniHive. Sellers are paid once you confirm delivery.', media: productMosaic.length >= 3 ? { type: 'mosaic', srcs: productMosaic.slice().reverse() } : { type: 'image', src: PARTNER_SHOTS[5] } },
    { kicker: 'Experiences worth having', title: 'Nights people talk about.', body: 'We’re intentional about every experience — worth showing up for, worth remembering.', media: { type: 'image', src: b('euph033') }, cta: { label: 'See The Buzz', to: '/services' } },
    { kicker: 'We grow together', title: 'When one wins, the Hive wins.', body: 'Open a shop and grow with entrepreneurs, creatives and brands growing with you.', media: productMosaic.length >= 3 ? { type: 'mosaic', srcs: productMosaic.slice(3).concat(productMosaic.slice(0, 3)) } : { type: 'image', src: PARTNER_SHOTS[4] }, cta: { label: 'Open your shop', to: '/myshop' } },
    { kicker: 'Official partners', title: 'People to possibilities.', body: 'Smirnoff, Red Bull, Little and Harrison’s Pearl Gerar — brands building with the Hive.', media: { type: 'mosaic', srcs: PARTNER_SHOTS } },
    { kicker: 'The culture', title: 'Built by us. For us.', body: 'Not just a platform — a community you’re proud to be part of, online and in person.', media: { type: 'image', src: b('ngh193') } },
  ];
};

export const UNIHIVE_SLIDES = buildHomeSlides();

export const UNIHIVE_TIPS = [
  'No scams, no stress — always pay through UniHive, never directly to a seller.',
  'Sellers get paid when you confirm delivery, so confirm once it’s in your hands.',
  'Collect orders at PickUp Mtaani points across Nairobi.',
  'Follow the shops you love — new drops land in your feed first.',
  'Open your shop in minutes from “My shop”. We grow better together.',
  'Respect the Hive: no harassment, no scams, no exceptions.',
  'THE HIVE: No Going Home — Fri 30 Oct, 6PM–4AM, Sarakasi Dome.',
  'Ride with Little: code UNIHIVE26 for KSh 200 off rides to and from the Hive.',
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
  if (media.type === 'mosaic') {
    const srcs = media.srcs.slice(0, 6);
    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 bg-black">
        {srcs.map((src, k) => (
          <div key={k} className={`relative overflow-hidden ${srcs.length < 6 && k === 0 ? 'row-span-2' : ''}`}>
            <img src={src} alt="" loading={active ? 'eager' : 'lazy'} decoding="async" className={`absolute inset-0 w-full h-full object-cover ${active ? 'hive-drift' : ''}`} />
          </div>
        ))}
      </div>
    );
  }
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
