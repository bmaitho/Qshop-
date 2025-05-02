import axios from 'axios';
import dotenv from 'dotenv';
import { generateAccessToken, generateTimestamp, generatePassword } from '../utils/mpesaAuth.js';
import { supabase } from '../supabaseClient.js';

dotenv.config();

// Environment configuration
const isProduction = true; // Force production mode
const MPESA_API_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

// M-Pesa credentials from environment variables
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.VITE_MPESA_CALLBACK_URL;

// Validate required configuration
if (!BUSINESS_SHORT_CODE || !PASSKEY || !CALLBACK_URL) {
  throw new Error('Missing required M-Pesa configuration in environment variables');
}

/**
 * Initiates an STK push payment request to the user's phone
 */
export const initiateSTKPush = async (req, res) => {
  try {
    const { phoneNumber, amount, orderId, accountReference } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ 
        error: 'Phone number and amount are required' 
      });
    }

    // Validate phone number format (should be 254XXXXXXXXX)
    const phoneRegex = /^254[17][0-9]{8}$/;
    const cleanedPhone = phoneNumber.toString().replace(/[^0-9]/g, '');
    const formattedPhone = cleanedPhone.startsWith('0') 
      ? `254${cleanedPhone.substring(1)}` 
      : cleanedPhone.startsWith('254') 
        ? cleanedPhone 
        : `254${cleanedPhone}`;
      
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      });
    }

    // Generate new access token - Must be fresh for each request
    console.log('Generating fresh access token for STK Push...');
    const accessToken = await generateAccessToken();
    console.log('Generated token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'FAILED TO GENERATE TOKEN');

    // Check token validity - must not be null or undefined
    if (!accessToken) {
      throw new Error('Failed to generate a valid access token');
    }

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(
      BUSINESS_SHORT_CODE,
      PASSKEY,
      timestamp
    );

    // Prepare request data
    const requestData = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Required for PayBill numbers in production
      Amount: Math.ceil(amount), // Safaricom requires whole numbers
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference || 'unihive marketplace',
      TransactionDesc: `Payment for order ${orderId || ''}`
    };

    console.log('Making STK push request with data:', {
      url: MPESA_API_URL,
      environment: isProduction ? 'production' : 'sandbox',
      businessShortCode: BUSINESS_SHORT_CODE,
      amount,
      phoneNumber: formattedPhone
    });

    // Make the STK push request with proper Bearer token format
    console.log(`🔐 Using token: ${accessToken ? accessToken.substring(0, 15) + '...' : 'MISSING'}`);
    console.log(`📊 Full request data:`, JSON.stringify(requestData, null, 2));
    
    const response = await axios({
      method: 'POST',
      url: MPESA_API_URL,
      data: requestData,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('STK push response:', response.data);
    
    // Update the order with CheckoutRequestID for tracking
    if (orderId && response.data.CheckoutRequestID) {
      try {
        console.log(`Updating order ${orderId} with CheckoutRequestID: ${response.data.CheckoutRequestID}`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('orders')
          .update({ 
            checkout_request_id: response.data.CheckoutRequestID,
            payment_status: 'pending',
            payment_method: 'mpesa'
          })
          .eq('id', orderId)
          .select();
        
        if (updateError) {
          console.error('Error updating order with CheckoutRequestID:', updateError);
        } else {
          console.log(`Successfully updated order with CheckoutRequestID:`, updateData);
        }
      } catch (dbError) {
        console.error('Error updating order with CheckoutRequestID:', dbError);
      }
    } else {
      console.warn(`Cannot update order - OrderId: ${orderId}, CheckoutRequestID: ${response.data.CheckoutRequestID}`);
    }

    res.json({
      success: true,
      data: response.data,
      message: 'STK push initiated successfully'
    });
  } catch (error) {
    console.error('M-Pesa STK Push error:', error);
    
    // Extract meaningful error information
    const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.ResponseDescription ||
                         error.message || 
                         'Failed to initiate payment';
                         
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Handle the callback from M-Pesa after a payment attempt
 */
export const handleCallback = async (req, res) => {
  try {
    // Log the full callback for debugging
    console.log('M-Pesa callback received:', JSON.stringify(req.body));
    
    // Safaricom sends the result in the Body property
    const callbackData = req.body.Body?.stkCallback || req.body;
    
    // Check if this is a successful transaction
    if (callbackData.ResultCode !== undefined) {
      const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID } = callbackData;
      
      console.log(`M-Pesa transaction result: ${ResultCode} - ${ResultDesc}`);
      console.log(`Looking for order with CheckoutRequestID: ${CheckoutRequestID}`);
      
      // Find the order by the CheckoutRequestID
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID);
      
      if (orderError) {
        console.error('Error finding order by checkout request ID:', orderError);
      } else if (orders && orders.length > 0) {
        const order = orders[0];
        console.log(`Found order with ID: ${order.id} for CheckoutRequestID: ${CheckoutRequestID}`);
        
        // Update order based on the result code (0 means success)
        if (ResultCode === 0 && CallbackMetadata) {
          // Extract payment details from the callback
          const items = CallbackMetadata.Item || [];
          const mpesaReceiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
          const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;
          const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;
          const amount = items.find(item => item.Name === 'Amount')?.Value;
          
          console.log(`Updating order ${order.id} with payment details:`, {
            receipt: mpesaReceiptNumber,
            date: transactionDate,
            phone: phoneNumber,
            amount: amount
          });
          
          // Update order with payment details
          const { data: updateData, error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'completed',
              order_status: 'processing',
              mpesa_receipt: mpesaReceiptNumber,
              payment_date: transactionDate ? formatMpesaDate(transactionDate) : new Date().toISOString(),
              phone_number: phoneNumber ? phoneNumber.toString() : order.phone_number,
              amount_paid: amount || order.amount
            })
            .eq('id', order.id)
            .select();
            
          if (updateError) {
            console.error('Error updating order after successful payment:', updateError);
          } else {
            console.log(`Order ${order.id} marked as paid successfully:`, updateData);
            
            // Also update order items status
            const { error: itemsError } = await supabase
              .from('order_items')
              .update({ status: 'processing' })
              .eq('order_id', order.id);
              
            if (itemsError) {
              console.error('Error updating order items:', itemsError);
            } else {
              console.log(`Updated order items for order ${order.id}`);
            }
          }
        } else {
          // Payment failed
          console.log(`Payment failed for order ${order.id}: ${ResultDesc}`);
          const { error: failedError } = await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              payment_error: ResultDesc
            })
            .eq('id', order.id);
            
          if (failedError) {
            console.error('Error updating order payment failure:', failedError);
          }
        }
      } else {
        console.error(`No order found with CheckoutRequestID: ${CheckoutRequestID}`);
      }
    }

    // Always respond with success to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback acknowledged" });
  }
};

