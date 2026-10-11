// api/og-image.js — branded 1200x630 share image for any product, shop,
// pack or event photo. Social crawlers get a JPEG (WebP previews are
// unreliable on WhatsApp/Instagram), framed so the link reads as UniHive.
//
// GET /api/og-image?src=<image url or /path>&v=unihive|hive
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const SITE_URL = 'https://unihive.shop';
const ALLOWED_HOSTS = new Set(['unihive.shop', 'www.unihive.shop', 'vycftqpspmxdohfbkqjb.supabase.co']);
const W = 1200;
const H = 630;

const frames = {};
const frame = (v) => {
  const key = v === 'hive' ? 'hive' : 'unihive';
  if (!frames[key]) frames[key] = readFileSync(join(process.cwd(), 'api', '_og', `frame-${key}.png`));
  return frames[key];
};

function resolveSource(src) {
  if (!src) return null;
  const url = new URL(src, SITE_URL);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return null;
  return url.toString();
}

export default async function handler(req, res) {
  const target = resolveSource(req.query.src);
  if (!target) {
    res.statusCode = 302;
    res.setHeader('Location', `${SITE_URL}/og-default.jpg`);
    return res.end();
  }
  try {
    const upstream = await fetch(target);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const input = Buffer.from(await upstream.arrayBuffer());

    const backdrop = await sharp(input)
      .resize(W, H, { fit: 'cover' })
      .blur(28)
      .modulate({ brightness: 0.42, saturation: 1.15 })
      .toBuffer();

    const subject = await sharp(input)
      .resize(820, 470, { fit: 'inside', withoutEnlargement: false })
      .toBuffer();
    const meta = await sharp(subject).metadata();

    const out = await sharp(backdrop)
      .composite([
        { input: subject, left: Math.round((W - meta.width) / 2), top: Math.max(24, Math.round((H - 120 - meta.height) / 2)) },
        { input: frame(req.query.v), left: 0, top: 0 },
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).send(out);
  } catch (err) {
    console.error('og-image error:', err.message);
    res.statusCode = 302;
    res.setHeader('Location', `${SITE_URL}/og-default.jpg`);
    return res.end();
  }
}
