// A UniHive experience (activation) page, rendered from EXPERIENCES config.
// Mobile-first: big imagery, short copy, one clear action (free RSVP).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Clock, MapPin, ShieldCheck, Ticket, ArrowRight, Loader2, CheckCircle2,
  Mountain, Waves, Sailboat, Trees, Target, Wind, Footprints, Sparkles, Mic,
} from 'lucide-react';
import HiveShell, { useCountdown } from '../hive/HiveShell';
import HiveShare from '../hive/HiveShare';
import QRCode from '../QRCode';
import useEventRsvp from './useEventRsvp';
import '../hive/hive.css';

const ICONS = { Mountain, Waves, Sailboat, Trees, Target, Wind, Footprints, Sparkles };
const PEOPLE_SHOTS = ['ngh193', 'ngh189', 'ngh202', 'ngh172', 'ngh191', 'ngh210'].map((k) => `/hive/booth/${k}.webp`);

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 backdrop-blur px-3 py-1.5 text-xs sm:text-sm text-white/90">
      <Icon className="w-3.5 h-3.5 text-[#e7c65f]" aria-hidden="true" /> {children}
    </span>
  );
}

function RsvpAction({ x, r, compact = false }) {
  if (r.state === 'loading') return <div className="h-12 w-56 rounded-full bg-white/10 animate-pulse" />;
  if (r.state === 'done') {
    return (
      <Link to="/my-tickets" className={`inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-bold ${compact ? 'px-5 py-3 text-sm' : 'px-7 py-4'}`}>
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> You’re in — view your pass
      </Link>
    );
  }
  if (r.state === 'closed') {
    return <p className="text-white/60 text-sm font-semibold">{r.error || 'RSVP isn’t open right now.'}</p>;
  }
  return (
    <div>
      <button
        onClick={r.rsvp}
        disabled={r.state === 'busy'}
        className={`hive-btn-gold rounded-full font-extrabold tracking-wide inline-flex items-center justify-center gap-2 disabled:opacity-60 ${compact ? 'px-6 py-3 text-sm' : 'px-8 py-4 text-sm sm:text-base'}`}
      >
        {r.state === 'busy' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Ticket className="w-5 h-5" aria-hidden="true" />}
        {r.user ? 'FREE ENTRY — RSVP NOW' : 'FREE ENTRY — RSVP ON UNIHIVE'}
      </button>
      {r.state === 'error' && <p className="text-[#ff8a8a] text-sm mt-2">{r.error}</p>}
      {!compact && !r.user && <p className="text-white/45 text-xs mt-2">Sign in or create a free UniHive account to get your pass.</p>}
      {r.spotsLeft != null && (
        <p className={`text-xs mt-2 font-semibold ${r.spotsLeft <= 15 ? 'text-[#ff8a8a]' : 'text-[#e7c65f]'}`}>
          {r.spotsLeft <= 15 ? `Only ${r.spotsLeft} spot${r.spotsLeft === 1 ? '' : 's'} left` : `Limited to ${r.event.max_capacity} people · ${r.spotsLeft} spots left`}
        </p>
      )}
      {!compact && x.age && <p className="text-white/45 text-xs mt-1">{x.age} only.</p>}
    </div>
  );
}

function PassCard({ pass, x }) {
  if (!pass?.ticket_token) return null;
  return (
    <section className="px-4 sm:px-8 lg:px-12 -mt-2 mb-10">
      <div className="max-w-md mx-auto rounded-[28px] border border-[#e7c65f]/40 bg-[linear-gradient(160deg,#141008,#07050a)] p-6 text-center hive-fade-in">
        <p className="text-[11px] tracking-[0.3em] text-[#e7c65f] uppercase">Your pass</p>
        <h3 className="hive-display text-white text-xl font-bold mt-1">{x.name}</h3>
        <p className="text-white/55 text-sm">{x.shortDate} · {x.timeLabel} · {x.venue}</p>
        <div className="bg-white rounded-2xl p-4 inline-block mt-5">
          <QRCode value={`${window.location.origin}/verify-ticket/${pass.ticket_token}`} size={190} fgColor="#000000" bgColor="#ffffff" />
        </div>
        <p className="text-white/50 text-xs mt-3">Show this at the gate. It’s saved in My Tickets too. One pass per person.</p>
      </div>
    </section>
  );
}

