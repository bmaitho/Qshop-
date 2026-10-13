// Promo card for a live experience, shown on THE HIVE page. Separate event,
// free RSVP — clearly distinct from the paid night (tickets on Little).
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { liveExperiences } from './experiences';

export default function ExperiencePromo() {
  const list = liveExperiences().filter((x) => x.promoteOnHive);
  if (!list.length) return null;
  return (
    <div className="px-3 sm:px-6 lg:px-10 pt-8 space-y-4">
      {list.map((x) => (
        <section key={x.slug} className="relative overflow-hidden rounded-[28px] border border-[#e7c65f]/30 bg-[radial-gradient(110%_90%_at_0%_100%,rgba(22,58,38,0.85),transparent_60%),radial-gradient(90%_70%_at_100%_0%,rgba(30,74,76,0.6),transparent_60%),linear-gradient(160deg,#0c140e,#07050a)] sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Link to={`/events/${x.slug}`} className="block relative aspect-[16/10] sm:aspect-auto sm:min-h-[260px]" aria-label={`${x.name} — event page`}>
            <img src={(x.media.wide || x.media.poster).src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-[#07050a]/80" />
            <span className="absolute top-3 left-3 rounded-full bg-[#e7c65f] text-[#1a0f05] text-[10px] font-extrabold tracking-widest px-2.5 py-1">FREE · RSVP</span>
          </Link>
          <div className="p-5 sm:p-8">
            <p className="text-[10px] tracking-[0.35em] text-[#e7c65f] font-semibold uppercase">Separate event · {x.shortDate}</p>
            <h2 className="hive-display text-white text-2xl sm:text-3xl font-extrabold mt-1 leading-tight">Before the night, there’s the road trip.</h2>
            <p className="text-white/70 text-sm sm:text-base mt-2">Explore Paradise Lost, try new experiences, meet creators and artists, and connect with the people behind THE HIVE.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/75">
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#e7c65f]" aria-hidden="true" /> {x.shortDate} · {x.timeLabel}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#e7c65f]" aria-hidden="true" /> {x.venue}</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to={`/events/${x.slug}?rsvp=1`} className="hive-btn-gold rounded-full px-5 py-3 text-sm font-extrabold inline-flex items-center gap-2">
                <Ticket className="w-4 h-4" aria-hidden="true" /> RSVP free
              </Link>
              <Link to={`/events/${x.slug}`} className="rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white inline-flex items-center gap-2 hover:border-white/60">
                {x.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-white/40 text-xs mt-3">Free entry, {x.age}. THE HIVE: NO GOING HOME on 30 Oct is a separate, paid event — tickets on Little.</p>
          </div>
        </section>
      ))}
    </div>
  );
}
