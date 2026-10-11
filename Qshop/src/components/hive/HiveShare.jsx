// Minimal icon-only share control. Native share sheet where available
// (phones), otherwise a small popover. Link previews are rendered
// server-side (api/og.js), so the link itself unfurls as a branded card.
import { useEffect, useRef, useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';

const SITE = 'https://unihive.shop';

export const hiveShareUrl = (path) => `${SITE}${path.startsWith('/') ? path : `/${path}`}`;

export default function HiveShare({ path, title, text, className = '', size = 'sm', label }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const url = hiveShareUrl(path);
  const message = `${title}${text ? ` — ${text}` : ''}`;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const onClick = async (e) => {
    e.stopPropagation();
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title, text: message, url }); } catch { /* dismissed */ }
      return;
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
  };

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const options = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}` },
  ];

  return (
    <div ref={ref} className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} inline-flex ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label || `Share ${title}`}
        className={`${dim} rounded-full bg-black/45 backdrop-blur border border-white/15 text-white/85 hover:text-white hover:bg-black/65 flex items-center justify-center transition-colors`}
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-2xl border border-white/10 bg-[#0e0809]/95 backdrop-blur-xl p-1.5 shadow-2xl hive-fade-in" onClick={(e) => e.stopPropagation()}>
          {options.map((o) => (
            <a key={o.name} href={o.href} target="_blank" rel="noreferrer" className="block px-3 py-2 rounded-xl text-sm text-white/85 hover:bg-white/5">
              {o.name}
            </a>
          ))}
          <button onClick={copy} className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/85 hover:bg-white/5 flex items-center gap-2">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy link · IG / TikTok'}
          </button>
        </div>
      )}
    </div>
  );
}