/**
 * Check the status of an STK push payment transaction
 */
export const checkTransactionStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    console.log(`Checking payment status for CheckoutRequestID: ${checkoutRequestId}`);
    
    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        error: 'Checkout request ID is required'
      });
    }
    
    // Find the order by checkout request ID
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId);
      
    if (orderError) {
      console.error('Error finding order:', orderError);
      throw orderError;
    }
    
    if (!orders || orders.length === 0) {
      console.error(`No order found with CheckoutRequestID: ${checkoutRequestId}`);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const order = orders[0];
    console.log(`Found order ${order.id} with payment status: ${order.payment_status}`);
    
    // Return the current payment status
    return res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        receipt: order.mpesa_receipt
      }
    });
  } catch (error) {
    console.error('Error checking transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction status'
    });
  }
};

/**
 * Helper function to format M-Pesa date (format: YYYYMMDDHHmmss) to ISO format
 */
const formatMpesaDate = (dateString) => {
  if (!dateString || dateString.length !== 14) {
    return new Date().toISOString();
  }
  
  try {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(8, 10);
    const minute = dateString.substring(10, 12);
    const second = dateString.substring(12, 14);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`).toISOString();
  } catch (error) {
    console.error('Error formatting M-Pesa date:', error);
    return new Date().toISOString();
  }
};