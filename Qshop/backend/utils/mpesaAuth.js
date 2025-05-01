// utils/mpesaAuth.js - Enhanced logging

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Determine the correct URL based on environment
const isProduction = process.env.MPESA_ENVIRONMENT === 'production';
const AUTH_URL = isProduction 
  ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
  : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

console.log(`M-Pesa Auth Configuration:
- Environment: ${process.env.MPESA_ENVIRONMENT || 'Not set (defaulting to sandbox)'}
- Auth URL: ${AUTH_URL}
- Consumer Key exists: ${Boolean(process.env.MPESA_CONSUMER_KEY)}
- Consumer Secret exists: ${Boolean(process.env.MPESA_CONSUMER_SECRET)}
`);

/**
 * Generate an M-Pesa access token for API authentication
 * @returns {Promise<string>} The access token
 */
const generateAccessToken = async () => {
  console.log('🔑 Starting access token generation process...');
  
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    console.error('❌ M-Pesa credentials missing:', {
      consumerKeyExists: Boolean(consumerKey),
      consumerSecretExists: Boolean(consumerSecret)
    });
    throw new Error('M-Pesa credentials are missing. Check your environment variables.');
  }

  console.log(`📝 Using credentials - Key: ${consumerKey.substring(0, 4)}... Secret: ${consumerSecret.substring(0, 4)}...`);
  
  try {
    // Create the auth string - Updated to match TypeScript implementation
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    console.log(`🔐 Generated Base64 auth string: ${auth.substring(0, 10)}...`);
    
    console.log(`🌐 Sending request to M-Pesa auth URL: ${AUTH_URL}`);
    
    const response = await axios(AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    console.log(`✅ Received response: ${JSON.stringify(response.data, null, 2)}`);

    if (!response.data || !response.data.access_token) {
      console.error('❌ Invalid token response:', response.data);
      throw new Error('Invalid response from M-Pesa authentication API');
    }

    const token = response.data.access_token;
    console.log(`🎉 Successfully obtained access token: ${token.substring(0, 10)}...`);
    return token;
  } catch (error) {
    console.error('❌ Error generating M-Pesa access token:', error.message);
    
    // Log detailed error information
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📋 No response received. Request details:', error.request);
    } else {
      console.error('📋 Error setting up request:', error.message);
    }
    
    console.error('📋 Error config:', JSON.stringify(error.config, null, 2));
    
    throw new Error(`Failed to generate M-Pesa access token: ${error.message}`);
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
  
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  console.log(`⏰ Generated timestamp: ${timestamp}`);
  return timestamp;
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
  console.log('🔒 Generating password with:', { 
    shortCode, 
    passkey: passkey ? `${passkey.substring(0, 4)}...` : 'MISSING',
    timestamp
  });
  
  if (!shortCode || !passkey || !timestamp) {
    console.error('❌ Missing required parameters for password generation:', {
      shortCodeExists: Boolean(shortCode),
      passkeyExists: Boolean(passkey),
      timestampExists: Boolean(timestamp)
    });
  }
  
  const str = shortCode + passkey + timestamp;
  const password = Buffer.from(str).toString('base64');
  console.log(`🔑 Generated password: ${password.substring(0, 10)}...`);
  return password;
};

export { generateAccessToken, generateTimestamp, generatePassword };