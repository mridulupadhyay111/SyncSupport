import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, UserCheck, Shield, Sparkles, LogIn, LogOut, Menu, X, ChevronRight, Activity } from 'lucide-react';

export default function Navbar({ activeAgentStatus, onStatusChange, currentUser, onLoginClick, onLogout }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/customer', label: 'Help Center & Storefront', icon: Bot },
    { path: '/agent', label: 'Support Agent Desk', icon: UserCheck },
    { path: '/admin', label: 'RAG Vector Index', icon: Shield }
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'AGENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link to="/customer" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 shadow-md group-hover:border-zinc-700 transition-colors">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-sans">
                SyncSupport
              </span>
              <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 border border-zinc-800 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">
              Omnichannel Contact Center & Knowledge Base
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/customer' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions / Auth & Agent Controls */}
        <div className="flex items-center gap-2.5">
          {location.pathname === '/agent' && currentUser && ['AGENT', 'ADMIN'].includes(currentUser.role) && (
            <select
              value={activeAgentStatus || 'ONLINE'}
              onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ONLINE">🟢 Online</option>
              <option value="BUSY">🟡 Busy</option>
              <option value="OFFLINE">🔴 Offline</option>
            </select>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-900/90 p-1.5 border border-zinc-800">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="h-7 w-7 rounded-lg object-cover border border-zinc-800"
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="block font-bold text-white leading-none truncate max-w-[110px]">{currentUser.name}</span>
                <span className={`inline-block mt-0.5 rounded px-1 py-0.2 text-[9px] font-bold border ${getRoleBadge(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">Navigation Portals</div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
