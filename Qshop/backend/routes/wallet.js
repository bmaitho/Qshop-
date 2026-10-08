// backend/routes/wallet.js
import express from 'express';
import { initiateWalletTopup, getWalletBalance } from '../controllers/walletController.js';

const router = express.Router();

router.post('/:eventId/topup', initiateWalletTopup);
router.get('/:eventId/balance', getWalletBalance);

export default router;
