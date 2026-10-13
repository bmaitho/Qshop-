// Free-event RSVP: loads the event row and the caller's pass, and creates a
// pass through the rsvp_event RPC (server-side, one per person, cap-aware).
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../SupabaseClient';

export default function useEventRsvp(slug) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [pass, setPass] = useState(null);
  const [user, setUser] = useState(null);
  const [state, setState] = useState('loading'); // loading | open | closed | busy | done | error
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [{ data: ev }, { data: { session } }] = await Promise.all([
      supabase.from('events').select('id, title, event_date, status, rsvp_enabled, max_capacity, tickets_sold').eq('slug', slug).maybeSingle(),
      supabase.auth.getSession(),
    ]);
    const u = session?.user || null;
    setEvent(ev || null);
    setUser(u);
    let mine = null;
    if (ev && u) {
      const { data } = await supabase.from('event_tickets').select('*')
        .eq('event_id', ev.id).eq('user_id', u.id).eq('source_platform', 'unihive_rsvp').maybeSingle();
      mine = data || null;
    }
    setPass(mine);
    const ended = ev && new Date(`${ev.event_date}T23:59:59+03:00`) < new Date();
    setState(mine ? 'done' : ev?.rsvp_enabled && !ended ? 'open' : 'closed');
    return { ev, u, mine };
  }, [slug]);

  const rsvp = useCallback(async (loaded) => {
    const ev = loaded?.ev || event;
    const u = loaded?.u ?? user;
    if (!u) {
      sessionStorage.setItem('postLoginRedirect', `/events/${slug}?rsvp=1`);
      navigate('/auth');
      return;
    }
    if (!ev) return;
    setState('busy'); setError('');
    const { data, error: err } = await supabase.rpc('rsvp_event', { p_event_id: ev.id });
    if (err) {
      setError(err.message || 'Could not RSVP. Try again.');
      setState(/full|closed|not open/i.test(err.message || '') ? 'closed' : 'error');
      return;
    }
    setPass(data);
    setState('done');
  }, [event, user, slug, navigate]);

  useEffect(() => {
    (async () => {
      const loaded = await load();
      // Coming back from sign-in with ?rsvp=1 finishes the RSVP.
      const params = new URLSearchParams(window.location.search);
      if (params.get('rsvp') === '1' && loaded.u && !loaded.mine && loaded.ev?.rsvp_enabled) {
        params.delete('rsvp');
        window.history.replaceState(null, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
        rsvp(loaded);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { event, pass, user, state, error, rsvp: () => rsvp() };
}
