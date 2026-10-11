import { useMemo } from 'react';
import { season } from './season';
import './hive.css';

// Corner web built from radial threads + sagging rings.
function CornerWeb({ size = 220, flip = false, className = '' }) {
  const paths = useMemo(() => {
    const spokes = 7;
    const rings = [0.22, 0.4, 0.58, 0.76, 0.94];
    const angle = (i) => (Math.PI / 2) * (i / (spokes - 1));
    const out = [];
    for (let i = 0; i < spokes; i++) {
      const a = angle(i);
      out.push(`M0 0 L${Math.cos(a) * size} ${Math.sin(a) * size}`);
    }
    rings.forEach((r) => {
      let d = '';
      for (let i = 0; i < spokes; i++) {
        const a = angle(i);
        const x = Math.cos(a) * size * r;
        const y = Math.sin(a) * size * r;
        if (i === 0) d += `M${x} ${y}`;
        else {
          const pa = angle(i - 1);
          const mid = (a + pa) / 2;
          const sag = size * r * 0.86;
          d += ` Q${Math.cos(mid) * sag} ${Math.sin(mid) * sag} ${x} ${y}`;
        }
      }
      out.push(d);
    });
    return out;
  }, [size]);

  return (
    <svg
      className={`hive-web ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function Spider() {
  return (
    <div className="hive-spider absolute top-[112px] right-[64px] z-40 pointer-events-none hidden xl:block" aria-hidden="true">
      <div className="mx-auto w-px h-14 bg-white/30" />
      <svg width="26" height="22" viewBox="0 0 26 22" className="-mt-1 mx-auto block">
        <g stroke="rgba(243,236,226,0.75)" strokeWidth="1.2" fill="none">
          <path d="M9 9 L2 4 M9 11 L1 11 M9 13 L2 18 M10 15 L5 21" />
          <path d="M17 9 L24 4 M17 11 L25 11 M17 13 L24 18 M16 15 L21 21" />
        </g>
        <ellipse cx="13" cy="12" rx="5" ry="6" fill="#0b0607" stroke="rgba(243,236,226,0.6)" />
        <circle cx="11.3" cy="9.5" r="0.9" fill="#ff2e3b" />
        <circle cx="14.7" cy="9.5" r="0.9" fill="#ff2e3b" />
      </svg>
    </div>
  );
}

function Embers({ count = 18 }) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 53) % 100}%`,
        delay: `${(i * 1.7) % 12}s`,
        duration: `${10 + ((i * 3.3) % 9)}s`,
        drift: `${((i % 5) - 2) * 25}px`,
        scale: 0.6 + ((i * 7) % 10) / 12,
      })),
    [count]
  );
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {embers.map((e, i) => (
        <span
          key={i}
          className="hive-ember"
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.duration, '--drift': e.drift, transform: `scale(${e.scale})` }}
        />
      ))}
    </div>
  );
}

export default function HiveTheme({ children }) {
  return (
    <div className={`hive-root ${season.grain ? 'hive-grain' : ''}`}>
      <div className="hive-atmosphere" />
      {season.embers && <Embers />}
      {season.webs && (
        <>
          <CornerWeb size={150} className="top-[100px] left-0 sm:hidden" />
          <CornerWeb size={240} className="top-[100px] md:top-[112px] left-0 hidden sm:block" />
          <CornerWeb size={200} flip className="top-[112px] right-0 hidden md:block" />
        </>
      )}
      {season.spider && <Spider />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export { CornerWeb };
