// Gathers the facts an issue of The Buzz is written from. Only real data:
// the writer may not mention anything that isn't in here.
import { supabase } from '../supabaseClient.js';

const SITE = 'https://unihive.shop';
const HIVE_SLUG = 'the-hive-no-going-home';
const LITTLE_TICKETS = 'https://apps.little.africa/events/the-hive-no-going-home-';
const abs = (u) => (!u ? null : u.startsWith('http') ? u : `${SITE}${u}`);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

export async function gatherBuzzData() {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [{ data: events }, { data: newProducts }, { data: newShops }, { count: shopCount }, { data: poll }] = await Promise.all([
    supabase.from('events').select('title, slug, event_date, event_time, venue, price, rsvp_enabled, description')
      .in('status', ['upcoming', 'live']).gte('event_date', today).lte('event_date', in30).order('event_date'),
    supabase.from('products').select('id, name, price, image_url, created_at')
      .eq('status', 'active').not('image_url', 'is', null).gte('created_at', daysAgo(10))
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('shops').select('id, shop_name, banner_url, created_at')
      .eq('status', 'active').gte('created_at', daysAgo(14)).order('created_at', { ascending: false }).limit(4),
    supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.rpc('hive_poll_counts', { p_poll: 'redbull-vodka' }),
  ]);

  const pollRow = Array.isArray(poll) ? poll[0] : poll;
  return {
    generated_for: today,
    events: (events || []).map((e) => ({
      title: e.title,
      date: e.event_date,
      time: e.event_time,
      venue: e.venue,
      admission: e.slug === HIVE_SLUG ? 'paid — tickets exclusively on Little Events' : e.rsvp_enabled && Number(e.price) === 0 ? 'free — RSVP on UniHive' : Number(e.price) === 0 ? 'free' : 'paid — tickets on Little Events',
      url: `${SITE}/events/${e.slug}`,
      tickets_url: e.slug === HIVE_SLUG ? LITTLE_TICKETS : null,
      blurb: (e.description || '').slice(0, 240),
    })),
    new_products: (newProducts || []).map((p) => ({ name: p.name, price_ksh: p.price, image: abs(p.image_url), url: `${SITE}/product/${p.id}` })),
    new_shops: (newShops || []).map((s) => ({ name: s.shop_name, image: abs(s.banner_url), url: `${SITE}/seller/${s.id}` })),
    active_shops: shopCount || 0,
    poll: pollRow ? { question: 'Y’all want Red Bull to release a vodka?', yes: Number(pollRow.yes || 0), no: Number(pollRow.no || 0), url: `${SITE}/events/${HIVE_SLUG}` } : null,
    links: { home: SITE, marketplace: `${SITE}/studentmarketplace`, buzz: `${SITE}/services`, open_shop: `${SITE}/myshop` },
    socials: { instagram: 'https://www.instagram.com/unihive.entertainment/', tiktok: 'https://www.tiktok.com/@unihive.entertainment' },
  };
}

// Every URL the writer is allowed to use.
export function allowedUrls(data) {
  const set = new Set([...Object.values(data.links), ...Object.values(data.socials)]);
  data.events.forEach((e) => { set.add(e.url); if (e.tickets_url) set.add(e.tickets_url); });
  data.new_products.forEach((p) => set.add(p.url));
  data.new_shops.forEach((s) => set.add(s.url));
  if (data.poll) set.add(data.poll.url);
  return set;
}
