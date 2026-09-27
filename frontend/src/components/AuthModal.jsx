import React, { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await api.login(email, password);
      } else {
        res = await api.register({ name, email, password, role });
      }

      if (res.data && res.data.user) {
        localStorage.setItem('sync_token', res.data.token);
        localStorage.setItem('sync_user', JSON.stringify(res.data.user));
        if (onAuthSuccess) onAuthSuccess(res.data.user);
        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoRole) => {
    setError(null);
    if (demoRole === 'CUSTOMER') {
      setIsLogin(true);
      setEmail('customer@syncsupport.io');
      setPassword('SyncSupport2026!');
    } else if (demoRole === 'AGENT') {
      setIsLogin(true);
      setEmail('rohan@syncsupport.io');
      setPassword('SyncSupport2026!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isLogin ? 'Customer & Support Login' : 'Create New Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {isLogin ? 'Sign in to access your chat session & live assistance' : 'Register to start live AI & Agent support'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6 text-xs font-semibold">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`rounded-lg py-2 transition-all ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="h-3.5 w-3.5 inline mr-1.5" />
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`rounded-lg py-2 transition-all ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 inline mr-1.5" />
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/60 p-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CUSTOMER">Customer (Store Visitor)</option>
                <option value="AGENT">Support Agent (Human Executive)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all mt-2"
          >
            {isLoading ? 'Processing...' : isLogin ? 'Sign In to Portal' : 'Complete Registration'}
          </button>
        </form>

        {/* Quick Demo Fill Credentials */}
        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
            ⚡ Quick One-Click Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fillDemoAccount('CUSTOMER')}
              className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-indigo-500 transition-all cursor-pointer"
            >
              <span className="block font-bold text-xs text-indigo-300">👤 Demo Customer</span>
              <span className="block text-[10px] text-slate-400 font-mono truncate">customer@syncsupport.io</span>
            </button>
            <button
              onClick={() => fillDemoAccount('AGENT')}
              className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-emerald-500 transition-all cursor-pointer"
            >
              <span className="block font-bold text-xs text-emerald-300">🎧 Demo Agent</span>
              <span className="block text-[10px] text-slate-400 font-mono truncate">rohan@syncsupport.io</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
