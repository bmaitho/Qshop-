import { supabase } from '../components/SupabaseClient';

/**
 * Format a phone number for M-Pesa payments
 * Accepts various formats and returns a standardized format with Kenya country code
 * 
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // Handle Kenyan phone formats
  if (cleaned.startsWith('0')) {
    // Convert format 07xx to 254xx
    cleaned = '254' + cleaned.slice(1);
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    // If it starts with 7 or 1 without country code
    cleaned = '254' + cleaned;
  } else if (!cleaned.startsWith('254')) {
    // For any other format, add country code
    cleaned = '254' + cleaned;
  }
  
  // Format for display
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }
  
  return cleaned;
};

/**
 * Validate Kenyan phone number for M-Pesa payments
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidKenyanPhone = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // Check for valid Kenyan formats
  // 254XXXXXXXXX (12 digits with country code)
  // 0XXXXXXXXX (10 digits starting with 0)
  // 7XXXXXXXX (9 digits starting with 7)
  
  // With country code (254) - must be 12 digits
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    // Must start with 254 followed by 7, 1, or 11
    return /^254[71]\d{8}$/.test(cleaned);
  }
  
  // Starting with 0 - must be 10 digits
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Must start with 07 or 01
    return /^0[71]\d{8}$/.test(cleaned);
  }
  
  // Without country code or starting 0 - must be 9 digits
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return /^[71]\d{8}$/.test(cleaned);
  }
  
  return false;
};

/**
 * Get transaction status text based on status code
 * 
 * @param {string} status - Status code
 * @returns {string} Human-readable status description
 */
export const getTransactionStatusText = (status) => {
  const statusMap = {
    'pending': 'Payment pending',
    'processing': 'Processing payment',
    'completed': 'Payment successful',
    'failed': 'Payment failed',
    'cancelled': 'Payment cancelled',
    'timeout': 'Payment timed out'
  };
  
  return statusMap[status] || 'Unknown status';
};

/**
 * Get payment status from order record
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Payment status information
 */
export const getOrderPaymentStatus = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status, checkout_request_id, mpesa_receipt')
      .eq('id', orderId)
      .single();
      
    if (error) throw error;
    
    return {
      status: data.payment_status || 'pending',
      checkoutRequestId: data.checkout_request_id,
      receipt: data.mpesa_receipt
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    return {
      status: 'unknown',
      checkoutRequestId: null,
      receipt: null
    };
  }
};

/**
 * Calculate order total including any fees
 * 
 * @param {Array} items - Cart items
 * @param {number} deliveryFee - Delivery fee amount
 * @returns {Object} Order total breakdown
 */
export const calculateOrderTotal = (items, deliveryFee = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.products?.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);
  
  const total = subtotal + deliveryFee;
  
  return {
    subtotal,
    deliveryFee,
    total
  };
};