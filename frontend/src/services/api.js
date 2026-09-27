import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : '/api';

const client = axios.create({
  baseURL: API_BASE
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const api = {
  // Auth
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (data) => client.post('/auth/register', data),
  getMe: (token) => client.get('/auth/me', { headers: { Authorization: `Bearer ${token || localStorage.getItem('sync_token')}` } }),
  updateStatus: (status, token) => client.put('/auth/status', { status }, { headers: { Authorization: `Bearer ${token || localStorage.getItem('sync_token')}` } }),

  // RAG & Knowledge Base
  queryRAG: (query) => client.post('/rag/query', { query }),
  ingestDocument: (title, content, category) => client.post('/rag/ingest', { title, content, category }),
  getKnowledgeBase: () => client.get('/rag/list'),
  deleteKnowledgeChunk: (id) => client.delete(`/rag/${id}`),

  // Tickets & Chat
  getTickets: (params = {}) => client.get('/tickets', { params }),
  initCustomerTicket: (customerName, customerEmail) => client.post('/tickets/customer-init', { customerName, customerEmail }),
  startNewCustomerTicket: (customerName, customerEmail) => client.post('/tickets/customer-new', { customerName, customerEmail }),
  getCustomerTickets: (email) => client.get(`/tickets/customer/${encodeURIComponent(email)}`),
  getTicketById: (id) => client.get(`/tickets/${id}`),
  escalateTicket: (id) => client.post(`/tickets/${id}/escalate`),
  sendMessage: (id, data) => client.post(`/tickets/${id}/message`, data),
  updateTicket: (id, data) => client.put(`/tickets/${id}`, data),
  proposeResolution: (id) => client.post(`/tickets/${id}/propose-resolution`),
  confirmResolution: (id, userChoice) => client.post(`/tickets/${id}/confirm-resolution`, { userChoice }),
  resolveAndSummarize: (id) => client.post(`/tickets/${id}/resolve-summarize`)
};
