const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');

router.post('/ingest', ragController.ingestDocument);
router.post('/query', ragController.queryRAG);
router.get('/list', ragController.getKnowledgeBase);
router.delete('/:id', ragController.deleteKnowledgeChunk);

module.exports = router;
