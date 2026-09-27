const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: { 
    type: String, 
    unique: true, 
    default: () => 'SYNC-' + Math.floor(100000 + Math.random() * 900000) 
  },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['BOT_HANDLED', 'PENDING_AGENT', 'IN_PROGRESS', 'PENDING_CUSTOMER_CONFIRMATION', 'RESOLVED'], 
    default: 'BOT_HANDLED' 
  },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sentiment: { 
    type: String, 
    enum: ['Satisfied', 'Neutral', 'Frustrated'], 
    default: 'Neutral' 
  },
  summary: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
