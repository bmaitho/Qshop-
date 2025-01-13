import axios from 'axios';
import dotenv from 'dotenv';
import { generateAccessToken } from '../utils/mpesaAuth.js';

dotenv.config();

const MPESA_API_URL = process.env.MPESA_API_URL;
const BUSINESS_SHORT_CODE = '174379';
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

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

export const initiateSTKPush = async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ 
        error: 'Phone number and amount are required' 
      });
    }

    // Generate new access token
    const accessToken = await generateAccessToken();

    const timestamp = generateTimestamp();
    const password = generatePassword(
      BUSINESS_SHORT_CODE,
      process.env.MPESA_PASSKEY,
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
      AccountReference: accountReference || 'StudentMarketplace',
      TransactionDesc: "Payment for order"
    };

    console.log('Making STK push request with data:', {
      url: MPESA_API_URL,
      data: requestData,
      phoneNumber,
      amount
    });

    const response = await axios.post(MPESA_API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('STK push response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('M-Pesa STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.errorMessage || 'Failed to initiate payment'
    });
  }
};