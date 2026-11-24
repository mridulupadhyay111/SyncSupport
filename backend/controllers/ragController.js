const KnowledgeBase = require('../models/KnowledgeBase');
const { 
  generateEmbedding, 
  calculateCosineSimilarity, 
  generateGroundedResponse,
  extractKnowledgeFromFile 
} = require('../services/aiService');

// Helper to chunk text into ~200 word blocks
const chunkText = (text, targetWordCount = 200) => {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += targetWordCount) {
    chunks.push(words.slice(i, i + targetWordCount).join(' '));
  }
  return chunks.length > 0 ? chunks : [text];
};

exports.ingestDocument = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const uploadedBy = req.user?.name || req.user?.email || 'Staff Agent';
    const textChunks = chunkText(content, 180);
    const createdChunks = [];

    for (let i = 0; i < textChunks.length; i++) {
      const chunkTextContent = textChunks[i];
      const chunkTitle = textChunks.length > 1 ? `${title} (Part ${i + 1})` : title;
      
      const embedding = await generateEmbedding(chunkTextContent);

      const kbItem = await KnowledgeBase.create({
        title: chunkTitle,
        contentChunk: chunkTextContent,
        embedding: embedding,
        category: category || 'General',
        sourceType: 'TEXT',
        uploadedBy: uploadedBy
      });

      createdChunks.push({
        id: kbItem._id,
        title: kbItem.title,
        contentChunk: kbItem.contentChunk,
        category: kbItem.category,
        sourceType: kbItem.sourceType,
        uploadedBy: kbItem.uploadedBy,
        vectorDimensions: kbItem.embedding.length
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ai_learned_new_knowledge', {
        title,
        sourceType: 'TEXT',
        chunksCreated: createdChunks.length,
        uploadedBy
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully ingested document and created ${createdChunks.length} vector chunk(s).`,
      chunks: createdChunks
    });
  } catch (err) {
    console.error('[RAG Controller Ingest Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Upload and Learn from Docs and Photos
 * Allows human agents and admins to upload documents (PDF, TXT, MD, etc.) and photos/screenshots
 * Multimodal AI extracts structured knowledge, converts into vector embeddings, and stores in RAG.
 */
exports.uploadAndLearn = async (req, res) => {
  try {
    const { fileData, fileName, fileType, fileSize, category, notes, title: customTitle } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, message: 'File data and file name are required.' });
    }

    const uploadedBy = req.user?.name || req.user?.email || 'Support Agent';

    // 1. Extract knowledge using AI multimodal service (Docs or Photos)
    const extracted = await extractKnowledgeFromFile({
      fileData,
      fileName,
      fileType,
      category: category || 'General',
      notes,
      uploadedBy
    });

    const docTitle = customTitle && customTitle.trim() ? customTitle.trim() : (extracted.title || fileName);
    const docContent = extracted.content || notes || 'Verified support reference.';
    const sourceType = extracted.sourceType || 'DOCUMENT';

    // 2. Chunk extracted text
    const textChunks = chunkText(docContent, 180);
    const createdChunks = [];

    // 3. Generate embeddings and save to KnowledgeBase
    for (let i = 0; i < textChunks.length; i++) {
      const chunkTextContent = textChunks[i];
      const chunkTitle = textChunks.length > 1 ? `${docTitle} (Part ${i + 1})` : docTitle;

      const embedding = await generateEmbedding(chunkTextContent);

      const kbItem = await KnowledgeBase.create({
        title: chunkTitle,
        contentChunk: chunkTextContent,
        embedding: embedding,
        category: category || 'General',
        sourceType: sourceType,
        fileMetadata: {
          fileName: fileName,
          fileType: fileType || (sourceType === 'PHOTO' ? 'image/png' : 'application/pdf'),
          fileSize: fileSize || 0
        },
        uploadedBy: uploadedBy
      });

      createdChunks.push({
        id: kbItem._id,
        title: kbItem.title,
        contentChunk: kbItem.contentChunk,
        category: kbItem.category,
        sourceType: kbItem.sourceType,
        uploadedBy: kbItem.uploadedBy,
        vectorDimensions: kbItem.embedding.length
      });
    }

    // 4. Real-time broadcast to all connected agents and clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('ai_learned_new_knowledge', {
        title: docTitle,
        sourceType,
        fileName,
        category: category || 'General',
        chunksCreated: createdChunks.length,
        uploadedBy,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully learned from ${sourceType === 'PHOTO' ? 'photo' : 'document'} "${fileName}" and created ${createdChunks.length} vector chunk(s).`,
      title: docTitle,
      sourceType,
      chunks: createdChunks
    });
  } catch (err) {
    console.error('[RAG Controller Upload Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.queryRAG = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query string is required.' });
    }

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    let atlasCandidates = [];

    // 2. Try Atlas $vectorSearch pipeline
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 20,
            limit: 10
          }
        },
        { 
          $project: { 
            _id: 1, 
            contentChunk: 1, 
            title: 1, 
            category: 1,
            embedding: 1,
            score: { $meta: "vectorSearchScore" } 
          } 
        }
      ];

      atlasCandidates = await KnowledgeBase.aggregate(pipeline);
    } catch (vectorSearchErr) {
      console.warn('[RAG Controller] MongoDB Atlas $vectorSearch notice:', vectorSearchErr.message);
    }

    // Merge Atlas candidates with direct DB query to ensure newly learned human solutions are immediately available
    const recentKBs = await KnowledgeBase.find({}).sort({ createdAt: -1 }).limit(25);

    const candidateMap = new Map();
    for (const item of atlasCandidates) {
      candidateMap.set(item._id.toString(), item);
    }
    for (const item of recentKBs) {
      if (!candidateMap.has(item._id.toString())) {
        candidateMap.set(item._id.toString(), item);
      }
    }
    const candidateChunks = Array.from(candidateMap.values());

    // 3. Hybrid RAG Ranking: Rank candidate chunks by vector score + keyword overlap + learned category boost
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'to', 'of', 'what', 'how', 'can', 'do', 'i', 'my', 'your', 'with', 'from', 'it']);
    const queryTerms = query.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 2 && !stopWords.has(w));

    const scoredKBs = candidateChunks.map(kb => {
      let vectorScore = kb.score || calculateCosineSimilarity(queryEmbedding, kb.embedding);
      
      const text = (kb.title + " " + kb.contentChunk).toLowerCase();
      let keywordMatches = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) keywordMatches++;
      }
      const keywordRatio = queryTerms.length > 0 ? (keywordMatches / queryTerms.length) : 0;

      // Category boost for human learned solutions if meaningful keywords match
      const learnedBoost = (kb.category === 'Agent Learned' && keywordMatches > 0) ? 0.8 : 0;

      const totalScore = vectorScore + (keywordRatio * 0.5) + learnedBoost;

      return {
        _id: kb._id,
        title: kb.title,
        contentChunk: kb.contentChunk,
        category: kb.category,
        score: totalScore
      };
    });

    scoredKBs.sort((a, b) => b.score - a.score);
    const matchedChunks = scoredKBs.slice(0, 3);

    // 4. Generate grounded answer via Gemini 2.5 Flash
    const answer = await generateGroundedResponse(query, matchedChunks);

    res.json({
      success: true,
      query,
      answer,
      matchedChunks: matchedChunks.map(c => ({
        id: c._id,
        title: c.title,
        contentChunk: c.contentChunk,
        category: c.category,
        score: c.score || 0.85
      }))
    });
  } catch (err) {
    console.error('[RAG Controller Query Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getKnowledgeBase = async (req, res) => {
  try {
    const kbs = await KnowledgeBase.find({}).sort({ createdAt: -1 });
    const formatted = kbs.map(k => ({
      _id: k._id,
      title: k.title,
      contentChunk: k.contentChunk,
      category: k.category,
      sourceType: k.sourceType || 'TEXT',
      fileMetadata: k.fileMetadata || {},
      uploadedBy: k.uploadedBy || 'Staff',
      vectorLength: k.embedding ? k.embedding.length : 0,
      createdAt: k.createdAt
    }));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteKnowledgeChunk = async (req, res) => {
  try {
    const { id } = req.params;
    await KnowledgeBase.findByIdAndDelete(id);
    res.json({ success: true, message: 'Chunk deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
