import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : (typeof window !== 'undefined' && (window.location.origin.includes('localhost:3000') || window.location.origin.includes('127.0.0.1:3000')))
        ? 'http://localhost:5000'
        : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to SyncSupport Server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });
  }
  return socket;
};
