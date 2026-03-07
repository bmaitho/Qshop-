import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, PhoneCall, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { initiateMpesaPayment, checkPaymentStatus } from '../Services/mpesaService';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

/**
 * ServiceCheckout
 * Props:
 *   service         — the service object (id, name, deposit_percentage, allows_deposit)
 *   selectedComps   — array of selected component objects [{ id, name, price, category_id }]
 *   total           — number, full package price
 *   deposit         — number, deposit amount
 *   paymentType     — 'full' | 'deposit'
 *   onClose         — fn to go back to ServicePage
 */
export default function ServiceCheckout({ service, selectedComps, total, deposit, paymentType, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm'); // confirm | phone | processing | success | failed
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [mpesaReceipt, setMpesaReceipt] = useState(null);
  const [bookingReference, setBookingReference] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pollingInterval = useRef(null);

  const amountDue = paymentType === 'deposit' ? deposit : total;
  const amountRemaining = paymentType === 'deposit' ? total - deposit : 0;

  useEffect(() => {
    // Pre-fill phone from profile
    async function getPhone() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single();
        if (profile?.phone) setPhoneNumber(profile.phone);
      }
    }
    getPhone();
    return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
  }, []);

  // ── Step 1: Create booking record then initiate STK Push
  async function handlePay() {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }
    setProcessing(true);
    setErrorMsg('');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please log in to complete this booking');

      const commissionRate = service.commission_rate ?? 5.00;
      const commissionAmount = Math.ceil((total * commissionRate) / 100);

      // Insert service_booking record
      const { data: booking, error: bookingError } = await supabase
        .from('service_bookings')
        .insert({
          service_id: service.id,
          user_id: user.id,
          selected_components: selectedComps.map(c => ({
            component_id: c.id,
            name: c.name,
            price: c.price,
            category_id: c.category_id,
          })),
          subtotal: total,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          payment_type: paymentType,
          deposit_percentage: paymentType === 'deposit' ? service.deposit_percentage : null,
          amount_due: amountDue,
          amount_remaining: amountRemaining,
          amount_paid: 0,
          phone_number: phoneNumber,
          booking_status: 'pending',
          payment_status: 'pending',
          payout_status: 'pending',
          payout_amount: total - commissionAmount,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setBookingId(booking.id);
      setBookingReference(booking.booking_reference);
      setStep('processing');

      // Initiate STK Push — reuses existing mpesaService
      const response = await initiateMpesaPayment(
        phoneNumber,
        amountDue,
        booking.id, // orderId field used as booking reference for callback
        `UniHive-${booking.booking_reference}`
      );

      if (!response.success) throw new Error(response.error);

      const checkoutId = response.data?.data?.CheckoutRequestID;
      if (!checkoutId) throw new Error('No checkout request ID received from M-Pesa');

      setCheckoutRequestId(checkoutId);

      // Save checkout_request_id to booking
      await supabase
        .from('service_bookings')
        .update({ checkout_request_id: checkoutId })
        .eq('id', booking.id);

      // Start polling
      startPolling(checkoutId, booking.id);

    } catch (err) {
      console.error('Service checkout error:', err);
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
      setStep('failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  }

  function startPolling(checkoutId, bkId) {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    pollOnce(checkoutId, bkId);
    pollingInterval.current = setInterval(() => pollOnce(checkoutId, bkId), 5000);
  }

  async function pollOnce(checkoutId, bkId) {
    try {
      // Primary: query service_bookings directly (most reliable)
      const { data: booking } = await supabase
        .from('service_bookings')
        .select('payment_status, booking_status, mpesa_receipt, amount_paid')
        .eq('id', bkId)
        .single();

      if (booking?.payment_status === 'completed') {
        clearInterval(pollingInterval.current);
        setMpesaReceipt(booking.mpesa_receipt);
        setStep('success');
        toast.success('Booking confirmed! 🎉');
        return;
      }

      if (booking?.payment_status === 'failed') {
        clearInterval(pollingInterval.current);
        setErrorMsg('Payment was cancelled or failed.');
        setStep('failed');
        return;
      }

      // Fallback: check via backend status endpoint
      const statusResponse = await checkPaymentStatus(checkoutId);
      if (statusResponse.success) {
        const status = statusResponse.data?.data?.paymentStatus;
        if (status === 'completed') {
          clearInterval(pollingInterval.current);
          setStep('success');
          toast.success('Booking confirmed! 🎉');
        } else if (status === 'failed') {
          clearInterval(pollingInterval.current);
          setErrorMsg('Payment was cancelled or failed.');
          setStep('failed');
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }

  // ── Styles (matching ServicePage brand)
  const s = {
    root: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    },
    sheet: {
      background: '#0d2318',
      border: '1px solid rgba(231,198,95,0.12)',
      borderBottom: 'none',
      borderRadius: '24px 24px 0 0',
      width: '100%', maxWidth: 520,
      maxHeight: '92vh', overflowY: 'auto',
      padding: '0 0 32px',
      fontFamily: "'DM Sans', sans-serif",
      color: '#f0f0f5',
      animation: 'slideUp 0.3s ease',
    },
    handle: {
      width: 40, height: 4,
      background: 'rgba(231,198,95,0.2)',
      borderRadius: 2, margin: '12px auto 0',
    },
    header: { padding: '20px 24px 0' },
    title: {
      fontFamily: "'Syne', sans-serif",
      fontSize: 20, fontWeight: 800,
      marginBottom: 4,
    },
    sub: { color: '#7a9e85', fontSize: 13, marginBottom: 20 },
    section: {
      margin: '20px 24px 0',
      background: '#113b1e',
      border: '1px solid rgba(231,198,95,0.1)',
      borderRadius: 14, padding: 16,
    },
    sectionTitle: {
      fontFamily: "'Syne', sans-serif",
      fontSize: 11, fontWeight: 700,
      color: '#e7c65f', textTransform: 'uppercase',
      letterSpacing: '0.08em', marginBottom: 12,
    },
    line: {
      display: 'flex', justifyContent: 'space-between',
      fontSize: 13, marginBottom: 8, color: '#7a9e85',
    },
    lineVal: { color: '#f0f0f5', fontWeight: 500 },
    divider: { borderTop: '1px solid rgba(231,198,95,0.1)', margin: '8px 0' },
    totalLine: {
      display: 'flex', justifyContent: 'space-between',
      fontFamily: "'Syne', sans-serif",
      fontSize: 16, fontWeight: 700, marginTop: 8,
    },
    depositNote: {
      margin: '16px 24px 0',
      background: 'rgba(231,198,95,0.07)',
      border: '1px solid rgba(231,198,95,0.2)',
      borderRadius: 12, padding: '12px 16px',
      fontSize: 12, color: '#f0d98a', lineHeight: 1.6,
    },
    phoneWrap: { margin: '16px 24px 0' },
    phoneLabel: {
      fontFamily: "'Syne', sans-serif",
      fontSize: 12, fontWeight: 700,
      color: '#e7c65f', textTransform: 'uppercase',
      letterSpacing: '0.06em', marginBottom: 8,
      display: 'block',
    },
    phoneInput: {
      width: '100%', padding: '13px 16px',
      background: '#113b1e',
      border: '1.5px solid rgba(231,198,95,0.2)',
      borderRadius: 12, color: '#f0f0f5',
      fontSize: 15, fontFamily: "'DM Sans', sans-serif",
      outline: 'none',
    },
    phoneHint: { fontSize: 11, color: '#7a9e85', marginTop: 6 },
    ctaWrap: { margin: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 10 },
    payBtn: {
      width: '100%', padding: 16,
      background: '#e7c65f', color: '#113b1e',
      border: 'none', borderRadius: 14,
      fontFamily: "'Syne', sans-serif",
      fontSize: 15, fontWeight: 800,
      cursor: 'pointer', letterSpacing: '0.02em',
      boxShadow: '0 4px 20px rgba(231,198,95,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    backBtn: {
      width: '100%', padding: 13,
      background: 'transparent',
      border: '1.5px solid rgba(231,198,95,0.2)',
      borderRadius: 14, color: '#7a9e85',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
    },
    processingBox: {
      margin: '32px 24px',
      textAlign: 'center',
    },
    spinner: {
      width: 56, height: 56,
      border: '3px solid rgba(231,198,95,0.2)',
      borderTop: '3px solid #e7c65f',
      borderRadius: '50%',
      animation: 'spin 0.9s linear infinite',
      margin: '0 auto 20px',
    },
    successBox: {
      margin: '32px 24px', textAlign: 'center',
    },
    successIcon: {
      width: 64, height: 64,
      background: 'rgba(34,197,94,0.12)',
      border: '2px solid rgba(34,197,94,0.3)',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    },
    refBox: {
      background: '#113b1e',
      border: '1px solid rgba(231,198,95,0.15)',
      borderRadius: 12, padding: '14px 16px',
      margin: '20px 0', textAlign: 'left',
    },
    errorBox: {
      margin: '32px 24px', textAlign: 'center',
    },
    errorIcon: {
      width: 64, height: 64,
      background: 'rgba(239,68,68,0.1)',
      border: '2px solid rgba(239,68,68,0.3)',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={s.root} onClick={(e) => e.target === e.currentTarget && step !== 'processing' && onClose()}>
        <div style={s.sheet}>
          <div style={s.handle} />

          {/* ── CONFIRM step */}
          {(step === 'confirm' || step === 'phone') && (
            <>
              <div style={s.header}>
                <div style={s.title}>{service.name}</div>
                <div style={s.sub}>
                  {paymentType === 'deposit'
                    ? `Paying deposit — balance of ${fmt(amountRemaining)} due before the trip`
                    : 'Paying in full'}
                </div>
              </div>

              {/* Package summary */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Your Package</div>
                {selectedComps.map(c => (
                  <div style={s.line} key={c.id}>
                    <span>{c.name}</span>
                    <span style={s.lineVal}>{fmt(c.price)}</span>
                  </div>
                ))}
                <div style={s.divider} />
                <div style={s.totalLine}>
                  <span style={{ color: '#7a9e85' }}>Package Total</span>
                  <span style={{ color: '#f0d98a' }}>{fmt(total)}</span>
                </div>
              </div>

              {/* What you pay now */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Paying Now</div>
                <div style={s.totalLine}>
                  <span style={{ color: '#7a9e85' }}>
                    {paymentType === 'deposit' ? `Deposit (${service.deposit_percentage}%)` : 'Full Payment'}
                  </span>
                  <span style={{ color: '#e7c65f', fontSize: 22 }}>{fmt(amountDue)}</span>
                </div>
                {paymentType === 'deposit' && (
                  <div style={{ ...s.line, marginTop: 8 }}>
                    <span>Balance remaining</span>
                    <span style={s.lineVal}>{fmt(amountRemaining)}</span>
                  </div>
                )}
              </div>

              {paymentType === 'deposit' && (
                <div style={s.depositNote}>
                  💡 Your spot will be secured with this deposit. You'll need to pay the remaining{' '}
                  <strong>{fmt(amountRemaining)}</strong> before the trip date.
                </div>
              )}

              {/* Phone number */}
              <div style={s.phoneWrap}>
                <label style={s.phoneLabel}>M-Pesa Phone Number</label>
                <input
                  style={s.phoneInput}
                  type="tel"
                  placeholder="07XX XXX XXX or 2547XX..."
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#e7c65f'}
                  onBlur={e => e.target.style.borderColor = 'rgba(231,198,95,0.2)'}
                />
                <div style={s.phoneHint}>Enter the number registered with M-Pesa (07XX or 2547XX)</div>
              </div>

              <div style={s.ctaWrap}>
                <button
                  style={{ ...s.payBtn, opacity: processing ? 0.7 : 1 }}
                  onClick={handlePay}
                  disabled={processing}
                >
                  {processing ? (
                    <><Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> Processing...</>
                  ) : (
                    `Pay ${fmt(amountDue)} via M-Pesa`
                  )}
                </button>
                <button style={s.backBtn} onClick={onClose}>
                  ← Back to package
                </button>
              </div>
            </>
          )}

          {/* ── PROCESSING step */}
          {step === 'processing' && (
            <div style={s.processingBox}>
              <div style={s.spinner} />
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Check Your Phone
              </div>
              <div style={{ color: '#7a9e85', fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
                An M-Pesa prompt has been sent to <strong style={{ color: '#f0d98a' }}>{phoneNumber}</strong>.
                Enter your PIN to confirm the payment of <strong style={{ color: '#f0d98a' }}>{fmt(amountDue)}</strong>.
              </div>
              <div style={{ color: '#7a9e85', fontSize: 11, marginTop: 24 }}>
                Waiting for confirmation...
              </div>
            </div>
          )}

          {/* ── SUCCESS step */}
          {step === 'success' && (
            <div style={s.successBox}>
              <div style={s.successIcon}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Booking Confirmed! 🎉
              </div>
              <div style={{ color: '#7a9e85', fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
                Your spot on <strong style={{ color: '#f0d98a' }}>{service.name}</strong> is secured.
              </div>

              <div style={s.refBox}>
                <div style={{ fontSize: 11, color: '#7a9e85', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Booking Reference
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#e7c65f', letterSpacing: '0.1em' }}>
                  {bookingReference}
                </div>
                {mpesaReceipt && (
                  <>
                    <div style={{ fontSize: 11, color: '#7a9e85', marginTop: 10, marginBottom: 2 }}>M-Pesa Receipt</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f0f0f5' }}>{mpesaReceipt}</div>
                  </>
                )}
                <div style={{ fontSize: 11, color: '#7a9e85', marginTop: 10 }}>
                  Amount paid: <strong style={{ color: '#f0d98a' }}>{fmt(amountDue)}</strong>
                  {paymentType === 'deposit' && (
                    <> · Balance due: <strong style={{ color: '#f0d98a' }}>{fmt(amountRemaining)}</strong></>
                  )}
                </div>
              </div>

              <div style={{ ...s.ctaWrap, margin: '0 0 0' }}>
                <button
                  style={s.payBtn}
                  onClick={() => {
                    onClose();
                    navigate('/my-orders');
                  }}
                >
                  View My Bookings
                </button>
                <button style={s.backBtn} onClick={onClose}>
                  Back to Services
                </button>
              </div>
            </div>
          )}

          {/* ── FAILED step */}
          {step === 'failed' && (
            <div style={s.errorBox}>
              <div style={s.errorIcon}>
                <XCircle size={32} color="#ef4444" />
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                Payment Failed
              </div>
              <div style={{ color: '#7a9e85', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                {errorMsg || 'Something went wrong. Please try again.'}
              </div>
              <div style={s.ctaWrap}>
                <button style={s.payBtn} onClick={() => { setStep('confirm'); setErrorMsg(''); }}>
                  Try Again
                </button>
                <button style={s.backBtn} onClick={onClose}>
                  Back to Package
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}