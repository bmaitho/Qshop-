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

// ─── PickUp Mtaani: Seller Drop-off Instructions ─────────────────────────────
router.post('/pickup-mtaani-seller-dropoff', async (req, res) => {
  try {
    const {
      sellerEmail,
      sellerName,
      orderId,
      orderItemIds,
      items,
      trackingCode,
      dropoffPointName,
      dropoffPointAddress,
      dropoffPointPhone,
      buyerName,
      destinationPointName,
      destinationTown
    } = req.body;

    if (!sellerEmail || !orderId) {
      return res.status(400).json({ success: false, error: 'sellerEmail and orderId are required' });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>';
    const APP_URL = process.env.APP_URL || 'https://unihive.shop';

    const orderUrl = orderItemIds?.[0]
      ? `${APP_URL}/seller/orders/${orderItemIds[0]}`
      : `${APP_URL}/myshop`;

    const shortOrderId = orderId.substring(0, 8).toUpperCase();

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drop-off Instructions - UniHive</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto 0; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background-color: #0D2B20; color: white; padding: 24px 20px; text-align: center; }
    .logo { color: #E7C65F; font-weight: bold; font-size: 20px; margin-bottom: 6px; }
    .header h1 { margin: 8px 0 0; font-size: 20px; font-weight: normal; }
    .badge { display: inline-block; background-color: #E7C65F; color: #0D2B20; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-top: 10px; }
    .content { padding: 28px 24px; }
    .dropoff-card { background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .dropoff-card h3 { color: #1e40af; margin: 0 0 12px; font-size: 16px; }
    .dropoff-detail { display: flex; align-items: flex-start; margin-bottom: 8px; font-size: 14px; }
    .dropoff-detail .icon { margin-right: 8px; font-size: 16px; flex-shrink: 0; }
    .tracking-box { background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 14px; text-align: center; margin: 16px 0; }
    .tracking-code { font-family: monospace; font-size: 22px; font-weight: bold; color: #15803d; letter-spacing: 2px; }
    .items-box { background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin: 16px 0; }
    .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 14px; margin: 16px 0; font-size: 13px; color: #92400e; }
    .button-container { text-align: center; margin: 24px 0 12px; }
    .button { display: inline-block; background-color: #0D2B20; color: white !important; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .footer { padding: 18px 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">UniHive</div>
      <h1>📦 Drop-off Required — Order #${shortOrderId}</h1>
      <div class="badge">Action needed</div>
    </div>
    <div class="content">
      <p>Hi <strong>${sellerName || 'Seller'}</strong>,</p>
      <p>Your order has been <strong>paid via PickUp Mtaani delivery</strong>. Please drop off the parcel at the location below:</p>

      <div class="dropoff-card">
        <h3>📍 Your Drop-off Point</h3>
        <div class="dropoff-detail">
          <span class="icon">🏪</span>
          <strong>${dropoffPointName || 'Nearest PickUp Mtaani Agent'}</strong>
        </div>
        ${dropoffPointAddress ? `
        <div class="dropoff-detail">
          <span class="icon">📍</span>
          <span>${dropoffPointAddress}</span>
        </div>` : ''}
        ${dropoffPointPhone ? `
        <div class="dropoff-detail">
          <span class="icon">📞</span>
          <span>${dropoffPointPhone}</span>
        </div>` : ''}
      </div>

      <div class="tracking-box">
        <p style="margin:0 0 6px; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;">Tracking Code</p>
        <div class="tracking-code">${trackingCode || 'Pending'}</div>
        <p style="margin:6px 0 0; font-size:12px; color:#6b7280;">Share this with the agent when dropping off</p>
      </div>

      <div class="items-box">
        <p style="margin:0 0 6px; font-size:12px; color:#6b7280; text-transform:uppercase;">Items to drop off</p>
        <p style="margin:0; font-weight:bold;">${items || 'Order items'}</p>
        <p style="margin:6px 0 0; font-size:13px; color:#6b7280;">Buyer: ${buyerName || 'Customer'}${destinationTown ? ` • Destination: ${destinationTown}` : ''}</p>
      </div>

      <div class="warning">
        ⚠️ <strong>Important:</strong> Please drop off the parcel within <strong>48 hours</strong>.
        Package it securely and mention tracking code <strong>${trackingCode}</strong> to the agent.
        The buyer will collect from their nearest PickUp Mtaani point${destinationPointName ? ` (${destinationPointName})` : ''}.
      </div>

      <div class="button-container">
        <a href="${orderUrl}" class="button">View Order Details →</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive — The Student Marketplace</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Hi ${sellerName || 'Seller'},

Your order #${shortOrderId} has been paid via PickUp Mtaani delivery.

DROP-OFF INSTRUCTIONS:
📍 Location: ${dropoffPointName || 'Nearest PickUp Mtaani Agent'}
${dropoffPointAddress ? `Address: ${dropoffPointAddress}` : ''}
${dropoffPointPhone ? `Phone: ${dropoffPointPhone}` : ''}

Tracking Code: ${trackingCode || 'Pending'}
Items: ${items || 'Order items'}
Buyer: ${buyerName || 'Customer'}

Please drop off within 48 hours. Share the tracking code with the agent.

View order: ${orderUrl}

© ${new Date().getFullYear()} UniHive`;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: sellerEmail,
      subject: `📦 Drop-off Required — Order #${shortOrderId} (PickUp Mtaani)`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('❌ Seller drop-off email failed:', error);
      return res.status(200).json({ success: false, error: 'Email send failed', details: error });
    }

    console.log(`✅ Seller drop-off email → ${sellerEmail} (${data.id})`);
    return res.status(200).json({ success: true, emailId: data.id });

  } catch (error) {
    console.error('Error in pickup-mtaani-seller-dropoff:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});


// ─── PickUp Mtaani: Buyer Pickup Confirmation ────────────────────────────────
router.post('/pickup-mtaani-buyer-confirmation', async (req, res) => {
  try {
    const {
      buyerEmail,
      buyerName,
      orderId,
      items,
      trackingCode,
      pickupPointName,
      pickupPointAddress,
      pickupPointTown,
      totalAmount
    } = req.body;

    if (!buyerEmail || !orderId) {
      return res.status(400).json({ success: false, error: 'buyerEmail and orderId are required' });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>';
    const APP_URL = process.env.APP_URL || 'https://unihive.shop';

    const orderUrl = `${APP_URL}/orders/${orderId}`;
    const shortOrderId = orderId.substring(0, 8).toUpperCase();

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Booked - UniHive</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto 0; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background-color: #0D2B20; color: white; padding: 24px 20px; text-align: center; }
    .logo { color: #E7C65F; font-weight: bold; font-size: 20px; margin-bottom: 6px; }
    .header h1 { margin: 8px 0 0; font-size: 20px; font-weight: normal; }
    .badge { display: inline-block; background-color: #22c55e; color: white; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-top: 10px; }
    .content { padding: 28px 24px; }
    .pickup-card { background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .pickup-card h3 { color: #1e40af; margin: 0 0 12px; font-size: 16px; }
    .pickup-detail { margin-bottom: 8px; font-size: 14px; }
    .pickup-detail .icon { margin-right: 8px; }
    .tracking-box { background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 14px; text-align: center; margin: 16px 0; }
    .tracking-code { font-family: monospace; font-size: 22px; font-weight: bold; color: #15803d; letter-spacing: 2px; }
    .info-box { background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 14px; }
    .button-container { text-align: center; margin: 24px 0 12px; }
    .button { display: inline-block; background-color: #0D2B20; color: white !important; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .footer { padding: 18px 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">UniHive</div>
      <h1>🎉 Delivery Booked — Order #${shortOrderId}</h1>
      <div class="badge">✓ Confirmed</div>
    </div>
    <div class="content">
      <p>Hi <strong>${buyerName || 'there'}</strong>,</p>
      <p>Great news! Your order has been paid and delivery has been booked via <strong>PickUp Mtaani</strong>. Here's where to collect your parcel:</p>

      <div class="pickup-card">
        <h3>📍 Your Collection Point</h3>
        <div class="pickup-detail">
          <span class="icon">🏪</span>
          <strong>${pickupPointName || 'Your selected PickUp Mtaani agent'}</strong>
        </div>
        ${pickupPointAddress ? `
        <div class="pickup-detail">
          <span class="icon">📍</span>
          <span>${pickupPointAddress}</span>
        </div>` : ''}
        ${pickupPointTown ? `
        <div class="pickup-detail">
          <span class="icon">🏙️</span>
          <span>${pickupPointTown}</span>
        </div>` : ''}
      </div>

      ${trackingCode ? `
      <div class="tracking-box">
        <p style="margin:0 0 6px; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;">Your Tracking Code</p>
        <div class="tracking-code">${trackingCode}</div>
        <p style="margin:6px 0 0; font-size:12px; color:#6b7280;">Show this code when collecting your parcel</p>
      </div>` : ''}

      <div class="info-box">
        <p style="margin:0 0 6px; font-size:12px; color:#6b7280; text-transform:uppercase;">Order Summary</p>
        <p style="margin:0;"><strong>Items:</strong> ${items || 'Your order items'}</p>
        ${totalAmount ? `<p style="margin:4px 0 0;"><strong>Total:</strong> KES ${parseFloat(totalAmount).toLocaleString()}</p>` : ''}
      </div>

      <p style="font-size:14px; color:#6b7280;">The seller will drop off your parcel at their nearest PickUp Mtaani agent. Once it arrives at your collection point, you'll be notified. Typical delivery takes 1-3 business days.</p>

      <div class="button-container">
        <a href="${orderUrl}" class="button">Track Your Order →</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive — The Student Marketplace</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Hi ${buyerName || 'there'},

Your order #${shortOrderId} has been paid and delivery booked via PickUp Mtaani!

YOUR COLLECTION POINT:
🏪 ${pickupPointName || 'Your selected agent'}
${pickupPointAddress ? `📍 ${pickupPointAddress}` : ''}
${pickupPointTown ? `🏙️ ${pickupPointTown}` : ''}

${trackingCode ? `Tracking Code: ${trackingCode}\nShow this code when collecting.\n` : ''}
Items: ${items || 'Your order items'}
${totalAmount ? `Total: KES ${parseFloat(totalAmount).toLocaleString()}` : ''}

The seller will drop off your parcel at their nearest agent. Typical delivery: 1-3 business days.

Track your order: ${orderUrl}

© ${new Date().getFullYear()} UniHive`;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: buyerEmail,
      subject: `🎉 Delivery Booked — Order #${shortOrderId} (PickUp Mtaani)`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('❌ Buyer confirmation email failed:', error);
      return res.status(200).json({ success: false, error: 'Email send failed', details: error });
    }

    console.log(`✅ Buyer confirmation email → ${buyerEmail} (${data.id})`);
    return res.status(200).json({ success: true, emailId: data.id });

  } catch (error) {
    console.error('Error in pickup-mtaani-buyer-confirmation:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

export default router;