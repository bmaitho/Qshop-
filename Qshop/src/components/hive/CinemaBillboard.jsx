// Cinematic single-stage billboard: each scene is a composition (split
// screen, full-bleed video, or poster on a blurred backdrop) and scenes
// crossfade slowly. Swipe or tap the edges to move; no counters — it
// should feel endless.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { POSTERS, VIDEOS, BOOTH, FACEPAINT } from './hiveMedia';
import './hive.css';

const { b } = BOOTH;
const img = (src) => ({ type: 'image', src });
const vid = (v) => ({ type: 'video', ...v });
const m = (n) => `/hive/media/${n}.webp`;

export const HIVE_SCENES = [
  { layout: 'poster', media: [vid(VIDEOS.neonNight)], caption: 'Who are you when the lights go red?' },
  { layout: 'split', media: [vid(VIDEOS.btsReel), img(b('ngh158'))], caption: 'Rehearsed. Ready. Fri 30 Oct.' },
  { layout: 'full', media: [vid(VIDEOS.recap)], caption: 'Last time the Hive opened its doors' },
  { layout: 'poster', media: [img(POSTERS.master)], caption: 'THE HIVE · No Going Home · Sarakasi Dome' },
  { layout: 'split', media: [img(b('euph025')), vid(VIDEOS.euphoriaReel)], caption: 'Euphoria went loud' },
  { layout: 'poster', media: [img(m('vip-experience'))], caption: 'VIP — a Red Bull or Smirnoff on arrival' },
  { layout: 'split', media: [vid(VIDEOS.supeeSmirnoff), vid(VIDEOS.siwakaUnihive)], caption: 'Supee × Smirnoff · Siwaka Podcast × UniHive' },
  { layout: 'split', media: [vid(FACEPAINT.uv), vid(FACEPAINT.clown)], caption: 'Face & body paint by Radiant By Tatty — real UniHive faces' },
  { layout: 'split', media: [img(m('dj-fringe')), vid(VIDEOS.fringe)], caption: 'On the decks: DJ Fringe' },
  { layout: 'full', media: [vid(VIDEOS.euphoriaWide)], caption: 'From the floor' },
  { layout: 'split', media: [img(b('smirnoff-story')), img(b('ngh202'))], caption: 'The story that landed us Smirnoff' },
  { layout: 'poster', media: [img(POSTERS.wave1)], caption: 'Tickets exclusively on Little Events' },
  { layout: 'split', media: [vid(VIDEOS.akuku), img(m('dj-akuku'))], caption: 'On the decks: DJ Bahati Akuku' },
  { layout: 'poster', media: [img(POSTERS.afterDark)], caption: 'Where the darkness dances' },
  { layout: 'split', media: [img(POSTERS.guessWho), vid(VIDEOS.ready)], caption: 'Guess who’s performing?' },
  { layout: 'split', media: [img(m('supee')), img(m('denzz'))], caption: 'On stage: Supee · Denzz' },
  { layout: 'split', media: [img(b('ngh023')), img(POSTERS.bloodMoon)], caption: 'One night. Endless memories.' },
];

// Each scene stays at least DURATION; scenes with video stay until every
// clip in them has played through once (capped so a stuck video can't freeze it).
const DURATION = 8000;
const MAX_DWELL = 70000;

function Media({ item, active, muted, fit = 'cover', drift = true, onDone }) {
  const ref = useRef(null);
  const reported = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    reported.current = false;
    if (active) { el.currentTime = 0; el.play().catch(() => onDone?.()); } else el.pause();
  }, [active]);
  // Looping videos never fire "ended", so watch for the last frame instead.
  const onTime = (e) => {
    const el = e.currentTarget;
    if (active && !reported.current && el.duration && el.currentTime >= el.duration - 0.3) {
      reported.current = true;
      onDone?.();
    }
  };
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);
  if (item.type === 'video') {
    return <video ref={ref} src={item.src} poster={item.poster} muted={muted} loop playsInline preload={active ? 'auto' : 'metadata'} onTimeUpdate={onTime} onError={() => onDone?.()} className="absolute inset-0 w-full h-full" style={{ objectFit: fit }} />;
  }
  return (
    <img
      src={item.src}
      alt=""
      decoding="async"
      className={`absolute inset-0 w-full h-full ${drift && active ? 'hive-drift' : ''}`}
      style={{ objectFit: fit }}
    />
  );
}

