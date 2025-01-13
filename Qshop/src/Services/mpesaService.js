import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const sanitizePhoneNumber = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
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
    if (!phoneNumber || !amount) {
      throw new Error('Phone number and amount are required');
    }

    const sanitizedPhone = sanitizePhoneNumber(phoneNumber.toString());
    const parsedAmount = parseInt(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

    const paymentData = {
      phoneNumber: sanitizedPhone,
      amount: parsedAmount,
      accountReference
    };

    const response = await axios.post(`${API_BASE_URL}/mpesa/stkpush`, paymentData);

    return {
      success: true,
      data: response.data,
      message: 'Payment request initiated successfully'
    };
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || 'Payment initiation failed'
    };
  }
};