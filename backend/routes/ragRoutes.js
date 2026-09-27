const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/ingest', protect, authorize('ADMIN'), ragController.ingestDocument);
router.post('/query', protect, ragController.queryRAG);
router.get('/list', protect, authorize('ADMIN', 'AGENT'), ragController.getKnowledgeBase);
router.delete('/:id', protect, authorize('ADMIN'), ragController.deleteKnowledgeChunk);

module.exports = router;
