// Official THE HIVE: NO GOING HOME media, served from public/hive/.
export const HIVE_SLUG = 'the-hive-no-going-home';
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
};

export const LINEUP = [
  { name: 'DJ FRINGE', role: 'On the decks', poster: m('dj-fringe'), video: VIDEOS.fringe },
  { name: 'DJ BAHATI AKUKU', role: 'On the decks', poster: m('dj-akuku'), video: VIDEOS.akuku },
  { name: 'DJ NIKX', role: 'On the decks', poster: m('dj-nikx') },
  { name: 'DJ PICCASSO', role: 'On the decks', poster: m('dj-piccasso') },
  { name: 'DENZZ', role: 'On stage', poster: m('denzz') },
  { name: 'SUPEE', role: 'On stage', poster: m('supee') },
];

// Billboard rotation — every official poster and video appears here.
export const BILLBOARD_SLIDES = [
  { type: 'video', ...VIDEOS.recap, ratio: 16 / 9, caption: 'Last time the Hive opened its doors' },
  { type: 'image', src: POSTERS.master, caption: 'THE HIVE · NO GOING HOME · Fri 30 Oct · Sarakasi Dome' },
  { type: 'video', ...VIDEOS.countdown, caption: 'The countdown to Fright Night begins' },
  { type: 'image', src: POSTERS.bloodMoon, caption: 'One night. Endless memories.' },
  { type: 'image', src: POSTERS.wave1, caption: 'Wave 1 — GA 1,000 · Group of 4 3,500 · VIP 2,000' },
  { type: 'video', ...VIDEOS.fringe, caption: 'DJ FRINGE will be performing' },
  { type: 'image', src: m('dj-fringe'), caption: 'On the decks: DJ FRINGE' },
  { type: 'video', ...VIDEOS.akuku, caption: 'DJ BAHATI AKUKU will be performing' },
  { type: 'image', src: m('dj-akuku'), caption: 'On the decks: DJ AKUKU' },
  { type: 'image', src: m('dj-nikx'), caption: 'On the decks: DJ NIKX' },
  { type: 'image', src: m('dj-piccasso'), caption: 'On the decks: DJ PICCASSO' },
  { type: 'image', src: m('denzz'), caption: 'On stage: DENZZ' },
  { type: 'image', src: m('supee'), caption: 'On stage: SUPEE' },
  { type: 'video', ...VIDEOS.ready, caption: 'Are you ready?' },
  { type: 'image', src: POSTERS.afterDark, caption: 'Where the darkness dances — AFTER DARK' },
  { type: 'image', src: POSTERS.guessWho, caption: 'Guess who will be performing?' },
  { type: 'image', src: POSTERS.whoTakesStage, caption: 'Unforgettable lineup awaits' },
  { type: 'video', ...VIDEOS.behind, caption: 'Behind the entertainment' },
  { type: 'image', src: POSTERS.info, caption: 'Regular 1,000 · VIP 2,000 · 6PM till late' },
  { type: 'image', src: POSTERS.earlyBird, caption: 'Early bird — 40% sold out' },
  { type: 'image', src: POSTERS.vendors, caption: 'Call for vendors — showcase your brand this Halloween' },
];

export const PERKS = [
  { title: 'Ride in on Little', body: 'Use code UNIHIVE on Little Cab drives to the Dome.' },
  { title: 'VIP treatment', body: 'Complimentary drink and private seating for VIP.' },
  { title: 'Dress to impress', body: 'Come in costume — and disturb.' },
  { title: 'Live sets all night', body: 'DJs on the decks and artists on stage, 6PM till late.' },
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
  if (n.includes('vip')) return POSTERS.guessWho;
  if (n.includes('after dark')) return POSTERS.afterDark;
  if (n.includes('crew')) return POSTERS.whoTakesStage;
  if (n.includes('four')) return POSTERS.wave1;
  if (n.includes('date')) return POSTERS.bloodMoon;
  if (n.includes('table')) return POSTERS.master;
  return POSTERS.info;
};
