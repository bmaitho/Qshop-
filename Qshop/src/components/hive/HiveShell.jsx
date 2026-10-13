import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import MobileNavbar from '../MobileNavbar';
import HiveTheme from './HiveTheme';
import { HIVE_SLUG, HIVE_STARTS_AT, SOCIALS, LITTLE } from './hiveMedia';

export function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const on = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return m;
}

export function useCountdown(target = HIVE_STARTS_AT) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    done: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    mins: Math.floor((diff / 60000) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };
}

const LINKS = [
  { label: 'Bar & Bites', to: `/events/${HIVE_SLUG}?tab=shop`, match: (p, q) => p === `/events/${HIVE_SLUG}` && (!q || q === 'shop') },
  { label: 'The Night', to: `/events/${HIVE_SLUG}?tab=night`, match: (p, q) => p === `/events/${HIVE_SLUG}` && q === 'night' },
  { label: 'Photo Booth', to: '/hive/booth', match: (p) => p === '/hive/booth' },
  { label: 'Wallet', to: `/events/${HIVE_SLUG}/wallet`, match: (p) => p.endsWith('/wallet') },
  { label: 'UniHive Specials', to: `/events/${HIVE_SLUG}?tab=packs`, match: (p, q) => p === `/events/${HIVE_SLUG}` && q === 'packs' },
  { label: 'Claim a Little ticket', to: `/claim/${HIVE_SLUG}`, match: (p) => p.startsWith('/claim') },
  { label: 'My Tickets', to: '/my-tickets', match: (p) => p === '/my-tickets' },
];

function HiveNav() {
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  const c = useCountdown();
  return (
    <div className="sticky top-0 pt-[52px] md:pt-0 md:top-16 z-50 border-b border-white/[0.08] bg-[#07050a]/45 md:bg-[#07050a]/95 backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex items-center gap-4 px-3 sm:px-6 lg:px-10 h-12">
        <Link to={`/events/${HIVE_SLUG}`} className="hive-display hive-gold-text text-sm sm:text-base font-bold shrink-0">
          THE HIVE
        </Link>
        <nav className="flex-1 overflow-x-auto hive-noscroll">
          <div className="flex items-center gap-1 w-max">
            {LINKS.map((l) => {
              const active = l.match(pathname, tab);
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-[#c3121f] text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
        {!c.done && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-white/50 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2e3b] animate-pulse" />
            {c.days}D {String(c.hours).padStart(2, '0')}H {String(c.mins).padStart(2, '0')}M
          </div>
        )}
      </div>
    </div>
  );
}

function HiveFooter() {
  return (
    <footer className="mt-10 border-t border-white/[0.06] px-4 sm:px-8 lg:px-12 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 text-sm">
      <div>
        <p className="hive-display hive-gold-text font-bold">THE HIVE</p>
        <p className="hive-accent text-white/55 text-sm mt-1">Who are you when the lights go red?</p>
        <p className="text-white/35 text-xs mt-3 max-w-md">18+. THE HIVE is photographed and filmed. Prefer not to appear? Tell our team on the night or DM us and we&rsquo;ll take it down.</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/60">
        {Object.values(SOCIALS).map((s) => (
          <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="hover:text-white">{s.label} {s.handle}</a>
        ))}
        <a href={LITTLE.tickets} target="_blank" rel="noreferrer" className="hover:text-white">Tickets on Little Events ↗</a>
        <Link to="/terms" className="hover:text-white">Terms</Link>
        <Link to="/privacy" className="hover:text-white">Privacy</Link>
        <Link to="/partner" className="hover:text-white">Partner login</Link>
      </div>
    </footer>
  );
}

export default function HiveShell({ children, hideSubnav = false }) {
  const isMobile = useIsMobile();
  return (
    <>
      <div className="dark">{isMobile ? <MobileNavbar /> : <Navbar />}</div>
      <HiveTheme>
        <div className="md:pt-16 pb-28 md:pb-0">
          {!hideSubnav && <HiveNav />}
          {children}
          <HiveFooter />
        </div>
      </HiveTheme>
    </>
  );
}
