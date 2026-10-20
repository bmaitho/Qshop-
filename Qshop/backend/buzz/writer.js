// Writes an issue of The Buzz in the UniHive voice. Uses Claude when
// ANTHROPIC_API_KEY is set; otherwise (or on any failure) a hand-written
// template. Output is validated: only URLs and images from the data survive.
import Anthropic from '@anthropic-ai/sdk';
import { allowedUrls } from './data.js';

const VOICE = `You write "The Buzz", UniHive's email to its community in Nairobi, Kenya.

UniHive connects people, creates opportunities and brings people together through experiences worth having: a marketplace of independent shops (The Goods), events and services (The Buzz), and THE HIVE, its own events. Values: quality experiences; no scams, no stress; we grow together; connecting people to possibilities; building a culture, not just a platform.

Voice: creative, minimal, quietly funny, cool and collected — the email people look forward to. Short lines. Confident, never needy. Light Sheng/Swahili is welcome where it lands naturally (e.g. "tunaenda", "sasa"), never forced. No exclamation-mark spam, no emoji walls (one or two at most), no corporate filler, no "Dear valued customer".

Hard rules:
- Use ONLY facts, names, prices, dates and URLs present in the DATA. Never invent offers, prices, line-ups, discounts or numbers.
- Paid event tickets are sold only on Little Events — say so and link the tickets_url; never suggest buying admission on UniHive.
- Free events: "free — RSVP on UniHive" with the event url.
- If a section has no data, leave it out. Fewer, better sections beat filler.
- Don't address the reader by name (the greeting is added separately).

Return ONLY a JSON object, no prose, in this shape:
{"subject": string (<= 60 chars, no clickbait), "preheader": string (<= 90 chars),
 "opener": string (1-2 short sentences),
 "sections": [{"kicker": string (2-4 words), "title": string (<= 8 words), "body": string (<= 45 words), "cta_label": string (<= 4 words), "cta_url": string (from DATA), "images": [string] (0-4 image URLs from DATA)}] (2-4 sections),
 "signoff": string (one line)}`;

const nice = (d) => new Date(`${d}T12:00:00+03:00`).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function validate(raw, data) {
  const urls = allowedUrls(data);
  const images = new Set([...data.new_products.map((p) => p.image), ...data.new_shops.map((s) => s.image)].filter(Boolean));
  const sections = (Array.isArray(raw?.sections) ? raw.sections : []).map((s) => ({
    kicker: clean(s.kicker, 40),
    title: clean(s.title, 80),
    body: clean(s.body, 400),
    cta_label: clean(s.cta_label, 30),
    cta_url: urls.has(s.cta_url) ? s.cta_url : null,
    images: (Array.isArray(s.images) ? s.images : []).filter((u) => images.has(u)).slice(0, 4),
  })).filter((s) => s.title && s.body).slice(0, 4);
  if (!raw?.subject || sections.length === 0) return null;
  return { subject: clean(raw.subject, 70), preheader: clean(raw.preheader, 110), opener: clean(raw.opener, 300), sections, signoff: clean(raw.signoff, 120) };
}

export function templateIssue(data) {
  const sections = [];
  const ev = data.events[0];
  if (ev) {
    const free = ev.admission.startsWith('free');
    sections.push({
      kicker: free ? 'Free · RSVP' : 'Coming up',
      title: ev.title,
      body: `${ev.venue || ''}${ev.venue ? ' · ' : ''}${nice(ev.date)}. ${free ? 'Free entry — RSVP on UniHive and your pass lands in My Tickets.' : 'Tickets exclusively on Little Events.'}`,
      cta_label: free ? 'RSVP free' : 'Get tickets',
      cta_url: free ? ev.url : (ev.tickets_url || ev.url),
      images: [],
    });
  }
  if (data.new_products.length) {
    sections.push({ kicker: 'Fresh on The Goods', title: 'New this week', body: 'Independent shops, real people, no scams. Pay through UniHive and the seller is paid when you confirm delivery.', cta_label: 'Browse The Goods', cta_url: data.links.marketplace, images: data.new_products.slice(0, 4).map((p) => p.image) });
  }
  if (data.new_shops.length) {
    sections.push({ kicker: 'New in the Hive', title: `${data.new_shops.length} new shop${data.new_shops.length > 1 ? 's' : ''} opened`, body: `Say hi to ${data.new_shops.map((s) => s.name).join(', ')}.`, cta_label: 'Visit', cta_url: data.new_shops[0].url, images: data.new_shops.map((s) => s.image).filter(Boolean).slice(0, 2) });
  }
  sections.push({ kicker: 'We grow together', title: 'Got something to sell?', body: 'Open a shop in minutes. When one wins, the Hive wins.', cta_label: 'Open your shop', cta_url: data.links.open_shop, images: [] });
  return { subject: ev ? `${ev.title} — and what’s new on UniHive` : 'What’s new on UniHive', preheader: 'Experiences worth having. Shops worth following.', opener: 'Here’s what’s buzzing. Two minutes, tops.', sections: sections.slice(0, 4), signoff: 'See you in the Hive.' };
}

export async function writeIssue(data) {
  if (!process.env.ANTHROPIC_API_KEY) return { issue: templateIssue(data), writtenBy: 'template' };
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: VOICE,
      messages: [{ role: 'user', content: `DATA:\n${JSON.stringify(data, null, 2)}\n\nWrite this week's issue.` }],
    });
    if (response.stop_reason === 'refusal') throw new Error('refused');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const issue = validate(JSON.parse(json), data);
    if (!issue) throw new Error('invalid issue');
    return { issue, writtenBy: 'claude' };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`Buzz writer API error ${err.status}:`, err.message);
    else console.error('Buzz writer fell back to template:', err.message);
    return { issue: templateIssue(data), writtenBy: 'template' };
  }
}
