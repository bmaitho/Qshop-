// One-off follow-up emails to the people who RSVP'd to an event.
// Hand-written copy (no AI), sent through The Buzz pipeline.
const SITE = 'https://unihive.shop';
const LITTLE_TICKETS = 'https://apps.little.africa/events/the-hive-no-going-home-';

export const FOLLOWUPS = {
  'pre-party-thanks': {
    audience: { event_slug: 'the-hive-pre-party', label: 'THE HIVE PRE-PARTY RSVPs' },
    issue: {
      subject: 'Paradise Lost was a vibe. 30 Oct is next.',
      preheader: 'Thank you for pulling up. Here’s what’s next.',
      opener: 'Thank you for pulling up to THE HIVE PRE-PARTY at Paradise Lost. Caves, a waterfall, big energy — and you were part of it.',
      sections: [
        {
          kicker: 'Next stop',
          title: 'THE HIVE: NO GOING HOME',
          body: 'Fri 30 Oct · 6PM–4AM · Sarakasi Dome, Nairobi. Halloween — come in costume. 18+.',
          cta_label: 'Get tickets on Little',
          cta_url: LITTLE_TICKETS,
          images: [`${SITE}/og/hive.jpg`],
        },
        {
          kicker: 'For ticket holders',
          title: 'Complimentary Red Bull & Smirnoff',
          body: 'Get your ticket on Little Events and you get a complimentary Red Bull and Smirnoff.',
          cta_label: 'Tickets on Little',
          cta_url: LITTLE_TICKETS,
          images: [],
        },
        {
          kicker: 'Ride safe',
          title: 'UNIHIVE26 on Little Cab',
          body: 'KSh 200 off Little Cab rides to and from the Dome. Usidrive ukiwa maji.',
          cta_label: 'See the night',
          cta_url: `${SITE}/events/the-hive-no-going-home?tab=night`,
          images: [],
        },
      ],
      signoff: 'See you in the Hive.',
    },
  },
};

// Users who hold an RSVP pass for the event.
export async function audienceUserIds(supabase, audience) {
  if (!audience?.event_slug) return null;
  const { data: ev } = await supabase.from('events').select('id').eq('slug', audience.event_slug).maybeSingle();
  if (!ev) return [];
  const { data } = await supabase.from('event_tickets').select('user_id')
    .eq('event_id', ev.id).eq('source_platform', 'unihive_rsvp').not('user_id', 'is', null);
  return [...new Set((data || []).map((t) => t.user_id))];
}
