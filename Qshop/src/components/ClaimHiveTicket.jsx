// src/components/ClaimHiveTicket.jsx
//
// Attendee-facing: link an externally-bought ticket (Little Events) to a
// UniHive account. This NEVER grants or checks entry — Little's own
// scanner stays the sole authority there. Claiming only unlocks UniHive
// benefits (wallet, catalogue, perks).
//
// Accepts an event id or slug in the URL; anything unresolvable falls
// back to THE HIVE so a mistyped/shared link never dead-ends.

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, CheckCircle2, XCircle, Lock, Ticket, Phone, Mail, ArrowRight } from 'lucide-react';
import { supabase } from './SupabaseClient';
import HiveShell from './hive/HiveShell';
import { HIVE_SLUG, POSTERS, VIDEOS } from './hive/hiveMedia';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tierPerks = (tier) => {
  const t = (tier || '').toLowerCase();
  if (t.includes('vip')) return ['Complimentary drink on arrival', 'Private seating', 'HIVE Wallet + catalogue access'];
  return ['HIVE Wallet + catalogue access', 'Pre-order drinks & bites, skip the queue'];
};

function PosterWall() {
  return (
    <div className="relative h-[340px] lg:h-auto overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-2 opacity-90">
        <video src={VIDEOS.ready.src} poster={VIDEOS.ready.poster} muted loop autoPlay playsInline className="w-full h-full object-cover rounded-2xl row-span-2" />
        <img src={POSTERS.bloodMoon} alt="" className="w-full h-full object-cover rounded-2xl" />
        <img src={POSTERS.earlyBird} alt="" className="w-full h-full object-cover rounded-2xl" />
        <img src={POSTERS.afterDark} alt="" className="w-full h-full object-cover rounded-2xl" />
        <img src={POSTERS.wave1} alt="" className="w-full h-full object-cover rounded-2xl" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050a] via-[#07050a]/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#07050a]/40 lg:to-[#07050a]" />
    </div>
  );
}

export default function ClaimHiveTicket() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);

  const [reference, setReference] = useState(searchParams.get('ref') || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u || null);
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const cols = 'id, title, slug, event_date, venue';
      let row = null;
      if (eventId && UUID_RE.test(eventId)) {
        ({ data: row } = await supabase.from('events').select(cols).eq('id', eventId).maybeSingle());
      } else if (eventId) {
        ({ data: row } = await supabase.from('events').select(cols).eq('slug', eventId).maybeSingle());
      }
      if (!row) ({ data: row } = await supabase.from('events').select(cols).eq('slug', HIVE_SLUG).maybeSingle());
      setEvent(row || null);
    })();
  }, [eventId]);

  const goLogin = () => {
    sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search);
    navigate('/auth');
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    setError('');
    if (!reference.trim()) {
      setError('Enter the Payment Key from your Little Events confirmation email or SMS.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError('Enter the phone or email you used to buy the ticket.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_external_ticket', {
        p_external_reference: reference.trim(),
        p_phone: phone.trim() || null,
        p_email: email.trim() || null,
      });
      if (rpcError) {
        setError(
          rpcError.message?.includes('No matching ticket')
            ? "Couldn't find a ticket matching that reference and contact detail — double-check both and try again."
            : rpcError.message?.includes('already been claimed')
            ? 'This ticket has already been claimed by a different account.'
            : rpcError.message || 'Could not claim this ticket.'
        );
        return;
      }
      setClaimed(data);
    } catch (err) {
      setError(err.message || 'Something went wrong claiming this ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const slug = event?.slug || HIVE_SLUG;

  let panel;
  if (!authChecked) {
    panel = <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e7c65f]" /></div>;
  } else if (!user) {
    panel = (
      <div className="text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#e7c65f]/10 border border-[#e7c65f]/30 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-[#e7c65f]" />
        </div>
        <p className="text-white/65">Log in or create a UniHive account first — your ticket links to it.</p>
        <button onClick={goLogin} className="w-full hive-btn-gold rounded-full py-3.5 font-bold flex items-center justify-center gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  } else if (claimed) {
    panel = (
      <div className="text-center space-y-5 hive-fade-in">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
        <div>
          <p className="hive-display hive-gold-text text-3xl font-bold">HIVE ACTIVATED</p>
          <p className="text-white/70 mt-1">{claimed.tier} — linked to your account</p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-left space-y-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Unlocked</p>
          {tierPerks(claimed.tier).map((p) => (
            <p key={p} className="flex items-center gap-2 text-sm text-white/85"><Sparkles className="w-4 h-4 text-[#e7c65f] shrink-0" /> {p}</p>
          ))}
        </div>
        <button onClick={() => navigate(`/events/${slug}?tab=shop`)} className="w-full hive-btn-blood rounded-full py-3.5 font-bold">Shop the night</button>
        <p className="text-white/35 text-xs">Entry is still scanned by Little Events at the door — this only unlocks your UniHive benefits.</p>
      </div>
    );
  } else {
    panel = (
      <form onSubmit={handleClaim} className="space-y-4">
        <label className="block">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45 mb-2"><Ticket className="w-3.5 h-3.5" /> Payment key</span>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="From your Little Events email / SMS" className="hive-input" />
        </label>
        <label className="block">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45 mb-2"><Phone className="w-3.5 h-3.5" /> Phone used at purchase</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" className="hive-input" />
        </label>
        <div className="flex items-center gap-3 text-white/30 text-xs"><span className="flex-1 h-px bg-white/10" />or<span className="flex-1 h-px bg-white/10" /></div>
        <label className="block">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45 mb-2"><Mail className="w-3.5 h-3.5" /> Email used at purchase</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="hive-input" />
        </label>
        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-[#c3121f]/10 border border-[#c3121f]/40 p-3 text-[#ffb3b8] text-sm">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="w-full hive-btn-blood rounded-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? 'Claiming…' : 'Claim my HIVE'}
        </button>
      </form>
    );
  }

  return (
    <HiveShell>
      <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-112px)]">
        <PosterWall />
        <div className="relative -mt-24 lg:mt-0 flex items-center justify-center px-4 sm:px-8 pb-12 lg:py-12">
          <div className="w-full max-w-md">
            <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">BOUGHT ON LITTLE EVENTS?</p>
            <h1 className="hive-display hive-gold-text text-4xl sm:text-5xl font-extrabold leading-[1.05] mt-2">Claim your HIVE</h1>
            <p className="hive-accent text-white/70 text-xl mt-2">{event ? `${event.title} — ${event.venue}` : 'THE HIVE: NO GOING HOME'}</p>
            <p className="text-white/50 text-sm mt-3 leading-relaxed">
              Link your ticket to unlock the HIVE Wallet, the bar & bites catalogue, and your tier perks.
            </p>
            <div className="mt-7 rounded-[26px] border border-white/10 bg-[#0e0809]/80 backdrop-blur-xl p-5 sm:p-7 shadow-[0_30px_80px_-30px_rgba(195,18,31,0.5)]">
              {panel}
            </div>
          </div>
        </div>
      </div>
    </HiveShell>
  );
}
