// utils/mpesaAuth.js - Secure M-Pesa Authentication

import axios from 'axios';
import dotenv from 'dotenv';
import { secureLog } from './secureLogger.js';

dotenv.config();

const AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

secureLog.info('M-Pesa Auth Configuration Loaded', {
  environment: 'production',
  authUrl: AUTH_URL,
  consumerKeyExists: Boolean(process.env.MPESA_CONSUMER_KEY),
  consumerSecretExists: Boolean(process.env.MPESA_CONSUMER_SECRET)
});

/**
 * Generate an M-Pesa access token for API authentication
 * @returns {Promise<string>} The access token
 */
const generateAccessToken = async () => {
  secureLog.info('🔑 Starting access token generation process...');

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    secureLog.error('❌ M-Pesa credentials missing', {
      consumerKeyExists: Boolean(consumerKey),
      consumerSecretExists: Boolean(consumerSecret)
    });
    throw new Error('M-Pesa credentials are missing. Check your environment variables.');
  }

  secureLog.credentials('📝 M-Pesa Credentials Check', {
    consumerKey,
    consumerSecret
  });

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    secureLog.info('🔐 Generated Base64 auth string');

    secureLog.info(`🌐 Sending request to M-Pesa auth URL: ${AUTH_URL}`);
    
    
    const response = await axios(AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    secureLog.info('✅ Received response from M-Pesa auth API');

    if (!response.data || !response.data.access_token) {
      secureLog.error('❌ Invalid token response');
      throw new Error('Invalid response from M-Pesa authentication API');
    }

    const token = response.data.access_token;
    secureLog.token('🎉 Successfully obtained access token', token);
    return token;
  } catch (error) {
    secureLog.error('❌ Error generating M-Pesa access token', error);

    // Log error information without exposing sensitive headers/config
    if (error.response) {
      secureLog.error('📋 Response status', { status: error.response.status });
      secureLog.error('📋 Response data', error.response.data);
    } else if (error.request) {
      secureLog.error('📋 No response received from M-Pesa API');
    } else {
      secureLog.error('📋 Error setting up request', error);
    }

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
  secureLog.info(`⏰ Generated timestamp: ${timestamp}`);
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
  secureLog.info('🔒 Generating M-Pesa password', {
    shortCodeExists: Boolean(shortCode),
    passkeyExists: Boolean(passkey),
    timestampExists: Boolean(timestamp)
  });

  if (!shortCode || !passkey || !timestamp) {
    secureLog.error('❌ Missing required parameters for password generation', {
      shortCodeExists: Boolean(shortCode),
      passkeyExists: Boolean(passkey),
      timestampExists: Boolean(timestamp)
    });
  }

  // Using the exact same method as TypeScript implementation
  const str = shortCode + passkey + timestamp;
  const password = Buffer.from(str).toString('base64');
  secureLog.info('🔑 M-Pesa password generated successfully');
  return password;
};

export { generateAccessToken, generateTimestamp, generatePassword };