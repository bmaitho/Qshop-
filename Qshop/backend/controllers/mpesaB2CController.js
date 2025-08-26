// backend/controllers/mpesaB2CController.js
import axios from 'axios';
import dotenv from 'dotenv';
import { generateAccessToken, generateTimestamp } from '../utils/mpesaAuth.js';
import { supabase } from '../supabaseClient.js';

dotenv.config();

// B2C API URL
const B2C_API_URL = 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

// M-Pesa B2C credentials from environment variables
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const INITIATOR_NAME = process.env.MPESA_B2C_INITIATOR_NAME;
const SECURITY_CREDENTIAL = process.env.MPESA_B2C_SECURITY_CREDENTIAL;
const B2C_CALLBACK_URL = process.env.MPESA_B2C_CALLBACK_URL;

// Validate required configuration
if (!BUSINESS_SHORT_CODE || !INITIATOR_NAME || !SECURITY_CREDENTIAL || !B2C_CALLBACK_URL) {
  console.error('Missing required M-Pesa B2C configuration in environment variables');
}

/**
 * Initiates an B2C payment to a seller
 */
export const initiateB2C = async (req, res) => {
  try {
    const { 
      phoneNumber, 
      amount, 
      orderId, 
      orderItemId,
      sellerId, 
      remarks = 'Seller Payment' 
    } = req.body;

    if (!phoneNumber || !amount || !orderId || !orderItemId || !sellerId) {
      return res.status(400).json({ 
        error: 'Phone number, amount, order ID, order item ID, and seller ID are required' 
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

    // Generate access token
    console.log('Generating access token for B2C payment...');
    const accessToken = await generateAccessToken();
    
    if (!accessToken) {
      throw new Error('Failed to generate a valid access token');
    }

    // Generate a unique transaction ID
    const transactionId = `B2C_${Date.now()}_${orderId}_${Math.floor(Math.random() * 10000)}`;

    // Prepare request data
    const requestData = {
      InitiatorName: INITIATOR_NAME,
      SecurityCredential: SECURITY_CREDENTIAL,
      CommandID: "BusinessPayment", // Use BusinessPayment for selling goods
      Amount: Math.ceil(amount), // Safaricom requires whole numbers
      PartyA: BUSINESS_SHORT_CODE,
      PartyB: formattedPhone,
      Remarks: remarks,
      QueueTimeOutURL: `${B2C_CALLBACK_URL}/timeout`,
      ResultURL: `${B2C_CALLBACK_URL}/result`,
      Occasion: `Payment for order ${orderId}`
    };

    console.log('Making B2C payment request with data:', {
      url: B2C_API_URL,
      businessShortCode: BUSINESS_SHORT_CODE,
      amount,
      phoneNumber: formattedPhone,
      transactionId
    });

    // Make the B2C payment request
    const response = await axios({
      method: 'POST',
      url: B2C_API_URL,
      data: requestData,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('B2C payment response:', response.data);
    
    // Save the transaction details to the database
    if (response.data && response.data.ConversationID) {
      try {
        const { data, error } = await supabase
          .from('seller_payments')
          .insert([
            { 
              order_id: orderId,
              order_item_id: orderItemId,
              seller_id: sellerId,
              amount: amount,
              phone_number: formattedPhone,
              conversation_id: response.data.ConversationID,
              originator_conversation_id: response.data.OriginatorConversationID,
              transaction_id: transactionId,
              status: 'initiated',
              remarks: remarks,
              created_at: new Date().toISOString()
            }
          ])
          .select();
          
        if (error) {
          console.error('Error saving B2C payment details:', error);
        } else {
          console.log('Successfully saved B2C payment details:', data);
          
          // Update the order item status
          const { error: updateError } = await supabase
            .from('order_items')
            .update({ 
              payment_status: 'processing',
              payment_reference: transactionId
            })
            .eq('id', orderItemId);
            
          if (updateError) {
            console.error('Error updating order item payment status:', updateError);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    res.json({
      success: true,
      data: response.data,
      message: 'B2C payment initiated successfully',
      transactionId: transactionId
    });
  } catch (error) {
    console.error('M-Pesa B2C payment error:', error);
    
    // Extract meaningful error information
    const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.ResponseDescription ||
                         error.message || 
                         'Failed to initiate B2C payment';
                         
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Handle the B2C result callback from M-Pesa
 */
export const handleB2CResult = async (req, res) => {
  try {
    console.log('B2C result callback received:', JSON.stringify(req.body));
    
    const callbackData = req.body.Result || req.body;
    
    // Check if this is a successful transaction
    if (callbackData.ResultCode !== undefined) {
      const { 
        ResultCode, 
        ResultDesc, 
        OriginatorConversationID, 
        ConversationID,
        TransactionID,
        TransactionAmount,
        B2CRecipientIsRegisteredCustomer,
        B2CChargesPaidAccountAvailableFunds,
        ReceiverPartyPublicName,
        TransactionCompletedDateTime
      } = callbackData;
      
      console.log(`B2C transaction result: ${ResultCode} - ${ResultDesc}`);
      
      // Find the payment record by the originator conversation ID
      const { data: payments, error: paymentError } = await supabase
        .from('seller_payments')
        .select('*')
        .eq('originator_conversation_id', OriginatorConversationID);
      
      if (paymentError) {
        console.error('Error finding payment by originator conversation ID:', paymentError);
      } else if (!payments || payments.length === 0) {
        console.error(`No payment found with originator conversation ID: ${OriginatorConversationID}`);
      } else {
        const payment = payments[0];
        
        // Update payment record based on the result code (0 means success)
        if (ResultCode === 0) {
          // Update payment with success details
          const { error: updateError } = await supabase
            .from('seller_payments')
            .update({
              status: 'completed',
              result_code: ResultCode,
              result_description: ResultDesc,
              transaction_id: TransactionID,
              transaction_amount: TransactionAmount,
              recipient_registered: B2CRecipientIsRegisteredCustomer,
              recipient_name: ReceiverPartyPublicName,
              transaction_date: TransactionCompletedDateTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);
            
          if (updateError) {
            console.error('Error updating payment record after successful B2C:', updateError);
          } else {
            console.log(`Payment ${payment.id} completed successfully`);
            
            // Update order item payment status
            await supabase
              .from('order_items')
              .update({ 
                payment_status: 'completed',
                seller_paid_at: new Date().toISOString()
              })
              .eq('id', payment.order_item_id);
          }
        } else {
          // Payment failed
          await supabase
            .from('seller_payments')
            .update({
              status: 'failed',
              result_code: ResultCode,
              result_description: ResultDesc,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);
            
          // Update order item payment status
          await supabase
            .from('order_items')
            .update({ 
              payment_status: 'failed',
              payment_error: ResultDesc
            })
            .eq('id', payment.order_item_id);
        }
      }
    }

    // Always respond with success to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('Error processing B2C result callback:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback acknowledged with errors" });
  }
};

/**
 * Handle the B2C timeout callback from M-Pesa
 */
export const handleB2CTimeout = async (req, res) => {
  try {
    console.log('B2C timeout callback received:', JSON.stringify(req.body));
    
    // The timeout callback doesn't have much to work with,
    // but we can log it and update records if possible
    const callbackData = req.body.Result || req.body;
    
    if (callbackData.OriginatorConversationID) {
      const { OriginatorConversationID, ConversationID } = callbackData;
      
      // Find the payment record by the originator conversation ID
      const { data: payments, error: paymentError } = await supabase
        .from('seller_payments')
        .select('*')
        .eq('originator_conversation_id', OriginatorConversationID);
      
      if (!paymentError && payments && payments.length > 0) {
        const payment = payments[0];
        
        // Update payment record with timeout status
        await supabase
          .from('seller_payments')
          .update({
            status: 'timeout',
            result_description: 'Transaction timed out',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
          
        // Update order item payment status
        await supabase
          .from('order_items')
          .update({ 
            payment_status: 'failed',
            payment_error: 'Transaction timed out'
          })
          .eq('id', payment.order_item_id);
      }
    }
    
    // Always respond with success to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('Error processing B2C timeout callback:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback acknowledged with errors" });
  }
};

/**
 * Check the status of a B2C transaction
 */
export const checkB2CStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }
    
    console.log(`Checking B2C payment status for transaction ID: ${transactionId}`);
    
    // Look up the payment by transaction ID
    const { data: payments, error: paymentError } = await supabase
      .from('seller_payments')
      .select('*')
      .eq('transaction_id', transactionId);
      
    if (paymentError) {
      throw paymentError;
    }
    
    if (!payments || payments.length === 0) {
      console.log(`No payment found with transaction ID: ${transactionId}`);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    const payment = payments[0];
    
    // Return the current payment status
    return res.json({
      success: true,
      data: {
        transactionId: payment.transaction_id,
        orderId: payment.order_id,
        orderItemId: payment.order_item_id,
        sellerId: payment.seller_id,
        amount: payment.amount,
        status: payment.status,
        resultDescription: payment.result_description,
        recipientName: payment.recipient_name,
        transactionDate: payment.transaction_date
      }
    });
  } catch (error) {
    console.error('Error checking B2C transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction status'
    });
  }
};

/**
 * Automatic payment to seller when order is delivered
 */
export const processSellerPayment = async (orderItemId) => {
  try {
    console.log(`Processing automatic payment for order item: ${orderItemId}`);
    
    // Fetch the order item details
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select(`
        *,
        products(*),
        orders(*)
      `)
      .eq('id', orderItemId)
      .single();
      
    if (orderItemError) {
      throw new Error(`Error fetching order item: ${orderItemError.message}`);
    }
    
    if (!orderItem) {
      throw new Error(`Order item not found: ${orderItemId}`);
    }
    
    // Check if payment to seller is already processed
    if (orderItem.payment_status === 'completed' || orderItem.payment_status === 'processing') {
      console.log(`Seller payment for order item ${orderItemId} already processed`);
      return {
        success: false,
        message: 'Payment already processed'
      };
    }
    
    // Check if the order has been paid by the customer
    if (orderItem.orders.payment_status !== 'completed') {
      console.log(`Order ${orderItem.order_id} not yet paid by customer`);
      return {
        success: false,
        message: 'Order not yet paid by customer'
      };
    }
    
    // Get the seller phone number
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', orderItem.seller_id)
      .single();
      
    if (sellerError || !sellerProfile || !sellerProfile.phone) {
      throw new Error(`Error fetching seller phone number: ${sellerError?.message || 'Phone not found'}`);
    }
    
    // Calculate amount to pay seller (normally subtract platform fee)
    // For simplicity, we'll pay the full amount
    const paymentAmount = orderItem.subtotal;
    
    // Call the B2C API directly
    // Note: In production, you'd use a queue system for this
    const paymentData = {
      phoneNumber: sellerProfile.phone,
      amount: 20,
      orderId: orderItem.order_id,
      orderItemId: orderItem.id,
      sellerId: orderItem.seller_id,
      remarks: `Payment for order ${orderItem.order_id}`
    };
    
    // Create a fake request and response object to use the same controller
    const fakeReq = { body: paymentData };
    const fakeRes = {
      status: (code) => ({
        json: (data) => {
          // Return the data directly
          return data;
        }
      }),
      json: (data) => {
        // Return the data directly
        return data;
      }
    };
    
    // Initiate the B2C payment
    const result = await initiateB2C(fakeReq, fakeRes);
    
    console.log(`Automatic payment initiated for order item ${orderItemId}:`, result);
    
    return result;
  } catch (error) {
    console.error(`Error processing automatic payment:`, error);
    return {
      success: false,
      error: error.message || 'Failed to process payment'
    };
  }
};