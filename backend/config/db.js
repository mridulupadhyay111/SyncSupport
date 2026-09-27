const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/syncsupport';
    const conn = await mongoose.connect(connStr);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB at ${process.env.MONGO_URI || 'localhost'}. ${error.message}`);
    console.warn(`[Database Info] Using fallback in-memory database simulation mode.`);
  }
};

module.exports = connectDB;
