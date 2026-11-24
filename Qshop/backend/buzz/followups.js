// One-off follow-up emails to the people who RSVP'd to an event.
// Hand-written copy (no AI), sent through The Buzz pipeline.
const SITE = 'https://unihive.shop';
// Add a follow-up here (key -> { audience, issue }) to send it from /admin/buzz.
export const FOLLOWUPS = {};

// Users who hold an RSVP pass for the event.
export async function audienceUserIds(supabase, audience) {
  if (!audience?.event_slug) return null;
  const { data: ev } = await supabase.from('events').select('id').eq('slug', audience.event_slug).maybeSingle();
  if (!ev) return [];
  const { data } = await supabase.from('event_tickets').select('user_id')
    .eq('event_id', ev.id).eq('source_platform', 'unihive_rsvp').not('user_id', 'is', null);
  return [...new Set((data || []).map((t) => t.user_id))];
}
