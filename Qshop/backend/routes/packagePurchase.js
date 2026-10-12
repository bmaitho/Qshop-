// backend/routes/packagePurchase.js
import express from 'express';
import { getPackagePurchaseStatus } from '../controllers/packagePurchaseController.js';

const router = express.Router();

// Packs that include entry are sold only on Little Events.
router.post('/:packageId/purchase', (req, res) => res.status(410).json({ error: 'Specials are sold exclusively on Little Events.' }));
router.get('/purchases/:purchaseId', getPackagePurchaseStatus);

export default router;
