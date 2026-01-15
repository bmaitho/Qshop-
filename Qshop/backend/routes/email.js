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




// Add this route to your existing email router
// backend/routes/email.js
// ADD THIS SIMPLE TEST ROUTE

router.post('/test-send-now', async (req, res) => {
  try {
    console.log('🧪 TEST: Sending email directly...');
    
    // Your actual data from the order
    const emailData = {
      sellerEmail: 'tulleyteyez@gmail.com',
      sellerName: 'Seller',
      orderId: '78ca44d0-4e16-44e5-8424-0f2bde0b9f05',
      orderItemId: 'ace4033f-6142-4ad1-97d0-3327296e758e',
      productName: 'Test Product',
      productImage: null,
      quantity: 1,
      totalAmount: 1000,
      buyerName: 'Test Buyer',
      buyerEmail: 'buyer@test.com'
    };
    
    console.log('📧 Email data:', emailData);
    
    // Import and use Resend directly
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('🔑 API Key present:', !!process.env.RESEND_API_KEY);
    console.log('📤 Attempting to send...');
    
    // Import your email template
    const { sellerOrderNotificationTemplate, sellerOrderNotificationText } = await import('../utils/emailTemplates.js');
    
    const APP_URL = process.env.APP_URL || 'https://unihive.shop';
    const SENDER_EMAIL = process.env.EMAIL_FROM || 'UniHive <support@unihive.store>';
    
    const orderUrl = `${APP_URL}/seller/orders/${emailData.orderItemId}`;
    
    const orderDetails = {
      orderId: emailData.orderId,
      orderItemId: emailData.orderItemId,
      productName: emailData.productName,
      productImage: emailData.productImage,
      quantity: emailData.quantity,
      totalAmount: emailData.totalAmount,
      buyerName: emailData.buyerName,
      buyerEmail: emailData.buyerEmail,
      orderUrl
    };
    
    console.log('📝 Generating email templates...');
    
    const htmlContent = sellerOrderNotificationTemplate(emailData.sellerName, orderDetails);
    const textContent = sellerOrderNotificationText(emailData.sellerName, orderDetails);
    
    console.log('✅ Templates generated');
    console.log('📨 Calling Resend API...');
    
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: emailData.sellerEmail,
      subject: `🎉 New Order #${emailData.orderItemId.substring(0, 8)} - ${emailData.productName}`,
      html: htmlContent,
      text: textContent,
    });
    
    if (error) {
      console.error('❌ Resend API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Resend API failed',
        details: error
      });
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', data.id);
    
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully!',
      emailId: data.id,
      sentTo: emailData.sellerEmail
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
// Health check route to verify the email service is running
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'email',
    timestamp: new Date().toISOString()
  });
});

export default router;