function Scene({ scene, active, muted, onDone }) {
  const [a, c] = scene.media;
  // Report done once every video in the scene has played through.
  const videos = scene.media.filter((x) => x.type === 'video').length;
  const finished = useRef(new Set());
  useEffect(() => { finished.current = new Set(); }, [active]);
  const done = (k) => () => {
    finished.current.add(k);
    if (finished.current.size >= videos) onDone?.();
  };
  if (scene.layout === 'split') {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-1 sm:gap-1.5 bg-black">
        <div className="relative overflow-hidden"><Media item={a} active={active} muted={muted} onDone={done(0)} /></div>
        <div className="relative overflow-hidden"><Media item={c} active={active} muted={muted} onDone={done(1)} /></div>
      </div>
    );
  }
  if (scene.layout === 'poster') {
    const bg = a.type === 'video' ? a.poster : a.src;
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <img src={bg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
          <div className="relative h-full aspect-[4/5] max-w-full rounded-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
            <Media item={a} active={active} muted={muted} drift={false} onDone={done(0)} />
          </div>
        </div>
      </div>
    );
  }
  return <div className="absolute inset-0 overflow-hidden bg-black"><Media item={a} active={active} muted={muted} onDone={done(0)} /></div>;
}

export default function CinemaBillboard({ scenes = HIVE_SCENES, className = '', height = 'h-[62svh] min-h-[420px] max-h-[720px]', linkTo }) {
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(true);
  const pausedUntil = useRef(0);
  const touch = useRef(null);
  const n = scenes.length;
  const go = useCallback((d) => setI((x) => (x + d + n) % n), [n]);
  const nudge = (d) => { pausedUntil.current = Date.now() + 14000; go(d); };

  // Advance when the scene has had its minimum time AND its videos have
  // finished; re-check every second so pauses (swipes, hidden tab) hold it.
  const [videoDone, setVideoDone] = useState(false);
  const shownAt = useRef(Date.now());
  useEffect(() => { shownAt.current = Date.now(); setVideoDone(false); }, [i]);
  useEffect(() => {
    const needsVideo = scenes[i].media.some((x) => x.type === 'video');
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current || document.hidden) return;
      const age = Date.now() - shownAt.current;
      if (age >= MAX_DWELL || (age >= DURATION && (!needsVideo || videoDone))) go(1);
    }, 1000);
    return () => clearInterval(t);
  }, [go, i, videoDone, scenes]);

  const near = (k) => k === i || k === (i + 1) % n || k === (i - 1 + n) % n;
  const hasVideo = scenes[i].media.some((x) => x.type === 'video');

  return (
    <section
      className={`relative w-full overflow-hidden bg-black select-none group ${height} ${className}`}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, t: Date.now() }; }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const quick = Date.now() - touch.current.t < 300;
        touch.current = null;
        if (Math.abs(dx) > 45) return nudge(dx < 0 ? 1 : -1);
        if (quick) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.changedTouches[0].clientX - rect.left;
          if (x < rect.width * 0.3) nudge(-1);
          else if (x > rect.width * 0.7) nudge(1);
        }
      }}
    >
      {scenes.map((s, k) => (
        <div key={k} className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${k === i ? 'opacity-100 z-[1]' : 'opacity-0 z-0'}`} aria-hidden={k !== i}>
          {near(k) && <Scene scene={s} active={k === i} muted={muted} onDone={k === i ? () => setVideoDone(true) : undefined} />}
        </div>
      ))}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-black/75 via-transparent to-black/10" />
      {linkTo && <a href={linkTo} className="absolute inset-0 z-[2]" aria-label="Open THE HIVE" />}
      <p key={i} className="absolute z-[3] left-5 sm:left-8 bottom-5 sm:bottom-7 right-20 text-white/90 text-sm sm:text-base font-medium tracking-wide hive-fade-in pointer-events-none">
        {scenes[i].caption}
      </p>
      {hasVideo && (
        <button onClick={() => setMuted((x) => !x)} aria-label={muted ? 'Unmute' : 'Mute'} className="absolute z-[3] right-4 sm:right-6 bottom-4 sm:bottom-6 w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/15 text-white/80 flex items-center justify-center">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
      <button onClick={() => nudge(-1)} aria-label="Previous" className="hidden md:flex absolute z-[3] left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 backdrop-blur border border-white/10 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => nudge(1)} aria-label="Next" className="hidden md:flex absolute z-[3] right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 backdrop-blur border border-white/10 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5" />
      </button>
    </section>
  );
}
