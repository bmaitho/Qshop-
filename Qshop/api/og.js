// api/og.js — Vercel Serverless Function
// Serves link-preview HTML (Open Graph / Twitter tags) to social crawlers
// so shared UniHive links unfurl as branded cards: the product photo, the
// shop banner, the event poster or the pack's ticket art. Visible content
// and a canonical link, no JS redirects (avoids cloaking flags).

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://unihive.shop';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vycftqpspmxdohfbkqjb.supabase.co';
// Public anon key (same one shipped in the browser bundle) — products,
// shops and events are publicly readable, so no secret is needed here.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y2Z0cXBzcG14ZG9oZmJrcWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3OTk2NTMsImV4cCI6MjA1MDM3NTY1M30.3UrZciGE7CQMredpuJrun9gFsELlC8wDp81Suk7O9GI';

const HIVE_SLUG = 'the-hive-no-going-home';
const EUPHORIA_SLUGS = new Set(['unihive-opening']);

const CARD = (name) => `${SITE_URL}/og/${name}.jpg`;
const framed = (src, v = 'unihive') => `${SITE_URL}/api/og-image?src=${encodeURIComponent(src)}&v=${v}`;

const PACK_POSTERS = [
  [/vip/i, '/hive/media/vip-package.webp'],
  [/after dark/i, '/hive/media/after-dark.webp'],
  [/crew/i, '/hive/media/who-takes-the-stage.webp'],
  [/four/i, '/hive/media/wave-1-tickets.webp'],
  [/date/i, '/hive/media/blood-moon.webp'],
  [/table/i, '/hive/media/master-poster.webp'],
];
const packPoster = (name) => (PACK_POSTERS.find(([re]) => re.test(name || '')) || [null, '/hive/media/hive-info-flyer.webp'])[1];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;

function buildOgHtml({ title, description, image, url, type = 'website' }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${u}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="UniHive" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:image" content="${i}" />
  <meta property="og:image:secure_url" content="${i}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${t}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${i}" />
  <style>body{font-family:-apple-system,sans-serif;max-width:720px;margin:2rem auto;padding:1rem;color:#0D2B20;line-height:1.6}h1{font-family:Georgia,serif}</style>
</head>
<body>
  <header><h1>${t}</h1><p>${d}</p></header>
  <main><p><img src="${i}" alt="${t}" width="600" /></p><p><a href="${u}">Open on UniHive</a></p></main>
  <footer><p>UniHive · Nairobi, Kenya</p></footer>
</body>
</html>`;
}

async function resolve(db, path, query) {
  const url = `${SITE_URL}/${path}${query.item ? `?item=${encodeURIComponent(query.item)}` : query.pack ? `?pack=${encodeURIComponent(query.pack)}` : ''}`;

  const product = path.match(/^product\/([a-f0-9-]+)$/i);
  if (product) {
    const { data: p } = await db.from('products').select('id, name, description, price, image_url, seller_id').eq('id', product[1]).maybeSingle();
    if (p) {
      const { data: img } = await db.from('product_images').select('image_url').eq('product_id', p.id).order('is_primary', { ascending: false }).order('display_order').limit(1).maybeSingle();
      const { data: shop } = p.seller_id ? await db.from('shops').select('shop_name').eq('id', p.seller_id).maybeSingle() : { data: null };
      const photo = img?.image_url || p.image_url;
      return {
        url, type: 'product',
        title: `${p.name.trim()} — ${ksh(p.price)}`,
        description: `${shop?.shop_name ? `${shop.shop_name} on UniHive · ` : 'On UniHive · '}${(p.description || 'Tap to see it before it’s gone.').slice(0, 150)}`,
        image: photo ? framed(photo) : CARD('unihive'),
      };
    }
  }

  const seller = path.match(/^seller\/([a-f0-9-]+)$/i);
  if (seller) {
    const { data: s } = await db.from('shops').select('shop_name, description, banner_url').eq('id', seller[1]).maybeSingle();
    if (s) {
      return {
        url,
        title: `${s.shop_name} — shop on UniHive`,
        description: (s.description || `Browse ${s.shop_name} on UniHive.`).slice(0, 180),
        image: s.banner_url ? framed(s.banner_url) : CARD('unihive'),
      };
    }
  }

  const event = path.match(/^events\/([\w-]+)(\/wallet)?$/i);
  if (event) {
    const slug = event[1];
    if (slug === HIVE_SLUG) {
      if (query.item) {
        const { data: it } = await db.from('event_products').select('name, price, description, image_url').eq('id', query.item).maybeSingle();
        if (it) {
          return {
            url,
            title: `${it.name} — ${ksh(it.price)} at THE HIVE`,
            description: 'Pre-order on UniHive, skip the queue, redeem at the stand. Fri 30 Oct · Sarakasi Dome.',
            image: it.image_url ? framed(it.image_url, 'hive') : CARD('hive'),
          };
        }
      }
      if (query.pack) {
        const { data: pk } = await db.from('event_packages').select('name, base_price, description').eq('id', query.pack).maybeSingle();
        if (pk) {
          return {
            url,
            title: `${pk.name} — ${ksh(pk.base_price)} · THE HIVE: NO GOING HOME`,
            description: `${pk.description || 'Entry, drinks and wallet credit in one pass.'} Fri 30 Oct · Sarakasi Dome · 18+`,
            image: framed(packPoster(pk.name), 'hive'),
          };
        }
      }
      return {
        url,
        title: 'THE HIVE: NO GOING HOME — Fri 30 Oct, Sarakasi Dome',
        description: 'Halloween at the Dome. Ticket packs, drinks & bites, and the full lineup — all on UniHive. 18+.',
        image: CARD('hive'),
      };
    }
    if (EUPHORIA_SLUGS.has(slug)) {
      return { url, title: 'THE HIVE: EUPHORIA — it happened', description: 'Relive the night the Hive went loud. Photos, reels and what’s next.', image: CARD('euphoria') };
    }
    const { data: ev } = await db.from('events').select('title, description, image_url, venue, event_date').eq('slug', slug).maybeSingle();
    if (ev) {
      return {
        url,
        title: `${ev.title}${ev.venue ? ` — ${ev.venue}` : ''}`,
        description: (ev.description || 'Tickets on UniHive.').slice(0, 180),
        image: ev.image_url ? framed(ev.image_url) : CARD('buzz'),
      };
    }
  }

  if (path === 'hive/booth') return { url, title: 'The Hive Photo Booth — real nights, real people', description: 'Find yourself in the photos and reels from every Hive night.', image: CARD('booth') };
  if (path.startsWith('claim')) return { url, title: 'Claim your HIVE — THE HIVE: NO GOING HOME', description: 'Bought on Little Events? Link your ticket to unlock the HIVE Wallet and perks.', image: CARD('hive') };
  if (path === 'services') return { url, title: 'The Buzz — UniHive', description: 'Events, experiences and the people who make them.', image: CARD('buzz') };

  return {
    url,
    title: 'UniHive — Goods & The Buzz',
    description: 'Built by us, for us. Shop the marketplace, open your shop, and catch what’s happening next.',
    image: CARD('unihive'),
  };
}

export default async function handler(req, res) {
  const raw = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  const path = raw === 'home' ? '' : raw.replace(/^\/+|\/+$/g, '');
  let meta;
  try {
    const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    meta = await resolve(db, path, req.query);
  } catch (error) {
    console.error('OG handler error:', error);
    meta = { url: `${SITE_URL}/${path}`, title: 'UniHive — Goods & The Buzz', description: 'Built by us, for us.', image: CARD('unihive') };
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  return res.status(200).send(buildOgHtml(meta));
}
