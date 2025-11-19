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
 * POST /api/mpesa/orders/trigger-payment/:orderItemId
 * Manually trigger payment for a specific order item
 * Called by SellerOrderDetail.jsx when order is marked as delivered
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
    
    console.log(`Manually triggering payment for order item: ${orderItemId}`);
    
    // Process the seller payment (this function already calculates commission)
    const result = await processSellerPayment(orderItemId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Payment processing initiated',
        data: result
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message || 'Payment processing failed',
        data: result
      });
    }
  } catch (error) {
    console.error('Error in triggerOrderItemPayment:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;