const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/upload', protect, authorize('ADMIN', 'AGENT'), ragController.uploadAndLearn);
router.post('/ingest', protect, authorize('ADMIN', 'AGENT'), ragController.ingestDocument);
router.post('/query', protect, ragController.queryRAG);
router.get('/list', protect, authorize('ADMIN', 'AGENT'), ragController.getKnowledgeBase);
router.delete('/:id', protect, authorize('ADMIN', 'AGENT'), ragController.deleteKnowledgeChunk);

module.exports = router;
