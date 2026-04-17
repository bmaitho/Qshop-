// api/og.js — Vercel Serverless Function
// Returns HTML with Open Graph meta tags for social media crawlers
// Handles: /seller/:id, /product/:id, /services, and fallback

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vycftqpspmxdohfbkqjb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://unihive.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Detect MIME type from URL extension
 */
function getImageMimeType(url) {
  if (!url) return 'image/jpeg';
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg'; // default for .jpg, .jpeg, and unknown
}

/**
 * Ensure image URL is compatible with social media crawlers.
 * - WhatsApp/Facebook have issues with WebP format
 * - Falls back to default OG image for unsupported formats
 */
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

  // Avoid WebP for FB/WA crawlers
  if (imageUrl.toLowerCase().endsWith('.webp')) {
    return DEFAULT_OG_IMAGE;
  }

  // Convert relative to absolute
  if (imageUrl.startsWith('/')) {
    imageUrl = `${SITE_URL}${imageUrl}`;
  }

  // Verify the URL actually serves an image, otherwise fallback
  const ok = await isImageUrlValid(imageUrl);
  return ok ? imageUrl : DEFAULT_OG_IMAGE;
}

function buildOgHtml({ title, description, image, url, type = 'website' }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  const imageType = getImageMimeType(image);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:url" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:site_name" content="UniHive" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />

  <!-- Redirect real users to the SPA (crawlers won't follow this) -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  <link rel="canonical" href="${safeUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeTitle}</a>...</p>
</body>
</html>`;
}

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : (path || '');
  const url = `${SITE_URL}/${fullPath}`;

  // Only initialize Supabase if we have a service key
  let supabase = null;
  if (SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  try {
    // ── /seller/:id ──────────────────────────────────────────────
    const sellerMatch = fullPath.match(/^seller\/([a-f0-9-]+)$/i);
    if (sellerMatch && supabase) {
      const shopId = sellerMatch[1];

      // Fetch shop data
      const { data: shop } = await supabase
        .from('shops')
        .select('shop_name, description, banner_url, rating, review_count')
        .eq('id', shopId)
        .single();

      if (shop) {
        // Count active products
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

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
        return res.status(200).send(buildOgHtml({ title, description: desc, image: safeImage, url }));
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
        // Get shop name separately (seller_id = shops.id)
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

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
        return res.status(200).send(buildOgHtml({ title, description: desc, image: safeImage, url, type: 'product' }));
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
    // Return fallback on error
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(buildOgHtml({
      title: 'UniHive — Student Marketplace',
      description: 'Empowering student entrepreneurs. Buy, sell, and develop real business skills within your university community.',
      image: DEFAULT_OG_IMAGE,
      url
    }));
  }
}