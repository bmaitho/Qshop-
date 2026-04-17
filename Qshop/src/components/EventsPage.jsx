import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft } from 'lucide-react';
import { supabase } from './SupabaseClient';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';

const EventsPage = ({ token }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-KE', { month: 'short' }).toUpperCase(),
      full: d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
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

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-sm text-foreground/50 mt-1">Upcoming events on UniHive</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-foreground/20" />
            <p className="text-foreground/50">No upcoming events right now</p>
            <p className="text-sm text-foreground/30 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const date = formatDate(event.event_date);
              const spotsLeft = event.max_capacity
                ? event.max_capacity - (event.tickets_sold || 0)
                : null;

              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/events/${event.slug}`)}
                  className="flex gap-4 p-4 border border-border rounded-2xl cursor-pointer 
                    hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  {/* Date block */}
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-primary leading-none">{date.month}</span>
                    <span className="text-xl font-bold text-foreground leading-none mt-0.5">{date.day}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-foreground/50">
                      {event.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(event.event_time)}
                        </span>
                      )}
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.venue}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {event.price === 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          FREE
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-foreground/70">
                          KES {event.price}
                        </span>
                      )}
                      {spotsLeft !== null && (
                        <span className={`text-xs ${spotsLeft <= 10 ? 'text-orange-500' : 'text-foreground/40'}`}>
                          {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold out'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event image thumbnail */}
                  {event.image_url && (
                    <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden hidden sm:block">
                      <img src={event.image_url} alt="" className="w-full h-full object-cover" />
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

export default EventsPage;