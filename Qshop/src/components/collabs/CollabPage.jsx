// A UniHive collaboration page (/collabs/:slug), rendered from COLLABS.
// Upcoming collabs lead with tickets; past ones read as "it happened".
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ArrowRight, ExternalLink, Play } from 'lucide-react';
import HiveShell from '../hive/HiveShell';
import HiveShare from '../hive/HiveShare';
import { getCollab, isEnded } from './collabs';
import '../hive/hive.css';

function Chip({ children }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs sm:text-sm text-white/90">{children}</span>;
}

export default function CollabPage() {
  const { slug } = useParams();
  const c = getCollab(slug);
  useEffect(() => { if (c) document.title = `${c.name} — ${c.kicker2 || c.kicker}`; }, [c]);
  if (!c) return <Navigate to="/services" replace />;
  const ended = isEnded(c);

  return (
    <HiveShell>
      {/* Hero */}
      <section className="relative overflow-hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:min-h-[72vh]">
        <div className="relative aspect-[4/5] lg:aspect-auto bg-black">
          <img src={c.hero.src} alt={c.hero.alt} className="absolute inset-0 w-full h-full object-cover" />
          <HiveShare className="absolute top-4 right-4" path={`/collabs/${c.slug}`} title={`${c.name} — ${c.kicker2 || c.kicker}`} text={c.tagline} />
        </div>
        <div className="px-4 sm:px-8 lg:px-12 py-8 lg:py-16 flex flex-col justify-center bg-[radial-gradient(80%_60%_at_80%_20%,rgba(195,18,31,0.25),transparent_70%)]">
          <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold uppercase">{ended ? `It happened · ${c.kicker}` : c.kicker}</p>
          {c.kicker2 && <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold uppercase mt-1">{c.kicker2}</p>}
          <h1 className="hive-display hive-gold-text text-4xl sm:text-6xl font-extrabold leading-[1.02] mt-2">{c.name}</h1>
          <p className="hive-accent text-white/85 text-xl sm:text-2xl mt-3 max-w-xl">{c.tagline}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {c.chips.map((t, i) => <Chip key={t}>{i === 0 && <CalendarDays className="w-3.5 h-3.5 text-[#e7c65f]" aria-hidden="true" />}{t}</Chip>)}
          </div>
          <p className="text-white/75 mt-5 max-w-xl">{c.role}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={c.cta.href} target="_blank" rel="noreferrer" className="hive-btn-gold rounded-full px-6 py-3.5 text-sm font-extrabold inline-flex items-center gap-2">
              {ended && c.cta.label.startsWith('Get tickets') ? 'See the event' : c.cta.label} <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <Link to="/events/the-hive-no-going-home" className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white hover:border-white/60 inline-flex items-center gap-2">
              THE HIVE <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          {c.ctaNote && <p className="text-white/45 text-xs mt-3 max-w-xl">{c.ctaNote}</p>}
        </div>
      </section>

      {/* Facts */}
      {c.facts && (
        <section className="px-4 sm:px-8 lg:px-12 py-10">
          <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">Good to know</h2>
          <dl className="mt-4 divide-y divide-white/10 rounded-[22px] border border-white/10 bg-white/[0.03] max-w-3xl">
            {c.facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[90px_1fr] sm:grid-cols-[140px_1fr] gap-3 px-5 py-4">
                <dt className="text-[11px] tracking-[0.25em] uppercase text-[#e7c65f] pt-0.5">{k}</dt>
                <dd className="text-white/80 text-sm sm:text-base">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Feature (e.g. a competition) */}
      {c.feature && (
        <section className="px-4 sm:px-8 lg:px-12 pb-10">
          <div className="rounded-[28px] overflow-hidden border border-[#e7c65f]/30 bg-[linear-gradient(160deg,#1a0508,#07050a)] md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <img src={c.feature.img} alt="" loading="lazy" className="w-full h-full object-cover aspect-[4/5] md:aspect-auto" />
            <div className="p-6 sm:p-10 flex flex-col justify-center">
              <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">{c.feature.kicker}</p>
              <h2 className="hive-display hive-gold-text text-3xl sm:text-4xl font-extrabold mt-2">{c.feature.title}</h2>
              <p className="text-white/75 mt-3 text-lg">{c.feature.body}</p>
            </div>
          </div>
        </section>
      )}

      {/* Schedule */}
      {c.schedule && (
        <section className="px-4 sm:px-8 lg:px-12 py-10">
          <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">The run</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {c.schedule.map((s) => (
              <div key={s.name} className="rounded-[22px] overflow-hidden border border-white/10 bg-white/[0.03]">
                <img src={s.img} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                <div className="p-4">
                  <p className="text-[11px] tracking-[0.25em] uppercase text-[#e7c65f]">{s.date}</p>
                  <p className="text-white font-bold mt-1">{s.name}</p>
                  <p className="text-white/60 text-sm mt-1">{s.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Watch */}
      {c.watch && (
        <section className="px-4 sm:px-8 lg:px-12 pb-10">
          <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">Watch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {c.watch.map((w) => (
              <a key={w.href} href={w.href} target="_blank" rel="noreferrer" className="group relative block rounded-[22px] overflow-hidden border border-white/10 bg-black">
                <img src={w.img} alt="" loading="lazy" className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100" />
                <span className="absolute inset-0 flex items-center justify-center"><span className="w-14 h-14 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"><Play className="w-6 h-6 text-white" aria-hidden="true" /></span></span>
                <span className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent text-white font-semibold">{w.title} ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {c.gallery && !c.schedule && (
        <section className="px-4 sm:px-8 lg:px-12 pb-10">
          <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">The artwork</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {c.gallery.map((g) => (
              <figure key={g.src}>
                <img src={g.src} alt={g.caption} loading="lazy" className="w-full rounded-2xl" />
                <figcaption className="text-white/45 text-xs mt-1.5">{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Partners */}
      <section className="px-4 sm:px-8 lg:px-12 pb-16">
        <h2 className="hive-display text-white text-2xl sm:text-3xl font-bold">Follow</h2>
        <div className="flex flex-wrap gap-3 mt-4">
          {c.partners.map((p) => (
            <div key={p.name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-white font-bold">{p.name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm">
                {p.links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer" className="text-[#e7c65f] hover:underline">{label} ↗</a>)}
              </div>
            </div>
          ))}
        </div>
        {c.credit && <p className="text-white/40 text-xs mt-5">{c.credit}</p>}
      </section>
    </HiveShell>
  );
}
