// Asks signed-in users to accept the current Terms & Privacy Policy when they
// haven't yet (new Google sign-ups, or after a policy update). Records the
// accepted version on their profile.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../SupabaseClient';
import { LEGAL_VERSION, LEGAL_UPDATED } from './legalVersion';

export default function ConsentGate() {
  const { pathname } = useLocation();
  const [userId, setUserId] = useState(null);
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase.from('profiles').select('terms_version').eq('id', uid).maybeSingle();
      // If the column or row isn't readable, never block the user.
      if (!alive || error || !data) return;
      setUserId(uid);
      setNeeded(data.terms_version !== LEGAL_VERSION);
    })();
    return () => { alive = false; };
  }, []);

  // Let people read the documents before accepting.
  if (!needed || pathname === '/terms' || pathname === '/privacy') return null;

  const accept = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles')
      .update({ terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() })
      .eq('id', userId);
    setSaving(false);
    if (!error) setNeeded(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/50">Updated {LEGAL_UPDATED}</p>
        <h2 id="consent-title" className="font-serif text-2xl font-bold mt-1">Our Terms &amp; Privacy Policy</h2>
        <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
          UniHive now covers the marketplace, The Buzz and THE HIVE events — tickets via Little Events, the HIVE Wallet, partner brands and event photos.
          We&rsquo;ve updated our terms to explain how this works and how we use your data.
        </p>
        <div className="flex gap-4 mt-4 text-sm font-semibold">
          <Link to="/terms" className="underline">Read the Terms</Link>
          <Link to="/privacy" className="underline">Read the Privacy Policy</Link>
        </div>
        <label className="flex items-start gap-3 mt-5 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>I agree to the Terms &amp; Conditions and consent to my data being used as described in the Privacy Policy.</span>
        </label>
        <button
          onClick={accept}
          disabled={!checked || saving}
          className="mt-5 w-full rounded-full bg-[#E7C65F] text-[#0D2B20] py-3 font-bold disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Accept and continue'}
        </button>
      </div>
    </div>
  );
}
