// UniHive collaborations with other organisers. Each entry is a page at
// /collabs/<slug>. Only sourced facts go here (organisers' own pages);
// UniHive's role is as confirmed by the CEO. Media lives in public/collabs/.
const TD = '/collabs/till-dawn';
const CF = '/collabs/cultur-fm';

export const COLLABS = {
  'till-dawn': {
    slug: 'till-dawn',
    name: 'TILL DAWN 2.0',
    kicker: 'MCM × METANOIA × UniHive',
    tagline: 'Music, energy, chaos — and the city going till dawn.',
    startsAt: '2026-12-05T12:00:00+03:00',
    endsAt: '2026-12-06T03:00:00+03:00',
    chips: ['Sat 5 Dec', '12PM – 3AM', 'Skate City, Parklands'],
    role: 'UniHive is partnering with MCM and METANOIA to bring TILL DAWN 2.0 to the Hive.',
    hero: { src: `${TD}/poster.webp`, alt: 'TILL DAWN 2.0 poster' },
    cta: { label: 'Get tickets on Passly', href: 'https://www.passly.co.ke/events/15ra0k7zx8djmt1xsdg2' },
    ctaNote: 'Tickets from KSh 1,250 to 4,000, sold by the organiser on Passly. All sales final.',
    facts: [
      ['When', 'Saturday 5 December 2026, 12PM until 3AM'],
      ['Where', 'Skate City, Diamond Plaza, Parklands, Nairobi'],
      ['Tickets', 'KSh 1,250 – 4,000 on Passly (organiser: MCM)'],
      ['Entry', 'ID may be checked at the door; alcohol only for those legally allowed to drink'],
    ],
    feature: {
      kicker: 'On the night',
      title: 'Faces of Till Dawn',
      body: 'A runway model competition with cash prizes: KSh 50,000 for first, 25,000 for second and 10,000 for third.',
      img: `${TD}/faces-of-till-dawn.webp`,
    },
    gallery: [
      { src: `${TD}/poster.webp`, caption: 'TILL DAWN 2.0' },
      { src: `${TD}/x-atelier-alliance.webp`, caption: 'TILL DAWN 2.0 × Atelier Alliance' },
      { src: `${TD}/faces-of-till-dawn.webp`, caption: 'Faces of Till Dawn' },
    ],
    partners: [
      { name: 'MCM', links: [['Instagram', 'https://www.instagram.com/mcmlive.25/'], ['TikTok', 'https://www.tiktok.com/@mcm.26']] },
      { name: 'METANOIA', links: [['Instagram', 'https://www.instagram.com/metanoiake/'], ['TikTok', 'https://www.tiktok.com/@metanoiake']] },
    ],
    credit: 'Posters: MCM.',
    homeSlide: { kicker: 'Sat 5 Dec · Skate City', title: 'Till Dawn 2.0', body: 'MCM × METANOIA × UniHive. Music, a runway model competition with cash prizes, and the city going till dawn.' },
  },

  'cultur-fm': {
    slug: 'cultur-fm',
    name: 'CULTUR FM NAIROBI',
    kicker: 'CULTUR FM × UniHive',
    tagline: 'CULTUR FM came back to Nairobi — three days, three rooms, one city.',
    startsAt: '2026-11-03T17:00:00+03:00',
    endsAt: '2026-11-07T04:00:00+03:00',
    chips: ['3 – 6 Nov 2026', 'Nairobi'],
    role: 'UniHive supported marketing and event presence for CULTUR FM’s Nairobi run, alongside 808 Masters.',
    hero: { src: `${CF}/main-night-6nov.webp`, alt: 'CULTUR FM Nairobi poster' },
    cta: { label: 'CULTUR FM on Instagram', href: 'https://www.instagram.com/cultur.fm/' },
    ctaNote: 'CULTUR FM is a global music and culture platform; this was its second visit to Nairobi.',
    schedule: [
      { date: 'Tue 3 Nov', name: 'CULTUR FM × Nairobi Street Kitchen', line: 'Creatives and culture shapers, plus open decks for DJs', img: `${CF}/nsk-3nov.webp` },
      { date: 'Thu 5 Nov', name: 'CULTUR FM × Networks Padel Village', line: 'Bringing the culture to the court, Gigiri', img: `${CF}/padel-5nov.webp` },
      { date: 'Fri 6 Nov', name: 'CULTUR FM Nairobi — main night', line: 'Masshouse with Larizzle, Kaneda, DJ Mikky, Big Nyagz and DJ Ruffy', img: `${CF}/main-night-6nov.webp` },
    ],
    watch: [
      { title: 'Inside CULTUR FM’s Nairobi House Party', href: 'https://www.youtube.com/watch?v=XqtHRk9O6Ps', img: `${CF}/house-party-video.webp` },
      { title: '055 — CULTUR FM Nairobi live mix by Kaneda', href: 'https://www.youtube.com/watch?v=hYd8O2GV1tI', img: `${CF}/kaneda-mix.webp` },
    ],
    gallery: [
      { src: `${CF}/main-night-6nov.webp`, caption: 'Main night, 6 Nov' },
      { src: `${CF}/nsk-3nov.webp`, caption: 'Nairobi Street Kitchen, 3 Nov' },
      { src: `${CF}/open-deck-3nov.webp`, caption: 'Open Deck, 3 Nov' },
      { src: `${CF}/padel-5nov.webp`, caption: 'Networks Padel Village, 5 Nov' },
    ],
    partners: [
      { name: 'CULTUR FM', links: [['Website', 'https://cultur.fm'], ['Instagram', 'https://www.instagram.com/cultur.fm/'], ['TikTok', 'https://www.tiktok.com/@cultur.fm'], ['YouTube', 'https://www.youtube.com/@CULTURFM']] },
    ],
    credit: 'Artwork and video: CULTUR FM (@cultur.fm).',
  },
};

export const getCollab = (slug) => COLLABS[slug] || null;
const ended = (c) => Date.now() > new Date(c.endsAt).getTime();
export const upcomingCollabs = () => Object.values(COLLABS).filter((c) => !ended(c)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
export const pastCollabs = () => Object.values(COLLABS).filter(ended).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
export const isEnded = ended;
