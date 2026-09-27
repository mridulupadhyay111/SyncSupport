const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

const getAIClient = () => {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('[AI Service Warning] Failed to initialize GoogleGenAI client:', err.message);
    }
  }
  return aiClient;
};

// Generate 768-dimensional vector embedding
const generateEmbedding = async (text) => {
  const client = getAIClient();
  if (client) {
    const embeddingModels = ['text-embedding-004', 'embedding-001', 'gemini-1.5-flash'];
    for (const model of embeddingModels) {
      try {
        const response = await client.models.embedContent({
          model,
          contents: text,
        });
        if (response && response.embedding && response.embedding.values) {
          return response.embedding.values;
        }
      } catch (err) {}
    }
  }

  // Fallback 768-dimensional normalized pseudo-vector derived from text string
  const vector = new Array(768).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const idx = (i * 31 + charCode) % 768;
    vector[idx] += (charCode / 255.0);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / magnitude);
};

// Cosine similarity for vector search fallback
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Generate grounded response using gemini-2.5-flash
const generateGroundedResponse = async (query, contextChunks) => {
  const client = getAIClient();
  const contextText = contextChunks.map((c, i) => `[Learned Knowledge ${i + 1}: ${c.title}]\n${c.contentChunk}`).join('\n\n');

  const systemPrompt = `You are SyncSupport AI, an autonomous customer support agent.
Answer the customer's question clearly and directly using the learned knowledge base context below:
${contextText || 'No specific document context available.'}

Rules:
1. If the knowledge base contains the answer (including answers previously learned from human agents), provide a helpful, concise answer.
2. If the answer is NOT in the knowledge base, inform the customer politely that you don't know yet and offer to escalate to a live human support agent.
3. Be professional, friendly, and direct.`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nCustomer Query: ${query}`,
      });
      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('[AI Service] Gemini text generation failed, using fallback:', err.message);
    }
  }

  // Fallback intelligent response formatting for learned RAG answers
  if (contextChunks.length > 0) {
    const topChunk = contextChunks[0];
    const chunkText = topChunk.contentChunk;

    // Check if chunk is a learned Q&A from human agent
    if (chunkText.includes('Resolution:') || chunkText.includes('A:')) {
      const match = chunkText.match(/(?:Resolution:|A:)\s*([\s\S]+)/i);
      const answerText = match ? match[1].trim() : chunkText;
      return `Here is the solution learned from our support team:\n\n${answerText}`;
    }

    return `Based on our knowledge base:\n\n${chunkText}`;
  }
  return `I don't have exact information on "${query}" in my current knowledge base. Would you like me to connect you with a live human support agent so we can resolve this and update my knowledge for future inquiries?`;
};

// Analyze Customer Sentiment
const analyzeSentiment = async (message) => {
  const client = getAIClient();
  if (client) {
    try {
      const prompt = `Analyze the sentiment of this customer message. Respond with ONLY one word: "Satisfied", "Neutral", or "Frustrated".
Customer message: "${message}"`;
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text.trim();
      if (['Satisfied', 'Neutral', 'Frustrated'].includes(text)) {
        return text;
      }
    } catch (err) {
      console.warn('[AI Service] Sentiment analysis failed:', err.message);
    }
  }

  const lower = message.toLowerCase();
  if (lower.includes('angry') || lower.includes('worst') || lower.includes('broken') || lower.includes('fail') || lower.includes('refund') || lower.includes('terrible') || lower.includes('bad') || lower.includes('issue') || lower.includes('not working') || lower.includes('human')) {
    return 'Frustrated';
  }
  if (lower.includes('thanks') || lower.includes('great') || lower.includes('awesome') || lower.includes('love') || lower.includes('perfect') || lower.includes('good') || lower.includes('helpful')) {
    return 'Satisfied';
  }
  return 'Neutral';
};

// Generate Smart Auto-Replies for Support Agents
const generateSmartReplies = async (latestCustomerMessage, history = []) => {
  const client = getAIClient();
  if (client) {
    try {
      const prompt = `You are an AI co-pilot for a customer support agent.
Based on the customer message: "${latestCustomerMessage}", generate 3 distinct, professional, turn-key quick reply options for the human agent.
Return ONLY a valid JSON array of 3 strings.`;
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text.trim().replace(/```json/g, '').replace(/```/g, '');
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    } catch (err) {
      console.warn('[AI Service] Smart reply generation failed:', err.message);
    }
  }

  return [
    "Hello! I am reviewing your issue and will resolve it for you right now.",
    "Thank you for reaching out. Here is the step-by-step solution to fix this issue.",
    "I have processed your request and verified the resolution on your account."
  ];
};

// One-Click Ticket Resolution Summarizer & Knowledge Extraction
const extractKnowledgeFromChat = async (chatMessages) => {
  const client = getAIClient();
  const textLog = chatMessages.map(m => `${m.sender} (${m.senderName}): ${m.message}`).join('\n');

  if (client) {
    try {
      const prompt = `Analyze this resolved customer support chat.
Extract the core customer question/problem and the exact solution provided by the human agent.
Return a clean, structured Q&A summary chunk suitable for embedding into a RAG knowledge base.

Format output as:
Title: [Short title describing the problem]
Q: [Customer's core question or issue]
A: [Human agent's exact solution and steps]

Chat Log:
${textLog}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        const text = response.text.trim();
        const lines = text.split('\n');
        let title = 'Agent Learned Solution';
        let contentChunk = text;

        for (const line of lines) {
          if (line.startsWith('Title:')) {
            title = line.replace('Title:', '').trim();
          }
        }
        return { title, contentChunk };
      }
    } catch (err) {
      console.warn('[AI Service] Extract knowledge failed:', err.message);
    }
  }

  // Fallback extraction - get latest customer question & agent resolution
  const custMsg = [...chatMessages].reverse().find(m => m.sender === 'CUSTOMER')?.message || 'Customer Inquiry';
  const agentMsg = [...chatMessages].reverse().find(m => m.sender === 'AGENT')?.message || 'Issue resolved by support agent.';

  return {
    title: `Learned: ${custMsg.slice(0, 50)}...`,
    contentChunk: `Question: ${custMsg}\n\nResolution: ${agentMsg}`
  };
};

module.exports = {
  generateEmbedding,
  calculateCosineSimilarity,
  generateGroundedResponse,
  analyzeSentiment,
  generateSmartReplies,
  extractKnowledgeFromChat
};
