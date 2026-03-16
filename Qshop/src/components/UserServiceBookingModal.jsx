import { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle, XCircle, PhoneCall } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { initiateMpesaPayment } from '../Services/mpesaService';
import { toast } from 'react-toastify';

const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function UserServiceBookingModal({ service, sellerProfile, onClose }) {
  const [step, setStep] = useState('confirm'); // confirm | phone | processing | success | failed
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [bookingRef, setBookingRef] = useState(null);
  const [mpesaReceipt, setMpesaReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [processing, setProcessing] = useState(false);
  const pollingRef = useRef(null);

  const availabilities = service.user_service_availabilities || [];

  useEffect(() => {
    async function prefillPhone() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single();
        if (profile?.phone) setPhoneNumber(profile.phone);
      }
    }
    prefillPhone();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  async function handlePay() {
    if (!phoneNumber.trim()) { toast.error('Enter your M-Pesa number'); return; }
    setProcessing(true);
    setErrorMsg('');

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Please log in to complete this booking');

      const commissionRate = service.commission_rate ?? 5.00;
      const commissionAmount = Math.ceil((service.price * commissionRate) / 100);
      const payoutAmount = service.price - commissionAmount;

      const { data: booking, error: bookingErr } = await supabase
        .from('user_service_bookings')
        .insert({
          service_id: service.id,
          seller_id: service.user_id,
          buyer_id: user.id,
          scheduled_date: scheduledDate || null,
          scheduled_start_time: scheduledTime || null,
          notes: notes.trim() || null,
          amount: service.price,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          payout_amount: payoutAmount,
          phone_number: phoneNumber,
          payment_status: 'pending',
          booking_status: 'pending',
          payout_status: 'pending',
        })
        .select()
        .single();

      if (bookingErr) throw bookingErr;
      setBookingId(booking.id);
      setBookingRef(booking.booking_reference);
      setStep('processing');

      const response = await initiateMpesaPayment(
        phoneNumber,
        service.price,
        booking.id,
        `UniHive-${booking.booking_reference}`
      );
      if (!response.success) throw new Error(response.error || 'M-Pesa request failed');

      const checkoutId = response.data?.data?.CheckoutRequestID;
      if (!checkoutId) throw new Error('No checkout ID from M-Pesa');

      await supabase
        .from('user_service_bookings')
        .update({ checkout_request_id: checkoutId })
        .eq('id', booking.id);

      startPolling(checkoutId, booking.id);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Payment initiation failed');
      setStep('failed');
    } finally {
      setProcessing(false);
    }
  }

  function startPolling(checkoutId, bkId) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    poll(checkoutId, bkId);
    pollingRef.current = setInterval(() => poll(checkoutId, bkId), 5000);
  }

  async function poll(checkoutId, bkId) {
    try {
      const { data: bk } = await supabase
        .from('user_service_bookings')
        .select('payment_status, mpesa_receipt')
        .eq('id', bkId)
        .single();

      if (bk?.payment_status === 'completed') {
        clearInterval(pollingRef.current);
        setMpesaReceipt(bk.mpesa_receipt);
        setStep('success');
        toast.success('Booking confirmed! 🎉');
      } else if (bk?.payment_status === 'failed') {
        clearInterval(pollingRef.current);
        setErrorMsg('Payment was cancelled or failed.');
        setStep('failed');
      }
    } catch {}
  }

  const priceLabel = service.price_type === 'per_hour' ? '/hr'
    : service.price_type === 'per_session' ? '/session' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-semibold">Book Service</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Service summary */}
          <div className="bg-muted rounded-xl p-4 mb-5">
            <p className="font-semibold">{service.title}</p>
            <p className="text-xs text-muted-foreground mb-1">{service.category}</p>
            {sellerProfile && (
              <p className="text-xs text-muted-foreground">By {sellerProfile.full_name}</p>
            )}
            <p className="text-lg font-bold text-primary mt-2">{fmt(service.price)}<span className="text-sm font-normal text-muted-foreground">{priceLabel}</span></p>
          </div>

          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Scheduling */}
              <div>
                <label className="text-sm font-medium mb-1 block">Preferred Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {availabilities.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Preferred Time</label>
                  <select
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a time slot</option>
                    {availabilities.map((av, i) => (
                      <option key={i} value={av.start_time}>
                        {av.day_of_week !== null ? DAYS_FULL[av.day_of_week] : av.date} — {av.start_time.slice(0,5)} to {av.end_time.slice(0,5)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Additional Notes (optional)</label>
                <textarea
                  rows={2} maxLength={300}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special requirements or details..."
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted rounded-xl p-3">
                <PhoneCall className="w-4 h-4 shrink-0" />
                <p>Enter the M-Pesa number to send the STK push to. You'll get a prompt on your phone.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="bg-muted rounded-xl p-3 text-sm">
                <div className="flex justify-between mb-1"><span className="text-muted-foreground">Amount</span><span className="font-bold">{fmt(service.price)}</span></div>
                {scheduledDate && <div className="flex justify-between text-xs text-muted-foreground"><span>Date</span><span>{scheduledDate}</span></div>}
              </div>
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full bg-[#00a651] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                Pay {fmt(service.price)} via M-Pesa
              </button>
              <button onClick={() => setStep('confirm')} className="w-full text-sm text-muted-foreground hover:text-foreground">← Back</button>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="font-semibold">Waiting for M-Pesa...</p>
              <p className="text-sm text-muted-foreground">Check your phone for the STK push prompt and enter your PIN.</p>
              <p className="text-xs text-muted-foreground">Ref: {bookingRef}</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
              <p className="font-bold text-lg">Booking Confirmed!</p>
              <div className="bg-muted rounded-xl p-4 text-sm space-y-1 text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{service.title}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-medium">{fmt(service.price)}</span></div>
                {mpesaReceipt && <div className="flex justify-between"><span className="text-muted-foreground">Receipt</span><span className="font-medium">{mpesaReceipt}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span className="font-medium">{bookingRef}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">The service provider will reach out to confirm your appointment.</p>
              <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90">Done</button>
            </div>
          )}

          {step === 'failed' && (
            <div className="text-center py-8 space-y-4">
              <XCircle className="w-14 h-14 mx-auto text-red-500" />
              <p className="font-bold text-lg">Payment Failed</p>
              <p className="text-sm text-muted-foreground">{errorMsg || 'Please try again.'}</p>
              <button onClick={() => setStep('phone')} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90">Try Again</button>
              <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
