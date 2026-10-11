// Full-quality Drive folders are a members perk: signed-in users get the
// link; everyone else is sent to sign up first and brought back here.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Lock } from 'lucide-react';
import { supabase } from '../SupabaseClient';

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

export default function DriveLink({ url, children, className, lockedLabel = 'Sign in for full-quality photos' }) {
  const signedIn = useSignedIn();
  const navigate = useNavigate();
  if (signedIn) {
    return <a href={url} target="_blank" rel="noreferrer" className={className}>{children} <ExternalLink className="w-3.5 h-3.5" /></a>;
  }
  return (
    <button
      type="button"
      onClick={() => { sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search); navigate('/auth'); }}
      className={className}
    >
      <Lock className="w-3.5 h-3.5" /> {lockedLabel}
    </button>
  );
}
