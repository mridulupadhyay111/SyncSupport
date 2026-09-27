const Ticket = require('../models/Ticket');
const Chat = require('../models/Chat');
const KnowledgeBase = require('../models/KnowledgeBase');
const { analyzeSentiment, generateSmartReplies, extractKnowledgeFromChat, generateEmbedding } = require('../services/aiService');

// Get all tickets
exports.getTickets = async (req, res) => {
  try {
    const { status, sentiment, search } = req.query;
    let query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (sentiment && sentiment !== 'ALL') {
      query.sentiment = sentiment;
    }
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Ticket.find(query).populate('assignedAgent', 'name email avatar status').sort({ createdAt: -1 });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create or retrieve active ticket for customer
exports.createTicket = async (req, res) => {
  try {
    const { customerName, customerEmail } = req.body;
    const name = customerName || 'Storefront Visitor';
    const email = customerEmail || 'customer@syncsupport.io';

    let ticket = await Ticket.findOne({
      customerEmail: email,
      status: { $in: ['BOT_HANDLED', 'PENDING_AGENT', 'IN_PROGRESS', 'PENDING_CUSTOMER_CONFIRMATION'] }
    }).sort({ createdAt: -1 });

    if (!ticket) {
      ticket = await Ticket.create({
        customerName: name,
        customerEmail: email,
        status: 'BOT_HANDLED'
      });

      // Initial Bot Greeting
      await Chat.create({
        ticketId: ticket._id,
        sender: 'BOT',
        senderName: 'SyncSupport AI Agent',
        message: `Hello ${name}! I am SyncSupport AI Agent. Ask me any question, and if I don't know the answer, I will escalate your session to a live human support agent.`
      });
    }

    const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });
    res.status(201).json({ success: true, ticket, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Force start a NEW ticket for customer
exports.startNewCustomerTicket = async (req, res) => {
  try {
    const { customerName, customerEmail } = req.body;
    const name = customerName || 'Storefront Visitor';
    const email = customerEmail || 'customer@syncsupport.io';

    const ticket = await Ticket.create({
      customerName: name,
      customerEmail: email,
      status: 'BOT_HANDLED'
    });

    const greetingChat = await Chat.create({
      ticketId: ticket._id,
      sender: 'BOT',
      senderName: 'SyncSupport AI Agent',
      message: `Hello ${name}! Starting a new support query ticket (${ticket.ticketNumber}). Ask me any question or select from recent queries below.`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_activity', { ticketId: ticket._id.toString(), sender: 'BOT', message: 'New ticket created' });
    }

    res.status(201).json({ success: true, ticket, chats: [greetingChat] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all tickets for a specific customer email
exports.getCustomerTickets = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ success: false, message: 'Customer email required' });

    const tickets = await Ticket.find({ customerEmail: email })
      .populate('assignedAgent', 'name email avatar status')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single ticket details
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate('assignedAgent', 'name email avatar status');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });

    const latestCustomerChat = [...chats].reverse().find(c => c.sender === 'CUSTOMER');
    let smartReplies = [];
    if (latestCustomerChat) {
      smartReplies = await generateSmartReplies(latestCustomerChat.message, chats);
    }

    res.json({ success: true, ticket, chats, smartReplies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Escalate ticket to human agent queue
exports.escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id, 
      { status: 'PENDING_AGENT' }, 
      { new: true }
    );

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const escalationChat = await Chat.create({
      ticketId: ticket._id,
      sender: 'BOT',
      senderName: 'System Escalation',
      message: '🚨 AI Agent could not fully resolve your request. Ticket escalated to Human Support Agent Queue.'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(ticket._id.toString()).emit('receive_message', { chat: escalationChat, ticketId: ticket._id });
      io.emit('new_ticket_pending', { ticketId: ticket._id, ticket });
    }

    res.json({ success: true, ticket, escalationChat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Send message to ticket
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, senderName, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ success: false, message: 'Sender and message required.' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const chat = await Chat.create({
      ticketId: ticket._id,
      sender,
      senderName: senderName || (sender === 'CUSTOMER' ? ticket.customerName : (req.user ? req.user.name : 'Human Agent')),
      message
    });

    if (sender === 'CUSTOMER') {
      const newSentiment = await analyzeSentiment(message);
      ticket.sentiment = newSentiment;
      await ticket.save();
    }

    const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });
    const smartReplies = await generateSmartReplies(message, chats);

    const io = req.app.get('io');
    if (io) {
      const ticketIdStr = ticket._id.toString();
      const payload = {
        chat,
        ticketId: ticketIdStr,
        ticketSentiment: ticket.sentiment,
        smartReplies,
        ticketStatus: ticket.status
      };
      io.to(ticketIdStr).emit('receive_message', payload);
      io.emit('ticket_activity', { ticketId: ticketIdStr, sender, message });
    }

    res.status(201).json({
      success: true,
      chat,
      ticketSentiment: ticket.sentiment,
      smartReplies
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update ticket metadata
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedAgent, sentiment, summary } = req.body;

    let updateFields = {};
    if (status) updateFields.status = status;
    if (assignedAgent !== undefined) updateFields.assignedAgent = assignedAgent;
    if (sentiment) updateFields.sentiment = sentiment;
    if (summary !== undefined) updateFields.summary = summary;

    const ticket = await Ticket.findByIdAndUpdate(id, updateFields, { new: true }).populate('assignedAgent', 'name email avatar status');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Propose resolution to customer
exports.proposeResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: 'PENDING_CUSTOMER_CONFIRMATION' },
      { new: true }
    ).populate('assignedAgent', 'name email avatar status');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const proposalChat = await Chat.create({
      ticketId: ticket._id,
      sender: 'BOT',
      senderName: 'SyncSupport Assistant',
      message: '📋 Support Agent has provided a resolution. Is your problem resolved? Please select Yes or No below.'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(ticket._id.toString()).emit('receive_message', { chat: proposalChat, ticketId: ticket._id, ticketStatus: ticket.status });
      io.to(ticket._id.toString()).emit('resolution_proposed', { ticketId: ticket._id, ticket });
      io.emit('ticket_activity', { ticketId: ticket._id, sender: 'BOT', message: 'Resolution proposed to customer.' });
    }

    res.json({ success: true, ticket, proposalChat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Customer confirms resolution (YES/NO) and triggers real-time RAG learning
exports.confirmResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { userChoice } = req.body; // 'YES' or 'NO'

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const io = req.app.get('io');

    if (userChoice === 'YES') {
      const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });
      const learnedKnowledge = await extractKnowledgeFromChat(chats);
      const embedding = await generateEmbedding(learnedKnowledge.contentChunk);

      const kbChunk = await KnowledgeBase.create({
        title: learnedKnowledge.title,
        contentChunk: learnedKnowledge.contentChunk,
        embedding: embedding,
        category: 'Agent Learned'
      });

      ticket.status = 'RESOLVED';
      ticket.summary = learnedKnowledge.contentChunk;
      await ticket.save();

      const customerChoiceChat = await Chat.create({
        ticketId: ticket._id,
        sender: 'CUSTOMER',
        senderName: ticket.customerName,
        message: 'Yes, my problem is resolved! Thank you.'
      });

      const systemChat = await Chat.create({
        ticketId: ticket._id,
        sender: 'BOT',
        senderName: 'SyncSupport AI Self-Learner',
        message: `✅ Issue RESOLVED and confirmed by customer!\n\n🧠 Real-Time RAG Learning Update: Solution stored as "${learnedKnowledge.title}". The AI Agent has learned this solution and will answer future similar queries automatically.`
      });

      const updatedTicket = await Ticket.findById(id).populate('assignedAgent', 'name email avatar status');

      if (io) {
        io.to(ticket._id.toString()).emit('receive_message', { chat: customerChoiceChat, ticketId: ticket._id });
        io.to(ticket._id.toString()).emit('receive_message', { chat: systemChat, ticketId: ticket._id });
        io.emit('ai_learned_new_knowledge', { kbItem: kbChunk, ticketId: ticket._id });
        io.emit('ticket_activity', { ticketId: ticket._id, sender: 'CUSTOMER', message: 'Customer confirmed resolution (YES).' });
      }

      return res.json({
        success: true,
        userChoice: 'YES',
        ticket: updatedTicket,
        learnedChunk: kbChunk,
        systemChat
      });
    } else {
      // Customer selected NO
      ticket.status = 'IN_PROGRESS';
      await ticket.save();

      const customerChoiceChat = await Chat.create({
        ticketId: ticket._id,
        sender: 'CUSTOMER',
        senderName: ticket.customerName,
        message: 'No, my problem is not resolved yet. I still need help.'
      });

      const systemChat = await Chat.create({
        ticketId: ticket._id,
        sender: 'BOT',
        senderName: 'SyncSupport Assistant',
        message: '⚠️ Customer indicated the issue is not fully resolved. Support session remains active.'
      });

      const updatedTicket = await Ticket.findById(id).populate('assignedAgent', 'name email avatar status');

      if (io) {
        io.to(ticket._id.toString()).emit('receive_message', { chat: customerChoiceChat, ticketId: ticket._id });
        io.to(ticket._id.toString()).emit('receive_message', { chat: systemChat, ticketId: ticket._id });
        io.emit('ticket_activity', { ticketId: ticket._id, sender: 'CUSTOMER', message: 'Customer rejected resolution (NO).' });
      }

      return res.json({
        success: true,
        userChoice: 'NO',
        ticket: updatedTicket
      });
    }
  } catch (err) {
    console.error('[Confirm Resolution Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// SELF-LEARNING FEEDBACK LOOP: RESOLVE & LEARN AS RAG
// =========================================================================
exports.resolveAndSummarizeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });

    // 1. Extract Q&A pair from human agent resolution
    const learnedKnowledge = await extractKnowledgeFromChat(chats);

    // 2. Generate 768-dim vector embedding for learned chunk
    const embedding = await generateEmbedding(learnedKnowledge.contentChunk);

    // 3. Save new chunk to KnowledgeBase vector collection
    const kbChunk = await KnowledgeBase.create({
      title: learnedKnowledge.title,
      contentChunk: learnedKnowledge.contentChunk,
      embedding: embedding,
      category: 'Agent Learned'
    });

    // 4. Update Ticket status to RESOLVED
    ticket.status = 'RESOLVED';
    ticket.summary = learnedKnowledge.contentChunk;
    await ticket.save();

    // 5. Create System Resolution Chat entry
    const systemChat = await Chat.create({
      ticketId: ticket._id,
      sender: 'BOT',
      senderName: 'SyncSupport AI Self-Learner',
      message: `✅ Ticket ${ticket.ticketNumber} RESOLVED by Human Agent.\n\n🧠 AI Self-Learning Update: Solution learned and stored in RAG Vector Index! AI Agent will now answer similar customer inquiries automatically.`
    });

    const updatedTicket = await Ticket.findById(id).populate('assignedAgent', 'name email avatar status');

    const io = req.app.get('io');
    if (io) {
      io.to(ticket._id.toString()).emit('receive_message', { chat: systemChat, ticketId: ticket._id });
      io.emit('ai_learned_new_knowledge', { kbItem: kbChunk, ticketId: ticket._id });
    }

    res.json({
      success: true,
      ticket: updatedTicket,
      summary: learnedKnowledge.contentChunk,
      learnedChunk: {
        id: kbChunk._id,
        title: kbChunk.title,
        contentChunk: kbChunk.contentChunk,
        category: kbChunk.category
      },
      systemChat
    });
  } catch (err) {
    console.error('[Resolve & Learn Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

