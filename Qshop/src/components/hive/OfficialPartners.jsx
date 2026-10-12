// Official partners strip for Home — minimal brand cards.
import { Link } from 'react-router-dom';
import { HIVE_SLUG, LITTLE } from './hiveMedia';

const PARTNERS = [
  { name: 'Smirnoff', line: 'Official drinks partner', img: '/hive/products/smirnoff-vodka-webs.webp', to: `/events/${HIVE_SLUG}?tab=shop&brand=smirnoff` },
  { name: 'Red Bull', line: 'Energy for the night', img: '/hive/products/redbull-webs.webp', to: `/events/${HIVE_SLUG}?tab=shop&brand=redbull` },
  { name: 'Little', line: `Rides · code ${LITTLE.code}`, img: null, href: LITTLE.tickets },
  { name: 'Harrison’s Pearl Gerar', line: 'Shawarma & hotdogs', img: '/hive/products/shawarma.png', to: `/events/${HIVE_SLUG}?tab=shop&brand=harrisons` },
];

export default function OfficialPartners() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="text-center mb-8">
        <p className="text-[11px] tracking-[0.35em] uppercase text-[#b8963a]">Official partners</p>
        <h2 className="text-3xl font-serif font-bold mt-2 text-[#113b1e] dark:text-white">Brands growing with the Hive</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {PARTNERS.map((p) => {
          const inner = (
            <>
              {p.img ? (
                <img src={p.img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(245,183,0,0.35),transparent_60%),linear-gradient(160deg,#1a1408,#060504)] flex items-center justify-center">
                  <span className="font-serif text-[#f5b700] text-2xl sm:text-3xl font-bold tracking-[0.18em] border border-dashed border-[#f5b700]/60 rounded-xl px-4 py-2">{LITTLE.code}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-white font-serif font-bold text-lg leading-tight">{p.name}</p>
                <p className="text-white/65 text-xs mt-0.5">{p.line}</p>
              </div>
            </>
          );
          const cls = 'group relative block aspect-[4/5] rounded-2xl overflow-hidden bg-[#0a0a0a]';
          return p.href
            ? <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
            : <Link key={p.name} to={p.to} className={cls}>{inner}</Link>;
        })}
      </div>
    </section>
  );
}
