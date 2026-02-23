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
 * ✅ DATABASE-CONSISTENT EMAIL FIX
 * POST /api/mpesa/orders/trigger-payment/:orderItemId
 *
 * This version is fully aligned with the actual database schema
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

    console.log(`\n========================================`);
    console.log(`ORDER MARKED AS DELIVERED`);
    console.log(`Order Item ID: ${orderItemId}`);
    console.log(`========================================\n`);

    // ============================================
    // STEP 1: CHECK PAYMENT STATUS
    // ============================================
    console.log('💰 Checking payment status...');
    const paymentResult = await processSellerPayment(orderItemId);
    console.log(`💰 Payment: ${paymentResult.success ? 'Processed' : paymentResult.message}`);

    // ============================================
    // STEP 2: SEND EMAIL TO BUYER
    // ============================================
    console.log('\n📧 ========== SENDING EMAIL TO BUYER ==========\n');

    let emailSuccess = false;
    let emailErrorMessage = null;

    try {
      // 2.1: Fetch order item
      console.log('📧 Step 1: Fetching order_items record...');
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', orderItemId)
        .single();

      if (itemError) {
        throw new Error(`Failed to fetch order_items: ${itemError.message}`);
      }

      if (!orderItem) {
        throw new Error('Order item not found');
      }

      console.log('✅ Order item fetched');
      console.log(`   buyer_user_id: ${orderItem.buyer_user_id}`);
      console.log(`   seller_id: ${orderItem.seller_id}`);
      console.log(`   product_id: ${orderItem.product_id}`);
      console.log(`   order_id: ${orderItem.order_id}`);
      console.log(`   quantity: ${orderItem.quantity}`);
      console.log(`   subtotal: ${orderItem.subtotal}`);

      // 2.2: Fetch buyer profile
      console.log('\n📧 Step 2: Fetching buyer profile...');
      const { data: buyerProfile, error: buyerError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', orderItem.buyer_user_id)
        .single();

      if (buyerError) {
        throw new Error(`Failed to fetch buyer profile: ${buyerError.message}`);
      }

      if (!buyerProfile || !buyerProfile.email) {
        throw new Error('Buyer profile not found or email missing');
      }

      console.log('✅ Buyer profile fetched');
      console.log(`   Name: ${buyerProfile.full_name}`);
      console.log(`   Email: ${buyerProfile.email}`);

      // 2.3: Fetch seller profile
      console.log('\n📧 Step 3: Fetching seller profile...');
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', orderItem.seller_id)
        .single();

      console.log(`   Seller: ${sellerProfile?.full_name || 'Seller'}`);

      // 2.4: Fetch product details
      console.log('\n📧 Step 4: Fetching product details...');
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, description, price')
        .eq('id', orderItem.product_id)
        .single();

      if (productError) {
        console.warn('⚠️ Could not fetch product:', productError.message);
      } else {
        console.log('✅ Product fetched:', product.name);
      }

      // 2.5: Fetch product images from separate table
      console.log('\n📧 Step 5: Fetching product images...');
      const { data: productImages, error: imagesError } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', orderItem.product_id)
        .order('display_order', { ascending: true });

      const firstImage = productImages && productImages.length > 0
        ? productImages[0].image_url
        : null;

      if (imagesError) {
        console.warn('⚠️ Could not fetch images:', imagesError.message);
      } else {
        console.log(`   Found ${productImages?.length || 0} image(s)`);
        if (firstImage) {
          console.log(`   First image: ${firstImage.substring(0, 50)}...`);
        }
      }

      // 2.6: Check environment
      console.log('\n📧 Step 6: Checking environment...');
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not set!');
      }
      console.log('✅ RESEND_API_KEY exists');
      console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'Using default'}`);

      // 2.7: Import Resend
      console.log('\n📧 Step 7: Importing Resend...');
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend initialized');

      // 2.8: Import email templates
      console.log('\n📧 Step 8: Importing email templates...');
      const {
        orderDeliveredEmailTemplate,
        orderDeliveredEmailText
      } = await import('../utils/emailTemplates.js');
      console.log('✅ Templates imported');

      // 2.9: Prepare email data
      console.log('\n📧 Step 9: Preparing email data...');
      const APP_URL = process.env.APP_URL || 'https://unihive.shop';
      const orderUrl = `${APP_URL}/orders/${orderItemId}`;

      const emailData = {
        orderId: orderItem.order_id,
        orderItemId: orderItem.id,
        productName: product?.name || 'Product',  // ✅ FIXED: Use 'name' not 'product_name'
        productImage: firstImage,                  // ✅ FIXED: From separate table
        quantity: orderItem.quantity || 1,
        totalAmount: orderItem.subtotal || 0,      // ✅ FIXED: Use 'subtotal'
        sellerName: sellerProfile?.full_name || 'Seller',
        orderUrl
      };

      console.log('✅ Email data prepared:');
      console.log(`   Product: ${emailData.productName}`);
      console.log(`   Quantity: ${emailData.quantity}`);
      console.log(`   Amount: KSh ${emailData.totalAmount}`);
      console.log(`   URL: ${orderUrl}`);

      // 2.10: Send email
      console.log('\n📧 Step 10: Sending email...');
      const fromAddress = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>';
      const subject = `📦 Your Order #${orderItem.order_id.substring(0, 8)} Has Been Delivered!`;

      console.log(`   FROM: ${fromAddress}`);
      console.log(`   TO: ${buyerProfile.email}`);
      console.log(`   SUBJECT: ${subject}`);

      const { data: emailResponse, error: emailSendError } = await resend.emails.send({
        from: fromAddress,
        to: buyerProfile.email,
        subject: subject,
        html: orderDeliveredEmailTemplate(buyerProfile.full_name, emailData),
        text: orderDeliveredEmailText(buyerProfile.full_name, emailData),
      });

      if (emailSendError) {
        console.error('\n❌ Resend API error:');
        console.error(JSON.stringify(emailSendError, null, 2));
        throw new Error(`Resend error: ${JSON.stringify(emailSendError)}`);
      }

      emailSuccess = true;
      console.log('\n✅✅✅ EMAIL SENT SUCCESSFULLY! ✅✅✅');
      console.log(`   Email ID: ${emailResponse.id}`);
      console.log('   Check Resend dashboard for delivery status\n');

    } catch (emailError) {
      emailSuccess = false;
      emailErrorMessage = emailError.message;

      console.error('\n❌❌❌ EMAIL FAILED! ❌❌❌');
      console.error(`   Error: ${emailError.message}`);
      console.error(`   Stack:`, emailError.stack);
    }

    // ============================================
    // STEP 3: RETURN RESPONSE
    // ============================================
    console.log(`========================================`);
    console.log(`FINAL RESULT:`);
    console.log(`  Payment: ${paymentResult.success ? '✅ Processed' : '⏳ On Hold'}`);
    console.log(`  Email: ${emailSuccess ? '✅ Sent' : '❌ Failed'}`);
    console.log(`========================================\n`);

    return res.status(200).json({
      success: true,
      message: 'Order marked as delivered' + (emailSuccess ? ' and buyer notified' : ''),
      data: {
        payment: paymentResult,
        email: {
          sent: emailSuccess,
          error: emailErrorMessage
        }
      }
    });

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/mpesa/payment-health/:orderId
router.get('/payment-health/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: order } = await supabase
      .from('orders')
      .select('id, payment_status, order_status, mpesa_receipt, amount, delivery_method, pickup_mtaani_tracking_code')
      .eq('id', orderId)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('id, status, payment_status, seller_paid_at, buyer_confirmed')
      .eq('order_id', orderId);

    const { data: sellerPayments } = await supabase
      .from('seller_payments')
      .select('id, amount, status, transaction_id, created_at')
      .eq('order_id', orderId);

    const health = {
      orderId,
      buyer_paid: order.payment_status === 'completed',
      receipt: order.mpesa_receipt,
      order_status: order.order_status,
      delivery_method: order.delivery_method,
      pickup_tracking: order.pickup_mtaani_tracking_code,
      items: items?.map(i => ({
        id: i.id.substring(0, 8),
        status: i.status,
        payment_status: i.payment_status,
        seller_paid: !!i.seller_paid_at,
        buyer_confirmed: i.buyer_confirmed
      })),
      seller_payouts: sellerPayments?.map(p => ({
        id: p.id.substring(0, 8),
        amount: `KSh ${p.amount}`,
        status: p.status,
        transaction: p.transaction_id
      })),
      issues: []
    };

    if (!health.buyer_paid) health.issues.push('⚠️ Payment not completed');
    if (health.buyer_paid && !health.receipt) health.issues.push('⚠️ No M-Pesa receipt stored');
    if (health.delivery_method === 'pickup_mtaani' && !health.pickup_tracking) {
      health.issues.push('⚠️ PickUp Mtaani order paid but no tracking code — retry /confirm-parcel-creation');
    }
    items?.forEach(i => {
      if (i.status === 'delivered' && i.payment_status !== 'completed') {
        health.issues.push(`⚠️ Item ${i.id.substring(0, 8)} delivered but seller not paid`);
      }
    });

    return res.status(200).json({
      success: true,
      healthy: health.issues.length === 0,
      health
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;