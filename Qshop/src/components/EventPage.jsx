import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, Share2, CheckCircle, AlertCircle, PhoneCall, Loader2, XCircle } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';
import { initiateMpesaPayment, checkPaymentStatus } from '../Services/mpesaService';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import QRCode from './QRCode';

const EventPage = ({ token }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [existingTicket, setExistingTicket] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Purchase flow state
  const [selectedTier, setSelectedTier] = useState(null);
  const [step, setStep] = useState('select'); // select | phone | processing | success | failed
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEvent();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setEvent(eventData);

      // Auto-select first available tier
      if (eventData.ticket_tiers?.length > 0) {
        const available = eventData.ticket_tiers.find(t => !t.capacity || t.sold < t.capacity);
        if (available) setSelectedTier(available);
      }

      // Check if user already has a ticket
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ticket } = await supabase
          .from('event_tickets')
          .select('*')
          .eq('event_id', eventData.id)
          .eq('user_id', user.id)
          .eq('payment_status', 'completed')
          .maybeSingle();

        if (ticket) setExistingTicket(ticket);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Event not found');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTicket = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to buy a ticket');
      navigate('/auth');
      return;
    }

    if (!selectedTier) {
      toast.error('Please select a ticket tier');
      return;
    }

    // If free event, skip payment
    if (selectedTier.price === 0) {
      await claimFreeTicket(user);
      return;
    }

    // Show phone input
    setStep('phone');
  };

  const claimFreeTicket = async (user) => {
    setProcessing(true);
    try {
      const { data: existing } = await supabase
        .from('event_tickets')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (existing) {
        toast.info('You already have a ticket!');
        fetchEvent();
        return;
      }

      const { data: ticket, error } = await supabase
        .from('event_tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          amount_paid: 0,
          payment_status: 'completed',
          tier: selectedTier.name,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc('increment_tickets_sold', { event_id_input: event.id });

      setEvent(prev => ({ ...prev, tickets_sold: (prev.tickets_sold || 0) + 1 }));
      setExistingTicket(ticket);
      toast.success('Ticket claimed! 🎉');
    } catch (err) {
      console.error('Error claiming ticket:', err);
      toast.error('Failed to claim ticket');
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
      toast.error('Enter a valid phone number');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setProcessing(true);
    setStep('processing');

    try {
      // Check existing ticket
      const { data: existing } = await supabase
        .from('event_tickets')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (existing) {
        toast.info('You already have a ticket!');
        fetchEvent();
        return;
      }

      // Create pending ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('event_tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          amount_paid: selectedTier.price,
          payment_status: 'pending',
          tier: selectedTier.name,
          phone_number: phoneNumber,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Initiate STK Push
      const response = await initiateMpesaPayment(
        phoneNumber,
        selectedTier.price,
        ticket.id,
        `UniHive-${event.slug}`
      );

      if (!response.success) throw new Error(response.error);

      const checkoutId = response.data?.data?.CheckoutRequestID;
      if (!checkoutId) throw new Error('No checkout request ID from M-Pesa');

      setCheckoutRequestId(checkoutId);

      // Save checkout ID to ticket
      await supabase
        .from('event_tickets')
        .update({ mpesa_checkout_request_id: checkoutId })
        .eq('id', ticket.id);

      // Start polling
      startPolling(checkoutId, ticket.id);

    } catch (err) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Payment failed');
      setStep('failed');
      setProcessing(false);
    }
  };

  const startPolling = (checkoutId, ticketId) => {
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollingRef.current);
        setErrorMsg('Payment timed out. If you were charged, contact support.');
        setStep('failed');
        setProcessing(false);
        return;
      }

      try {
        const status = await checkPaymentStatus(checkoutId);
        if (status?.success && status.data?.paymentStatus === 'completed') {
          clearInterval(pollingRef.current);
          setMpesaReceipt(status.data.receipt || '');
          setProcessing(false);

          // Refresh ticket
          const { data: updatedTicket } = await supabase
            .from('event_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

          if (updatedTicket) setExistingTicket(updatedTicket);

          // Refresh event to get updated counts
          fetchEvent();
          setStep('success');
        } else if (status?.success && status.data?.paymentStatus === 'failed') {
          clearInterval(pollingRef.current);
          setErrorMsg('Payment was declined or cancelled.');
          setStep('failed');
          setProcessing(false);
        }
      } catch (err) {
        // Keep polling on network errors
        console.log('Polling attempt', attempts);
      }
    }, 3000);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const resetPurchase = () => {
    setStep('select');
    setPhoneNumber('');
    setProcessing(false);
    setErrorMsg('');
    setCheckoutRequestId(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-KE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  };

  const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

  const spotsLeft = event?.max_capacity ? event.max_capacity - (event.tickets_sold || 0) : null;
  const soldOut = spotsLeft !== null && spotsLeft <= 0;
  const tiers = event?.ticket_tiers || [];
  const hasTiers = tiers.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile ? <MobileNavbar /> : <Navbar />}
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile ? <MobileNavbar /> : <Navbar />}
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-foreground/60">
          <Ticket className="w-16 h-16 mb-4 opacity-40" />
          <p className="text-lg">Event not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 text-primary hover:underline">
            Browse events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <MobileNavbar /> : <Navbar />}

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="sm:bg-card sm:border sm:border-border sm:rounded-2xl sm:shadow-sm sm:overflow-hidden">

          {/* Image */}
          {event.image_url && (
            <div className="w-full h-44 sm:h-72 rounded-2xl sm:rounded-none overflow-hidden mb-4 sm:mb-0">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="sm:p-6 lg:p-8">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                event.status === 'upcoming' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                event.status === 'live' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                event.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {event.status === 'upcoming' ? '🟢 Upcoming' :
                 event.status === 'live' ? '🔴 Happening Now' :
                 event.status === 'cancelled' ? 'Cancelled' : 'Past'}
              </span>
              {soldOut && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  SOLD OUT
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
              {event.title}
            </h1>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span>{formatDate(event.event_date)}</span>
              </div>
              {event.event_time && (
                <div className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <span>{formatTime(event.event_time)}</span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span>{event.venue}</span>
                </div>
              )}
              {event.max_capacity && (
                <div className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{spotsLeft > 0 ? spotsLeft : 0}</span>
                    <span className="text-foreground/50"> / {event.max_capacity} spots left</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {event.max_capacity && (
              <div className="mb-6">
                <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      soldOut ? 'bg-red-500' : spotsLeft <= 10 ? 'bg-orange-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(((event.tickets_sold || 0) / event.max_capacity) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-foreground/40 mt-1.5">
                  {event.tickets_sold || 0} ticket{(event.tickets_sold || 0) !== 1 ? 's' : ''} claimed
                </p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">About this event</h2>
                <p className="text-foreground/75 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            <div className="border-t border-border mb-6" />

            {/* ═══ TICKET AREA ═══ */}
            {existingTicket ? (
              /* ── Already have ticket ── */
              <div className="bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800/50 rounded-2xl p-5 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                  <p className="font-semibold text-green-700 dark:text-green-400 text-lg mb-0.5">
                    You've got a ticket!
                  </p>
                  {existingTicket.tier && (
                    <p className="text-sm text-green-600/80 dark:text-green-400/70 mb-1">
                      {existingTicket.tier} · {existingTicket.amount_paid > 0 ? fmt(existingTicket.amount_paid) : 'FREE'}
                    </p>
                  )}
                  <p className="text-sm text-green-600/60 dark:text-green-400/50 mb-5">
                    Show this QR code at the entrance
                  </p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                    <QRCode
                      value={`${window.location.origin}/verify-ticket/${existingTicket.ticket_token}`}
                      size={isMobile ? 180 : 220}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                  {existingTicket.mpesa_receipt && (
                    <p className="text-xs text-foreground/40 mb-1">Receipt: {existingTicket.mpesa_receipt}</p>
                  )}
                  <p className="text-[10px] sm:text-xs text-foreground/30 font-mono break-all max-w-[280px]">
                    {existingTicket.ticket_token}
                  </p>
                  <button onClick={() => navigate('/my-tickets')} className="mt-5 text-sm text-primary hover:underline font-medium">
                    View all my tickets →
                  </button>
                </div>
              </div>

            ) : step === 'select' ? (
              /* ── Tier selection ── */
              <div className="space-y-4">
                {hasTiers ? (
                  <>
                    <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Select ticket</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tiers.map((tier, idx) => {
                        const tierSoldOut = tier.capacity && tier.sold >= tier.capacity;
                        const isSelected = selectedTier?.name === tier.name;
                        const tierSpotsLeft = tier.capacity ? tier.capacity - (tier.sold || 0) : null;

                        return (
                          <button
                            key={idx}
                            onClick={() => !tierSoldOut && setSelectedTier(tier)}
                            disabled={tierSoldOut}
                            className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                              tierSoldOut
                                ? 'border-foreground/10 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-primary/40'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                              </div>
                            )}
                            <p className="font-semibold text-foreground text-base">{tier.name}</p>
                            <p className="text-xl font-bold text-foreground mt-1">
                              {tier.price === 0 ? 'FREE' : fmt(tier.price)}
                            </p>
                            {tierSpotsLeft !== null && (
                              <p className={`text-xs mt-1.5 ${
                                tierSoldOut ? 'text-red-500' :
                                tierSpotsLeft <= 10 ? 'text-orange-500' : 'text-foreground/40'
                              }`}>
                                {tierSoldOut ? 'Sold out' : `${tierSpotsLeft} left`}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {event.price > 0 ? fmt(event.price) : 'FREE'}
                    </p>
                  </div>
                )}

                {soldOut ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>This event is sold out.</span>
                  </div>
                ) : (
                  <button
                    onClick={handleBuyTicket}
                    disabled={!selectedTier || processing}
                    className="w-full py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all
                      bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]
                      disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-5 h-5" />
                    {selectedTier?.price > 0
                      ? `Buy Ticket — ${fmt(selectedTier.price)}`
                      : 'Claim Free Ticket'}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="w-full py-3 sm:py-3.5 rounded-xl font-medium text-sm border border-border
                    text-foreground/70 hover:bg-muted/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share Event
                </button>
              </div>

            ) : step === 'phone' ? (
              /* ── Phone input ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted rounded-xl p-3">
                  <PhoneCall className="w-4 h-4 shrink-0" />
                  <p>Enter the M-Pesa number to receive the STK push. You'll get a prompt on your phone.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="0712345678"
                    className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket</span>
                    <span className="font-semibold text-foreground">{selectedTier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-foreground">{fmt(selectedTier?.price)}</span>
                  </div>
                </div>
                <button
                  onClick={handlePay}
                  disabled={processing}
                  className="w-full bg-[#00a651] text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Pay {fmt(selectedTier?.price)} via M-Pesa
                </button>
                <button onClick={resetPurchase} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
              </div>

            ) : step === 'processing' ? (
              /* ── Processing ── */
              <div className="text-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                <p className="font-semibold text-foreground">Waiting for M-Pesa...</p>
                <p className="text-sm text-muted-foreground">Check your phone for the STK push prompt and enter your PIN.</p>
              </div>

            ) : step === 'success' ? (
              /* ── Success ── */
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
                <p className="font-bold text-lg text-foreground">Ticket Confirmed!</p>
                <div className="bg-muted rounded-xl p-4 text-sm space-y-1 text-left">
                  <div className="flex justify-between"><span className="text-muted-foreground">Event</span><span className="font-medium text-foreground">{event.title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="font-medium text-foreground">{selectedTier?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium text-foreground">{fmt(selectedTier?.price)}</span></div>
                  {mpesaReceipt && <div className="flex justify-between"><span className="text-muted-foreground">Receipt</span><span className="font-medium text-foreground">{mpesaReceipt}</span></div>}
                </div>
                <button
                  onClick={() => { resetPurchase(); fetchEvent(); }}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90"
                >
                  View My Ticket
                </button>
              </div>

            ) : step === 'failed' ? (
              /* ── Failed ── */
              <div className="text-center py-8 space-y-4">
                <XCircle className="w-14 h-14 mx-auto text-red-500" />
                <p className="font-bold text-lg text-foreground">Payment Failed</p>
                <p className="text-sm text-muted-foreground">{errorMsg || 'Please try again.'}</p>
                <button onClick={() => setStep('phone')} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90">
                  Try Again
                </button>
                <button onClick={resetPurchase} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;