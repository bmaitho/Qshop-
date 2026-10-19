// UniHive experiences: config-driven event pages for activations.
//
// To launch a new activation:
//   1. Add an `events` row (slug, title, date, venue, price 0, rsvp_enabled
//      true for free RSVP; paid admission always links to Little instead).
//   2. Add an entry below keyed by that slug. Drop media into
//      public/experiences/<slug>/ and point the slots at it.
//   3. Flip `confirmed: true` on people/brands/activities once verified;
//      unconfirmed entries are never shown as confirmed.
// The page, RSVP, QR pass (My Tickets), door scan, Home slide, Buzz card and
// link preview all work from this config + the events row.

const PP = '/experiences/the-hive-pre-party';

export const EXPERIENCES = {
  'the-hive-pre-party': {
    slug: 'the-hive-pre-party',
    name: 'THE HIVE PRE-PARTY',
    navLabel: 'Pre-Party · 16 Oct',
    presentedBy: 'UniHive',
    dateLabel: 'Friday 16 October 2026',
    shortDate: 'Fri 16 Oct',
    timeLabel: '12PM – 8PM EAT',
    startsAt: '2026-10-16T12:00:00+03:00',
    endsAt: '2026-10-16T20:00:00+03:00',
    venue: 'Paradise Lost, Kiambu',
    mapUrl: 'https://maps.app.goo.gl/xtjWCf4zFcdqQ1k97',
    age: '18+',
    admission: 'Free entry · RSVP on UniHive',
    tagline: 'Good vibes. New connections. Big energy.',
    support: 'One day. New people. Unforgettable moments.',
    campaign: 'Nairobi, tunaenda road trip!',
    intro: 'Swap the city for caves, a waterfall and a lake. Explore Paradise Lost, try something new, meet creators and artists, and connect with the people behind THE HIVE — before the night itself on 30 October.',

    // Look: THE HIVE gold/red/black, opened up with forest and lake tones.
    theme: { accent: '#e7c65f', blood: '#c3121f', forest: '#163a26', lake: '#1e4a4c' },

    // Media slots. Replace files in public/experiences/the-hive-pre-party/
    // (same names) or point these at new paths. `temporary: true` marks
    // placeholder art so nothing is presented as real event footage.
    media: {
      poster: { src: `${PP}/poster.webp`, temporary: true },
      // Real Paradise Lost footage (credit: @paradiselost_ke).
      hero: { src: `${PP}/hero.webp`, video: `${PP}/hero.mp4` },
      // Landscape art for cards and the Home billboard.
      wide: { src: `${PP}/wide.webp`, video: `${PP}/wide.mp4` },
      // Text-free backdrop for places that put their own words on top.
      backdrop: { src: `${PP}/wide.webp`, video: `${PP}/wide.mp4` },
      venue: [{ src: `${PP}/wide.webp`, video: `${PP}/wide.mp4` }],
      credit: 'Footage: @paradiselost_ke',
      og: '/og/pre-party.jpg',
    },

    // Shown as "things to explore". Inclusions/fees are confirmed by the team.
    activitiesNote: 'Some activities may carry a venue fee — we’ll confirm what’s included before the day.',
    activities: [
      { key: 'caves', img: `${PP}/act-caves.webp`, title: 'Caves', line: 'Step into the caves', icon: 'Mountain' },
      { key: 'waterfall', img: `${PP}/act-waterfall.webp`, title: 'Waterfall', line: 'Find the falls', icon: 'Waves' },
      { key: 'lake', img: `${PP}/act-lake.webp`, title: 'The lake', line: 'Slow down by the water', icon: 'Sailboat' },
      { key: 'trails', img: `${PP}/act-trails.webp`, title: 'Nature trails', line: 'Get lost (on purpose)', icon: 'Trees' },
      { key: 'archery', img: `${PP}/act-archery.webp`, title: 'Archery', line: 'Find your aim', icon: 'Target' },
      { key: 'zipline', img: `${PP}/act-zipline.webp`, title: 'Ziplining', line: 'Fly over the valley', icon: 'Wind' },
    ],

    // Only `confirmed: true` people are named on the page (all confirmed 13 Oct).
    people: [
      { name: 'Siwaka Podcast', role: 'Official media outlet', img: '/media/siwaka/still-3.webp', badge: '/partners/siwaka-podcast.png', to: '/hive/siwaka', confirmed: true },
      { name: 'Supee', role: 'Artist', img: '/hive/media/supee.webp', confirmed: true },
      { name: 'DJ Picasso', role: 'On the decks', img: '/hive/media/dj-piccasso.webp', confirmed: true },
      { name: 'DJ Nikx', role: 'On the decks', img: '/hive/media/dj-nikx.webp', confirmed: true },
    ],

    // Brands on the published poster. Little is a UniHive partner but is not
    // part of this activation unless approved — do not add it here.
    brands: [
      { name: 'UniHive', img: null, confirmed: true },
      { name: 'Smirnoff', img: '/hive/products/smirnoff-vodka-webs.webp', confirmed: true },
      { name: 'Red Bull', img: '/hive/products/redbull-webs.webp', confirmed: true },
      { name: 'Charge24', img: '/partners/charge24.png', logo: true, line: 'Official power-bank charging station', confirmed: false }, // 30 Oct only — not confirmed for 16 Oct,
    ],

    practical: [
      ['When', 'Friday 16 October · 12PM – 8PM EAT'],
      ['Where', 'Paradise Lost, Kiambu'],
      ['Entry', 'Free with RSVP. Show your pass (My Tickets) at the gate.'],
      ['Age', '18+ — bring ID'],
      ['Wear', 'No dress code. Comfortable sports or dance shoes — you’ll be on the move.'],
    ],

    // The bigger night this builds toward.
    next: {
      slug: 'the-hive-no-going-home',
      title: 'THE HIVE: NO GOING HOME',
      line: 'Fri 30 Oct · 6PM – 4AM · Sarakasi Dome, Nairobi · 18+',
      note: 'Paid tickets on Little Events.',
      offer: 'Get your ticket on Little — ticket holders get complimentary Red Bull & Smirnoff.',
      ticketsUrl: 'https://apps.little.africa/events/the-hive-no-going-home-',
    },

    // Shown once the day is over: the page flips from "RSVP" to "you missed it,
    // catch the next one". Drop picks from the pre-party Drive into
    // public/experiences/the-hive-pre-party/recap/ and list them in `gallery`
    // ({ src } for photos, { src, video } for clips; poster frame in src).
    recap: {
      kicker: 'It happened · Fri 16 Oct',
      headline: 'Paradise Lost got found.',
      turnout: '~60 pulled up',
      lines: [
        'Around 60 of us made the road trip. Caves explored, the waterfall found, the lake vibed with, and a lot of new numbers saved.',
        'If you missed it: we noticed. We laughed. Lovingly. Mostly.',
      ],
      next: 'Good news: you get one more chance this year. 30 October. Sarakasi Dome. 6PM till 4AM. No going home.',
      gallery: [],
      driveUrl: null,
    },

    // Where it shows up across UniHive.
    promoteOnHive: true,
    homeSlide: { kicker: 'Fri 16 Oct · Paradise Lost', title: 'Nairobi, tunaenda road trip!', body: 'THE HIVE PRE-PARTY — free entry, RSVP on UniHive. Caves, a waterfall, a lake and big energy. 18+.' },
  },
};

export const getExperience = (slug) => EXPERIENCES[slug] || null;

// Experiences still worth promoting (hide once they've ended).
export const liveExperiences = () =>
  Object.values(EXPERIENCES).filter((x) => new Date(x.endsAt).getTime() > Date.now());
