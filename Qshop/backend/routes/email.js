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

// Health check route to verify the email service is running
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'email',
    timestamp: new Date().toISOString()
  });
});

export default router;