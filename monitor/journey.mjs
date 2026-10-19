// UniHive synthetic monitor: walks the live site like a visitor, read-only.
// Fails (exit 1) on anything a user would notice: page errors, missing
// content, broken images, failed APIs, broken link previews, slow loads.
// Usage: node monitor/journey.mjs [https://unihive.shop]
import { chromium } from 'playwright';
import fs from 'fs';

const SITE = process.argv[2] || 'https://unihive.shop';
const API = 'https://unihive-wba0.onrender.com';
const SUPA = 'https://vycftqpspmxdohfbkqjb.supabase.co';
// Public anon key (same one the website ships); read from the repo.
const ANON = (fs.readFileSync(new URL('../Qshop/api/og.js', import.meta.url), 'utf8').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/) || [])[0];
const SLOW_MS = 6000;   // warn
const FAIL_MS = 15000;  // fail

const fails = [];
const warns = [];
const rows = [];
const fail = (where, msg) => fails.push(`**${where}** — ${msg}`);
const warn = (where, msg) => warns.push(`${where} — ${msg}`);
const t0 = () => Date.now();

async function supa(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// ── 1. Back end and data ──────────────────────────────────────────────
async function checkData() {
  try {
    const s = t0();
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(60000) });
    const j = await r.json();
    const ms = Date.now() - s;
    if (j.status !== 'ok') fail('Backend', `health returned ${JSON.stringify(j)}`);
    else if (ms > SLOW_MS) warn('Backend', `health took ${ms}ms (cold start?)`);
    rows.push(['Backend API (payments, emails)', j.status === 'ok' ? 'ok' : 'DOWN', `${ms}ms`]);
  } catch (e) { fail('Backend', `unreachable: ${e.message}`); rows.push(['Backend API', 'DOWN', '']); }

  try {
    const [pp] = await supa('events?select=slug,rsvp_enabled,max_capacity,tickets_sold&slug=eq.the-hive-pre-party');
    const [hive] = await supa('events?select=slug,status&slug=eq.the-hive-no-going-home');
    const products = await supa(`event_products?select=name,price,image_url&active=eq.true&event_id=not.is.null`);
    if (!hive) fail('Data', 'THE HIVE event row missing');
    if (!products.length) fail('Data', 'no active HIVE products');
    products.filter((p) => !p.image_url || !(Number(p.price) > 0)).forEach((p) => warn('Catalogue', `${p.name}: ${!p.image_url ? 'no image' : 'no price'}`));
    if (pp) {
      const left = pp.max_capacity != null ? pp.max_capacity - (pp.tickets_sold || 0) : null;
      if (!pp.rsvp_enabled) warn('Pre-party', 'RSVP is switched off');
      if (left !== null && left <= 10) warn('Pre-party', `${left} RSVP spots left of ${pp.max_capacity}`);
      rows.push(['Pre-party RSVPs', `${pp.tickets_sold || 0}${pp.max_capacity ? ` / ${pp.max_capacity}` : ''}`, '']);
    }
    rows.push(['Database (Supabase)', 'ok', `${products.length} live products`]);
  } catch (e) { fail('Database', e.message); rows.push(['Database (Supabase)', 'DOWN', '']); }
}

// ── 2. Link previews (WhatsApp / Instagram / TikTok crawlers) ─────────
async function checkPreviews() {
  for (const path of ['/', '/events/the-hive-no-going-home', '/events/the-hive-pre-party', '/hive/siwaka']) {
    try {
      const html = await (await fetch(SITE + path, { headers: { 'User-Agent': 'WhatsApp/2.23.20.0' } })).text();
      const img = (html.match(/property="og:image" content="([^"]+)"/) || [])[1];
      const title = (html.match(/property="og:title" content="([^"]+)"/) || [])[1];
      if (!img || !title) { fail('Link preview', `${path} has no og:title/og:image`); continue; }
      const ir = await fetch(img.replace(/&amp;/g, '&'), { redirect: 'follow' });
      if (!ir.ok || !(ir.headers.get('content-type') || '').startsWith('image/')) fail('Link preview', `${path} image broken (${ir.status})`);
    } catch (e) { fail('Link preview', `${path}: ${e.message}`); }
  }
  rows.push(['Link previews', fails.some((f) => f.includes('Link preview')) ? 'BROKEN' : 'ok', '4 pages']);
}

// ── 3. The visitor journey in a real browser (phone) ──────────────────
const IGNORE = /favicon|vercel-scripts|_vercel\/(insights|speed)|google-analytics|ResizeObserver loop|Failed to load resource: net::ERR_ABORTED|AbortError/i;

async function visit(ctx, name, path, check) {
  const page = await ctx.newPage();
  const errors = [];
  const onErr = (e) => { if (!IGNORE.test(String(e.message || e))) errors.push(String(e.message || e)); };
  const onConsole = (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text()); };
  const onResp = (r) => { const u = r.url(); if (r.status() >= 500 && !IGNORE.test(u)) errors.push(`${r.status()} ${u}`); };
  page.on('pageerror', onErr); page.on('console', onConsole); page.on('response', onResp);
  const s = t0();
  try {
    const res = await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
    await check(page);
    const ms = Date.now() - s;
    // broken images that are on screen
    await page.waitForTimeout(1500);
    const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => !/supabase\.co\/storage\//.test(i.currentSrc || i.src) && i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 40 && getComputedStyle(i).display !== 'none').map((i) => i.currentSrc || i.src));
    if (broken.length) fail(name, `broken images: ${broken.slice(0, 3).join(', ')}`);
    if (errors.length) fail(name, `errors: ${errors.slice(0, 3).join(' | ')}`);
    if (ms > FAIL_MS) fail(name, `took ${ms}ms to show content`);
    else if (ms > SLOW_MS) warn(name, `slow: ${ms}ms`);
    rows.push([name, broken.length || errors.length ? 'ISSUE' : 'ok', `${ms}ms`]);
  } catch (e) {
    fail(name, e.message.split('\n')[0]);
    rows.push([name, 'FAIL', '']);
  } finally {
    await page.close().catch(() => {});
  }
}

