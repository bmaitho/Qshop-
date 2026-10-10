// src/components/HivePackages.jsx
//
// "Build Your Night" — browse and buy THE HIVE Edition packages for an
// event. Purchasing requires login (same as a wallet top-up): the backend
// ties the purchase to auth.uid() and fulfils it into real event_tickets/
// event_entitlements/wallet_transactions rows via fulfil_package_purchase.
//
// STK push + polling follows the EventPage.jsx pattern: DB-first poll on
// our own table, backend status endpoint as fallback, capped at 40
// attempts (~2 minutes).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from './SupabaseClient';

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes

const describeItem = (item) => {
  if (item.item_type === 'ticket_tier') {
    return `${item.quantity}× ${item.tier} admission`;
  }
  if (item.item_type === 'product') {
    const name = item.event_products?.name || 'item';
    return `${item.quantity}× ${name}`;
  }
  if (item.item_type === 'wallet_credit') {
    return `KSh ${item.wallet_credit_amount * item.quantity} wallet credit`;
  }
  return null;
};

export default function HivePackages() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [event, setEvent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState('idle'); // idle | processing | success | failed
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u || null);
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError('');

      const { data: eventRow, error: eventError } = await supabase
        .from('events')
        .select('id, title, slug, event_date')
        .eq('slug', slug)
        .maybeSingle();

      if (eventError || !eventRow) {
        setLoadError('Event not found.');
        setLoading(false);
        return;
      }
      setEvent(eventRow);

      const { data: pkgRows, error: pkgError } = await supabase
        .from('event_packages')
        .select('*, event_package_items(*, event_products(name))')
        .eq('event_id', eventRow.id)
        .eq('status', 'active')
        .order('display_order', { ascending: true });

      if (pkgError) {
        setLoadError(pkgError.message);
      } else {
        setPackages(pkgRows || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const startPolling = useCallback((purchaseId) => {
    let attempts = 0;

    const finalize = (status) => {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setStep(status === 'confirmed' ? 'success' : 'failed');
      if (status !== 'confirmed') {
        setErrorMsg('Payment was declined, cancelled, or timed out.');
      }
    };

    pollingRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        setErrorMsg('Payment timed out. If you were charged, contact support.');
        finalize('failed');
        return;
      }

      try {
        const { data: row } = await supabase
          .from('event_package_purchases')
          .select('status')
          .eq('id', purchaseId)
          .maybeSingle();

        if (row?.status === 'confirmed') finalize('confirmed');
        else if (row?.status === 'failed') finalize('failed');
      } catch {
        // swallow, retry next tick
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const handlePurchase = async () => {
    if (!user) {
      sessionStorage.setItem('postLoginRedirect', `/events/${slug}/packages`);
      navigate('/auth');
      return;
    }
    if (!selectedPackage) return;
    if (!phoneNumber.trim()) {
      setErrorMsg('Enter the phone number to pay with.');
      return;
    }

    setStep('processing');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const backendUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${backendUrl}/packages/${selectedPackage.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        setErrorMsg(body?.error || `Purchase failed (HTTP ${response.status})`);
        setStep('failed');
        return;
      }

      startPolling(body.purchaseId);
    } catch (err) {
      setErrorMsg(err.message || 'Network error starting purchase');
      setStep('failed');
    }
  };

  const resetFlow = () => {
    setSelectedPackage(null);
    setPhoneNumber('');
    setStep('idle');
    setErrorMsg('');
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white p-6">
        <p className="text-white/70">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="text-center space-y-1">
          <Sparkles className="w-8 h-8 text-[#E7C65F] mx-auto" />
          <h1 className="text-2xl font-bold text-[#E7C65F]">Build Your Night</h1>
          <p className="text-white/60 text-sm">{event?.title}</p>
        </div>

        <div className="space-y-3">
          {packages.map((pkg) => {
            const items = pkg.event_package_items || [];
            const expanded = expandedId === pkg.id;
            return (
              <div
                key={pkg.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg">{pkg.name}</h2>
                      {pkg.featured && (
                        <span className="text-[10px] uppercase tracking-wider bg-[#E7C65F] text-[#0D2B20] px-2 py-0.5 rounded-full font-bold">
                          Featured
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-white/50 text-sm mt-0.5">{pkg.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-[#E7C65F]">KSh {pkg.base_price}</div>
                  </div>
                </div>

                {items.length > 0 && (
                  <button
                    onClick={() => setExpandedId(expanded ? null : pkg.id)}
                    className="text-xs text-white/50 flex items-center gap-1"
                  >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded ? 'Hide' : 'What\'s included'}
                  </button>
                )}

                {expanded && (
                  <ul className="text-sm text-white/70 space-y-1 pl-1">
                    {items.map((item) => (
                      <li key={item.id}>• {describeItem(item)}</li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => { setSelectedPackage(pkg); setStep('idle'); setErrorMsg(''); }}
                  className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-2.5 rounded-xl"
                >
                  Get this package
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPackage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D2B20] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            {step === 'idle' && (
              <>
                <h3 className="font-bold text-lg">{selectedPackage.name}</h3>
                <p className="text-[#E7C65F] font-bold text-2xl">KSh {selectedPackage.base_price}</p>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
                    M-Pesa phone number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                  />
                </div>
                {errorMsg && <p className="text-red-300 text-sm">{errorMsg}</p>}
                <div className="flex gap-2">
                  <button onClick={resetFlow} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/70">
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    className="flex-1 bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-2.5 rounded-xl"
                  >
                    Pay now
                  </button>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div className="text-center py-6 space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#E7C65F] mx-auto" />
                <p className="text-white/70 text-sm">Check your phone to complete payment…</p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="font-bold">You're in! Check "My Tickets" for your QR.</p>
                <button
                  onClick={() => navigate('/my-tickets')}
                  className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-2.5 rounded-xl"
                >
                  View my tickets
                </button>
              </div>
            )}

            {step === 'failed' && (
              <div className="text-center py-6 space-y-3">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-red-200 text-sm">{errorMsg || 'Payment failed.'}</p>
                <button onClick={resetFlow} className="w-full border border-white/20 py-2.5 rounded-xl">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
