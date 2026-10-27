// Ticket strip + ticket list for THE HIVE, as sold on Little Events (the only
// place tickets are sold; every link goes there). While the discount runs it
// shows Little's price crossed out next to the discounted one.
import { ArrowRight } from 'lucide-react';
import { LITTLE, WAVES, PROMO, promoActive, ticketCode, isUniCode, discounted } from './hiveMedia';

const ksh = (n) => `KSh ${Number(n).toLocaleString('en-KE')}`;

export function WaveStrip({ className = '' }) {
  if (promoActive()) {
    return (
      <a href={LITTLE.tickets} target="_blank" rel="noreferrer" className={`group inline-flex self-start w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-[#ff3b3b]/60 bg-[#c3121f]/25 backdrop-blur px-4 py-2 text-xs sm:text-sm ${className}`}>
        <span className="font-extrabold tracking-wide text-white">🎟️ {PROMO.regularOff}% OFF REGULAR · {PROMO.vipOff}% OFF VIP</span>
        <span className="text-white/60">code {ticketCode()}</span>
        <span className="text-[#e7c65f] font-extrabold tracking-wide">GET TICKETS ↗</span>
      </a>
    );
  }
  return (
    <a href={LITTLE.tickets} target="_blank" rel="noreferrer" className={`group inline-flex self-start w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-[#e7c65f]/40 bg-black/45 backdrop-blur px-4 py-2 text-xs sm:text-sm ${className}`}>
      <span className="font-bold text-white/45 line-through decoration-[#c3121f] decoration-2">{WAVES.soldOut.toUpperCase()}</span>
      <span className="text-[#ff8a8a] font-extrabold tracking-wide">SOLD OUT</span>
      <ArrowRight className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
      <span className="text-[#e7c65f] font-extrabold tracking-wide">{WAVES.onSale.toUpperCase()} ON SALE NOW ↗</span>
    </a>
  );
}

export default function WaveTwo({ className = '' }) {
  const promo = promoActive();
  const code = ticketCode();
  return (
    <section className={`rounded-[28px] border border-[#e7c65f]/30 bg-[radial-gradient(110%_80%_at_100%_0%,rgba(195,18,31,0.35),transparent_60%),linear-gradient(160deg,#141008,#07050a)] p-5 sm:p-8 ${className}`}>
      {promo ? (
        <>
          <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">
            {isUniCode() ? `Your ${code} code is on` : 'Shika tiko usipatwe na FOMO'}
          </p>
          <h2 className="hive-display hive-gold-text text-2xl sm:text-4xl font-extrabold mt-2">{PROMO.regularOff}% off Regular · {PROMO.vipOff}% off VIP</h2>
          <p className="text-white/70 text-sm mt-2">Code <span className="font-bold text-white">{code}</span> is applied for you when you tap any ticket below. Until doors open, Fri 30 Oct.</p>
        </>
      ) : (
        <>
          <p className="text-[11px] tracking-[0.35em] text-[#ff7a1a] font-semibold uppercase">{WAVES.soldOut} is gone. Blink and {WAVES.onSale} goes too.</p>
          <h2 className="hive-display hive-gold-text text-2xl sm:text-4xl font-extrabold mt-2">{WAVES.onSale} is live on Little</h2>
        </>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-5">
        {WAVES.tiers.map((t) => (
          <a key={t.name} href={LITTLE.tickets} target="_blank" rel="noreferrer" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-[#e7c65f]/60 ${t.perk ? 'border-[#e7c65f]/30 bg-[#e7c65f]/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
            <span>
              <span className="block text-white font-bold text-sm sm:text-base">{t.name}{t.limited && <span className="ml-2 text-[10px] tracking-widest text-[#ff8a8a]">LTD</span>}</span>
              {t.perk && <span className="block text-[#e7c65f]/90 text-xs mt-0.5">{t.perk}</span>}
            </span>
            {promo ? (
              <span className="text-right whitespace-nowrap">
                <span className="block text-white/40 text-xs line-through">{ksh(t.price)}</span>
                <span className="block hive-display text-white font-bold">{ksh(discounted(t))}</span>
                <span className="block text-[10px] font-extrabold tracking-widest text-[#ff8a8a]">−{t.vip ? PROMO.vipOff : PROMO.regularOff}%</span>
              </span>
            ) : (
              <span className="hive-display text-white font-bold whitespace-nowrap">{ksh(t.price)}</span>
            )}
          </a>
        ))}
      </div>
      <a href={LITTLE.tickets} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-5 hive-btn-gold rounded-full px-7 py-3.5 text-sm font-extrabold">
        {promo ? `Get tickets with ${code}` : `Book ${WAVES.onSale} on Little`} <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </a>
      <p className="text-white/40 text-xs mt-3">Tickets are sold only on Little Events.{promo ? ' Crossed-out prices are Little’s listed prices; the discount is applied at checkout.' : ' Prices as listed on Little.'}</p>
    </section>
  );
}
