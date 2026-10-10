// backend/controllers/walletController.js
//
// Event wallet top-ups. Requires login — unlike guest ticket checkout,
// a wallet has to belong to a real UniHive account since it holds a
// balance across the event.
//
// Depends on supabase/migrations/20261007000000_hive_event_shell_and_wallet.sql
// (event_wallets, wallet_transactions, wallet_topup_confirm). Confirm
// that migration has actually been applied before relying on this —
// it was written and reviewed before the database connector to verify
// it landed was available; don't assume it's live without checking.

import axios from 'axios';
import { generateAccessToken, generateTimestamp, generatePassword } from '../utils/mpesaAuth.js';
import { supabase } from '../supabaseClient.js';
import { secureLog } from '../utils/secureLogger.js';

const MPESA_API_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.VITE_MPESA_CALLBACK_URL;

/**
 * POST /api/wallet/:eventId/topup
 * Body: { amount: number, phoneNumber: string }
 *
 * Creates (or reuses) the caller's wallet for this event, requests an
 * STK push, and records a 'pending' wallet_transactions row keyed by
 * the resulting CheckoutRequestID. The callback in mpesaController.js
 * confirms it via the wallet_topup_confirm RPC — never a raw UPDATE —
 * so a duplicate callback can never double-credit.
 */
export const initiateWalletTopup = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const { eventId } = req.params;
    const { amount, phoneNumber } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }
    const topupAmount = Number(amount);
    if (!topupAmount || topupAmount <= 0) {
      return res.status(400).json({ success: false, error: 'A positive amount is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const phoneRegex = /^254[17][0-9]{8}$/;
    const cleanedPhone = phoneNumber.toString().replace(/[^0-9]/g, '');
    const formattedPhone = cleanedPhone.startsWith('0')
      ? `254${cleanedPhone.substring(1)}`
      : cleanedPhone.startsWith('254')
      ? cleanedPhone
      : `254${cleanedPhone}`;
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format. Use 254XXXXXXXXX' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError) return res.status(500).json({ success: false, error: eventError.message });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    // Find or create the wallet. One per (event, user) — the unique
    // constraint on event_wallets is what makes this safe under
    // concurrent calls; "find or create" here is a convenience lookup,
    // not the actual safety mechanism.
    let { data: wallet, error: walletError } = await supabase
      .from('event_wallets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (walletError) return res.status(500).json({ success: false, error: walletError.message });

    if (!wallet) {
      const { data: created, error: createError } = await supabase
        .from('event_wallets')
        .insert({ event_id: eventId, user_id: user.id })
        .select('id')
        .single();
      if (createError) {
        // Unique-violation race: someone else's concurrent request created
        // it a moment ago. Re-fetch rather than fail.
        if (createError.code === '23505') {
          const { data: refetched } = await supabase
            .from('event_wallets')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();
          wallet = refetched;
        } else {
          return res.status(500).json({ success: false, error: createError.message });
        }
      } else {
        wallet = created;
      }
    }

    secureLog.info('Generating access token for wallet topup STK push...');
    const accessToken = await generateAccessToken();
    if (!accessToken) {
      throw new Error('Failed to generate a valid access token');
    }

    const timestamp = generateTimestamp();
    const password = generatePassword(BUSINESS_SHORT_CODE, PASSKEY, timestamp);

    const requestData = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(topupAmount),
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: `HIVE-WALLET-${event.title}`.slice(0, 20),
      TransactionDesc: `Wallet top-up for ${event.title}`,
    };

    const response = await axios({
      method: 'POST',
      url: MPESA_API_URL,
      data: requestData,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    const checkoutRequestId = response.data?.CheckoutRequestID;
    if (!checkoutRequestId) {
      return res.status(502).json({ success: false, error: 'M-Pesa did not return a checkout request id' });
    }

    const { error: txnError } = await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'topup',
      amount: topupAmount,
      status: 'pending',
      mpesa_checkout_request_id: checkoutRequestId,
    });
    if (txnError) {
      return res.status(500).json({ success: false, error: `STK push sent but failed to record: ${txnError.message}` });
    }

    return res.json({
      success: true,
      message: 'STK push sent — check your phone to complete the top-up',
      checkoutRequestId,
    });
  } catch (error) {
    console.error('Error initiating wallet topup:', error.message);
    const errorMessage =
      error.response?.data?.errorMessage || error.response?.data?.ResponseDescription || error.message;
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * GET /api/wallet/:eventId/balance
 * Reads the derived balance view — never a stored, directly-editable number.
 */
export const getWalletBalance = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const { eventId } = req.params;
    const { data, error } = await supabase
      .from('event_wallet_balances')
      .select('wallet_id, balance')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, error: error.message });

    return res.json({
      success: true,
      walletId: data?.wallet_id || null,
      balance: data?.balance || 0,
    });
  } catch (error) {
    console.error('Error reading wallet balance:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
