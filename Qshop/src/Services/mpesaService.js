import axios from 'axios';

// Your base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Sanitize and format phone number to the required format for M-Pesa:
 * - Remove non-digit characters
 * - Ensure it starts with 254 (Kenya country code)
 * - Convert to integer as required by M-Pesa API
 */
const sanitizePhoneNumber = (phoneNumber) => {
  // Convert to string and remove non-digit characters
  let cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // Handle Kenyan phone formats
  if (cleaned.startsWith('0')) {
    // Convert format 07xx to 254xx
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    // If it starts with 7 or 1 without country code
    cleaned = '254' + cleaned;
  } else if (!cleaned.startsWith('254')) {
    // For any other format, add country code
    cleaned = '254' + cleaned;
  }
  
  // Ensure it's a valid phone number (254 + 9 digits)
  if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
    throw new Error('Invalid phone number format. Use format: 07XXXXXXXX or 254XXXXXXXXX');
  }
  
  return parseInt(cleaned);
};

/**
 * Initiate an M-Pesa payment for an order
 */
export const initiateMpesaPayment = async (phoneNumber, amount, orderId, accountReference = 'UniHive') => {
  try {
    if (!phoneNumber || !amount) {
      throw new Error('Phone number and amount are required');
    }

    // Sanitize the phone number
    const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
    
    // Ensure amount is a positive integer
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount. Must be a positive number.');
    }

    // Prepare payment data
    const paymentData = {
      phoneNumber: sanitizedPhone,
      amount: parsedAmount,
      orderId,
      accountReference
    };

    // Make the API request with the correct path
    const response = await axios.post(`${API_BASE_URL}/mpesa/stkpush`, paymentData);

    return {
      success: true,
      data: response.data,
      message: 'Payment request initiated successfully'
    };
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    
    // Extract meaningful error message
    const errorMessage = error.response?.data?.error || 
                         error.message || 
                         'Payment initiation failed';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check the status of a payment transaction
 */
export const checkPaymentStatus = async (checkoutRequestId) => {
  try {
    if (!checkoutRequestId) {
      throw new Error('Checkout request ID is required');
    }

    
    const response = await axios.get(`${API_BASE_URL}/mpesa/status/${checkoutRequestId}`);

    return {
      success: true,
      data: response.data,
      message: 'Payment status retrieved successfully'
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to check payment status'
    };
  }
};