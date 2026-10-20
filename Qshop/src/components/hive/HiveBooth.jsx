// Hive Photo Booth — media wall of real event photography and reels,
// with links to the full-quality Drive folders so people can find theirs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink, Camera } from 'lucide-react';
import HiveShell from './HiveShell';
import Masonry from './Masonry';
import Portal from './Portal';
import DriveLink from './DriveLink';
import { BOOTH_PHOTOS } from './boothMedia';
import { VIDEOS, DRIVE_FOLDERS } from './hiveMedia';

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'pre-party', label: 'Pre-Party' },
  { key: 'no-going-home', label: 'No Going Home · BTS' },
  { key: 'euphoria', label: 'Euphoria' },
];

const REELS = [
  { key: 'reel-crew', kind: 'video', event: 'pre-party', ...VIDEOS.crewCheer2, w: 960, h: 540 },
  { key: 'reel-lake', kind: 'video', event: 'pre-party', ...VIDEOS.lakeSelfie, w: 540, h: 960 },
  { key: 'reel-pp-0', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-01.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-01.webp', w: 402, h: 720 },
  { key: 'reel-pp-1', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-02.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-02.webp', w: 402, h: 720 },
  { key: 'reel-pp-2', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-03.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-03.webp', w: 406, h: 720 },
  { key: 'reel-pp-3', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-04.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-04.webp', w: 402, h: 720 },
  { key: 'reel-pp-4', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-05.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-05.webp', w: 402, h: 720 },
  { key: 'reel-pp-5', kind: 'video', event: 'pre-party', src: '/experiences/the-hive-pre-party/recap/clip-06.mp4', poster: '/experiences/the-hive-pre-party/recap/clip-06.webp', w: 402, h: 720 },
  { key: 'reel-pp-6', kind: 'video', event: 'pre-party', src: '/hive/video/neon-night.mp4', poster: '/hive/video/neon-night.webp', w: 576, h: 1024 },
  { key: 'reel-pp-7', kind: 'video', event: 'pre-party', src: '/hive/video/supee-smirnoff.mp4', poster: '/hive/video/supee-smirnoff.webp', w: 720, h: 1280 },
  { key: 'reel-pp-8', kind: 'video', event: 'pre-party', src: '/hive/video/siwaka-unihive.mp4', poster: '/hive/video/siwaka-unihive.webp', w: 720, h: 1280 },
  { key: 'reel-pp-9', kind: 'video', event: 'pre-party', src: '/hive/video/crew-cheer-1.mp4', poster: '/hive/video/crew-cheer-1.webp', w: 960, h: 540 },
  { key: 'reel-pp-10', kind: 'video', event: 'pre-party', src: '/hive/facepaint/uv-mirror.mp4', poster: '/hive/facepaint/uv-mirror.webp', w: 576, h: 1024 },
  { key: 'reel-pp-11', kind: 'video', event: 'pre-party', src: '/hive/facepaint/clown-reveal.mp4', poster: '/hive/facepaint/clown-body.webp', w: 576, h: 1024 },
  { key: 'reel-bts', kind: 'video', event: 'no-going-home', ...VIDEOS.btsReel, w: 720, h: 1280 },
  { key: 'reel-euph', kind: 'video', event: 'euphoria', ...VIDEOS.euphoriaReel, w: 720, h: 1280 },
  { key: 'reel-euph-wide', kind: 'video', event: 'euphoria', ...VIDEOS.euphoriaWide, w: 1280, h: 720 },
];

// Clips only download and play while near the screen, so a long booth
// doesn't pull every video at once.
function LazyVideo({ src, poster }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!el.src) el.src = src; el.play().catch(() => {}); } else el.pause();
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} poster={poster} muted loop playsInline preload="none" className="absolute inset-0 w-full h-full object-cover" />;
}

function Tile({ item, onOpen }) {
  const ratio = `${item.w} / ${item.h}`;
  return (
    <button onClick={onOpen} className="hive-card block w-full text-left" style={{ aspectRatio: ratio }}>
      {item.kind === 'video' ? (
        <LazyVideo src={item.src} poster={item.poster} />
      ) : (
        <img src={item.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]" />
      )}
    </button>
  );
}

function Lightbox({ items, index, onClose, onNav }) {
  const item = items[index];
  const touch = useRef(null);
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose, onNav]);
  if (!item) return null;
  const folder = DRIVE_FOLDERS[item.event];
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 50) onNav(dx < 0 ? 1 : -1); }}
    >
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <span />
        <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5" /></button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {item.kind === 'video' ? (
          <video key={item.src} src={item.src} poster={item.poster} controls autoPlay playsInline className="max-w-full max-h-full rounded-xl" />
        ) : (
          <img key={item.src} src={item.src} alt="" className="max-w-full max-h-full object-contain rounded-xl hive-fade-in" />
        )}
        <button onClick={() => onNav(-1)} aria-label="Previous" className="hidden md:flex absolute left-4 w-11 h-11 rounded-full bg-white/10 items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => onNav(1)} aria-label="Next" className="hidden md:flex absolute right-4 w-11 h-11 rounded-full bg-white/10 items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
      </div>
      {folder && (
        <div className="shrink-0 px-4 py-4 flex justify-center">
          <DriveLink url={folder.url} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm text-white/80 hover:bg-white/10">
            Full-quality originals: {folder.label}
          </DriveLink>
        </div>
      )}
    </div>
  );
}

