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
  checkB2CStatus
} from '../controllers/mpesaB2CController.js';

const router = express.Router();

// C2B (Customer to Business) - Existing endpoints
router.post('/stkpush', initiateSTKPush);
router.post('/callback', handleCallback);
router.get('/status/:checkoutRequestId', checkTransactionStatus);

// B2C (Business to Customer) - New endpoints for seller payments
router.post('/b2c', initiateB2C);
router.post('/b2c/result', handleB2CResult);
router.post('/b2c/timeout', handleB2CTimeout);
router.get('/b2c/status/:transactionId', checkB2CStatus);

export default router;