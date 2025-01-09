// services/mpesaService.js
import axios from 'axios';

const MPESA_API_URL = import.meta.env.VITE_MPESA_API_URL;
const ACCESS_TOKEN = import.meta.env.VITE_MPESA_ACCESS_TOKEN;
const BUSINESS_SHORT_CODE = '174379';
const CALLBACK_URL = import.meta.env.VITE_MPESA_CALLBACK_URL;

const generateTimestamp = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const generatePassword = (shortCode, passkey, timestamp) => {
  const str = shortCode + passkey + timestamp;
  return Buffer.from(str).toString('base64');
};

export const initiateMpesaPayment = async (phoneNumber, amount, accountReference = 'StudentMarketplace') => {
  try {
    const timestamp = generateTimestamp();
    const password = generatePassword(
      BUSINESS_SHORT_CODE,
      import.meta.env.VITE_MPESA_PASSKEY,
      timestamp
    );

    const requestData = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: phoneNumber,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: "Payment for order"
    };

    const response = await axios.post(MPESA_API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    return {
      success: false,
      error: error.response?.data?.errorMessage || 'Payment initiation failed',
    };
  }
};