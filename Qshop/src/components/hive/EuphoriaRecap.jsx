// THE HIVE: EUPHORIA — past-event recap built from the event's own footage.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import HiveShell from './HiveShell';
import Masonry from './Masonry';
import Portal from './Portal';
import { BOOTH_PHOTOS } from './boothMedia';
import { VIDEOS, DRIVE_FOLDERS, HIVE_SLUG, POSTERS } from './hiveMedia';

export default function EuphoriaRecap() {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(null);
  const photos = useMemo(
    () => [
      { key: 'reel', kind: 'video', ...VIDEOS.euphoriaReel, w: 720, h: 1280 },
      ...BOOTH_PHOTOS.filter((p) => p.event === 'euphoria').map((p) => ({ ...p, key: p.src, kind: 'image' })),
    ],
    []
  );

  return (
    <HiveShell>
      <section className="relative h-[72svh] min-h-[480px] max-h-[820px] overflow-hidden">
        <video src={VIDEOS.euphoriaWide.src} poster={VIDEOS.euphoriaWide.poster} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07050a] via-[#07050a]/40 to-[#2a0b4a]/30" />
        <div className="relative h-full flex flex-col justify-end px-5 sm:px-10 lg:px-16 pb-12">
          <p className="text-[11px] tracking-[0.45em] text-white/60 font-semibold">IT HAPPENED · 29 MAY · SARAKASI DOME</p>
          <h1 className="hive-display font-extrabold text-[12vw] sm:text-7xl lg:text-8xl leading-[0.95] mt-2 bg-gradient-to-b from-white to-[#c9a7ff] bg-clip-text text-transparent">EUPHORIA</h1>
          <p className="hive-accent text-2xl sm:text-3xl text-white/80">The night the Hive went loud.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={() => navigate(`/events/${HIVE_SLUG}`)} className="hive-btn-blood rounded-full px-6 py-3.5 text-sm font-bold flex items-center gap-2">
              Next up: No Going Home <ArrowRight className="w-4 h-4" />
            </button>
            <a href={DRIVE_FOLDERS.euphoria.url} target="_blank" rel="noreferrer" className="rounded-full px-6 py-3.5 text-sm font-bold border border-white/25 bg-white/5 backdrop-blur flex items-center gap-2">
              Find your photos <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="px-3 sm:px-6 lg:px-10 py-12">
        <div className="flex items-end justify-between mb-5 px-1">
          <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">From the floor</h2>
          <button onClick={() => navigate('/hive/booth?event=euphoria')} className="text-sm text-[#e7c65f]">Open the photo booth →</button>
        </div>
        <Masonry
          items={photos}
          render={(it) => (
            <button onClick={() => setLightbox(it)} className="hive-card block w-full" style={{ aspectRatio: `${it.w} / ${it.h}` }}>
              {it.kind === 'video'
                ? <video src={it.src} poster={it.poster} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                : <img src={it.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
            </button>
          )}
        />
      </section>

      <section className="px-3 sm:px-6 lg:px-10 pb-20">
        <button onClick={() => navigate(`/events/${HIVE_SLUG}`)} className="relative block w-full rounded-[26px] overflow-hidden text-left">
          <img src={POSTERS.bannerWide} alt="THE HIVE: NO GOING HOME" className="w-full h-auto min-h-[180px] object-cover" />
        </button>
      </section>

      {lightbox && (<Portal>
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-3" onClick={() => setLightbox(null)}>
          {lightbox.kind === 'video'
            ? <video src={lightbox.src} controls autoPlay playsInline className="max-w-full max-h-full rounded-xl" />
            : <img src={lightbox.src} alt="" className="max-w-full max-h-full object-contain rounded-xl" />}
        </div>
        </Portal>)}
    </HiveShell>
  );
}
