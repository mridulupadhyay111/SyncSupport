import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : '/api';

export const api = {
  // Auth
  login: (email, password) => axios.post(`${API_BASE}/auth/login`, { email, password }),
  register: (data) => axios.post(`${API_BASE}/auth/register`, data),
  getMe: (token) => axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
  updateStatus: (status, token) => axios.put(`${API_BASE}/auth/status`, { status }, { headers: { Authorization: `Bearer ${token}` } }),

  // RAG & Knowledge Base
  queryRAG: (query) => axios.post(`${API_BASE}/rag/query`, { query }),
  ingestDocument: (title, content, category) => axios.post(`${API_BASE}/rag/ingest`, { title, content, category }),
  getKnowledgeBase: () => axios.get(`${API_BASE}/rag/list`),
  deleteKnowledgeChunk: (id) => axios.delete(`${API_BASE}/rag/${id}`),

  // Tickets & Chat
  getTickets: (params = {}) => axios.get(`${API_BASE}/tickets`, { params }),
  initCustomerTicket: (customerName, customerEmail) => axios.post(`${API_BASE}/tickets/customer-init`, { customerName, customerEmail }),
  startNewCustomerTicket: (customerName, customerEmail) => axios.post(`${API_BASE}/tickets/customer-new`, { customerName, customerEmail }),
  getCustomerTickets: (email) => axios.get(`${API_BASE}/tickets/customer/${encodeURIComponent(email)}`),
  getTicketById: (id) => axios.get(`${API_BASE}/tickets/${id}`),
  escalateTicket: (id) => axios.post(`${API_BASE}/tickets/${id}/escalate`),
  sendMessage: (id, data) => axios.post(`${API_BASE}/tickets/${id}/message`, data),
  updateTicket: (id, data) => axios.put(`${API_BASE}/tickets/${id}`, data),
  proposeResolution: (id) => axios.post(`${API_BASE}/tickets/${id}/propose-resolution`),
  confirmResolution: (id, userChoice) => axios.post(`${API_BASE}/tickets/${id}/confirm-resolution`, { userChoice }),
  resolveAndSummarize: (id) => axios.post(`${API_BASE}/tickets/${id}/resolve-summarize`)
};
