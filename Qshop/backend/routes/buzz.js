import express from 'express';
import { draftBuzz, listBuzz, setBuzzStatus, testBuzz, sendBuzz, unsubscribeBuzz } from '../controllers/buzzController.js';

const router = express.Router();
router.post('/draft', draftBuzz);
router.get('/campaigns', listBuzz);
router.post('/campaigns/:id/status', setBuzzStatus);
router.post('/campaigns/:id/test', testBuzz);
router.post('/send', sendBuzz);
router.get('/unsubscribe', unsubscribeBuzz);
router.post('/unsubscribe', unsubscribeBuzz);
export default router;
