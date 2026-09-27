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

    // Real-time typing indicators
    socket.on('typing', (data) => {
      if (data && data.ticketId) {
        socket.to(String(data.ticketId)).emit('user_typing', data);
      }
    });

    socket.on('stop_typing', (data) => {
      if (data && data.ticketId) {
        socket.to(String(data.ticketId)).emit('user_stopped_typing', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = registerSocketHandlers;
