// backend/routes/packagePurchase.js
import express from 'express';
import { initiatePackagePurchase, getPackagePurchaseStatus } from '../controllers/packagePurchaseController.js';

const router = express.Router();

router.post('/:packageId/purchase', initiatePackagePurchase);
router.get('/purchases/:purchaseId', getPackagePurchaseStatus);

export default router;
