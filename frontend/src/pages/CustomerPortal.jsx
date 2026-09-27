import React from 'react';
import { Sparkles, Shield, Cpu, Zap, ArrowRight, CheckCircle2, Terminal, Code2, Globe, Server } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';

export default function CustomerPortal({ currentUser, onLoginClick }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/0 blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex flex-col justify-center items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-6 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
          <span>Indigenous Indian E-Commerce Support Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Power Your Customer Experience with <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
            Gemini 2.5 RAG & Real-Time Agents
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Welcome to <strong className="text-slate-200">SyncSupport Storefront</strong>. Test instant AI grounded responses, vector search precision, and seamless human agent escalation.
        </p>

        {/* User Account Login Banner */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 backdrop-blur-xl shadow-xl flex items-center justify-between text-left">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="h-10 w-10 rounded-xl object-cover border border-indigo-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{currentUser.name}</span>
                  <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Logged In ({currentUser.role})
                  </span>
                </div>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <span className="font-bold text-xs text-white block">Sign In for Personalized Support</span>
                <span className="text-[11px] text-slate-400 block">Link your order history & save support sessions</span>
              </div>
              <button
                onClick={onLoginClick}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer shrink-0"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl text-left">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl hover:border-indigo-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">768-Dim Vector RAG</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Knowledge base chunks are embedded with <code className="text-indigo-300 font-mono text-[11px]">text-embedding-004</code> and matched using MongoDB Atlas Vector Search.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl hover:border-indigo-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Bi-Directional WebSockets</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Instant sub-10ms event broadcasts for live customer queues, agent chat room joins, typing indicators, and status sync.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl hover:border-indigo-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Agent AI Co-Pilot</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Real-time customer sentiment gauge, click-to-reply smart chips, and automatic 2-sentence ticket resolution summaries.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Chat Widget Component */}
      <ChatWidget currentUser={currentUser} onLoginClick={onLoginClick} />
    </div>
  );
}