const sees = (text) => async (p) => { await p.getByText(text).first().waitFor({ state: 'visible', timeout: FAIL_MS }); };

async function journey() {
  // MONITOR_LOCAL=1 only for running behind a TLS-inspecting proxy in dev.
  const local = process.env.MONITOR_LOCAL === '1';
  const browser = await chromium.launch(local ? { executablePath: process.env.PW_EXEC, proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined } : {});
  const ctx = await browser.newContext({ ignoreHTTPSErrors: local, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 UniHiveMonitor' });
  // Don't pull photos straight from Supabase Storage: every run would eat into
  // Supabase's bandwidth quota. Photos served through Vercel's image CDN are
  // still loaded (and checked), since those come from Vercel's cache.
  await ctx.route(/supabase\.co\/storage\/v1\/(object|render)\//, (route) => route.abort());
  let productId = null;
  try { productId = (await supa('products?select=id&status=eq.active&order=created_at.desc&limit=1'))[0]?.id; } catch { /* reported above */ }

  await visit(ctx, 'Home', '/', sees('Featured Shops'));
  await visit(ctx, 'Marketplace', '/studentmarketplace', async (p) => { await p.locator('a[href^="/product/"], [class*="product"]').first().waitFor({ timeout: FAIL_MS }); });
  if (productId) await visit(ctx, 'Product page', `/product/${productId}`, async (p) => { await p.getByText(/KES|KSh/).first().waitFor({ timeout: FAIL_MS }); });
  await visit(ctx, 'THE HIVE · Bar & Bites', '/events/the-hive-no-going-home', async (p) => {
    await p.getByText('No Going Home').first().waitFor({ timeout: FAIL_MS });
    await p.getByText(/KSh \d/).first().waitFor({ timeout: FAIL_MS });
    const n = await p.getByText(/KSh \d/).count();
    if (n < 5) throw new Error(`only ${n} priced items visible`);
  });
  await visit(ctx, 'THE HIVE · The Night', '/events/the-hive-no-going-home?tab=night', sees('Tonight at THE Sarakasi Dome'));
  await visit(ctx, 'THE HIVE · Specials', '/events/the-hive-no-going-home?tab=packs', sees(/Little/));
  await visit(ctx, 'Pre-party', '/events/the-hive-pre-party', async (p) => {
    await p.getByText('Good vibes. New connections. Big energy.').first().waitFor({ timeout: FAIL_MS });
    const rsvp = p.getByRole('button', { name: /RSVP/ }).first();
    const full = p.getByText(/RSVPs are full|isn’t open/).first();
    await Promise.race([rsvp.waitFor({ timeout: FAIL_MS }), full.waitFor({ timeout: FAIL_MS })]);
  });
  await visit(ctx, 'Photo Booth', '/hive/booth', sees('Real nights. Real people.'));
  await visit(ctx, 'Siwaka Podcast', '/hive/siwaka', sees('The Siwaka Podcast'));
  await visit(ctx, 'The Buzz', '/services', sees(/Events/));
  await visit(ctx, 'Sign in', '/auth', async (p) => { await p.locator('input[type="email"], input[type="password"]').first().waitFor({ timeout: FAIL_MS }); });
  await visit(ctx, 'Terms', '/terms', sees('Terms & Conditions'));

  // Logged-out RSVP should send people to sign in, not break.
  const page = await ctx.newPage();
  try {
    await page.goto(`${SITE}/events/the-hive-pre-party`, { waitUntil: 'domcontentloaded' });
    const btn = page.getByRole('button', { name: /RSVP ON UNIHIVE/ }).first();
    if (await btn.isVisible({ timeout: FAIL_MS }).catch(() => false)) {
      await btn.click();
      await page.waitForURL(/\/auth/, { timeout: FAIL_MS });
    }
    rows.push(['RSVP flow (logged out → sign in)', 'ok', '']);
  } catch (e) { fail('RSVP flow', `logged-out RSVP didn’t reach sign-in: ${e.message.split('\n')[0]}`); rows.push(['RSVP flow', 'FAIL', '']); }

  await browser.close();
}

await checkData();
await checkPreviews();
await journey();

const md = [
  `## UniHive live check — ${fails.length ? `🚨 ${fails.length} problem${fails.length > 1 ? 's' : ''}` : '✅ all good'}`,
  `_${new Date().toISOString()}_`, '',
  '| Check | Status | Time |', '|---|---|---|', ...rows.map((r) => `| ${r.join(' | ')} |`), '',
  ...(fails.length ? ['### Problems', ...fails.map((f) => `- ${f}`), ''] : []),
  ...(warns.length ? ['### Heads-up', ...warns.map((w) => `- ${w}`)] : []),
].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
// Annotations show up on the run page and through the API.
if (process.env.GITHUB_ACTIONS) {
  const esc = (x) => String(x).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::notice title=Live check::${esc(rows.map((r) => `${r[0]}: ${r[1]}${r[2] ? ` (${r[2]})` : ''}`).join('\n'))}`);
  warns.forEach((w) => console.log(`::warning title=Heads-up::${esc(w)}`));
  fails.forEach((f) => console.log(`::error title=Problem::${esc(f.replace(/\*\*/g, ''))}`));
}
fs.writeFileSync('monitor-report.md', md);
process.exit(fails.length ? 1 : 0);
