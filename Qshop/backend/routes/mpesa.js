import express from 'express';
import { 
  initiateSTKPush, 
  handleCallback, 
  checkTransactionStatus 
} from '../controllers/mpesaController.js';

const router = express.Router();

// Initiate STK Push payment
router.post('/stkpush', initiateSTKPush);

// Handle callback from M-Pesa
router.post('/callback', handleCallback);

// Check payment status
router.get('/status/:checkoutRequestId', checkTransactionStatus);

export default router;