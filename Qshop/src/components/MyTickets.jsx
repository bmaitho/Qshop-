import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Clock, MapPin, ArrowLeft, QrCode } from 'lucide-react';
import { supabase } from './SupabaseClient';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import QRCode from './QRCode';

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedTicket, setExpandedTicket] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (ticketError) throw ticketError;

      if (!ticketData || ticketData.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      // Fetch associated events
      const eventIds = [...new Set(ticketData.map(t => t.event_id))];
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      const eventMap = {};
      (events || []).forEach(e => { eventMap[e.id] = e; });

      const enriched = ticketData.map(t => ({
        ...t,
        event: eventMap[t.event_id] || null,
      }));

      setTickets(enriched);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-KE', {
      weekday: 'short', month: 'short', day: 'numeric'
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

  const isUpcoming = (event) => {
    if (!event) return false;
    return new Date(event.event_date + 'T23:59:59') >= new Date();
  };

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

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <MobileNavbar /> : <Navbar />}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">My Tickets</h1>
        <p className="text-sm text-foreground/50 mb-6">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>

        {tickets.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-gradient-to-br from-[#0D2B20] to-[#0D2B20]/90 rounded-2xl p-8 border border-[#E7C65F]/30 shadow-lg">
              <Ticket className="w-14 h-14 mx-auto mb-4 text-[#E7C65F]" />
              <h2 className="text-xl font-bold text-white mb-2">No tickets yet</h2>
              <p className="text-white/70 text-sm mb-6 max-w-sm mx-auto">
                You haven't grabbed a ticket yet. Head over to The Hive to see what's coming up.
              </p>
              <button
                onClick={() => navigate('/events')}
                className="inline-flex items-center gap-2 bg-[#E7C65F] hover:bg-[#E7C65F]/90 text-[#0D2B20] font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Ticket className="w-4 h-4" />
                Go to The Hive
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const event = ticket.event;
              const upcoming = isUpcoming(event);
              const expanded = expandedTicket === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    ticket.scanned
                      ? 'border-foreground/10 opacity-60'
                      : upcoming
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border'
                  }`}
                >
                  {/* Ticket header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedTicket(expanded ? null : ticket.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {event?.title || 'Unknown Event'}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-foreground/60">
                          {event?.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(event.event_date)}
                            </span>
                          )}
                          {event?.event_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(event.event_time)}
                            </span>
                          )}
                          {event?.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.venue}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="ml-3 shrink-0">
                        {ticket.scanned ? (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Used
                          </span>
                        ) : upcoming ? (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Valid
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{expanded ? 'Hide' : 'Show'} QR Code</span>
                    </div>
                  </div>

                  {/* Expanded QR section */}
                  {expanded && (
                    <div className="border-t border-dashed border-foreground/10 p-6 bg-background text-center">
                      <div className="inline-block p-3 bg-white rounded-xl">
                        <QRCode
                          value={`${window.location.origin}/verify-ticket/${ticket.ticket_token}`}
                          size={200}
                          fgColor="#000000"
                          bgColor="#ffffff"
                        />
                      </div>
                      <p className="text-xs text-foreground/30 font-mono mt-3 break-all">
                        {ticket.ticket_token}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;