// Events on The Buzz (/services): what's next, and what already happened.
// Upcoming vs past is decided by date, so an event never looks "on sale"
// after its night. Paid tickets always go to Little Events.
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Clock } from 'lucide-react';
import { img } from '../../utils/ImageUtils';
import { getExperience } from '../experience/experiences';
import { HIVE_SLUG, LITTLE, WAVES, FLASH, flashActive } from '../hive/hiveMedia';

const today = () => new Date().toISOString().slice(0, 10);
const day = (d, opts) => new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', opts);
const time = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}${m !== '00' ? `:${m}` : ''}${hr >= 12 ? 'PM' : 'AM'}`;
};
const cover = (evt) => getExperience(evt.slug)?.recap?.hero?.src || img(evt.image_url, 640) || '/hive/media/blood-moon.webp';

export const splitEvents = (events) => {
  const t = today();
  return {
    upcoming: events.filter((e) => e.event_date >= t).sort((a, b) => a.event_date.localeCompare(b.event_date)),
    past: events.filter((e) => e.event_date < t).sort((a, b) => b.event_date.localeCompare(a.event_date)),
  };
};

function Featured({ evt }) {
  const isHive = evt.slug === HIVE_SLUG;
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#e7c65f]/30 bg-[radial-gradient(110%_80%_at_100%_0%,rgba(195,18,31,0.32),transparent_60%),var(--surface)] md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Link to={`/events/${evt.slug}`} className="relative block aspect-[4/5] md:aspect-auto md:min-h-[460px] bg-black">
        <img src={img(evt.image_url, 640) || '/hive/media/blood-moon.webp'} alt={evt.title} className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-[#e7c65f] px-3 py-1 text-[10px] font-extrabold tracking-widest text-[#1a0f05]">UP NEXT</span>
      </Link>
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ff7a1a]">UniHive presents</p>
          <h3 className="mt-2 font-['Syne',sans-serif] text-3xl font-extrabold leading-[1.05] text-[var(--text)] sm:text-4xl lg:text-5xl">{evt.title}</h3>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm text-[var(--text)]">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5"><CalendarDays className="h-4 w-4 text-[#e7c65f]" aria-hidden="true" />{day(evt.event_date, { weekday: 'short', day: 'numeric', month: 'short' })}</li>
          {evt.event_time && <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5"><Clock className="h-4 w-4 text-[#e7c65f]" aria-hidden="true" />{time(evt.event_time)}</li>}
          {evt.venue && <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5"><MapPin className="h-4 w-4 text-[#e7c65f]" aria-hidden="true" />{evt.venue}</li>}
        </ul>
        {isHive && flashActive() && (
          <p className="text-sm text-[var(--muted)]"><span className="font-bold text-[#ff8a8a]">⚡ Weekend flash sale</span> — code <span className="font-bold text-[var(--text)]">{FLASH.code}</span>, applied for you on Little. Ends Sunday.</p>
        )}
        {isHive && !flashActive() && (
          <p className="text-sm text-[var(--muted)]">
            <span className="font-bold text-[#ff8a8a]">{WAVES.soldOut} sold out.</span>{' '}
            <span className="font-bold text-[#e7c65f]">{WAVES.onSale} is on sale now</span> — from KSh {Math.min(...WAVES.tiers.map((t) => t.price)).toLocaleString('en-KE')} on Little.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {isHive && (
            <a href={LITTLE.tickets} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#e7c65f] px-6 py-3.5 text-sm font-extrabold text-[#1a0f05] transition-transform hover:-translate-y-0.5">
              Tickets on Little ↗
            </a>
          )}
          <Link to={`/events/${evt.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3.5 text-sm font-bold text-[var(--text)] hover:border-[#e7c65f]/60">
            {isHive ? 'Explore the night' : 'View event'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function UpcomingCard({ evt }) {
  return (
    <Link to={`/events/${evt.slug}`} className="group overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] transition-transform hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        <img src={cover(evt)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {Number(evt.price) === 0 && <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-white">FREE</span>}
      </div>
      <div className="p-4">
        <p className="font-bold text-[var(--text)]">{evt.title}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{day(evt.event_date, { day: 'numeric', month: 'short' })}{evt.venue ? ` · ${evt.venue}` : ''}</p>
      </div>
    </Link>
  );
}

function PastCard({ evt }) {
  return (
    <Link to={`/events/${evt.slug}`} className="group relative block aspect-[4/5] w-[68vw] shrink-0 snap-start overflow-hidden rounded-[22px] bg-black sm:w-[260px] md:w-auto">
      <img src={cover(evt)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/50 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-white backdrop-blur">IT HAPPENED</span>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#e7c65f]">{day(evt.event_date, { day: 'numeric', month: 'short' })}</p>
        <p className="mt-1 font-['Syne',sans-serif] text-lg font-bold leading-tight text-white">{evt.title}</p>
        <p className="mt-1 text-xs text-white/60 group-hover:text-white/90">See what you missed →</p>
      </div>
    </Link>
  );
}

export default function BuzzEvents({ events }) {
  const { upcoming, past } = splitEvents(events);
  if (!upcoming.length && !past.length) return null;
  const [featured, ...rest] = [...upcoming].sort((a, b) => (b.slug === HIVE_SLUG) - (a.slug === HIVE_SLUG));
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-4 sm:px-6">
      {featured && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-['Syne',sans-serif] text-xl font-bold text-[var(--text)] sm:text-2xl">Events & tickets</h2>
            <Link to="/events" className="text-sm font-semibold text-[var(--accent)]">All events →</Link>
          </div>
          <Featured evt={featured} />
          {rest.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((e) => <UpcomingCard key={e.id} evt={e} />)}
            </div>
          )}
        </section>
      )}
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-['Syne',sans-serif] text-xl font-bold text-[var(--text)] sm:text-2xl">It happened</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">You either were there, or you’re about to find out what you missed.</p>
          <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
            {past.slice(0, 4).map((e) => <PastCard key={e.id} evt={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
