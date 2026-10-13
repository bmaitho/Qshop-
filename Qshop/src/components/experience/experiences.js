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
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Paradise+Lost+Kiambu+Kenya',
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
      hero: { src: `${PP}/poster.webp`, video: null, temporary: true },
      // Landscape art for cards and the Home billboard.
      wide: { src: '/og/pre-party.jpg', temporary: true },
      // Text-free backdrop for places that put their own words on top.
      backdrop: { src: `${PP}/scene-wide.webp`, temporary: true },
      venue: [],
      og: '/og/pre-party.jpg',
    },

    // Shown as "things to explore". Inclusions/fees are confirmed by the team.
    activitiesNote: 'Some activities may carry a venue fee — we’ll confirm what’s included before the day.',
    activities: [
      { key: 'caves', title: 'Caves', line: 'Step into the caves', icon: 'Mountain' },
      { key: 'waterfall', title: 'Waterfall', line: 'Find the falls', icon: 'Waves' },
      { key: 'lake', title: 'The lake', line: 'Slow down by the water', icon: 'Sailboat' },
      { key: 'trails', title: 'Nature trails', line: 'Get lost (on purpose)', icon: 'Trees' },
      { key: 'archery', title: 'Archery', line: 'Find your aim', icon: 'Target' },
      { key: 'zipline', title: 'Ziplining', line: 'Fly over the valley', icon: 'Wind' },
    ],

    // Only `confirmed: true` people are named on the page.
    people: [
      { name: 'Siwaka Podcast', role: 'Creators', img: null, confirmed: false },
      { name: 'Supee', role: 'Artist', img: '/hive/media/supee.webp', confirmed: false },
      { name: 'DJ Picasso', role: 'On the decks', img: '/hive/media/dj-piccasso.webp', confirmed: false },
      { name: 'DJ Nikx', role: 'On the decks', img: '/hive/media/dj-nikx.webp', confirmed: false },
    ],

    // Brands on the published poster. Little is a UniHive partner but is not
    // part of this activation unless approved — do not add it here.
    brands: [
      { name: 'UniHive', img: null, confirmed: true },
      { name: 'Smirnoff', img: '/hive/products/smirnoff-vodka-webs.webp', confirmed: true },
      { name: 'Red Bull', img: '/hive/products/redbull-webs.webp', confirmed: true },
      { name: 'Charge 24', img: null, confirmed: true },
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
