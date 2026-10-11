import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play } from 'lucide-react';
import './hive.css';

const ratioOf = (s) => s.ratio || (s.type === 'video' ? 9 / 16 : 4 / 5);

function VideoMedia({ slide, muted, className, fit = 'cover' }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);
  return (
    <>
      <video
        ref={ref}
        src={slide.src}
        poster={slide.poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className={className}
        style={{ objectFit: fit }}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </>
  );
}

function Slide({ slide, muted, mode, height }) {
  const media =
    slide.type === 'video' ? (
      <VideoMedia slide={slide} muted={muted} className="absolute inset-0 w-full h-full" fit={mode === 'banner' ? 'contain' : 'cover'} />
    ) : (
      <img
        src={slide.src}
        alt={slide.caption || ''}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: mode === 'banner' ? 'contain' : 'cover' }}
      />
    );

  const backdrop = slide.type === 'video' ? slide.poster : slide.src;
  const style = mode === 'reel' ? { height, width: `calc(${height} * ${ratioOf(slide)})`, maxWidth: '88vw' } : undefined;
  const Tag = slide.href ? 'a' : 'div';

  return (
    <Tag
      href={slide.href}
      className={`relative shrink-0 overflow-hidden bg-black ${mode === 'reel' ? 'rounded-[22px]' : 'w-full h-full'}`}
      style={style}
    >
      {mode === 'banner' && (
        <img src={backdrop} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
      )}
      {media}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      {slide.caption && (
        <p className="absolute bottom-3 left-4 right-4 text-white text-xs sm:text-sm font-semibold leading-snug drop-shadow pointer-events-none">
          {slide.caption}
        </p>
      )}
    </Tag>
  );
}

export default function MediaCarousel({
  slides,
  mode = 'reel',
  height = 'clamp(360px, 62vh, 620px)',
  aspect = 'aspect-[16/9] md:aspect-[32/9]',
  autoplayMs = 5000,
  className = '',
}) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const pausedUntil = useRef(0);
  const hasVideo = slides.some((s) => s.type === 'video');

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const kids = Array.from(el.children);
    let best = 0;
    let bestD = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - kids[0].offsetLeft - el.scrollLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    setIndex(best);
  }, []);

  const go = useCallback((dir) => {
    const el = track.current;
    if (!el) return;
    const kids = Array.from(el.children);
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (dir > 0 && atEnd) { el.scrollTo({ left: 0, behavior: 'smooth' }); return; }
    const target = kids[Math.max(0, Math.min(kids.length - 1, index + dir))];
    if (target) el.scrollTo({ left: target.offsetLeft - kids[0].offsetLeft, behavior: 'smooth' });
  }, [index]);

  const pause = () => { pausedUntil.current = Date.now() + 12000; };

  useEffect(() => {
    if (!autoplayMs || slides.length < 2) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current || document.hidden) return;
      go(1);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [go, autoplayMs, slides.length]);

  return (
    <div className={`relative group ${className}`} onPointerDown={pause} onWheel={pause}>
      <div
        ref={track}
        onScroll={onScroll}
        className={`hive-snap-x hive-noscroll flex overflow-x-auto ${mode === 'reel' ? 'gap-3 sm:gap-4 px-3 sm:px-6 lg:px-10 scroll-px-3 sm:scroll-px-6 lg:scroll-px-10' : `w-full ${aspect} rounded-[22px]`}`}
      >
        {slides.map((s, i) => (
          <Slide key={i} slide={s} muted={muted} mode={mode} height={height} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => { pause(); go(-1); }}
        className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/55 backdrop-blur border border-white/10 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => { pause(); go(1); }}
        className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/55 backdrop-blur border border-white/10 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-10 mt-3">
        <div className="flex-1 h-[3px] rounded-full bg-neutral-500/25 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c3121f] to-[#ff7a1a] transition-all duration-500"
            style={{ width: `${((index + 1) / slides.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-neutral-500 font-semibold">{index + 1}/{slides.length}</span>
        {hasVideo && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-8 h-8 rounded-full border border-neutral-500/30 flex items-center justify-center text-neutral-500 hover:text-neutral-300"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
