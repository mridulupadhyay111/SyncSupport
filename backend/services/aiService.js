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

const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

const safeGenerateContent = async (client, contents) => {
  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
      });
      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      // If model candidate fails, try next candidate model in order
    }
  }
  return null;
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

// Helper to clean informal human agent jargon or internal notes
const sanitizeAgentText = (text) => {
  if (!text) return '';
  let cleaned = text.trim();
  const preambles = [
    /^(done\s*fixed|fixed|done)\b[.,:]?\s*/i,
    /^tell\s*(him|her|them|customer)\b[.,:]?\s*/i,
    /^(he|she|customer)\s*(asked|requested)\b[.,:]?\s*/i,
    /^(instructed|noted|ok|okay)\b[.,:]?\s*/i
  ];
  
  let changed = true;
  while (changed) {
    changed = false;
    for (const pat of preambles) {
      if (pat.test(cleaned)) {
        cleaned = cleaned.replace(pat, '').trim();
        changed = true;
      }
    }
  }

  // Rephrase informal shorthand and third-person pronouns into courteous customer phrasing
  cleaned = cleaned.replace(/\bdelivery guys have\b/gi, 'our delivery partners carry');
  cleaned = cleaned.replace(/\bpay via GPay or PhonePe\b/gi, 'pay via GPay, PhonePe, or any UPI app');
  cleaned = cleaned.replace(/\bsent (it )?to (her|his|their|customer's) email( id)?\b/gi, 'sent directly to your registered email address');
  cleaned = cleaned.replace(/\bcheck email\b/gi, 'please check your email inbox');
  cleaned = cleaned.replace(/\b(her|his|their) account\b/gi, 'your account');

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
};

// Helper to curate and format raw human agent/KB text into a polite, well-mannered AI response
const curateFallbackResponse = (query, contextChunks) => {
  if (!contextChunks || contextChunks.length === 0) {
    return `Hello! Thank you for reaching out to SyncSupport.\n\nI don't have exact details regarding "${query}" in my current knowledge base.\n\nWould you like me to connect you with a live human support representative who can assist you directly and update my knowledge for future inquiries?`;
  }

  const topChunk = contextChunks[0];
  let rawText = topChunk.contentChunk || '';

  // Extract solution body if structured with Q&A or Resolution tags
  let solutionText = rawText;
  if (rawText.includes('Resolution:')) {
    const parts = rawText.split(/Resolution:/i);
    solutionText = parts[parts.length - 1].trim();
  } else if (rawText.includes('A:')) {
    const parts = rawText.split(/A:/i);
    solutionText = parts[parts.length - 1].trim();
  }

  // Clean up any remaining leading Q: or Question: headers or Title: lines
  solutionText = solutionText
    .replace(/^Title:\s*.*$/gm, '')
    .replace(/^Q:\s*.*$/gm, '')
    .replace(/^Question:\s*.*$/gm, '')
    .trim();

  // Sanitize informal jargon and internal notes
  solutionText = sanitizeAgentText(solutionText);

  // Format with Markdown bullet points if multiple sentences/steps are present
  const sentences = solutionText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  let formattedBody = solutionText;
  if (sentences.length > 1) {
    formattedBody = sentences.map(s => `• ${s.trim()}`).join('\n');
  }

  return `Hello! Thank you for contacting SyncSupport.\n\nBased on our verified support guidelines, here is the curated solution for your query:\n\n${formattedBody}\n\nPlease let me know if you need any further assistance! I am always here to help.`;
};

// Generate grounded response
const generateGroundedResponse = async (query, contextChunks) => {
  const client = getAIClient();
  const contextText = contextChunks.map((c, i) => `[Knowledge Source ${i + 1}: ${c.title}]\n${c.contentChunk}`).join('\n\n');

  const systemPrompt = `You are SyncSupport AI, an empathetic, highly courteous, and well-mannered customer support assistant.

Your task is to answer the customer's query using the verified Knowledge Base context below.

Knowledge Base Context:
${contextText || 'No specific document context available.'}

RULES FOR CURATING YOUR ANSWER:
1. REPHRASE & CURATE: Do NOT repeat raw human agent messages, internal chat transcripts, or informal notes word-for-word. Synthesize and transform the solution into a polished, polite, and well-structured customer response.
2. TONE & MANNER: Be warm, respectful, and professional. Include a polite greeting, explain the steps clearly and concisely, and close with a friendly offer of further assistance.
3. CLEAR FORMATTING: Use Markdown (such as bullet points or bold text) to present steps or key information clearly.
4. RELEVANCE & ACCURACY: Directly address the customer's specific question: "${query}". Keep all facts, policies, and procedural steps 100% accurate according to the Knowledge Base context.
5. ESCALATION: If the Knowledge Base context does not contain sufficient details to answer the customer's question, politely explain that you do not have that specific information yet and offer to escalate the request to a live human support representative.`;

  if (client) {
    const text = await safeGenerateContent(client, `${systemPrompt}\n\nCustomer Query: ${query}`);
    if (text) return text;
  }

  // Intelligently curated fallback response for offline/fallback mode
  return curateFallbackResponse(query, contextChunks);
};

// Analyze Customer Sentiment
const analyzeSentiment = async (message) => {
  const client = getAIClient();
  if (client) {
    const prompt = `Analyze the sentiment of this customer message. Respond with ONLY one word: "Satisfied", "Neutral", or "Frustrated".
Customer message: "${message}"`;
    const text = await safeGenerateContent(client, prompt);
    if (text && ['Satisfied', 'Neutral', 'Frustrated'].includes(text)) {
      return text;
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
    const prompt = `You are an AI co-pilot for a customer support agent.
Based on the customer message: "${latestCustomerMessage}", generate 3 distinct, professional, turn-key quick reply options for the human agent.
Return ONLY a valid JSON array of 3 strings.`;
    const text = await safeGenerateContent(client, prompt);
    if (text) {
      try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3);
        }
      } catch (err) {}
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
    const prompt = `Analyze this resolved customer support chat log.
Extract the core customer question/issue and the resolution provided by the human agent.
Synthesize the human agent's resolution into a clean, professional, step-by-step knowledge base entry. Do NOT copy informal chat slang, typos, or conversational filler verbatim.

Format output exactly as:
Title: [Short, clear title describing the problem and resolution]
Q: [Clean summary of customer question/issue]
A: [Curated, well-structured, step-by-step resolution]

Chat Log:
${textLog}`;

    const text = await safeGenerateContent(client, prompt);

    if (text) {
      const lines = text.split('\n');
      let title = 'Verified Support Solution';
      let contentChunk = text;

      for (const line of lines) {
        if (line.startsWith('Title:')) {
          title = line.replace('Title:', '').trim();
        }
      }
      return { title, contentChunk };
    }
  }

  // Fallback extraction with clean formatting
  const custMsg = [...chatMessages].reverse().find(m => m.sender === 'CUSTOMER')?.message || 'Customer Inquiry';
  const rawAgentMsg = [...chatMessages].reverse().find(m => m.sender === 'AGENT' || m.sender === 'BOT')?.message || 'Issue resolved by support representative.';

  const cleanAgentMsg = rawAgentMsg.replace(/^(namaste|hello|hi|hey|thanks|thank you)[^.!]*[.!]?/i, '').trim() || rawAgentMsg;

  return {
    title: `Solution: ${custMsg.slice(0, 55).trim()}`,
    contentChunk: `Question: ${custMsg}\n\nResolution: ${cleanAgentMsg}`
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
