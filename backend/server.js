const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const registerSocketHandlers = require('./socket/socketHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
connectDB();

// Register Socket Handlers
registerSocketHandlers(io);

// Expose io instance to Express app
app.set('io', io);

const path = require('path');

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rag', require('./routes/ragRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SyncSupport Enterprise Omnichannel Contact Center & AI Co-Pilot API',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend dist build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const startKeepAlive = require('./services/keepAlive');

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  SyncSupport Omnichannel Server Running on Port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
  
  // Start automated Keep-Alive daemon to prevent backend spin-down
  startKeepAlive();
});

