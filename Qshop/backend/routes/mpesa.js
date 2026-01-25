// backend/routes/mpesa.js
import express from 'express';
import {
  initiateSTKPush,
  handleCallback,
  checkTransactionStatus
} from '../controllers/mpesaController.js';
import {
  initiateB2C,
  handleB2CResult,
  handleB2CTimeout,
  checkB2CStatus,
  processSellerPayment
} from '../controllers/mpesaB2CController.js';
import { calculateOrderItemCommission } from '../utils/commissionCalculator.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// ============================================
// C2B (Customer to Business) - Existing endpoints
// ============================================
router.post('/stkpush', initiateSTKPush);
router.post('/callback', handleCallback);
router.get('/status/:checkoutRequestId', checkTransactionStatus);

// ============================================
// B2C (Business to Customer) - Seller payment endpoints
// ============================================
router.post('/b2c', initiateB2C);
router.post('/b2c/result', handleB2CResult);
router.post('/b2c/timeout', handleB2CTimeout);
router.get('/b2c/status/:transactionId', checkB2CStatus);

// ============================================
// ORDER & COMMISSION ENDPOINTS
// ============================================

/**
 * POST /api/mpesa/orders/calculate-commission
 * Calculate commission for a given price and quantity
 * Called by SellerOrderDetail.jsx to show earnings breakdown
 */
router.post('/orders/calculate-commission', async (req, res) => {
  try {
    const { pricePerUnit, quantity } = req.body;
    
    // Validation
    if (!pricePerUnit) {
      return res.status(400).json({ 
        success: false,
        error: 'pricePerUnit is required' 
      });
    }
    
    const price = parseFloat(pricePerUnit);
    const qty = quantity ? parseInt(quantity) : 1;
    
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'pricePerUnit must be a positive number' 
      });
    }
    
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'quantity must be a positive integer' 
      });
    }
    
    // Calculate commission using the official rate table
    const commission = calculateOrderItemCommission(price, qty);
    
    console.log('Commission calculated:', {
      price,
      quantity: qty,
      sellerPayout: commission.totalSellerPayout,
      sellerFee: commission.sellerFee * qty,
      platformFee: commission.platformFee
    });
    
    return res.status(200).json({
      success: true,
      commission
    });
  } catch (error) {
    console.error('Error calculating commission:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * POST /api/mpesa/orders/trigger-payment/:orderItemId
 * Manually trigger payment for a specific order item
 * Called by SellerOrderDetail.jsx when order is marked as delivered
 * NOW WITH EMAIL NOTIFICATION TO BUYER
 */
router.post('/orders/trigger-payment/:orderItemId', async (req, res) => {
  try {
    const { orderItemId } = req.params;

    if (!orderItemId) {
      return res.status(400).json({
        success: false,
        error: 'Order item ID is required'
      });
    }

    console.log(`Manually triggering payment for order item: ${orderItemId}`);

    // Process the seller payment (this function already calculates commission)
    const result = await processSellerPayment(orderItemId);

    // Send email notification to buyer
    try {
      console.log('📧 Sending delivered notification email to buyer...');

      // Fetch order item with all details
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*),
          orders(*)
        `)
        .eq('id', orderItemId)
        .single();

      if (!itemError && orderItem) {
        // Get buyer profile
        const { data: buyerProfile, error: buyerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', orderItem.buyer_user_id)
          .single();

        // Get seller profile for display in email
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', orderItem.seller_id)
          .single();

        if (!buyerError && buyerProfile?.email) {
          // Import email templates and Resend
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);

          const {
            orderDeliveredEmailTemplate,
            orderDeliveredEmailText
          } = await import('../utils/emailTemplates.js');

          const APP_URL = process.env.APP_URL || 'https://unihive.shop';
          const orderUrl = `${APP_URL}/orders/${orderItemId}`;

          // Prepare email data
          const productImages = orderItem.products?.product_images;
          const firstImage = Array.isArray(productImages) && productImages.length > 0
            ? productImages[0]
            : null;

          const emailData = {
            orderId: orderItem.order_id,
            orderItemId: orderItem.id,
            productName: orderItem.products?.name || orderItem.products?.product_name || 'Product',
            productImage: firstImage,
            quantity: orderItem.quantity || 1,
            totalAmount: orderItem.total_price || orderItem.subtotal || 0,
            sellerName: sellerProfile?.full_name || 'Seller',
            orderUrl
          };

          console.log('📧 Sending email to:', buyerProfile.email);
          console.log('   Order:', emailData.productName);
          console.log('   Amount: KSh', emailData.totalAmount);

          // Send the email
          const { data: emailResponse, error: emailError } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>',
            to: buyerProfile.email,
            subject: `📦 Your Order #${orderItem.order_id.substring(0, 8)} Has Been Delivered!`,
            html: orderDeliveredEmailTemplate(buyerProfile.full_name, emailData),
            text: orderDeliveredEmailText(buyerProfile.full_name, emailData),
          });

          if (emailError) {
            console.error('❌ Email send failed:', emailError);
          } else {
            console.log('✅ Delivered notification email sent!', emailResponse.id);
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending delivered notification:', emailError);
      // Don't fail the payment if email fails
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Payment processing initiated and buyer notified',
        data: result
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message || 'Payment processing failed',
        data: result
      });
    }
  } catch (error) {
    console.error('Error in triggerOrderItemPayment:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;