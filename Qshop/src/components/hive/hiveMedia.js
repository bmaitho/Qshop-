// Official THE HIVE: NO GOING HOME media, served from public/hive/.
export const HIVE_SLUG = 'the-hive-no-going-home';
export const EUPHORIA_SLUGS = ['unihive-opening'];
export const isEuphoriaSlug = (slug = '') => EUPHORIA_SLUGS.includes(slug) || /euphoria/i.test(slug);
export const HIVE_STARTS_AT = '2026-10-30T18:00:00+03:00';

const m = (name) => `/hive/media/${name}.webp`;
const v = (name) => ({ src: `/hive/video/${name}.mp4`, poster: `/hive/video/${name}.webp` });

export const POSTERS = {
  master: m('master-poster'),
  bloodMoon: m('blood-moon'),
  info: m('hive-info-flyer'),
  guessWho: m('guess-who'),
  whoTakesStage: m('who-takes-the-stage'),
  earlyBird: m('early-bird-sold-out'),
  afterDark: m('after-dark'),
  wave1: m('wave-1-tickets'),
  vendors: m('call-for-vendors'),
  faceBoardA: m('facepaint-board-a'),
  faceBoardB: m('facepaint-board-b'),
  bannerWide: m('banner-wide'),
};

export const VIDEOS = {
  recap: v('recap'),
  behind: v('behind-the-entertainment'),
  akuku: v('dj-bahati-akuku'),
  countdown: v('countdown'),
  fringe: v('dj-fringe'),
  ready: v('are-you-ready'),
  btsReel: v('ngh-bts-reel'),
  euphoriaReel: v('euphoria-reel'),
  euphoriaWide: v('euphoria-wide'),
  // Pre-party (Oct 2026): the UniHive neon night, Supee x Smirnoff, Siwaka Podcast x UniHive.
  neonNight: v('neon-night'),
  supeeSmirnoff: v('supee-smirnoff'),
  siwakaUnihive: v('siwaka-unihive'),
  crewCheer1: v('crew-cheer-1'),
  crewCheer2: v('crew-cheer-2'),
  lakeSelfie: v('lake-selfie'),
};

// Our own Halloween face-paint shoot (real UniHive faces), used for the
// face-paint products, the lookbook and the billboards.
const fp = (name) => `/hive/facepaint/${name}`;
export const FACEPAINT = {
  uv: { src: fp('uv-mirror.mp4'), poster: fp('uv-mirror.webp') },
  clown: { src: fp('clown-reveal.mp4'), poster: fp('clown-body.webp') },
  flower: fp('look-flower.webp'),
  red: fp('look-red.webp'),
};

const b = (name) => `/hive/booth/${name}.webp`;
export const BOOTH = { b };

// Public Drive folders holding the full-quality event photography.
export const DRIVE_FOLDERS = {
  'no-going-home': { label: 'THE HIVE: NO GOING HOME — behind the scenes', url: 'https://drive.google.com/drive/folders/1PM0zcV4uM_oU3N1od241dKbwHrlG8P3Z' },
  euphoria: { label: 'THE HIVE: EUPHORIA', url: 'https://drive.google.com/drive/folders/1d1SgXLvHK8Ku7wFRLXSYPUuKVK-vo1uy' },
};

export const LINEUP = [
  { name: 'DJ FRINGE', role: 'On the decks', poster: m('dj-fringe'), video: VIDEOS.fringe },
  { name: 'DJ BAHATI AKUKU', role: 'On the decks', poster: m('dj-akuku'), video: VIDEOS.akuku },
  { name: 'DJ NIKX', role: 'On the decks', poster: m('dj-nikx') },
  { name: 'DJ PICCASSO', role: 'On the decks', poster: m('dj-piccasso') },
  { name: 'DENZZ', role: 'On stage', poster: m('denzz') },
  { name: 'SUPEE', role: 'On stage', poster: m('supee') },
];

export const SOCIALS = {
  instagram: { label: 'Instagram', handle: '@unihive.entertainment', url: 'https://www.instagram.com/unihive.entertainment/' },
  tiktok: { label: 'TikTok', handle: '@unihive.entertainment', url: 'https://www.tiktok.com/@unihive.entertainment' },
};

const LITTLE_EVENT = 'https://apps.little.africa/events/the-hive-no-going-home-';

// Ticket discount on Little: 25% off Regular, 20% off VIP with a code in the
// link. Each university's plug has its own code (STRATHMORE, USIU, ...);
// anyone who arrives on unihive.shop with ?code=XYZ keeps that code on every
// "Tickets on Little" button (see rememberTicketCode). Everyone else gets
// UNIHIVE. After doors open the buttons go back to the plain Little page.
export const PROMO = {
  defaultCode: 'UNIHIVE',
  regularOff: 25,
  vipOff: 20,
  startsAt: '2026-10-23T00:00:00+03:00',
  endsAt: '2026-10-30T18:00:00+03:00',
};
export const promoActive = () => {
  const now = Date.now();
  return now >= new Date(PROMO.startsAt).getTime() && now < new Date(PROMO.endsAt).getTime();
};

