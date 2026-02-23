// backend/routes/email.js
import express from 'express';
import { 
  sendConfirmationEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail,
  resendConfirmationEmail,
  sendSellerOrderNotification
} from '../controllers/emailController.js';
import { verifyAuth, rateLimiter } from '../middleware/authMiddleware.js';

import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Public route for sending confirmation emails
// This is called from the frontend after sign-up
router.post('/confirmation', rateLimiter(), sendConfirmationEmail);
router.post('/confirmation/resend', rateLimiter(), resendConfirmationEmail);

// Protected route for sending welcome emails
// This should be called after email confirmation
router.post('/welcome', verifyAuth, sendWelcomeEmail);

// Public route for sending password reset emails
router.post('/password-reset', rateLimiter(), sendPasswordResetEmail);

// NEW: Route for sending seller order notifications
// This will be called when a new order is placed
router.post('/seller-order-notification', sendSellerOrderNotification);



router.post('/resend-order-notification', async (req, res) => {
  try {
    const { checkoutRequestId, orderId } = req.body;
    
    if (!checkoutRequestId && !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Either checkoutRequestId or orderId is required'
      });
    }
    
    console.log('🔍 Looking for order...');
    
    // Find order
    let query = supabase.from('orders').select('*');
    
    if (checkoutRequestId) {
      query = query.eq('checkout_request_id', checkoutRequestId);
    } else {
      query = query.eq('id', orderId);
    }
    
    const { data: orders, error: orderError } = await query;
    
    if (orderError || !orders || orders.length === 0) {
      console.error('Order not found:', orderError);
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const order = orders[0];
    console.log('✅ Found order:', order.id);
    console.log('   Total Amount:', order.amount);
    
    // Get order items with products
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          *,
          seller_id
        )
      `)
      .eq('order_id', order.id);
    
    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('No order items found:', itemsError);
      return res.status(404).json({ 
        success: false, 
        error: 'No order items found' 
      });
    }
    
    console.log(`✅ Found ${orderItems.length} order item(s)`);
    
    // ✅ FIX: Get buyer from order_items, not orders table
    const firstItem = orderItems[0];
    const buyerUserId = firstItem.buyer_user_id;
    
    console.log('🔍 Fetching buyer profile from order_items...');
    console.log('   Buyer ID:', buyerUserId);
    
    let buyerProfile = null;
    
    if (buyerUserId) {
      const { data: buyer, error: buyerError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', buyerUserId)
        .single();
      
      if (buyerError) {
        console.error('Error fetching buyer:', buyerError);
      } else {
        buyerProfile = buyer;
        console.log('✅ Buyer:', buyer.full_name);
        console.log('   Email:', buyer.email);
      }
    } else {
      console.warn('⚠️ No buyer_user_id in order_items');
    }
    
    // Import Resend and templates
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { 
      sellerOrderNotificationTemplate, 
      sellerOrderNotificationText 
    } = await import('../utils/emailTemplates.js');
    
    const results = [];
    
    // Send email to each seller
    for (const item of orderItems) {
      try {
        console.log(`\n📦 Processing order item: ${item.id}`);
        
        const sellerId = item.products?.seller_id;
        
        if (!sellerId) {
          console.error('❌ No seller ID for item');
          results.push({ 
            orderItemId: item.id, 
            success: false, 
            error: 'No seller ID' 
          });
          continue;
        }
        
        console.log('🔍 Fetching seller profile...');
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', sellerId)
          .single();
        
        if (sellerError || !sellerProfile?.email) {
          console.error('❌ Seller not found or no email:', sellerError);
          results.push({ 
            orderItemId: item.id, 
            success: false, 
            error: 'Seller not found or no email' 
          });
          continue;
        }
        
        console.log('✅ Seller:', sellerProfile.full_name);
        console.log('   Email:', sellerProfile.email);
        
        // Get product details
        const productName = item.products?.product_name || item.products?.name || 'Product';
        const productImages = item.products?.product_images;
        const firstImage = Array.isArray(productImages) && productImages.length > 0 
          ? productImages[0] 
          : null;
        
        console.log('📦 Product:', productName);
        console.log('   Quantity:', item.quantity);
        console.log('   Price per unit:', item.price_per_unit);
        console.log('   Total price:', item.total_price);
        console.log('   Image:', firstImage ? 'Yes' : 'No');
        
        // Construct order URL
        const APP_URL = process.env.APP_URL || 'https://unihive.shop';
        const orderUrl = `${APP_URL}/seller/orders/${item.id}`;
        
        // Prepare order details with REAL data
        const orderDetails = {
          orderId: order.id,
          orderItemId: item.id,
          productName: productName,
          productImage: firstImage,
          quantity: item.quantity || 1,
          totalAmount: item.total_price || item.price_per_unit || 0,
          buyerName: buyerProfile?.full_name || 'Customer',
          buyerEmail: buyerProfile?.email || '',
          orderUrl
        };
        
        console.log('\n📧 Email data:');
        console.log('   To:', sellerProfile.email);
        console.log('   Seller name:', sellerProfile.full_name || 'Seller');
        console.log('   Product:', orderDetails.productName);
        console.log('   Quantity:', orderDetails.quantity);
        console.log('   Total: KSh', orderDetails.totalAmount);
        console.log('   Buyer:', orderDetails.buyerName);
        console.log('   Buyer Email:', orderDetails.buyerEmail);
        
        // Send the email
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>',
          to: sellerProfile.email,
          subject: `🎉 New Order #${item.id.substring(0, 8)} - ${orderDetails.productName}`,
          html: sellerOrderNotificationTemplate(sellerProfile.full_name || 'Seller', orderDetails),
          text: sellerOrderNotificationText(sellerProfile.full_name || 'Seller', orderDetails),
        });
        
        if (error) {
          console.error('❌ Email send failed:', error);
          results.push({ 
            orderItemId: item.id, 
            sellerEmail: sellerProfile.email, 
            success: false, 
            error: error 
          });
        } else {
          console.log('✅ Email sent! ID:', data.id);
          results.push({ 
            orderItemId: item.id, 
            sellerEmail: sellerProfile.email, 
            success: true, 
            emailId: data.id 
          });
        }
        
      } catch (itemError) {
        console.error('❌ Error processing item:', itemError);
        results.push({ 
          orderItemId: item.id, 
          success: false, 
          error: itemError.message 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 Summary: ${successCount} of ${orderItems.length} emails sent`);
    
    return res.json({
      success: successCount > 0,
      message: `Sent ${successCount} of ${orderItems.length} emails`,
      orderId: order.id,
      results
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

router.post('/message-notification', async (req, res) => {
  try {
    const {
      recipientId,
      senderName,
      messageText,
      orderItemId,
      orderId,
      productId,
    } = req.body;

    if (!recipientId || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'recipientId and messageText are required'
      });
    }

    // 1. Fetch recipient profile
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient?.email) {
      console.warn(`⚠️ Message notification skipped — no email for recipient ${recipientId}`);
      return res.status(200).json({
        success: false,
        skipped: true,
        reason: 'Recipient has no email'
      });
    }

    // 2. Build context (product name, order ref)
    let context = {};

    if (orderItemId) {
      const { data: item } = await supabase
        .from('order_items')
        .select('order_id, products(name)')
        .eq('id', orderItemId)
        .single();
      if (item) {
        context.productName = item.products?.name;
        context.orderRef = (item.order_id || '').substring(0, 8).toUpperCase();
      }
    } else if (orderId) {
      context.orderRef = orderId.substring(0, 8).toUpperCase();
    }

    if (!context.productName && productId) {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      if (product) context.productName = product.name;
    }

    // 3. Build conversation URL
    const APP_URL = process.env.APP_URL || 'https://unihive.shop';
    let conversationUrl;
    if (orderItemId) {
      conversationUrl = `${APP_URL}/orders/${orderItemId}`;
    } else if (orderId) {
      conversationUrl = `${APP_URL}/orders`;
    } else {
      conversationUrl = `${APP_URL}/messages`;
    }

    // 4. Truncate message preview (max 200 chars)
    const messagePreview = messageText.length > 200
      ? messageText.substring(0, 197) + '...'
      : messageText;

    // 5. Send email
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { newMessageEmailTemplate, newMessageEmailText } = await import('../utils/emailTemplates.js');

    const fromAddress = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>';

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: recipient.email,
      subject: `💬 New message from ${senderName || 'someone'} on UniHive`,
      html: newMessageEmailTemplate(
        recipient.full_name,
        senderName,
        messagePreview,
        conversationUrl,
        context
      ),
      text: newMessageEmailText(
        recipient.full_name,
        senderName,
        messagePreview,
        conversationUrl,
        context
      ),
    });

    if (emailError) {
      console.error('❌ Message notification email failed:', emailError);
      return res.status(200).json({
        success: false,
        error: 'Email send failed',
        details: emailError
      });
    }

    console.log(`✅ Message notification → ${recipient.email} (${emailData.id})`);
    return res.status(200).json({
      success: true,
      emailId: emailData.id
    });

  } catch (error) {
    console.error('Error in /email/message-notification:', error);
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

export default router;