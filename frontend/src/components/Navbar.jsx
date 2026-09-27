import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, UserCheck, Shield, LogIn, LogOut, Menu, X, ChevronRight, Activity } from 'lucide-react';

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
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AGENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link to="/customer" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
                SyncSupport
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Omnichannel Contact Center & Knowledge Base
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 border border-slate-200/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/customer' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
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
              className="rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-slate-400"
            >
              <option value="ONLINE">🟢 Online</option>
              <option value="BUSY">🟡 Busy</option>
              <option value="OFFLINE">🔴 Offline</option>
            </select>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 border border-slate-200 shadow-xs">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="h-7 w-7 rounded-lg object-cover border border-slate-200"
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="block font-bold text-slate-900 leading-none truncate max-w-[110px]">{currentUser.name}</span>
                <span className={`inline-block mt-0.5 rounded px-1 py-0.2 text-[9px] font-bold border ${getRoleBadge(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-xl bg-white border border-slate-200 p-2 text-slate-600 hover:text-slate-900 shadow-xs"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 shadow-lg">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Navigation Portals</div>
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
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
