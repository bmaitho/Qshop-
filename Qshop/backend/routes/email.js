// Add this line to your backend/routes/email.js file
// This creates an alias for the route your frontend is actually calling

// backend/routes/email.js
import express from 'express';
import { 
  sendConfirmationEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail,
  resendConfirmationEmail
} from '../controllers/emailController.js';
import { verifyAuth, rateLimiter } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for sending confirmation emails
// This is called from the frontend after sign-up
router.post('/confirmation', rateLimiter(), sendConfirmationEmail);

// ADD THIS LINE - Alias for the route your frontend is calling
router.post('/send-confirmation', rateLimiter(), sendConfirmationEmail);

// Public route for resending confirmation emails
// Used when users didn't receive or lost the original email
router.post('/resend-confirmation', rateLimiter(), resendConfirmationEmail);

// Protected route for sending welcome emails
// This should be called after email confirmation
router.post('/welcome', verifyAuth, sendWelcomeEmail);

// Public route for sending password reset emails
router.post('/password-reset', rateLimiter(), sendPasswordResetEmail);

// Health check route to verify the email service is running
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'email',
    timestamp: new Date().toISOString()
  });
});

export default router;