export default function HiveBooth() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.some((f) => f.key === params.get('event')) ? params.get('event') : 'all';
  const [open, setOpen] = useState(null);

  const items = useMemo(() => {
    // Filter first, then weave clips evenly through the photos.
    const keep = (x) => filter === 'all' || x.event === filter;
    const photos = BOOTH_PHOTOS.filter(keep).map((p) => ({ ...p, key: p.src, kind: 'image' }));
    const reels = REELS.filter(keep);
    const gap = reels.length ? Math.max(2, Math.floor(photos.length / reels.length)) : 0;
    const list = [...photos];
    reels.forEach((r, i) => list.splice(Math.min(1 + i * (gap + 1), list.length), 0, r));
    return list;
  }, [filter]);

  const nav = (d) => setOpen((i) => (i + d + items.length) % items.length);

  return (
    <HiveShell>
      <section className="px-4 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-6">
        <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> THE HIVE PHOTO BOOTH</p>
        <h1 className="hive-display hive-gold-text text-4xl sm:text-6xl font-extrabold mt-2 leading-tight">Real nights. Real people.</h1>
        <p className="text-white/60 mt-3 max-w-2xl">Every frame here is from a Hive night. Find yourself, save it, and tag <a href="https://www.instagram.com/unihive.entertainment/" target="_blank" rel="noreferrer" className="text-white underline-offset-4 hover:underline">@unihive.entertainment</a>.</p>
        <div className="flex flex-wrap gap-2 mt-6">
          {Object.entries(DRIVE_FOLDERS).map(([k, f]) => (
            <DriveLink key={k} url={f.url} className="inline-flex items-center gap-2 rounded-full hive-btn-gold px-4 py-2 text-xs sm:text-sm font-bold" lockedLabel={`Sign in to find yours — ${k === 'euphoria' ? 'Euphoria' : 'No Going Home BTS'}`}>
              Find yours — {k === 'euphoria' ? 'Euphoria' : 'No Going Home BTS'}
            </DriveLink>
          ))}
        </div>
      </section>

      <div className="px-4 sm:px-8 lg:px-12 pb-6">
        <Link to="/hive/siwaka" className="group flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] hover:border-[#e7c65f]/50 p-3 pr-5 max-w-xl">
          <img src="/media/siwaka/ep97-voxpop.webp" alt="" className="w-16 h-16 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#e7c65f]">Official media outlet</p>
            <p className="hive-display text-white font-bold leading-tight">The Siwaka Podcast</p>
            <p className="text-white/55 text-xs">Episode 97 — on the streets with UniHive</p>
          </div>
          <img src="/partners/siwaka-podcast.png" alt="" className="w-10 h-10 rounded-full" />
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto hive-noscroll px-4 sm:px-8 lg:px-12 pb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setParams(f.key === 'all' ? {} : { event: f.key })}
            className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-[13px] font-semibold border transition-colors ${filter === f.key ? 'bg-white text-black border-white' : 'border-white/15 text-white/70 hover:border-white/40'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-3 sm:px-6 lg:px-10 pb-20">
        <Masonry items={items} render={(it) => <Tile item={it} onOpen={() => setOpen(items.indexOf(it))} />} />
      </div>

      {open !== null && <Portal><Lightbox items={items} index={open} onClose={() => setOpen(null)} onNav={nav} /></Portal>}
    </HiveShell>
  );
}
