const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  sender: { type: String, enum: ['CUSTOMER', 'BOT', 'AGENT'], required: true },
  senderName: { type: String, default: 'System' },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
