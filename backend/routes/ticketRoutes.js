const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.get('/', ticketController.getTickets);
router.post('/customer-init', ticketController.createTicket);
router.post('/customer-new', ticketController.startNewCustomerTicket);
router.get('/customer/:email', ticketController.getCustomerTickets);
router.get('/:id', ticketController.getTicketById);
router.post('/:id/escalate', ticketController.escalateTicket);
router.post('/:id/message', ticketController.sendMessage);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/propose-resolution', ticketController.proposeResolution);
router.post('/:id/confirm-resolution', ticketController.confirmResolution);
router.post('/:id/resolve-summarize', ticketController.resolveAndSummarizeTicket);

module.exports = router;
