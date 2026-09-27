import React, { useState } from 'react';
import { Sparkles, Shield, Cpu, Zap, ArrowRight, CheckCircle2, Search, Truck, CreditCard, RefreshCw, FileText, HelpCircle, Package, MessageSquare, Activity } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';

export default function CustomerPortal({ currentUser, onLoginClick }) {
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      title: 'Shipping & Delivery',
      desc: 'Free delivery over ₹499, pincode serviceability, and 2-4 day metro SLA',
      icon: Truck,
      badge: 'Fast Delivery'
    },
    {
      title: 'Payments & UPI',
      desc: 'Instant UPI scanners, Cash on Delivery (COD), RuPay, & Credit Cards',
      icon: CreditCard,
      badge: 'Zero Charge'
    },
    {
      title: 'Returns & Refunds',
      desc: '7-day doorstep pickup, instant UPI refunds, and unboxing guidelines',
      icon: RefreshCw,
      badge: 'Instant Refund'
    },
    {
      title: 'GST Tax Invoicing',
      desc: 'Input Tax Credit (ITC) with 15-digit B2B GSTIN downloads',
      icon: FileText,
      badge: 'B2B Enabled'
    }
  ];

  const popularTopics = [
    "What is the delivery timeline for my pincode?",
    "Can I pay via UPI Scanner during Cash on Delivery?",
    "How do I request a 7-day doorstep replacement?",
    "How to download B2B GST Tax Invoice for ITC?"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Subtle Light Top Highlight Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[350px] bg-gradient-to-b from-slate-200/50 to-transparent blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span>Enterprise Customer Support Center</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            How can we help you today?
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Search our knowledge base for instant answers or sign in to start a live support session with our team.
          </p>

          {/* Help Search Bar */}
          <div className="relative max-w-xl mx-auto pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, shipping policy, returns, GST invoice..."
                className="w-full rounded-2xl bg-white border border-slate-300 pl-11 pr-4 py-3.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-slate-500 font-medium">Popular:</span>
            {popularTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => setSearchQuery(topic)}
                className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition-all cursor-pointer truncate max-w-[240px] shadow-2xs"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* User Account Login Status Card */}
        <div className="w-full max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          {currentUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.name}
                  className="h-11 w-11 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{currentUser.name}</span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Authenticated ({currentUser.role})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Ready for AI & Live Support</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-sm text-slate-900 block">Sign In Required for Support Assistant</span>
                <span className="text-xs text-slate-600 block mt-0.5">
                  Sign in to ask questions, track order history, and connect with live support agents.
                </span>
              </div>
              <button
                onClick={onLoginClick}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        {/* Help Categories Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Support Knowledge Categories</h2>
            <span className="text-xs text-slate-500">Self-Service Documentation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all space-y-3 group shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-900 group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {cat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cat.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Omnichannel Platform Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Cpu className="h-4 w-4 text-emerald-600" />
              <span>Grounded Knowledge Base</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our AI assistant is grounded with direct e-commerce policies, providing precise, verifiable answers to customer queries.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Zap className="h-4 w-4 text-amber-600" />
              <span>Real-Time Support Escalation</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your inquiry requires custom assistance, your session transfers instantly to an available human support executive.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Shield className="h-4 w-4 text-sky-600" />
              <span>Continuous AI Self-Learning</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a support executive resolves an inquiry, our system updates its vector knowledge base to handle similar questions automatically.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Chat Widget Component */}
      <ChatWidget currentUser={currentUser} onLoginClick={onLoginClick} />
    </div>
  );
}