const CODE_KEY = 'hiveTicketCode';
const CODE_RE = /^[A-Za-z0-9]{3,24}$/;
// Called once on page load: keep a university code from the link (?code=USIU).
export const rememberTicketCode = (search = window.location.search) => {
  try {
    const code = new URLSearchParams(search).get('code');
    if (code && CODE_RE.test(code)) localStorage.setItem(CODE_KEY, code.toUpperCase());
  } catch { /* storage blocked: fall back to the default code */ }
};
export const ticketCode = () => {
  try {
    const c = localStorage.getItem(CODE_KEY);
    if (c && CODE_RE.test(c)) return c;
  } catch { /* ignore */ }
  return PROMO.defaultCode;
};
export const isUniCode = () => ticketCode() !== PROMO.defaultCode;
export const discounted = (tier) => Math.round(tier.price * (1 - (tier.vip ? PROMO.vipOff : PROMO.regularOff) / 100));

export const LITTLE = {
  get tickets() { return promoActive() ? `${LITTLE_EVENT}?code=${ticketCode()}` : LITTLE_EVENT; },
  code: 'UNIHIVE26',
  offer: 'KSh 200 off Little Cab rides to and from Hive events',
};

// Ticket waves, as listed on Little Events (the only place tickets are sold).
// Update `onSale`/`soldOut` and the tiers when Little moves to the next wave.
export const WAVES = {
  soldOut: 'Wave 1',
  onSale: 'Wave 2',
  tiers: [
    // As listed on Little, 23 Oct 2026.
    { name: 'Single Hive Regular', price: 1500 },
    { name: 'Hive of 4 Regular', price: 4800 },
    { name: 'Hive of 6 Regular', price: 5000 },
    { name: 'VIP Hive Single', price: 2500, vip: true, perk: 'Complimentary Red Bull' },
    { name: 'VIP Hive Duo', price: 4500, vip: true, perk: 'Complimentary Red Bull + Smirnoff cans', limited: true },
    { name: 'Hive of 6 VIP', price: 8000, vip: true, perk: 'Complimentary Smirnoff & Red Bull cans for the whole crew', limited: true },
  ],
};

export const PERKS = [
  { title: 'Ride with Little', body: 'Code UNIHIVE26 — KSh 200 off Little Cab rides to and from the Dome.' },
  { title: 'VIP = free Red Bull', body: 'Every VIP ticket comes with a complimentary Red Bull — VIP Duo and Hive of 6 VIP add Smirnoff cans.' },
  { title: 'Costume competition', body: 'Cartoons, villains, main characters — lots of prizes for the best costumes. Don’t show up looking regular.' },
  { title: 'Live sets all night', body: 'DJs on the decks and artists on stage, 6PM until 4AM.' },
  { title: 'Stay charged', body: 'Charge24 power-bank stations on site — keep your phone alive till 4AM.' },
  { title: 'Usidrive ukiwa maji', body: 'Drink responsibly — let Little get you home.' },
];

export const PARTNERS = ['Little', 'Smirnoff', 'Red Bull', 'Charge24', "Harrison's Pearl Gerar"];

// Catalogue grouping — derived from product name so no schema change is needed.
export const BRANDS = [
  { key: 'smirnoff', label: 'Smirnoff', tag: 'Kuja tukate tukatiane.', match: /smirnoff/i, cover: '/hive/products/smirnoff-ice-black-webs.webp', tint: 'from-[#5a0a10]' },
  { key: 'redbull', label: 'Red Bull', match: /red bull/i, cover: '/hive/products/redbull.png', tint: 'from-[#0b1d4a]' },
  { key: 'harrisons', label: "Harrison's Pearl Gerar", match: /shawarma|hotdog|hot dog/i, cover: '/hive/products/shawarma.png', tint: 'from-[#4a2205]' },
  { key: 'facepaint', label: 'Face & Body Paint', by: 'Radiant By Tatty', tag: 'by Radiant By Tatty', instagram: 'https://www.instagram.com/radiantby_tatty/', match: /paint/i, cover: '/hive/facepaint/look-red.webp', tint: 'from-[#0f3a12]' },
  { key: 'merch', label: 'THE HIVE Merch', match: /hive cup|tee/i, cover: '/hive/products/hive-cup-fang.webp', tint: 'from-[#2a2a2a]' },
];

export const brandOf = (product) => BRANDS.find((b) => b.match.test(product?.name || ''))?.key || 'other';

// Drinks that get the seasonal spider-web wrap (MAIN INSPO direction).
// Listed but not on sale yet (shown as "Coming soon").
export const COMING_SOON = ['After Dark Tee'];
export const isComingSoon = (product) => COMING_SOON.includes(product?.name);

export const isWebbedCan = (product) => /red bull|guarana/i.test(product?.name || '');

// Package → poster backdrop for the Ticket Packs cards.
export const packagePoster = (pkg) => {
  const n = (pkg?.name || '').toLowerCase();
  if (n.includes('vip')) return m('vip-package');
  if (n.includes('after dark')) return POSTERS.afterDark;
  if (n.includes('crew')) return POSTERS.whoTakesStage;
  if (n.includes('four')) return POSTERS.wave1;
  if (n.includes('date')) return POSTERS.bloodMoon;
  if (n.includes('table')) return POSTERS.master;
  return POSTERS.info;
};
