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

export const LITTLE = {
  tickets: 'https://apps.little.africa/events/the-hive-no-going-home-',
  code: 'UNIHIVE26',
  offer: 'KSh 200 off Little Cab rides to and from Hive events',
};

export const PERKS = [
  { title: 'Ride with Little', body: 'Code UNIHIVE26 — KSh 200 off Little Cab rides to and from the Dome.' },
  { title: 'VIP treatment', body: 'Complimentary drink and private seating for VIP.' },
  { title: 'Dress to impress', body: 'Come in costume — and disturb.' },
  { title: 'Live sets all night', body: 'DJs on the decks and artists on stage, 6PM till late.' },
  { title: 'Usidrive ukiwa maji', body: 'Drink responsibly — let Little get you home.' },
];

export const PARTNERS = ['Little', 'Smirnoff', 'Red Bull', 'Charge24', "Harrison's Pearl Gerar"];

// Catalogue grouping — derived from product name so no schema change is needed.
export const BRANDS = [
  { key: 'smirnoff', label: 'Smirnoff', match: /smirnoff/i, cover: '/hive/products/smirnoff-ice-black.png', tint: 'from-[#5a0a10]' },
  { key: 'redbull', label: 'Red Bull', match: /red bull/i, cover: '/hive/products/redbull.png', tint: 'from-[#0b1d4a]' },
  { key: 'harrisons', label: "Harrison's Pearl Gerar", match: /shawarma|hotdog|hot dog/i, cover: '/hive/products/shawarma.png', tint: 'from-[#4a2205]' },
  { key: 'facepaint', label: 'Face & Body Paint', match: /paint/i, cover: '/hive/products/facepaint-luminous.webp', tint: 'from-[#0f3a12]' },
  { key: 'merch', label: 'THE HIVE Merch', match: /hive cup|tee/i, cover: '/hive/products/hive-cup-fang.webp', tint: 'from-[#2a2a2a]' },
];

export const brandOf = (product) => BRANDS.find((b) => b.match.test(product?.name || ''))?.key || 'other';

// Drinks that get the seasonal spider-web wrap (MAIN INSPO direction).
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
