import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import QRCode from './QRCode';

const EventPage = ({ token }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [existingTicket, setExistingTicket] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEvent();
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

  const handleClaimTicket = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to claim a ticket');
      navigate('/auth');
      return;
    }

    // Re-fetch event to get latest tickets_sold count
    const { data: freshEvent } = await supabase
      .from('events')
      .select('tickets_sold, max_capacity')
      .eq('id', event.id)
      .single();

    if (freshEvent?.max_capacity && freshEvent.tickets_sold >= freshEvent.max_capacity) {
      toast.error('Sorry, this event is sold out!');
      setEvent(prev => ({ ...prev, tickets_sold: freshEvent.tickets_sold }));
      return;
    }

    setClaiming(true);
    try {
      // Check for existing ticket first
      const { data: existing } = await supabase
        .from('event_tickets')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (existing) {
        toast.info('You already have a ticket for this event!');
        fetchEvent();
        return;
      }

      // Insert ticket
      const { data: ticket, error } = await supabase
        .from('event_tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          amount_paid: event.price || 0,
          payment_status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;

      // Atomic increment via RPC
      const { error: rpcError } = await supabase.rpc('increment_tickets_sold', {
        event_id_input: event.id
      });

      if (rpcError) {
        console.error('RPC increment error:', rpcError);
        // Fallback: manual update
        await supabase
          .from('events')
          .update({ tickets_sold: (event.tickets_sold || 0) + 1 })
          .eq('id', event.id);
      }

      // Update local state immediately
      setEvent(prev => ({
        ...prev,
        tickets_sold: (prev.tickets_sold || 0) + 1
      }));
      setExistingTicket(ticket);
      toast.success('Ticket claimed! 🎉');
    } catch (err) {
      console.error('Error claiming ticket:', err);
      toast.error('Failed to claim ticket. Try again.');
    } finally {
      setClaiming(false);
    }
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

  const spotsLeft = event?.max_capacity ? event.max_capacity - (event.tickets_sold || 0) : null;
  const soldOut = spotsLeft !== null && spotsLeft <= 0;

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

      {/* Desktop: centered card layout. Mobile: edge-to-edge */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Main card on desktop, flat on mobile */}
        <div className="sm:bg-card sm:border sm:border-border sm:rounded-2xl sm:shadow-sm sm:overflow-hidden">

          {/* Event image */}
          {event.image_url && (
            <div className="w-full h-44 sm:h-72 rounded-2xl sm:rounded-none overflow-hidden mb-4 sm:mb-0">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="sm:p-6 lg:p-8">
            {/* Status badges */}
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
              {event.price === 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  FREE
                </span>
              )}
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
                    <span className="font-medium text-foreground">
                      {spotsLeft > 0 ? spotsLeft : 0}
                    </span>
                    <span className="text-foreground/50"> / {event.max_capacity} spots left</span>
                  </div>
                </div>
              )}
            </div>

            {/* Capacity progress bar */}
            {event.max_capacity && (
              <div className="mb-6">
                <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      soldOut ? 'bg-red-500' :
                      spotsLeft <= 10 ? 'bg-orange-500' :
                      'bg-primary'
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

            {/* Divider */}
            <div className="border-t border-border mb-6" />

            {/* Action area */}
            {existingTicket ? (
              <div className="bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800/50 rounded-2xl p-5 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                  <p className="font-semibold text-green-700 dark:text-green-400 text-lg mb-1">
                    You've got a ticket!
                  </p>
                  <p className="text-sm text-green-600/60 dark:text-green-400/50 mb-5">
                    Show this QR code at the entrance
                  </p>

                  {/* QR code with white background for scanability */}
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                    <QRCode
                      value={`${window.location.origin}/verify-ticket/${existingTicket.ticket_token}`}
                      size={isMobile ? 180 : 220}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>

                  <p className="text-[10px] sm:text-xs text-foreground/30 font-mono break-all max-w-[280px]">
                    {existingTicket.ticket_token}
                  </p>

                  <button
                    onClick={() => navigate('/my-tickets')}
                    className="mt-5 text-sm text-primary hover:underline font-medium"
                  >
                    View all my tickets →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {soldOut && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15 rounded-xl p-3 mb-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>This event is sold out. No more tickets available.</span>
                  </div>
                )}

                <button
                  onClick={handleClaimTicket}
                  disabled={claiming || event.status === 'cancelled' || event.status === 'past' || soldOut}
                  className="w-full py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all
                    bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Claiming...
                    </>
                  ) : soldOut ? (
                    'Sold Out'
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" />
                      {event.price > 0 ? `Get Ticket — KES ${event.price}` : 'Claim Free Ticket'}
                    </>
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="w-full py-3 sm:py-3.5 rounded-xl font-medium text-sm border border-border 
                    text-foreground/70 hover:bg-muted/50 active:scale-[0.98] transition-all 
                    flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;