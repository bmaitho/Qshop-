import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Ticket, Calendar, Clock, MapPin, User } from 'lucide-react';
import { supabase } from './SupabaseClient';

const VerifyTicket = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, valid, used, invalid, error
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [attendee, setAttendee] = useState(null);

  useEffect(() => {
    if (token) verifyTicket();
  }, [token]);

  const verifyTicket = async () => {
    try {
      // Look up ticket by token
      const { data: ticketData, error: ticketError } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('ticket_token', token)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (ticketError) throw ticketError;

      if (!ticketData) {
        setStatus('invalid');
        return;
      }

      setTicket(ticketData);

      // Fetch event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', ticketData.event_id)
        .single();

      if (eventData) setEvent(eventData);

      // Fetch attendee profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', ticketData.user_id)
        .single();

      if (profileData) setAttendee(profileData);

      // Check if already scanned
      if (ticketData.scanned) {
        setStatus('used');
        return;
      }

      // Mark as scanned
      const { error: updateError } = await supabase
        .from('event_tickets')
        .update({
          scanned: true,
          scanned_at: new Date().toISOString(),
        })
        .eq('id', ticketData.id);

      if (updateError) {
        console.error('Error marking ticket as scanned:', updateError);
      }

      setStatus('valid');
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
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

  const formatScannedAt = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-KE', {
      dateStyle: 'medium', timeStyle: 'short'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: status === 'valid' ? 'linear-gradient(135deg, #0a3d1a 0%, #0D2B20 100%)' :
                    status === 'used' ? 'linear-gradient(135deg, #3d2a0a 0%, #2b1d08 100%)' :
                    status === 'invalid' ? 'linear-gradient(135deg, #3d0a0a 0%, #2b0808 100%)' :
                    '#0D2B20'
      }}
    >
      <div className="w-full max-w-sm">
        {/* UniHive branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#E7C65F]">UniHive</h1>
          <p className="text-white/40 text-sm">Ticket Verification</p>
        </div>

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
          {/* Status header */}
          <div className={`p-8 text-center ${
            status === 'loading' ? '' :
            status === 'valid' ? 'bg-green-500/10' :
            status === 'used' ? 'bg-yellow-500/10' :
            'bg-red-500/10'
          }`}>
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-[#E7C65F] mx-auto mb-4"></div>
                <p className="text-white/60 text-lg">Verifying ticket...</p>
              </>
            )}

            {status === 'valid' && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-[pulse_0.5s_ease-in-out]">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400 mb-1">VALID TICKET</h2>
                <p className="text-green-300/60 text-sm">Entry granted — ticket marked as used</p>
                {ticket?.admits_count > 1 && (
                  <div className="mt-4 inline-block bg-green-500/20 border-2 border-green-400/40 rounded-2xl px-5 py-3">
                    <p className="text-green-400 text-3xl font-bold leading-none">ADMITS {ticket.admits_count}</p>
                    <p className="text-green-300/70 text-xs mt-1">Group ticket — let {ticket.admits_count} people in</p>
                  </div>
                )}
              </>
            )}

            {status === 'used' && (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-12 h-12 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-yellow-400 mb-1">ALREADY USED</h2>
                <p className="text-yellow-300/60 text-sm">
                  Scanned {ticket?.scanned_at ? formatScannedAt(ticket.scanned_at) : 'earlier'}
                </p>
                {ticket?.admits_count > 1 && (
                  <p className="text-yellow-300/40 text-xs mt-2">
                    Group ticket ({ticket.admits_count} entries)
                  </p>
                )}
              </>
            )}

            {status === 'invalid' && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-400 mb-1">INVALID TICKET</h2>
                <p className="text-red-300/60 text-sm">This ticket does not exist or has been cancelled</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-400 mb-1">ERROR</h2>
                <p className="text-red-300/60 text-sm">Something went wrong. Try again.</p>
              </>
            )}
          </div>

          {/* Details section */}
          {(status === 'valid' || status === 'used') && event && (
            <div className="p-6 space-y-4 border-t border-white/10">
              {/* Event info */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Event</p>
                <p className="text-white font-semibold text-lg">{event.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#E7C65F]" />
                  <span className="text-white/70 text-sm">{formatDate(event.event_date)}</span>
                </div>
                {event.event_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#E7C65F]" />
                    <span className="text-white/70 text-sm">{formatTime(event.event_time)}</span>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-[#E7C65F]" />
                    <span className="text-white/70 text-sm">{event.venue}</span>
                  </div>
                )}
              </div>

              {/* Attendee info */}
              {attendee && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Attendee</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E7C65F]/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#E7C65F]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{attendee.full_name || 'Unknown'}</p>
                      {attendee.phone && (
                        <p className="text-white/40 text-sm">{attendee.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Token */}
              <div className="pt-2">
                <p className="text-white/20 text-xs font-mono text-center break-all">{token}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scan another */}
        {status !== 'loading' && (
          <div className="text-center mt-6">
            <p className="text-white/30 text-xs">Scan another QR code to verify the next ticket</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyTicket;