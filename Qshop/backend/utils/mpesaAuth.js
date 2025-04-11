import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Determine the correct URL based on environment
const isProduction = process.env.MPESA_ENVIRONMENT === 'production';
const AUTH_URL = isProduction 
  ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
  : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

/**
 * Generate an M-Pesa access token for API authentication
 * @returns {Promise<string>} The access token
 */
const generateAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa credentials are missing. Check your environment variables.');
  }

  try {
    // Create the auth string
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    // Make the request to get access token
    const response = await axios.get(AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid response from M-Pesa authentication API');
    }

    return response.data.access_token;
  } catch (error) {
    console.error('Error generating M-Pesa access token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to generate M-Pesa access token');
  }
};

/**
 * Generate timestamp in the format required by M-Pesa API (YYYYMMDDHHmmss)
 * @returns {string} Formatted timestamp
 */
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

/**
 * Generate the password for STK Push using the format: 
 * Base64(BusinessShortCode + Passkey + Timestamp)
 * 
 * @param {string} shortCode - The business short code
 * @param {string} passkey - The passkey provided by M-Pesa
 * @param {string} timestamp - The timestamp in YYYYMMDDHHmmss format
 * @returns {string} Encoded password
 */
const generatePassword = (shortCode, passkey, timestamp) => {
  const str = shortCode + passkey + timestamp;
  return Buffer.from(str).toString('base64');
};

export { generateAccessToken, generateTimestamp, generatePassword };