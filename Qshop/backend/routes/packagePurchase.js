// backend/routes/packagePurchase.js
import express from 'express';
import { getPackagePurchaseStatus } from '../controllers/packagePurchaseController.js';

const router = express.Router();

// Packs that include entry are not sold through this route.
router.post('/:packageId/purchase', (req, res) => res.status(410).json({ error: 'Specials aren’t on sale.' }));
router.get('/purchases/:purchaseId', getPackagePurchaseStatus);

export default router;
