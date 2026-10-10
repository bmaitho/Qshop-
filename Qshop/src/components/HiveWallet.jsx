// src/components/HiveWallet.jsx
//
// Event wallet balance + top-up. Requires login. Calls the existing
// backend endpoints (walletController.js): POST /api/wallet/:eventId/topup
// and GET /api/wallet/:eventId/balance. Polling follows the same
// DB-first / capped pattern as HivePackages.jsx and EventPage.jsx.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wallet, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { supabase } from './SupabaseClient';

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 40;

export default function HiveWallet() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState('idle'); // idle | processing | success | failed
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        sessionStorage.setItem('postLoginRedirect', `/events/${eventId}/wallet`);
        navigate('/auth');
        return;
      }
      setUser(u);
      setAuthChecked(true);
    })();
  }, [eventId, navigate]);

  const fetchBalance = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const backendUrl = import.meta.env.VITE_API_URL;
    try {
      const response = await fetch(`${backendUrl}/wallet/${eventId}/balance`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json();
      if (body.success) setBalance(body.balance);
    } catch {
      // leave balance as-is, user can retry via top-up flow
    } finally {
      setBalanceLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (authChecked) fetchBalance();
  }, [authChecked, fetchBalance]);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const startPolling = useCallback(() => {
    let attempts = 0;
    const startingBalance = balance;

    pollingRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setErrorMsg('Payment timed out. If you were charged, contact support.');
        setStep('failed');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const backendUrl = import.meta.env.VITE_API_URL;

      try {
        const response = await fetch(`${backendUrl}/wallet/${eventId}/balance`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await response.json();
        if (body.success && body.balance !== startingBalance) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setBalance(body.balance);
          setStep('success');
        }
      } catch {
        // retry next tick
      }
    }, POLL_INTERVAL_MS);
  }, [eventId, balance]);

  const handleTopup = async () => {
    const topupAmount = Number(amount);
    if (!topupAmount || topupAmount <= 0) {
      setErrorMsg('Enter a valid amount.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg('Enter the phone number to pay with.');
      return;
    }

    setStep('processing');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const backendUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${backendUrl}/wallet/${eventId}/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: topupAmount, phoneNumber }),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        setErrorMsg(body?.error || `Top-up failed (HTTP ${response.status})`);
        setStep('failed');
        return;
      }

      startPolling();
    } catch (err) {
      setErrorMsg(err.message || 'Network error starting top-up');
      setStep('failed');
    }
  };

  const resetFlow = () => {
    setAmount('');
    setPhoneNumber('');
    setStep('idle');
    setErrorMsg('');
    setShowTopup(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D2B20] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E7C65F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        <div className="text-center space-y-1">
          <Wallet className="w-8 h-8 text-[#E7C65F] mx-auto" />
          <h1 className="text-2xl font-bold text-[#E7C65F]">HIVE Wallet</h1>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Balance</p>
          {balanceLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#E7C65F] mx-auto" />
          ) : (
            <p className="text-3xl font-bold text-[#E7C65F]">KSh {balance ?? 0}</p>
          )}
        </div>

        <button
          onClick={() => setShowTopup(true)}
          className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Top up
        </button>
      </div>

      {showTopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D2B20] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            {step === 'idle' && (
              <>
                <h3 className="font-bold text-lg">Top up your wallet</h3>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Amount (KSh)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">M-Pesa phone number</label>
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
                    onClick={handleTopup}
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
                <p className="font-bold">Top-up confirmed — new balance: KSh {balance}</p>
                <button onClick={resetFlow} className="w-full bg-[#E7C65F] hover:bg-[#d4b550] text-[#0D2B20] font-bold py-2.5 rounded-xl">
                  Done
                </button>
              </div>
            )}

            {step === 'failed' && (
              <div className="text-center py-6 space-y-3">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-red-200 text-sm">{errorMsg || 'Top-up failed.'}</p>
                <button onClick={() => setStep('idle')} className="w-full border border-white/20 py-2.5 rounded-xl">
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
