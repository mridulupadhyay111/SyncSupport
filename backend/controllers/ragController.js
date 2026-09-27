const KnowledgeBase = require('../models/KnowledgeBase');
const { generateEmbedding, calculateCosineSimilarity, generateGroundedResponse } = require('../services/aiService');

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
        category: category || 'General'
      });

      createdChunks.push({
        id: kbItem._id,
        title: kbItem.title,
        contentChunk: kbItem.contentChunk,
        category: kbItem.category,
        vectorDimensions: kbItem.embedding.length
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
