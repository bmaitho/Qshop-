// Hive Photo Booth — media wall of real event photography and reels,
// with links to the full-quality Drive folders so people can find theirs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink, Camera } from 'lucide-react';
import HiveShell from './HiveShell';
import Masonry from './Masonry';
import Portal from './Portal';
import { BOOTH_PHOTOS } from './boothMedia';
import { VIDEOS, DRIVE_FOLDERS } from './hiveMedia';

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'no-going-home', label: 'No Going Home · BTS' },
  { key: 'euphoria', label: 'Euphoria' },
];

const REELS = [
  { key: 'reel-bts', kind: 'video', event: 'no-going-home', ...VIDEOS.btsReel, w: 720, h: 1280 },
  { key: 'reel-euph', kind: 'video', event: 'euphoria', ...VIDEOS.euphoriaReel, w: 720, h: 1280 },
  { key: 'reel-euph-wide', kind: 'video', event: 'euphoria', ...VIDEOS.euphoriaWide, w: 1280, h: 720 },
];

function Tile({ item, onOpen }) {
  const ratio = `${item.w} / ${item.h}`;
  return (
    <button onClick={onOpen} className="hive-card block w-full text-left" style={{ aspectRatio: ratio }}>
      {item.kind === 'video' ? (
        <video src={item.src} poster={item.poster} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
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
        <span className="text-xs text-white/50 tabular-nums">{index + 1} / {items.length}</span>
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
          <a href={folder.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm text-white/80 hover:bg-white/10">
            Full-quality originals: {folder.label} <ExternalLink className="w-3.5 h-3.5" />
          </a>
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
    const photos = BOOTH_PHOTOS.map((p) => ({ ...p, key: p.src, kind: 'image' }));
    const list = [...photos];
    REELS.forEach((r, i) => list.splice(Math.min(2 + i * 9, list.length), 0, r));
    return list.filter((x) => filter === 'all' || x.event === filter);
  }, [filter]);

  const nav = (d) => setOpen((i) => (i + d + items.length) % items.length);

  return (
    <HiveShell>
      <section className="px-4 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-6">
        <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> THE HIVE PHOTO BOOTH</p>
        <h1 className="hive-display hive-gold-text text-4xl sm:text-6xl font-extrabold mt-2 leading-tight">Real nights. Real people.</h1>
        <p className="text-white/60 mt-3 max-w-2xl">Every frame here is from a Hive night. Find yourself, save it, and tag <span className="text-white">@unihive.ke</span>.</p>
        <div className="flex flex-wrap gap-2 mt-6">
          {Object.entries(DRIVE_FOLDERS).map(([k, f]) => (
            <a key={k} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full hive-btn-gold px-4 py-2 text-xs sm:text-sm font-bold">
              Find yours — {k === 'euphoria' ? 'Euphoria' : 'No Going Home BTS'} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </section>

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
