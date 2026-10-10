// backend/controllers/packagePurchaseController.js
//
// Checkout for a THE HIVE Edition package (event_packages). Requires
// login — a package purchase fulfils into event_tickets/event_entitlements/
// wallet_transactions rows tied to the buyer's account, same as a wallet
// top-up.
//
// Depends on supabase/migrations/20261009000000_hive_package_checkout.sql
// (event_package_purchases, fulfil_package_purchase). Confirm that
// migration has actually been applied before relying on this.

import axios from 'axios';
import { generateAccessToken, generateTimestamp, generatePassword } from '../utils/mpesaAuth.js';
import { supabase } from '../supabaseClient.js';
import { secureLog } from '../utils/secureLogger.js';

const MPESA_API_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.VITE_MPESA_CALLBACK_URL;

const requireUser = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    return null;
  }
  return user;
};

/**
 * POST /api/packages/:packageId/purchase
 * Body: { phoneNumber: string }
 *
 * Creates a 'pending' event_package_purchases row for the package's
 * base_price, requests an STK push, and links the CheckoutRequestID.
 * The callback in mpesaController.js confirms it via fulfil_package_purchase
 * — never a raw UPDATE — so a duplicate callback is a safe no-op.
 */
export const initiatePackagePurchase = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { packageId } = req.params;
    const { phoneNumber } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, error: 'packageId is required' });
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

    const { data: pkg, error: pkgError } = await supabase
      .from('event_packages')
      .select('id, event_id, name, base_price, status, inventory')
      .eq('id', packageId)
      .maybeSingle();
    if (pkgError) return res.status(500).json({ success: false, error: pkgError.message });
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
    if (pkg.status !== 'active') {
      return res.status(400).json({ success: false, error: 'This package is not currently on sale' });
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('event_package_purchases')
      .insert({
        event_id: pkg.event_id,
        package_id: pkg.id,
        user_id: user.id,
        amount: pkg.base_price,
        phone_number: formattedPhone,
      })
      .select('id')
      .single();
    if (purchaseError) {
      return res.status(500).json({ success: false, error: purchaseError.message });
    }

    secureLog.info('Generating access token for package purchase STK push...');
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
      Amount: Math.ceil(pkg.base_price),
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: `HIVE-${pkg.name}`.slice(0, 20),
      TransactionDesc: `${pkg.name} — THE HIVE`,
    };

    let response;
    try {
      response = await axios({
        method: 'POST',
        url: MPESA_API_URL,
        data: requestData,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
    } catch (stkError) {
      // STK push failed outright — mark the purchase failed rather than
      // leaving an orphaned pending row with no CheckoutRequestID.
      await supabase
        .from('event_package_purchases')
        .update({ status: 'failed' })
        .eq('id', purchase.id)
        .eq('status', 'pending');
      throw stkError;
    }

    const checkoutRequestId = response.data?.CheckoutRequestID;
    if (!checkoutRequestId) {
      await supabase
        .from('event_package_purchases')
        .update({ status: 'failed' })
        .eq('id', purchase.id)
        .eq('status', 'pending');
      return res.status(502).json({ success: false, error: 'M-Pesa did not return a checkout request id' });
    }

    const { error: linkError } = await supabase
      .from('event_package_purchases')
      .update({ mpesa_checkout_request_id: checkoutRequestId })
      .eq('id', purchase.id);
    if (linkError) {
      return res.status(500).json({ success: false, error: `STK push sent but failed to record: ${linkError.message}` });
    }

    return res.json({
      success: true,
      message: 'STK push sent — check your phone to complete the purchase',
      purchaseId: purchase.id,
      checkoutRequestId,
    });
  } catch (error) {
    console.error('Error initiating package purchase:', error.message);
    const errorMessage =
      error.response?.data?.errorMessage || error.response?.data?.ResponseDescription || error.message;
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * GET /api/packages/purchases/:purchaseId
 * Lets the frontend poll for confirmation after the STK prompt.
 */
export const getPackagePurchaseStatus = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { purchaseId } = req.params;
    const { data, error } = await supabase
      .from('event_package_purchases')
      .select('id, status, amount, package_id, confirmed_at')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!data) return res.status(404).json({ success: false, error: 'Purchase not found' });

    return res.json({ success: true, purchase: data });
  } catch (error) {
    console.error('Error reading package purchase status:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
