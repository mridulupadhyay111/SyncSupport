const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  contentChunk: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Array of 768 floating point numbers
  category: { type: String, default: 'General' },
  sourceType: { type: String, default: 'TEXT' }, // 'TEXT' | 'DOCUMENT' | 'PHOTO'
  fileMetadata: {
    fileName: String,
    fileType: String,
    fileSize: Number
  },
  uploadedBy: { type: String, default: 'Staff Agent' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
