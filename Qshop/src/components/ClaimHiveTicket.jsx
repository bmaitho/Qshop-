// src/components/ClaimHiveTicket.jsx
//
// Attendee-facing: link an externally-bought ticket (e.g. Little Events)
// to a UniHive account. This is the "claim" half of the bridge — it
// NEVER grants or checks entry. The external platform's own scanner
// stays the sole authority there. Claiming only unlocks UniHive-side
// benefits (wallet, catalogue, tier perks) once built.
//
// Reached via a QR/link that carries the event id and, ideally, the
// partner's reference baked in as a query param (?ref=...) so the
// attendee doesn't have to type anything cryptic. Falls back to a
// manual field if the link didn't carry one.

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { supabase } from './SupabaseClient';

const tierPerks = (tier) => {
  const t = (tier || '').toLowerCase();
  if (t.includes('vip')) return ['Complimentary drink on arrival', 'Priority entry lane'];
  return [];
};

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
    if (!eventId) return;
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, venue')
        .eq('id', eventId)
        .maybeSingle();
      setEvent(data || null);
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
      setError("Enter the reference from your ticket confirmation — it's usually in the email or SMS.");
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

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D2B20] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-8 text-center bg-[#E7C65F]/10">
            <Lock className="w-12 h-12 text-[#E7C65F] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#E7C65F] mb-1">Claim Your HIVE</h2>
            <p className="text-white/60 text-sm">Log in or create a UniHive account to link your ticket.</p>
          </div>
          <div className="p-6">
            <button
              onClick={goLogin}
              className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-3.5 rounded-xl"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (claimed) {
    const perks = tierPerks(claimed.tier);
    return (
      <div className="min-h-screen bg-[#0D2B20] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-emerald-600 rounded-3xl overflow-hidden text-white text-center p-8">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-3" />
          <h2 className="text-3xl font-extrabold">HIVE ACTIVATED</h2>
          <p className="mt-2 text-white/90">{claimed.tier} — linked to your account</p>
          {perks.length > 0 && (
            <div className="mt-5 bg-black/20 rounded-xl p-4 text-left space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-2">Your perks</p>
              {perks.map((p) => (
                <p key={p} className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 shrink-0" /> {p}
                </p>
              ))}
            </div>
          )}
          <p className="mt-5 text-white/70 text-xs">
            Entry is still validated by whoever you bought the ticket from — this only unlocks your UniHive account benefits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D2B20] text-white flex items-center justify-center p-4">
      <form onSubmit={handleClaim} className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="text-center mb-2">
          <Sparkles className="w-10 h-10 text-[#E7C65F] mx-auto mb-2" />
          <h1 className="text-xl font-bold text-[#E7C65F]">Claim Your HIVE</h1>
          {event && <p className="text-white/50 text-sm mt-1">{event.title} — {event.venue}</p>}
          <p className="text-white/40 text-xs mt-2">
            Bought your ticket somewhere other than UniHive? Link it here to unlock wallet, perks, and more.
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
            Ticket reference
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="From your confirmation email/SMS"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
            Phone used at purchase
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30"
          />
        </div>

        <div className="relative text-center text-white/30 text-xs">
          <span className="bg-[#0D2B20] px-2 relative z-10">or</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
            Email used at purchase
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-200 text-sm">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#E7C65F] hover:bg-[#d4b550] disabled:opacity-50 text-[#0D2B20] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {submitting ? 'Claiming…' : 'Claim my HIVE'}
        </button>
      </form>
    </div>
  );
}
