// The Siwaka Podcast — UniHive's official media outlet. A media wall in
// THE HIVE world: hero loop, the latest episode with sound, moments.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Play, ExternalLink } from 'lucide-react';
import HiveShell from '../hive/HiveShell';
import HiveShare from '../hive/HiveShare';
import Masonry from '../hive/Masonry';
import { SIWAKA as S } from './mediaPartners';
import '../hive/hive.css';

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.69 5.69 0 1 0 4.91 5.63V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z" />
  </svg>
);

export default function SiwakaPage() {
  useEffect(() => { document.title = `${S.name} — UniHive’s official media outlet`; }, []);
  const ep = S.episodes[0];
  return (
    <HiveShell>
      {/* Hero */}
      <section className="relative overflow-hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:min-h-[78vh]">
        <div className="relative aspect-[4/5] lg:aspect-auto bg-black">
          <video src={S.hero.video} poster={S.hero.poster} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#07050a] to-transparent lg:inset-y-0 lg:left-auto lg:h-auto lg:w-1/4 lg:bg-gradient-to-r" />
          <HiveShare className="absolute top-4 right-4" path="/hive/siwaka" title={`${S.name} × UniHive`} text="UniHive’s official media outlet." />
        </div>
        <div className="px-4 sm:px-8 lg:px-12 py-8 lg:py-16 flex flex-col justify-center bg-[radial-gradient(80%_60%_at_80%_20%,rgba(195,18,31,0.25),transparent_70%)]">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold uppercase flex items-center gap-2"><Mic className="w-3.5 h-3.5" aria-hidden="true" /> {S.role}</p>
          <div className="mt-3 flex items-center gap-4">
            <img src={S.logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-16 w-16 rounded-2xl object-contain bg-black border border-white/10" />
            <h1 className="hive-display hive-gold-text text-4xl sm:text-6xl font-extrabold leading-[1.02]">{S.name}</h1>
          </div>
          <p className="hive-accent text-white/85 text-xl sm:text-2xl mt-3 max-w-xl">{S.line}</p>
          <div className="flex flex-wrap gap-3 mt-7">
            <a href="#latest" className="hive-btn-gold rounded-full px-6 py-3.5 text-sm font-extrabold inline-flex items-center gap-2"><Play className="w-4 h-4" aria-hidden="true" /> Watch {ep.title}</a>
            <a href={S.tiktok} target="_blank" rel="noreferrer" className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white inline-flex items-center gap-2 hover:border-white/60">
              <TikTokIcon className="w-4 h-4" /> {S.handle} ↗
            </a>
          </div>
        </div>
      </section>

      {/* Latest episode */}
      <section id="latest" className="scroll-mt-28 px-4 sm:px-8 lg:px-12 py-12 lg:grid lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12 lg:items-center">
        <div className="relative mx-auto w-full max-w-[420px] rounded-[28px] overflow-hidden border border-white/10 bg-black">
          <video src={ep.video} poster={ep.poster} controls playsInline preload="none" className="w-full aspect-[9/16] object-cover bg-black" />
        </div>
        <div className="mt-8 lg:mt-0">
          <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">Latest episode</p>
          <h2 className="hive-display text-white text-3xl sm:text-4xl font-bold mt-1">{ep.title}</h2>
          <p className="text-white/70 mt-3 text-lg">{ep.line}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={ep.tiktokUrl} target="_blank" rel="noreferrer" className="hive-btn-gold rounded-full px-5 py-3 text-sm font-extrabold inline-flex items-center gap-2">
              <TikTokIcon className="w-4 h-4" /> Watch on TikTok <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <Link to="/events/the-hive-no-going-home" className="rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white hover:border-white/60">THE HIVE · 30 Oct</Link>
          </div>
        </div>
      </section>

      {/* Moments */}
      <section className="px-4 sm:px-8 lg:px-12 pb-14">
        <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">Moments</p>
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold mt-1 mb-5">From the streets</h2>
        <Masonry
          maxCols={4}
          items={S.moments.map((m, i) => ({ ...m, key: `${m.src}-${i}` }))}
          render={(m) => (
            <div className="hive-card">
              {m.kind === 'video'
                ? <video src={m.src} poster={m.poster} muted loop autoPlay playsInline preload="metadata" className="block w-full h-auto" />
                : <img src={m.src} alt="" loading="lazy" className="hive-card-img" />}
            </div>
          )}
        />
        <div className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="hive-display text-white text-xl font-bold">Got a story for the Hive?</p>
            <p className="text-white/60 text-sm mt-1">Catch the Siwaka mic at the next UniHive event — or slide into their DMs.</p>
          </div>
          <a href={S.tiktok} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white inline-flex items-center gap-2 hover:border-white/60">
            <TikTokIcon className="w-4 h-4" /> Follow {S.handle}
          </a>
        </div>
      </section>
    </HiveShell>
  );
}
