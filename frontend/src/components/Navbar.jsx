import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, UserCheck, Shield, Sparkles, Activity, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar({ activeAgentStatus, onStatusChange, currentUser, onLoginClick, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/customer', label: 'Storefront & Customer Chat', icon: Bot, badge: 'Widget Demo' },
    { path: '/agent', label: 'Agent Workspace & AI Co-Pilot', icon: UserCheck, badge: 'Live Workspace' },
    { path: '/admin', label: 'RAG Knowledge Dashboard', icon: Shield, badge: 'Vector Search' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                SyncSupport
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                Enterprise v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Omnichannel Contact Center & Gemini AI Co-Pilot
            </p>
          </div>
        </div>

        {/* Portal Navigation Links */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/customer' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action / User Login & Status */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-1.5 border border-slate-800">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="h-7 w-7 rounded-lg object-cover border border-slate-700"
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="block font-bold text-white leading-tight">{currentUser.name}</span>
                <span className="block text-[10px] text-indigo-400 leading-none">{currentUser.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Customer Login</span>
            </button>
          )}

          {location.pathname === '/agent' && (
            <div className="flex items-center gap-2">
              <select
                value={activeAgentStatus || 'ONLINE'}
                onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
                className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ONLINE">🟢 Online</option>
                <option value="BUSY">🟡 Busy</option>
                <option value="OFFLINE">🔴 Offline</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