export default function ExperiencePage({ x }) {
  const r = useEventRsvp(x.slug);
  const c = useCountdown(x.startsAt);
  const people = x.people.filter((p) => p.confirmed);
  const brands = x.brands.filter((b) => b.confirmed);
  const hero = x.media.hero;
  const title = x.name.replace(/-/g, '\u2011'); // keep "PRE-PARTY" on one line
  // Sticky mobile RSVP appears only once the hero button scrolls away.
  const ctaRef = useRef(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    // Visible, or not yet reached (still above it) → no sticky bar.
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting || e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [r.state]);

  useEffect(() => { document.title = `${x.name} — ${x.shortDate}, ${x.venue}`; }, [x]);

  return (
    <HiveShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:min-h-[78vh]">
          <div className="relative aspect-[4/5] lg:aspect-auto bg-black">
            {hero.video ? (
              <video src={hero.video} poster={hero.src} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <img src={hero.src} alt={`${x.name} poster`} className="absolute inset-0 w-full h-full object-cover hive-drift" />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-[#07050a] to-transparent lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-1/4 lg:bg-gradient-to-r lg:from-transparent lg:to-[#07050a]" />
            <HiveShare className="absolute top-4 right-4" path={`/events/${x.slug}`} title={`${x.name} — ${x.shortDate}, ${x.venue}`} text={`${x.campaign} Free entry, RSVP on UniHive.`} />
          </div>
          <div className="relative px-4 sm:px-8 lg:px-12 pt-6 lg:pt-0 flex flex-col justify-center pb-10 lg:py-16 bg-[radial-gradient(90%_60%_at_80%_20%,rgba(30,74,76,0.35),transparent_70%)]">
            <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold uppercase">{x.presentedBy} presents</p>
            <h1 className="hive-display hive-gold-text text-4xl sm:text-6xl font-extrabold leading-[1.02] mt-2">{title}</h1>
            <p className="hive-accent text-white/85 text-xl sm:text-2xl mt-3">{x.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Chip icon={CalendarDays}>{x.shortDate}</Chip>
              <Chip icon={Clock}>{x.timeLabel}</Chip>
              <Chip icon={MapPin}>{x.venue}</Chip>
              <Chip icon={ShieldCheck}>{x.age}</Chip>
            </div>
            <div className="mt-7" ref={ctaRef}><RsvpAction x={x} r={r} /></div>
            {!c.done && (
              <p className="mt-5 text-[11px] tracking-[0.3em] text-white/45 font-semibold">
                {c.days}D {String(c.hours).padStart(2, '0')}H {String(c.mins).padStart(2, '0')}M TO GO
              </p>
            )}
          </div>
        </div>
      </section>

      {r.state === 'done' && <PassCard pass={r.pass} x={x} />}

      {/* Intro */}
      <section className="px-4 sm:px-8 lg:px-12 py-10 max-w-4xl">
        <p className="hive-display text-[#e7c65f] text-2xl sm:text-4xl font-bold leading-tight">{x.campaign}</p>
        <p className="text-white/75 text-base sm:text-lg mt-4 leading-relaxed">{x.intro}</p>
        <p className="hive-accent text-white/60 text-lg mt-3">{x.support}</p>
      </section>

      {/* Activities */}
      <section className="px-4 sm:px-8 lg:px-12 pb-12">
        <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">At Paradise Lost</p>
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold mt-1">A day to explore</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-5">
          {x.activities.map((a, i) => {
            const Icon = ICONS[a.icon] || Sparkles;
            return (
              <div key={a.key} className={`group relative overflow-hidden rounded-[22px] border border-white/10 p-5 min-h-[170px] sm:min-h-[220px] flex flex-col justify-end ${i % 3 === 0 ? 'bg-[linear-gradient(160deg,#163a26,#07120c)]' : i % 3 === 1 ? 'bg-[linear-gradient(160deg,#1e4a4c,#06100f)]' : 'bg-[linear-gradient(160deg,#3a1408,#0b0503)]'}`}>
                {a.img && <img src={a.img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <Icon className="absolute top-4 right-4 w-7 h-7 text-[#e7c65f] drop-shadow" aria-hidden="true" />
                <h3 className="relative hive-display text-white text-lg sm:text-xl font-bold">{a.title}</h3>
                <p className="relative text-white/75 text-sm">{a.line}</p>
              </div>
            );
          })}
        </div>
        {x.activitiesNote && <p className="text-white/45 text-xs mt-4">{x.activitiesNote}</p>}
      </section>

      {/* Venue */}
      <section className="px-4 sm:px-8 lg:px-12 pb-12">
        <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(30,74,76,0.55),transparent_60%),linear-gradient(160deg,#0c1a12,#07050a)] p-6 sm:p-10 lg:grid lg:grid-cols-2 lg:gap-10">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-[#e7c65f] font-semibold uppercase">The destination</p>
            <h2 className="hive-display text-white text-3xl sm:text-4xl font-bold mt-2">Paradise Lost</h2>
            <p className="text-white/70 mt-3 leading-relaxed">Caves, a waterfall, a lake and trails through the green — a road trip from Nairobi into Kiambu. Come early, explore, and stay for the energy.</p>
            <a href={x.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-5 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white hover:border-white/60">
              <MapPin className="w-4 h-4" aria-hidden="true" /> Open in Maps ↗
            </a>
          </div>
          {x.media.venue.length > 0 && (
            <div className={`grid gap-2 mt-6 lg:mt-0 ${x.media.venue.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {x.media.venue.slice(0, 4).map((m) => (
                m.video
                  ? <video key={m.video} src={m.video} poster={m.src} muted loop autoPlay playsInline preload="metadata" className={`rounded-2xl w-full object-cover ${x.media.venue.length > 1 ? 'aspect-[4/5]' : 'aspect-video'}`} />
                  : <img key={m.src} src={m.src} alt="Paradise Lost" loading="lazy" className={`rounded-2xl w-full object-cover ${x.media.venue.length > 1 ? 'aspect-[4/5]' : 'aspect-video'}`} />
              ))}
              {x.media.credit && <p className="text-white/40 text-[11px]">{x.media.credit}</p>}
            </div>
          )}
        </div>
      </section>

      {/* People */}
      <section className="px-4 sm:px-8 lg:px-12 pb-12">
        <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">Creators · artists · DJs</p>
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold mt-1">Who you’ll meet</h2>
        {people.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto hive-noscroll mt-5 -mx-4 px-4 sm:mx-0 sm:px-0">
            {people.map((p) => { const Card = p.to ? Link : 'div'; return (
              <Card key={p.name} {...(p.to ? { to: p.to } : {})} className="relative block shrink-0 w-[62vw] sm:w-[260px] aspect-[4/5] rounded-[22px] overflow-hidden bg-[linear-gradient(160deg,#1a1205,#07050a)]">
                {p.img && !p.logo ? (
                  <img src={p.img} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : p.logo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(90%_70%_at_50%_30%,rgba(231,198,95,0.25),transparent_70%)]">
                    <Mic className="w-16 h-16 text-[#e7c65f]/80" aria-hidden="true" />
                    <img src={p.img} alt={p.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-full h-full object-contain p-8 bg-black" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(90%_70%_at_50%_30%,rgba(231,198,95,0.25),transparent_70%)]" aria-hidden="true">
                    <Mic className="w-16 h-16 text-[#e7c65f]/80" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute bottom-0 p-4">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-[#e7c65f]">{p.role}</p>
                  <p className="hive-display text-white text-xl font-bold">{p.name}{p.to ? ' →' : ''}</p>
                </div>
              </Card>
            ); })}
          </div>
        ) : (
          <p className="text-white/60 mt-3">Creators, artists and DJs — names dropping soon. Watch <a href="https://www.instagram.com/unihive.entertainment/" target="_blank" rel="noreferrer" className="underline">@unihive.entertainment</a>.</p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {PEOPLE_SHOTS.map((src) => <img key={src} src={src} alt="" loading="lazy" className="rounded-2xl w-full aspect-square object-cover" />)}
        </div>
        <p className="text-white/40 text-xs mt-2">From past Hive nights. New connections start here.</p>
      </section>

      {/* Brands */}
      {brands.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-12 pb-12">
          <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">With</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {brands.map((b) => (
              <div key={b.name} className="relative aspect-[4/3] rounded-[20px] overflow-hidden border border-white/10 bg-[linear-gradient(160deg,#151008,#07050a)]">
                {b.img && <img src={b.img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <p className="absolute bottom-3 left-4 hive-display text-white font-bold">{b.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Practical */}
      <section className="px-4 sm:px-8 lg:px-12 pb-12">
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">Good to know</h2>
        <dl className="mt-4 divide-y divide-white/10 rounded-[22px] border border-white/10 bg-white/[0.03]">
          {x.practical.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[90px_1fr] sm:grid-cols-[140px_1fr] gap-3 px-5 py-4">
              <dt className="text-[11px] tracking-[0.25em] uppercase text-[#e7c65f] pt-0.5">{k}</dt>
              <dd className="text-white/80 text-sm sm:text-base">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6"><RsvpAction x={x} r={r} /></div>
      </section>

      {/* What it builds toward */}
      {x.next && (
        <section className="px-4 sm:px-8 lg:px-12 pb-16">
          <Link to={`/events/${x.next.slug}`} className="group block relative overflow-hidden rounded-[28px] border border-[#c3121f]/40 bg-[radial-gradient(100%_80%_at_100%_0%,rgba(195,18,31,0.45),transparent_60%),linear-gradient(160deg,#1a0508,#07050a)] p-6 sm:p-10">
            <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">Then, the night</p>
            <h2 className="hive-display hive-gold-text text-2xl sm:text-4xl font-extrabold mt-2">{x.next.title}</h2>
            <p className="text-white/70 mt-2">{x.next.line}</p>
            <p className="text-white/45 text-sm mt-1">{x.next.note}</p>
            <span className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-[#e7c65f]">Enter THE HIVE <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
          {x.next.offer && x.next.ticketsUrl && (
            <a href={x.next.ticketsUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between gap-4 rounded-[22px] border border-[#f5b700]/30 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(245,183,0,0.18),transparent_60%),#0b0805] px-5 py-4">
              <span className="text-white/85 text-sm sm:text-base">{x.next.offer}</span>
              <span className="shrink-0 rounded-full bg-[#f5b700] text-[#1a0f05] px-4 py-2 text-xs sm:text-sm font-extrabold">Tickets on Little ↗</span>
            </a>
          )}
        </section>
      )}

      {/* Sticky mobile RSVP */}
      {r.state !== 'done' && r.state !== 'closed' && !ctaVisible && (
        <div className="lg:hidden fixed inset-x-0 bottom-[84px] z-40 px-4 pointer-events-none">
          <div className="pointer-events-auto flex justify-center"><RsvpAction x={x} r={r} compact /></div>
        </div>
      )}
    </HiveShell>
  );
}
