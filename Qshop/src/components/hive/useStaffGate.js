// Resolves who is scanning: staff/admin and/or partner memberships.
import { useEffect, useState } from 'react';
import { supabase } from '../SupabaseClient';

export default function useStaffGate() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, partners: [] });
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data.user || null;
      if (!user) return setState({ loading: false, user: null, profile: null, partners: [] });
      const [{ data: profile }, { data: mem }] = await Promise.all([
        supabase.from('my_profile').select('id, full_name, email, is_admin, is_staff').eq('id', user.id).maybeSingle(),
        supabase.from('event_partner_members').select('role, event_partners(id, slug, name, logo_url, event_id)').eq('user_id', user.id),
      ]);
      let partners = (mem || []).map((m) => ({ ...m.event_partners, role: m.role })).filter((p) => p.id);
      if (profile?.is_admin) {
        const { data: all } = await supabase.from('event_partners').select('id, slug, name, logo_url, event_id').order('name');
        const mine = new Set(partners.map((p) => p.id));
        partners = [...partners, ...(all || []).filter((p) => !mine.has(p.id)).map((p) => ({ ...p, role: 'admin' }))];
      }
      setState({ loading: false, user, profile, partners });
    })();
  }, []);
  const isStaff = !!(state.profile?.is_staff || state.profile?.is_admin);
  return { ...state, isStaff };
}
