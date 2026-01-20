// backend/routes/buyerOrders.js
import express from 'express';
import {
  getBuyerOrders,
  confirmOrderDelivery,
  updateOrderRating,
  getSellerRatings
} from '../controllers/buyerOrderController.js';

const router = express.Router();

// Get buyer's order history
router.get('/', getBuyerOrders);

// Confirm order delivery and trigger payment
router.post('/:orderItemId/confirm', confirmOrderDelivery);

// Update order rating
router.put('/:orderItemId/rating', updateOrderRating);

// Get seller's ratings and reviews
router.get('/seller/:sellerId/ratings', getSellerRatings);

export default router;