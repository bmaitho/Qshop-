import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, Share2, CheckCircle } from 'lucide-react';
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
      // Fetch event by slug
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
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to claim a ticket');
      navigate('/auth');
      return;
    }

    // Check capacity
    if (event.max_capacity && event.tickets_sold >= event.max_capacity) {
      toast.error('Sorry, this event is sold out!');
      return;
    }

    setClaiming(true);
    try {
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

      if (error) {
        if (error.code === '23505') {
          toast.info('You already have a ticket for this event!');
          fetchEvent();
          return;
        }
        throw error;
      }

      // Increment tickets_sold
      await supabase
        .from('events')
        .update({ tickets_sold: (event.tickets_sold || 0) + 1 })
        .eq('id', event.id);

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
        <div className="flex flex-col items-center justify-center h-[60vh] text-foreground/60">
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

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Event image */}
        {event.image_url && (
          <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-2">
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
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{event.title}</h1>

        {/* Details grid */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-foreground/70">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          {event.event_time && (
            <div className="flex items-center gap-3 text-foreground/70">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <span>{formatTime(event.event_time)}</span>
            </div>
          )}
          {event.venue && (
            <div className="flex items-center gap-3 text-foreground/70">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <span>{event.venue}</span>
            </div>
          )}
          {event.max_capacity && (
            <div className="flex items-center gap-3 text-foreground/70">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold out'} · {event.max_capacity} capacity</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-2">About</h2>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Action area */}
        {existingTicket ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-green-700 dark:text-green-400 mb-1">You've got a ticket!</p>
            <p className="text-sm text-green-600/70 dark:text-green-400/60 mb-4">
              Show this QR code at the entrance
            </p>
            <div className="flex justify-center mb-4">
              <QRCode
                value={`${window.location.origin}/verify-ticket/${existingTicket.ticket_token}`}
                size={180}
              />
            </div>
            <p className="text-xs text-foreground/40 font-mono break-all">
              {existingTicket.ticket_token}
            </p>
            <button
              onClick={() => navigate('/my-tickets')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              View all my tickets →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleClaimTicket}
              disabled={claiming || event.status === 'cancelled' || event.status === 'past' || (spotsLeft !== null && spotsLeft <= 0)}
              className="w-full py-3.5 rounded-xl font-semibold text-base transition-all
                bg-primary text-primary-foreground hover:opacity-90 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Claiming...
                </>
              ) : (
                <>
                  <Ticket className="w-5 h-5" />
                  {event.price > 0 ? `Get Ticket — KES ${event.price}` : 'Claim Free Ticket'}
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="w-full py-3 rounded-xl font-medium text-sm border border-border text-foreground/70 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventPage;