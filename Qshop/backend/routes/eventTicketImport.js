// backend/routes/eventTicketImport.js
import express from 'express';
import { importExternalTickets } from '../controllers/eventTicketImportController.js';

const router = express.Router();

// Admin-only import of tickets sold on an external platform (e.g. Little
// Events) — see eventTicketImportController.js for the safety notes on
// why this never touches entry/check-in state.
router.post('/:eventId/import-tickets', importExternalTickets);

export default router;
