import { useEffect, useMemo, useState } from 'react';

// Column count follows viewport width; items are dealt round-robin so the
// reading order stays left-to-right like Pinterest.
export function useColumnCount() {
  const calc = () => {
    const w = window.innerWidth;
    if (w < 640) return 2;
    if (w < 1024) return 3;
    if (w < 1280) return 4;
    if (w < 1680) return 5;
    return 6;
  };
  const [n, setN] = useState(() => (typeof window === 'undefined' ? 2 : calc()));
  useEffect(() => {
    const on = () => setN(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
}

export default function Masonry({ items, render, maxCols = 6 }) {
  const n = Math.min(useColumnCount(), maxCols);
  const cols = useMemo(() => {
    const c = Array.from({ length: n }, () => []);
    items.forEach((it, i) => c[i % n].push(it));
    return c;
  }, [items, n]);
  return (
    <div className="flex gap-3 sm:gap-4 items-start">
      {cols.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
          {col.map((it) => <div key={it.key} className="hive-fade-in">{render(it)}</div>)}
        </div>
      ))}
    </div>
  );
}

