import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import CustomerPortal from './pages/CustomerPortal';
import AgentPortal from './pages/AgentPortal';
import AdminPortal from './pages/AdminPortal';

import { api } from './services/api';
import { getSocket } from './services/socket';

export default function App() {
  const [activeAgentStatus, setActiveAgentStatus] = useState('ONLINE');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('sync_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  // Server Keep-Alive & Auto-Reconnect Heartbeat
  useEffect(() => {
    // Ping backend /api/health every 4 minutes to ensure backend stays warm while app is open
    const heartbeatInterval = setInterval(() => {
      api.checkHealth().catch(() => {});
    }, 4 * 60 * 1000);

    // Initial warm-up ping
    api.checkHealth().catch(() => {});

    // Handle tab focus or network reconnect
    const handleFocusOrOnline = () => {
      api.checkHealth().catch(() => {});
      const socket = getSocket();
      if (socket && !socket.connected) {
        socket.connect();
      }
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sync_token');
    localStorage.removeItem('sync_user');
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
        <Navbar 
          activeAgentStatus={activeAgentStatus} 
          onStatusChange={setActiveAgentStatus}
          currentUser={currentUser}
          onLoginClick={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />
        <div className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/customer" replace />} />
            <Route 
              path="/customer" 
              element={
                <CustomerPortal 
                  currentUser={currentUser} 
                  onLoginClick={() => setIsAuthModalOpen(true)} 
                />
              } 
            />
            <Route 
              path="/agent" 
              element={
                <AgentPortal 
                  currentUser={currentUser} 
                  onLoginClick={() => setIsAuthModalOpen(true)}
                  activeAgentStatus={activeAgentStatus}
                  onStatusChange={setActiveAgentStatus}
                />
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminPortal 
                  currentUser={currentUser} 
                  onLoginClick={() => setIsAuthModalOpen(true)} 
                />
              } 
            />
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Routes>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(user) => setCurrentUser(user)}
        />
      </div>
    </Router>
  );
}
