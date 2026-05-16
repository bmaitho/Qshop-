import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Calendar, Clock, MapPin, User, ShieldCheck } from 'lucide-react';
import { supabase } from './SupabaseClient';
import QRCode from './QRCode';

const VerifyTicket = () => {
  const { token } = useParams();

  // Status flow:
  //  loading            -> fetching ticket + auth state
  //  holder_view        -> ticket holder (or anyone) viewing a fresh ticket -> show details only
  //  ready_to_scan      -> staff + ticket is fresh -> show MARK AS USED button
  //  marking            -> staff just tapped the button, performing update
  //  valid              -> just marked as used right now (success animation)
  //  used               -> ticket was already used previously
  //  invalid            -> token does not match any completed ticket
  //  error              -> something blew up
  const [status, setStatus] = useState('loading');
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [staffUser, setStaffUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (token) loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadTicket = async () => {
    try {
      // 1. Check auth state
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Look up the ticket (public SELECT policy allows this)
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

      // 3. If already used, show used state regardless of who's viewing
      if (ticketData.scanned) {
        setStatus('used');
        return;
      }

      // 4. Not used. Determine if viewer is staff (can mark as used) or just a holder (view only).
      //    Public ticket holders should see their ticket details without being forced to log in.
      if (!user) {
        setStatus('holder_view');
        return;
      }

      // Check is_admin OR is_staff on profile
      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, is_admin, is_staff')
        .eq('id', user.id)
        .maybeSingle();

      if (!viewerProfile?.is_admin && !viewerProfile?.is_staff) {
        // Logged-in non-staff user — they're a holder, show details only.
        setStatus('holder_view');
        return;
      }

      // Staff + fresh ticket -> arm the MARK AS USED button
      setStaffUser({ id: user.id, name: viewerProfile.full_name || user.email });
      setStatus('ready_to_scan');
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMsg(err.message || 'Unknown error');
      setStatus('error');
    }
  };

  const markAsUsed = async () => {
    if (!ticket || !staffUser) return;
    setStatus('marking');

    try {
      // Use the atomic admit_ticket RPC — handles single & group tickets,
      // locks the row to prevent double-admit under concurrency,
      // and re-verifies staff role server-side.
      const { data: updated, error: rpcError } = await supabase.rpc('admit_ticket', {
        p_ticket_id: ticket.id,
        p_admits_to_use: 1,
      });

      if (rpcError) {
        console.error('Mark-as-used RPC error:', rpcError);
        setErrorMsg(rpcError.message || 'Failed to mark ticket as used');
        setStatus('error');
        return;
      }

      if (!updated) {
        setStatus('used');
        return;
      }

      setTicket(updated);
      const fullyUsed = (updated.admits_used || 0) >= (updated.admits_count || 1);
      setStatus(fullyUsed ? 'valid' : 'ready_to_scan');
    } catch (err) {
      console.error('Mark-as-used exception:', err);
      setErrorMsg(err.message || 'Unknown error');
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

  const bgGradient =
    status === 'valid' ? 'linear-gradient(135deg, #0a3d1a 0%, #0D2B20 100%)' :
    status === 'used' ? 'linear-gradient(135deg, #3d2a0a 0%, #2b1d08 100%)' :
    status === 'invalid' || status === 'error' ? 'linear-gradient(135deg, #3d0a0a 0%, #2b0808 100%)' :
    status === 'ready_to_scan' || status === 'marking' ? 'linear-gradient(135deg, #0a3d2a 0%, #0D2B20 100%)' :
    status === 'holder_view' ? 'linear-gradient(135deg, #0D2B20 0%, #08201A 100%)' :
    '#0D2B20';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: bgGradient }}>
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
            status === 'loading' || status === 'marking' ? '' :
            status === 'valid' ? 'bg-green-500/10' :
            status === 'used' ? 'bg-yellow-500/10' :
            status === 'ready_to_scan' ? 'bg-emerald-500/10' :
            status === 'holder_view' ? 'bg-[#E7C65F]/10' :
            'bg-red-500/10'
          }`}>
            {(status === 'loading' || status === 'marking') && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-[#E7C65F] mx-auto mb-4"></div>
                <p className="text-white/60 text-lg">
                  {status === 'marking' ? 'Marking ticket as used...' : 'Loading ticket...'}
                </p>
              </>
            )}

            {status === 'ready_to_scan' && (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-400 mb-1">FRESH TICKET</h2>
                <p className="text-emerald-200/70 text-sm">Verify attendee details below, then mark as used</p>
                {ticket?.admits_count > 1 && (
                  <div className="mt-4 inline-block bg-emerald-500/20 border-2 border-emerald-400/40 rounded-2xl px-5 py-3">
                    <p className="text-emerald-300 text-3xl font-bold leading-none">ADMITS {ticket.admits_count}</p>
                    <p className="text-emerald-200/70 text-xs mt-1">Group ticket — admits {ticket.admits_count} people</p>
                  </div>
                )}
              </>
            )}

            {status === 'valid' && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-[pulse_0.5s_ease-in-out]">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400 mb-1">ENTRY GRANTED</h2>
                <p className="text-green-300/70 text-sm">Ticket marked as used just now</p>
                {ticket?.admits_count > 1 && (
                  <div className="mt-4 inline-block bg-green-500/20 border-2 border-green-400/40 rounded-2xl px-5 py-3">
                    <p className="text-green-400 text-3xl font-bold leading-none">ADMITS {ticket.admits_count}</p>
                    <p className="text-green-300/70 text-xs mt-1">Let {ticket.admits_count} people in</p>
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
                <p className="text-yellow-300/70 text-sm">
                  Scanned {ticket?.scanned_at ? formatScannedAt(ticket.scanned_at) : 'earlier'}
                </p>
                {ticket?.admits_count > 1 && (
                  <p className="text-yellow-300/40 text-xs mt-2">
                    Group ticket ({ticket.admits_count} entries)
                  </p>
                )}
              </>
            )}

            {status === 'holder_view' && (
              <>
                <div className="w-20 h-20 rounded-full bg-[#E7C65F]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-[#E7C65F]" />
                </div>
                <h2 className="text-2xl font-bold text-[#E7C65F] mb-1">YOUR TICKET</h2>
                <p className="text-white/60 text-sm">Show the QR code below at the entrance</p>
                {ticket?.admits_count > 1 && (
                  <div className="mt-4 inline-block bg-[#E7C65F]/20 border-2 border-[#E7C65F]/40 rounded-2xl px-5 py-3">
                    <p className="text-[#E7C65F] text-3xl font-bold leading-none">ADMITS {ticket.admits_count}</p>
                    <p className="text-[#E7C65F]/70 text-xs mt-1">Group ticket — admits {ticket.admits_count} people</p>
                  </div>
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
                <p className="text-red-300/60 text-sm">{errorMsg || 'Something went wrong. Try again.'}</p>
              </>
            )}
          </div>

          {/* Details section (shown whenever we found a ticket) */}
          {(['ready_to_scan', 'valid', 'used', 'holder_view'].includes(status)) && event && (
            <div className="p-6 space-y-4 border-t border-white/10">
              {/* QR code — show for fresh tickets (holder + staff views). Hidden on valid/used. */}
              {['holder_view', 'ready_to_scan'].includes(status) && ticket?.ticket_token && (
                <div className="flex flex-col items-center -mt-2 mb-2">
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <QRCode
                      value={`${window.location.origin}/verify-ticket/${ticket.ticket_token}`}
                      size={200}
                      fgColor="#0D2B20"
                    />
                  </div>
                  <p className="text-white/40 text-[11px] mt-3 text-center">
                    Present this QR code at the entrance
                  </p>
                </div>
              )}

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

              {/* Tier */}
              {ticket?.tier && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Tier</p>
                  <p className="text-white font-medium">{ticket.tier}</p>
                </div>
              )}

              {/* Attendee info */}
              {attendee && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Attendee</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E7C65F]/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#E7C65F]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{attendee.full_name || ticket?.guest_name || 'Unknown'}</p>
                      {attendee.phone && (
                        <p className="text-white/40 text-sm">{attendee.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MARK AS USED button — only when staff is viewing a fresh ticket */}
              {status === 'ready_to_scan' && (
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={markAsUsed}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    MARK AS USED
                  </button>
                  <p className="text-white/30 text-[10px] text-center mt-2">
                    Signed in as {staffUser?.name}
                  </p>
                </div>
              )}

              {/* Token */}
              <div className="pt-2">
                <p className="text-white/20 text-xs font-mono text-center break-all">{token}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer hint */}
        {!['loading', 'marking'].includes(status) && (
          <div className="text-center mt-6">
            <p className="text-white/30 text-xs">
              {status === 'holder_view'
                ? 'Save this page — your QR is your entry pass'
                : status === 'ready_to_scan'
                ? 'Scan another QR code to verify the next ticket'
                : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyTicket;