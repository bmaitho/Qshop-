// Ticket strip for THE HIVE hero. Tickets sell on UniHive's own checkout
// (/events/:slug/tickets).
import { ArrowRight } from 'lucide-react';
import { TICKETS_PATH, WAVES, PROMO, promoActive, ticketCode } from './hiveMedia';

export function WaveStrip({ className = '' }) {
  if (promoActive()) {
    return (
      <a href={TICKETS_PATH} className={`group inline-flex self-start w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-[#ff3b3b]/60 bg-[#c3121f]/25 backdrop-blur px-4 py-2 text-xs sm:text-sm ${className}`}>
        <span className="font-extrabold tracking-wide text-white">🎟️ {PROMO.regularOff}% OFF REGULAR · {PROMO.vipOff}% OFF VIP</span>
        <span className="text-white/60">code {ticketCode()}</span>
        <span className="text-[#e7c65f] font-extrabold tracking-wide">GET TICKETS ↗</span>
      </a>
    );
  }
  return (
    <a href={TICKETS_PATH} className={`group inline-flex self-start w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-[#e7c65f]/40 bg-black/45 backdrop-blur px-4 py-2 text-xs sm:text-sm ${className}`}>
      <span className="font-bold text-white/45 line-through decoration-[#c3121f] decoration-2">{WAVES.soldOut.toUpperCase()}</span>
      <span className="text-[#ff8a8a] font-extrabold tracking-wide">SOLD OUT</span>
      <ArrowRight className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
      <span className="text-[#e7c65f] font-extrabold tracking-wide">{WAVES.onSale.toUpperCase()} ON SALE NOW ↗</span>
    </a>
  );
}
