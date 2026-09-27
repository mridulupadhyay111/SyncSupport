const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('ADMIN', 'AGENT'), ticketController.getTickets);
router.post('/customer-init', protect, ticketController.createTicket);
router.post('/customer-new', protect, ticketController.startNewCustomerTicket);
router.get('/customer/:email', protect, ticketController.getCustomerTickets);
router.get('/:id', protect, ticketController.getTicketById);
router.post('/:id/escalate', protect, ticketController.escalateTicket);
router.post('/:id/message', protect, ticketController.sendMessage);
router.put('/:id', protect, authorize('ADMIN', 'AGENT'), ticketController.updateTicket);
router.post('/:id/propose-resolution', protect, authorize('ADMIN', 'AGENT'), ticketController.proposeResolution);
router.post('/:id/confirm-resolution', protect, ticketController.confirmResolution);
router.post('/:id/resolve-summarize', protect, authorize('ADMIN', 'AGENT'), ticketController.resolveAndSummarizeTicket);

module.exports = router;
