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
  // Convert string to Base64 using browser's btoa function
  const str = shortCode + passkey + timestamp;
  return btoa(str);
};

const sanitizePhoneNumber = (phoneNumber) => {
  // Remove any whitespace or special characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure it starts with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return parseInt(cleaned);
};

export const initiateMpesaPayment = async (phoneNumber, amount, accountReference = 'StudentMarketplace') => {
  try {
    // Validate inputs
    if (!phoneNumber || !amount) {
      throw new Error('Phone number and amount are required');
    }

    // Sanitize phone number
    const sanitizedPhone = sanitizePhoneNumber(phoneNumber.toString());
    
    // Validate amount
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

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
      Amount: parsedAmount,
      PartyA: sanitizedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: sanitizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: "Payment for order"
    };

    // Validate environment variables
    if (!MPESA_API_URL || !ACCESS_TOKEN || !CALLBACK_URL) {
      throw new Error('Missing required environment variables');
    }

    const response = await axios.post(MPESA_API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // Check for specific M-Pesa API error responses
    if (response.data.errorCode) {
      throw new Error(response.data.errorMessage || 'M-Pesa API error');
    }

    return {
      success: true,
      data: response.data,
      message: 'Payment request initiated successfully'
    };
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    
    // Handle different types of errors
    let errorMessage = 'Payment initiation failed';
    
    if (error.response?.data?.errorMessage) {
      errorMessage = error.response.data.errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};