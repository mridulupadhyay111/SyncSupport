import React, { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, Shield, User, Headset, KeyRound } from 'lucide-react';
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
    if (e) e.preventDefault();
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

  const loginWithDemo = async (demoEmail) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.login(demoEmail, 'SyncSupport2026!');
      if (res.data && res.data.user) {
        localStorage.setItem('sync_token', res.data.token);
        localStorage.setItem('sync_user', JSON.stringify(res.data.user));
        if (onAuthSuccess) onAuthSuccess(res.data.user);
        onClose();
      }
    } catch (err) {
      setError('Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative overflow-hidden text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-xs">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {isLogin ? 'SyncSupport Authentication' : 'Create New Account'}
            </h2>
            <p className="text-xs text-slate-500">
              {isLogin ? 'Sign in to access AI queries, support sessions, and staff desks' : 'Register a new customer or staff account'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 mb-5 text-xs font-semibold">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`rounded-lg py-2 transition-all cursor-pointer ${
              isLogin ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="h-3.5 w-3.5 inline mr-1.5" />
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`rounded-lg py-2 transition-all cursor-pointer ${
              !isLogin ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 inline mr-1.5" />
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="CUSTOMER">Customer (Store Visitor)</option>
                <option value="AGENT">Support Agent (Human Executive)</option>
                <option value="ADMIN">System Admin (RAG Manager)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer mt-1"
          >
            {isLoading ? 'Authenticating...' : isLogin ? 'Sign In to Portal' : 'Complete Registration'}
          </button>
        </form>

        {/* Quick Demo Instant Logins */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 text-center">
            ⚡ Quick 1-Click Demo Login
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => loginWithDemo('customer@syncsupport.io')}
              className="rounded-xl border border-slate-200 bg-white p-2 text-center hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <User className="h-4 w-4 text-sky-600 mx-auto mb-1" />
              <span className="block font-bold text-[11px] text-slate-800">Customer</span>
            </button>
            <button
              onClick={() => loginWithDemo('rohan@syncsupport.io')}
              className="rounded-xl border border-slate-200 bg-white p-2 text-center hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Headset className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <span className="block font-bold text-[11px] text-slate-800">Agent</span>
            </button>
            <button
              onClick={() => loginWithDemo('admin@syncsupport.io')}
              className="rounded-xl border border-slate-200 bg-white p-2 text-center hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Shield className="h-4 w-4 text-purple-600 mx-auto mb-1" />
              <span className="block font-bold text-[11px] text-slate-800">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
