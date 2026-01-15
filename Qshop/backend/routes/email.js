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

// Add this import at the top if not already there
import { supabase } from '../supabaseClient.js';

// Add this route to your existing email router
router.post('/resend-order-notification', async (req, res) => {
  try {
    const { checkoutRequestId, orderId } = req.body;
    
    if (!checkoutRequestId && !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Either checkoutRequestId or orderId is required'
      });
    }
    
    console.log('🔍 Manual email resend requested...');
    
    // Find the order
    let query = supabase.from('orders').select('*');
    
    if (checkoutRequestId) {
      query = query.eq('checkout_request_id', checkoutRequestId);
    } else {
      query = query.eq('id', orderId);
    }
    
    const { data: orders, error: orderError } = await query;
    
    if (orderError || !orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Fetch order items with CORRECTED seller_id reference
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
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order items'
      });
    }
    
    // Fetch buyer profile
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', order.buyer_user_id)
      .single();
    
    // Send emails to sellers
    const results = [];
    
    for (const item of orderItems) {
      try {
        const sellerId = item.products?.seller_id; // CORRECTED
        
        if (!sellerId) {
          results.push({ orderItemId: item.id, success: false, error: 'No seller ID' });
          continue;
        }
        
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', sellerId)
          .single();
        
        if (!sellerProfile?.email) {
          results.push({ orderItemId: item.id, success: false, error: 'No seller email' });
          continue;
        }
        
        // Get product images
        const productImages = item.products?.product_images;
        const firstImage = Array.isArray(productImages) && productImages.length > 0 
          ? productImages[0] 
          : null;
        
        const emailData = {
          sellerEmail: sellerProfile.email,
          sellerName: sellerProfile.full_name || 'Seller',
          orderId: order.id,
          orderItemId: item.id,
          productName: item.products?.product_name || 'Product',
          productImage: firstImage,
          quantity: item.quantity || 1,
          totalAmount: item.total_price || 0,
          buyerName: buyerProfile?.full_name || 'Customer',
          buyerEmail: buyerProfile?.email || ''
        };
        
        // Call the email controller
        const { sendSellerOrderNotification } = await import('../controllers/emailController.js');
        
        const mockReq = { body: emailData };
        let emailSuccess = false;
        
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              emailSuccess = code === 200 && data.success;
            }
          })
        };
        
        await sendSellerOrderNotification(mockReq, mockRes);
        
        results.push({ 
          orderItemId: item.id, 
          sellerEmail: sellerProfile.email,
          success: emailSuccess 
        });
        
      } catch (error) {
        results.push({ orderItemId: item.id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return res.status(200).json({
      success: true,
      message: `Sent ${successCount} of ${orderItems.length} emails`,
      orderId: order.id,
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