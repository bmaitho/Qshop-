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
    const { checkoutRequestId } = req.body;
    
    console.log('🔍 Looking for order:', checkoutRequestId);
    
    // Find order
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single();
    
    if (!orders) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Get order items with CORRECTED seller_id
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`*, products(*, seller_id)`)
      .eq('order_id', orders.id);
    
    // Get buyer
    const { data: buyer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', orders.buyer_user_id)
      .single();
    
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { 
      sellerOrderNotificationTemplate, 
      sellerOrderNotificationText 
    } = await import('../utils/emailTemplates.js');
    
    const results = [];
    
    // Send emails to each seller
    for (const item of orderItems) {
      try {
        const { data: seller } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', item.products.seller_id)
          .single();
        
        if (!seller?.email) {
          results.push({ orderItemId: item.id, success: false, error: 'No seller email' });
          continue;
        }
        
        const APP_URL = process.env.APP_URL || 'https://unihive.shop';
        const orderUrl = `${APP_URL}/seller/orders/${item.id}`;
        
        const productImages = item.products?.product_images;
        const firstImage = Array.isArray(productImages) && productImages.length > 0 
          ? productImages[0] 
          : null;
        
        const orderDetails = {
          orderId: orders.id,
          orderItemId: item.id,
          productName: item.products?.product_name || 'Product',
          productImage: firstImage,
          quantity: item.quantity || 1,
          totalAmount: item.total_price || 0,
          buyerName: buyer?.full_name || 'Customer',
          buyerEmail: buyer?.email || '',
          orderUrl
        };
        
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>',
          to: seller.email,
          subject: `🎉 New Order #${item.id.substring(0, 8)} - ${orderDetails.productName}`,
          html: sellerOrderNotificationTemplate(seller.full_name, orderDetails),
          text: sellerOrderNotificationText(seller.full_name, orderDetails),
        });
        
        if (error) {
          results.push({ orderItemId: item.id, sellerEmail: seller.email, success: false, error });
        } else {
          results.push({ orderItemId: item.id, sellerEmail: seller.email, success: true, emailId: data.id });
        }
        
      } catch (error) {
        results.push({ orderItemId: item.id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return res.json({
      success: true,
      message: `Sent ${successCount} of ${orderItems.length} emails`,
      orderId: orders.id,
      results
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Health check route to verify the email service is running
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'email',
    timestamp: new Date().toISOString()
  });
});

export default router;