// api/og.js — Vercel Serverless Function
// Returns HTML with Open Graph meta tags for social media crawlers.
// FIXED: No JavaScript redirects, no cloaking patterns. Crawler sees a real
// HTML page with visible content + canonical link to the real URL.
// This prevents Google Safe Browsing from flagging the site as deceptive.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vycftqpspmxdohfbkqjb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://unihive.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
const DEFAULT_OG_WIDTH = 1200;
const DEFAULT_OG_HEIGHT = 630;

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getImageMimeType(url) {
  if (!url) return 'image/jpeg';
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function isImageUrlValid(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return ct.startsWith('image/');
  } catch (err) {
    return false;
  }
}

async function getSafeImageUrl(imageUrl) {
  if (!imageUrl) return DEFAULT_OG_IMAGE;
  if (imageUrl.startsWith('/')) {
    imageUrl = `${SITE_URL}${imageUrl}`;
  }
  if (imageUrl.toLowerCase().endsWith('.webp')) {
    return DEFAULT_OG_IMAGE;
  }
  const ok = await isImageUrlValid(imageUrl);
  return ok ? imageUrl : DEFAULT_OG_IMAGE;
}

/**
 * Build a full HTML page that:
 *  - Has all OG / Twitter meta tags (so social cards work)
 *  - Has a <link rel="canonical"> pointing at the real URL
 *  - Has VISIBLE content describing the page (so Safe Browsing sees a real page, not a cloak)
 *  - Has NO JavaScript redirect (the cloaking signal)
 *  - Has a normal HTML link the crawler can follow naturally
 */
function buildOgHtml({ title, description, image, url, type = 'website', width = DEFAULT_OG_WIDTH, height = DEFAULT_OG_HEIGHT, bodyContent = null }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  const imageType = getImageMimeType(image);

  // Default visible body if none supplied — keeps the page from looking empty/cloaked
  const visibleBody = bodyContent || `
    <header>
      <h1>${safeTitle}</h1>
      <p>${safeDesc}</p>
    </header>
    <main>
      <p>UniHive is a student marketplace platform serving Kenyan universities. Buy and sell textbooks, electronics, stationery, and study materials within your campus community.</p>
      <p><a href="${safeUrl}" rel="canonical">Visit UniHive</a></p>
    </main>
    <footer>
      <p>UniHive Marketplace &middot; Nairobi, Kenya</p>
    </footer>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />

  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:url" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="${width}" />
  <meta property="og:image:height" content="${height}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:site_name" content="UniHive" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />

  <style>
    body { font-family: 'Open Sans', -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 1rem; color: #0D2B20; line-height: 1.6; }
    h1 { color: #0D2B20; font-family: 'Playfair Display', serif; }
    a { color: #0D2B20; }
  </style>
</head>
<body>
${visibleBody}
</body>
</html>`;
}

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : (path || '');
  const url = `${SITE_URL}/${fullPath}`;

  let supabase = null;
  if (SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  try {
    // ── /seller/:id ──────────────────────────────────────────────
    const sellerMatch = fullPath.match(/^seller\/([a-f0-9-]+)$/i);
    if (sellerMatch && supabase) {
      const shopId = sellerMatch[1];
      const { data: shop } = await supabase
        .from('shops')
        .select('shop_name, description, banner_url, rating, review_count')
        .eq('id', shopId)
        .single();

      if (shop) {
        const { count: productCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', shopId)
          .eq('status', 'active');

        const title = `${shop.shop_name} — UniHive`;
        const desc = shop.description
          ? `${shop.description}${productCount ? ` • ${productCount} product${productCount !== 1 ? 's' : ''} available` : ''}`
          : `Check out ${shop.shop_name} on UniHive${productCount ? ` — ${productCount} product${productCount !== 1 ? 's' : ''} available` : ''}`;
        const imageUrl = shop?.banner_url || DEFAULT_OG_IMAGE;
        const safeImage = await getSafeImageUrl(imageUrl);

        const bodyContent = `
          <header>
            <h1>${escapeHtml(shop.shop_name)}</h1>
            <p>${escapeHtml(desc)}</p>
          </header>
          <main>
            <p>Browse products from ${escapeHtml(shop.shop_name)} on UniHive, the student marketplace platform serving Kenyan universities.</p>
            ${productCount ? `<p>${productCount} active product${productCount !== 1 ? 's' : ''} available.</p>` : ''}
            <p><a href="${escapeHtml(url)}" rel="canonical">View shop on UniHive</a></p>
          </main>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
        return res.status(200).send(buildOgHtml({ title, description: desc, image: safeImage, url, bodyContent }));
      }
    }

    // ── /product/:id ─────────────────────────────────────────────
    const productMatch = fullPath.match(/^product\/([a-f0-9-]+)$/i);
    if (productMatch && supabase) {
      const productId = productMatch[1];
      const { data: product } = await supabase
        .from('products')
        .select('name, description, price, image_url, seller_id')
        .eq('id', productId)
        .single();

      if (product) {
        let shopName = '';
        if (product.seller_id) {
          const { data: shopData } = await supabase
            .from('shops')
            .select('shop_name')
            .eq('id', product.seller_id)
            .single();
          shopName = shopData?.shop_name || '';
        }

        const price = product.price ? `KSh ${Number(product.price).toLocaleString()}` : '';
        const title = `${product.name}${price ? ` — ${price}` : ''} | UniHive`;
        const desc = product.description
          ? product.description.substring(0, 200)
          : `${product.name}${shopName ? ` by ${shopName}` : ''} on UniHive marketplace`;
        const imageUrl = product?.image_url || DEFAULT_OG_IMAGE;
        const safeImage = await getSafeImageUrl(imageUrl);

        const bodyContent = `
          <header>
            <h1>${escapeHtml(product.name)}</h1>
            ${price ? `<p><strong>${escapeHtml(price)}</strong></p>` : ''}
            <p>${escapeHtml(desc)}</p>
          </header>
          <main>
            ${shopName ? `<p>Sold by ${escapeHtml(shopName)} on UniHive.</p>` : ''}
            <p>UniHive is a student marketplace platform serving Kenyan universities.</p>
            <p><a href="${escapeHtml(url)}" rel="canonical">View product on UniHive</a></p>
          </main>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
        return res.status(200).send(buildOgHtml({ title, description: desc, image: safeImage, url, type: 'product', bodyContent }));
      }
    }

    // ── /services ────────────────────────────────────────────────
    if (fullPath === 'services') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).send(buildOgHtml({
        title: 'Services — UniHive',
        description: 'Book trips, accommodations, events and more through UniHive. Student-friendly services at great prices.',
        image: DEFAULT_OG_IMAGE,
        url
      }));
    }

    // ── Fallback (home, marketplace, etc.) ───────────────────────
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).send(buildOgHtml({
      title: 'UniHive — Student Marketplace',
      description: 'Empowering student entrepreneurs. Buy, sell, and develop real business skills within your university community.',
      image: DEFAULT_OG_IMAGE,
      url
    }));

  } catch (error) {
    console.error('OG handler error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(buildOgHtml({
      title: 'UniHive — Student Marketplace',
      description: 'Empowering entrepreneurs. Buy, sell, and develop real business skills within your community.',
      image: DEFAULT_OG_IMAGE,
      url
    }));
  }
}
