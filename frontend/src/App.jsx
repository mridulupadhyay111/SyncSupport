import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import CustomerPortal from './pages/CustomerPortal';
import AgentPortal from './pages/AgentPortal';
import AdminPortal from './pages/AdminPortal';

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

  const handleLogout = () => {
    localStorage.removeItem('sync_token');
    localStorage.removeItem('sync_user');
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
