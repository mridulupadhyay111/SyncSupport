const Chat = require('../models/Chat');
const Ticket = require('../models/Ticket');
const KnowledgeBase = require('../models/KnowledgeBase');
const { analyzeSentiment, generateSmartReplies, extractKnowledgeFromChat, generateEmbedding } = require('../services/aiService');

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join_room', (ticketId) => {
      if (ticketId) {
        const roomStr = String(ticketId);
        socket.join(roomStr);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${roomStr}`);
      }
    });

    socket.on('leave_room', (ticketId) => {
      if (ticketId) {
        socket.leave(String(ticketId));
      }
    });

    // Handle real-time chat messaging
    socket.on('send_message', async (data) => {
      const { ticketId, sender, senderName, message } = data;
      try {
        const roomStr = String(ticketId);
        const chat = await Chat.create({
          ticketId,
          sender,
          senderName: senderName || 'User',
          message
        });

        let ticketSentiment = 'Neutral';
        let smartReplies = [];

        if (sender === 'CUSTOMER') {
          ticketSentiment = await analyzeSentiment(message);
          await Ticket.findByIdAndUpdate(ticketId, { sentiment: ticketSentiment });
        }

        const chats = await Chat.find({ ticketId }).sort({ timestamp: 1 });
        smartReplies = await generateSmartReplies(message, chats);

        io.to(roomStr).emit('receive_message', {
          chat,
          ticketId: roomStr,
          ticketSentiment,
          smartReplies
        });

        io.emit('ticket_activity', { ticketId: roomStr, sender, message });
      } catch (err) {
        console.error('[Socket Error on send_message]', err.message);
      }
    });

    // Customer Escalation Event
    socket.on('escalate_ticket', async (data) => {
      const { ticketId } = data;
      try {
        const ticket = await Ticket.findByIdAndUpdate(
          ticketId,
          { status: 'PENDING_AGENT' },
          { new: true }
        );

        const escalationChat = await Chat.create({
          ticketId,
          sender: 'BOT',
          senderName: 'System Escalation',
          message: '🚨 AI Agent could not fully resolve customer query. Session escalated to Human Agent Queue.'
        });

        io.to(ticketId).emit('receive_message', {
          chat: escalationChat,
          ticketId
        });

        io.emit('new_ticket_pending', {
          ticketId,
          ticket
        });
      } catch (err) {
        console.error('[Socket Error on escalate_ticket]', err.message);
      }
    });

    // Human Agent Proposes Resolution
    socket.on('propose_resolution', async (data) => {
      const { ticketId } = data;
      try {
        const ticket = await Ticket.findByIdAndUpdate(ticketId, { status: 'PENDING_CUSTOMER_CONFIRMATION' }, { new: true });
        if (!ticket) return;

        const proposalChat = await Chat.create({
          ticketId,
          sender: 'BOT',
          senderName: 'SyncSupport Assistant',
          message: '📋 Support Agent has provided a resolution. Is your problem resolved? Please select Yes or No below.'
        });

        io.to(ticketId).emit('receive_message', { chat: proposalChat, ticketId, ticketStatus: ticket.status });
        io.to(ticketId).emit('resolution_proposed', { ticketId, ticket });
        io.emit('ticket_activity', { ticketId, sender: 'BOT', message: 'Resolution proposed to customer.' });
      } catch (err) {
        console.error('[Socket Error on propose_resolution]', err.message);
      }
    });

    // Customer Confirms Resolution (YES or NO)
    socket.on('confirm_resolution', async (data) => {
      const { ticketId, userChoice } = data;
      try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return;

        if (userChoice === 'YES') {
          const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });
          const learned = await extractKnowledgeFromChat(chats);
          const embedding = await generateEmbedding(learned.contentChunk);

          const kbItem = await KnowledgeBase.create({
            title: learned.title,
            contentChunk: learned.contentChunk,
            embedding: embedding,
            category: 'Agent Learned'
          });

          ticket.status = 'RESOLVED';
          ticket.summary = learned.contentChunk;
          await ticket.save();

          const custChat = await Chat.create({
            ticketId: ticket._id,
            sender: 'CUSTOMER',
            senderName: ticket.customerName,
            message: 'Yes, my problem is resolved! Thank you.'
          });

          const systemChat = await Chat.create({
            ticketId: ticket._id,
            sender: 'BOT',
            senderName: 'SyncSupport AI Self-Learner',
            message: `✅ Issue RESOLVED and confirmed by customer!\n\n🧠 Real-Time RAG Learning Update: Solution stored as "${learned.title}". The AI Agent has learned this solution and will answer future similar queries automatically.`
          });

          io.to(ticketId).emit('receive_message', { chat: custChat, ticketId });
          io.to(ticketId).emit('receive_message', { chat: systemChat, ticketId });
          io.emit('ai_learned_new_knowledge', { kbItem, ticketId });
          io.emit('ticket_activity', { ticketId, sender: 'CUSTOMER', message: 'Customer confirmed resolution (YES).' });
        } else {
          ticket.status = 'IN_PROGRESS';
          await ticket.save();

          const custChat = await Chat.create({
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

          io.to(ticketId).emit('receive_message', { chat: custChat, ticketId });
          io.to(ticketId).emit('receive_message', { chat: systemChat, ticketId });
          io.emit('ticket_activity', { ticketId, sender: 'CUSTOMER', message: 'Customer rejected resolution (NO).' });
        }
      } catch (err) {
        console.error('[Socket Error on confirm_resolution]', err.message);
      }
    });

    // Human Agent Resolves Ticket & Learns RAG Solution
    socket.on('resolve_and_learn', async (data) => {
      const { ticketId } = data;
      try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return;

        const chats = await Chat.find({ ticketId: ticket._id }).sort({ timestamp: 1 });
        const learned = await extractKnowledgeFromChat(chats);

        const embedding = await generateEmbedding(learned.contentChunk);
        const kbItem = await KnowledgeBase.create({
          title: learned.title,
          contentChunk: learned.contentChunk,
          embedding: embedding,
          category: 'Agent Learned'
        });

        ticket.status = 'RESOLVED';
        ticket.summary = learned.contentChunk;
        await ticket.save();

        const systemChat = await Chat.create({
          ticketId: ticket._id,
          sender: 'BOT',
          senderName: 'SyncSupport AI Self-Learner',
          message: `🧠 Solution Learned from Human Agent! Saved into Vector Search index as "${learned.title}". AI will now answer similar customer queries automatically!`
        });

        io.to(ticketId).emit('receive_message', {
          chat: systemChat,
          ticketId
        });

        // Broadcast to all portals that AI learned new knowledge
        io.emit('ai_learned_new_knowledge', {
          kbItem,
          ticketId
        });
      } catch (err) {
        console.error('[Socket Error on resolve_and_learn]', err.message);
      }
    });

    socket.on('typing', (data) => {
      socket.to(data.ticketId).emit('user_typing', data);
    });

    socket.on('stop_typing', (data) => {
      socket.to(data.ticketId).emit('user_stopped_typing', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = registerSocketHandlers;
