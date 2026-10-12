import express from 'express';
import { verifyAuth } from '../middleware/authMiddleware.js';
import { broadcastToShopOwners } from '../controllers/shopBroadcastController.js';

const router = express.Router();
router.post('/shop-owners', verifyAuth, broadcastToShopOwners);
export default router;
