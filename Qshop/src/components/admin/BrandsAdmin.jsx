// Admin: brand partners — create brands, keep their contact details (private
// to admins), and add/remove the brand staff who use /partner and the stand
// scanner.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Save, Trash2, UserPlus, ExternalLink } from 'lucide-react';
import { supabase } from '../SupabaseClient';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EMPTY_CONTACT = { contact_name: '', contact_email: '', contact_phone: '', notes: '' };
const field = 'w-full rounded-xl bg-white/[0.04] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E7C65F]/60';
const btn = 'rounded-full px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40';

function Label({ children }) {
  return <span className="block text-[11px] uppercase tracking-[0.2em] text-white/45 mb-1.5">{children}</span>;
}

export default function BrandsAdmin() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(null);
  const [events, setEvents] = useState([]);
  const [brands, setBrands] = useState([]);
  const [active, setActive] = useState(null);
  const [brand, setBrand] = useState({ name: '', logo_url: '' });
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [members, setMembers] = useState([]);
  const [invite, setInvite] = useState({ email: '', role: 'staff' });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const loadBrands = useCallback(async () => {
    const [{ data: b }, { data: ev }] = await Promise.all([
      supabase.from('event_partners').select('id, name, slug, logo_url, event_id, events(title)').order('name'),
      supabase.from('events').select('id, title').order('event_date', { ascending: false }).limit(20),
    ]);
    setBrands(b || []);
    setEvents(ev || []);
    return b || [];
  }, []);

  const loadBrand = useCallback(async (b) => {
    setActive(b);
    setBrand({ name: b.name, logo_url: b.logo_url || '' });
    const [{ data: c }, { data: m, error }] = await Promise.all([
      supabase.from('event_partner_contacts').select('*').eq('partner_id', b.id).maybeSingle(),
      supabase.rpc('admin_partner_members', { p_partner_id: b.id }),
    ]);
    setContact(c ? { contact_name: c.contact_name || '', contact_email: c.contact_email || '', contact_phone: c.contact_phone || '', notes: c.notes || '' } : EMPTY_CONTACT);
    setMembers(m || []);
    if (error) setNote(error.message);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      setOk(!!data?.is_admin);
      if (data?.is_admin) {
        const b = await loadBrands();
        if (b[0]) loadBrand(b[0]);
      }
    })();
  }, [navigate, loadBrands, loadBrand]);

  const run = (label, fn) => async (e) => {
    e?.preventDefault();
    setBusy(label); setNote('');
    try { const msg = await fn(); if (msg) setNote(msg); } catch (err) { setNote(err.message); } finally { setBusy(''); }
  };

  const createBrand = run('create', async () => {
    const name = draft.name.trim();
    if (!name || !draft.event_id) throw new Error('Give the brand a name and pick its event.');
    const { data, error } = await supabase.from('event_partners')
      .insert({ name, slug: slugify(name), event_id: draft.event_id, logo_url: draft.logo_url.trim() || null })
      .select('id, name, slug, logo_url, event_id, events(title)').single();
    if (error) throw error;
    setDraft(null);
    await loadBrands();
    await loadBrand(data);
    return `${name} created. Add their contact details and staff below.`;
  });

  const saveBrand = run('brand', async () => {
    const { error } = await supabase.from('event_partners')
      .update({ name: brand.name.trim(), logo_url: brand.logo_url.trim() || null }).eq('id', active.id);
    if (error) throw error;
    await loadBrands();
    return 'Brand saved.';
  });

  const saveContact = run('contact', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const trimmed = Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, v.trim() || null]));
    if (trimmed.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.contact_email)) throw new Error('That email doesn’t look right.');
    const { error } = await supabase.from('event_partner_contacts')
      .upsert({ partner_id: active.id, ...trimmed, updated_at: new Date().toISOString(), updated_by: user.id });
    if (error) throw error;
    return 'Contact details saved.';
  });

  const addMember = run('invite', async () => {
    const { error } = await supabase.rpc('admin_add_partner_member', { p_partner_id: active.id, p_email: invite.email, p_role: invite.role });
    if (error) throw error;
    setInvite({ email: '', role: 'staff' });
    await loadBrand(active);
    return `${invite.email} can now use the ${active.name} dashboard and stand scanner.`;
  });

  const removeMember = (m) => run(`rm-${m.user_id}`, async () => {
    if (!window.confirm(`Remove ${m.email || m.full_name} from ${active.name}?`)) return '';
    const { error } = await supabase.rpc('admin_remove_partner_member', { p_partner_id: active.id, p_user_id: m.user_id });
    if (error) throw error;
    await loadBrand(active);
    return 'Removed.';
  });

  if (ok === null) return <div className="min-h-screen flex items-center justify-center bg-[#07120a]"><Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" /></div>;
  if (!ok) return <div className="min-h-screen flex items-center justify-center bg-[#07120a] text-white/70">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-[#07120a] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-[11px] tracking-[0.4em] text-[#E7C65F]">ADMIN</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-1">Brands</h1>
        <p className="text-white/55 text-sm mt-2 max-w-2xl">
          Partner brands at UniHive events. Contact details are visible to admins only. Brand staff need a UniHive account; once added they get the partner dashboard and can scan their own items.
        </p>
        {note && <p className="text-[#E7C65F] text-sm mt-4">{note}</p>}

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 mt-8">
          <div className="space-y-2">
            {brands.map((b) => (
              <button key={b.id} onClick={() => { setDraft(null); setNote(''); loadBrand(b); }} className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 ${active?.id === b.id && !draft ? 'border-[#E7C65F]/60 bg-white/[0.04]' : 'border-white/10 hover:border-white/25'}`}>
                {b.logo_url ? <img src={b.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5" /> : <div className="w-10 h-10 rounded-xl bg-white/5" />}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{b.name}</p>
                  <p className="text-white/45 text-xs truncate">{b.events?.title}</p>
                </div>
              </button>
            ))}
            <button onClick={() => setDraft({ name: '', event_id: events[0]?.id || '', logo_url: '' })} className={`${btn} w-full justify-center border border-dashed border-white/25 text-white/75`}>
              <Plus className="w-4 h-4" /> New brand
            </button>
          </div>

          {draft ? (
            <form onSubmit={createBrand} className="rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4 max-w-xl">
              <h2 className="font-serif text-xl font-bold">New brand</h2>
              <label className="block"><Label>Brand name</Label><input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Coca-Cola" /></label>
              <label className="block"><Label>Event</Label>
                <select className={field} value={draft.event_id} onChange={(e) => setDraft({ ...draft, event_id: e.target.value })}>
                  {events.map((ev) => <option key={ev.id} value={ev.id} className="bg-[#07120a]">{ev.title}</option>)}
                </select>
              </label>
              <label className="block"><Label>Logo URL (optional)</Label><input className={field} value={draft.logo_url} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} placeholder="https://…" /></label>
              <div className="flex gap-2">
                <button disabled={!!busy} className={`${btn} bg-[#E7C65F] text-[#0D2B20]`}>{busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create brand</button>
                <button type="button" onClick={() => setDraft(null)} className={`${btn} border border-white/15 text-white/70`}>Cancel</button>
              </div>
            </form>
          ) : active && (
            <div className="space-y-6">
              <form onSubmit={saveBrand} className="rounded-2xl border border-white/10 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-serif text-xl font-bold">{active.name}</h2>
                  <button type="button" onClick={() => navigate('/partner')} className="text-sm text-[#E7C65F] inline-flex items-center gap-1.5">Partner dashboard <ExternalLink className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block"><Label>Brand name</Label><input className={field} value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} /></label>
                  <label className="block"><Label>Logo URL</Label><input className={field} value={brand.logo_url} onChange={(e) => setBrand({ ...brand, logo_url: e.target.value })} placeholder="https://…" /></label>
                </div>
                <button disabled={!!busy} className={`${btn} mt-4 border border-white/20`}>{busy === 'brand' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save brand</button>
              </form>

              <form onSubmit={saveContact} className="rounded-2xl border border-white/10 p-5 sm:p-6">
                <h3 className="font-semibold">Contact details <span className="text-white/40 font-normal text-sm">· admins only</span></h3>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <label className="block"><Label>Contact person</Label><input className={field} value={contact.contact_name} onChange={(e) => setContact({ ...contact, contact_name: e.target.value })} placeholder="Full name" /></label>
                  <label className="block"><Label>Email</Label><input type="email" className={field} value={contact.contact_email} onChange={(e) => setContact({ ...contact, contact_email: e.target.value })} placeholder="name@brand.com" /></label>
                  <label className="block"><Label>Phone</Label><input type="tel" className={field} value={contact.contact_phone} onChange={(e) => setContact({ ...contact, contact_phone: e.target.value })} placeholder="07…" /></label>
                </div>
                <label className="block mt-4"><Label>Notes</Label><textarea rows={3} className={field} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder="Agreement, stand size, billing contact…" /></label>
                <button disabled={!!busy} className={`${btn} mt-4 bg-[#E7C65F] text-[#0D2B20]`}>{busy === 'contact' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save contact</button>
              </form>

              <section className="rounded-2xl border border-white/10 p-5 sm:p-6">
                <h3 className="font-semibold">Brand staff</h3>
                <p className="text-white/45 text-sm mt-1">They log in with their own UniHive account. Owners and staff have the same access today.</p>
                <ul className="divide-y divide-white/5 mt-4">
                  {members.map((m) => (
                    <li key={m.user_id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{m.full_name || m.email}</p>
                        <p className="text-white/45 text-xs truncate">{m.email} · {m.role}</p>
                      </div>
                      <button onClick={removeMember(m)} disabled={!!busy} className="text-white/50 hover:text-[#ff8a92] p-2" aria-label={`Remove ${m.email}`}>
                        {busy === `rm-${m.user_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                  {!members.length && <li className="py-3 text-white/45 text-sm">No staff yet.</li>}
                </ul>
                <form onSubmit={addMember} className="flex flex-wrap gap-2 mt-4">
                  <input type="email" required className={`${field} flex-1 min-w-[200px]`} value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="Their UniHive account email" />
                  <select className={`${field} !w-auto`} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                    <option value="staff" className="bg-[#07120a]">Staff</option>
                    <option value="owner" className="bg-[#07120a]">Owner</option>
                  </select>
                  <button disabled={!!busy} className={`${btn} border border-[#E7C65F]/50 text-[#E7C65F]`}>{busy === 'invite' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add</button>
                </form>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
