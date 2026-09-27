import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, UserCheck, Sparkles, RefreshCw, ChevronDown, CheckCircle2, Brain, FileText, Plus, Lock, LogIn } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export default function ChatWidget({ currentUser, onLoginClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const customerName = currentUser?.name || '';
  const customerEmail = currentUser?.email || '';
  const [isInitialized, setIsInitialized] = useState(false);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [isEscalated, setIsEscalated] = useState(false);
  const [learnedBanner, setLearnedBanner] = useState(null);

  const [activeTab, setActiveTab] = useState('CHAT'); // 'CHAT' | 'MY_QUERIES'
  const [customerTickets, setCustomerTickets] = useState([]);

  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);

  // Helper to deduplicate messages in React state
  const mergeUniqueMessages = (prev, newMsg) => {
    if (!newMsg || !newMsg.message) return prev;

    const newIdStr = newMsg._id ? String(newMsg._id) : null;

    // Check if ID already exists
    if (newIdStr && prev.some(m => m._id && String(m._id) === newIdStr)) {
      return prev;
    }

    // Check if same sender and same text exists within 8 seconds
    const existingIndex = prev.findIndex(m =>
      m.sender === newMsg.sender &&
      m.message.trim() === newMsg.message.trim() &&
      Math.abs(new Date(m.timestamp || Date.now()) - new Date(newMsg.timestamp || Date.now())) < 8000
    );

    if (existingIndex !== -1) {
      // Replace existing temporary message with authoritative database object
      const updated = [...prev];
      updated[existingIndex] = newMsg;
      return updated;
    }

    return [...prev, newMsg];
  };

  const fetchCustomerTickets = async () => {
    if (!customerEmail) return;
    try {
      const res = await api.getCustomerTickets(customerEmail);
      if (res.data && res.data.data) {
        setCustomerTickets(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch customer tickets', e);
    }
  };

  useEffect(() => {
    if (currentUser && customerEmail) {
      fetchCustomerTickets();
    } else {
      setCustomerTickets([]);
      setTicket(null);
      setMessages([]);
      setIsInitialized(false);
    }
  }, [currentUser, customerEmail]);

  const handleSelectPastTicket = async (t) => {
    if (!currentUser) {
      onLoginClick();
      return;
    }
    try {
      setIsLoading(true);
      setTicket(t);
      const res = await api.getTicketById(t._id);
      if (res.data && res.data.chats) {
        setMessages(res.data.chats);
      }
      setIsInitialized(true);
      setIsEscalated(['PENDING_AGENT', 'IN_PROGRESS', 'PENDING_CUSTOMER_CONFIRMATION'].includes(t.status));
      if (t.status === 'PENDING_CUSTOMER_CONFIRMATION') {
        setShowResolutionPrompt(true);
      } else {
        setShowResolutionPrompt(false);
      }
      setActiveTab('CHAT');
    } catch (e) {
      console.error('Error selecting past ticket', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewQuery = async () => {
    if (!currentUser) {
      onLoginClick();
      return;
    }
    try {
      setIsLoading(true);
      const res = await api.startNewCustomerTicket(customerName, customerEmail);
      if (res.data && res.data.ticket) {
        setTicket(res.data.ticket);
        setMessages(res.data.chats || []);
        setIsInitialized(true);
        setIsEscalated(false);
        setShowResolutionPrompt(false);
        fetchCustomerTickets();
        setActiveTab('CHAT');
      }
    } catch (e) {
      console.error('Error starting new ticket', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_AGENT':
        return <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">PENDING QUEUE</span>;
      case 'IN_PROGRESS':
        return <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">HUMAN LIVE</span>;
      case 'PENDING_CUSTOMER_CONFIRMATION':
        return <span className="rounded bg-purple-50 border border-purple-200 px-2 py-0.5 text-[9px] font-bold text-purple-700 animate-pulse">AWAITING YES/NO</span>;
      case 'RESOLVED':
        return <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">RESOLVED</span>;
      default:
        return <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-700">AI ACTIVE</span>;
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isLoading, showResolutionPrompt]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (ticket && ticket._id) {
      const roomStr = String(ticket._id);
      socket.emit('join_room', roomStr);

      const handleReceiveMessage = (data) => {
        if (data && String(data.ticketId) === roomStr && data.chat) {
          setMessages((prev) => mergeUniqueMessages(prev, data.chat));
          if (data.ticketStatus === 'PENDING_CUSTOMER_CONFIRMATION') {
            setShowResolutionPrompt(true);
          }
        }
      };

      const handleResolutionProposed = (data) => {
        if (data && String(data.ticketId) === roomStr) {
          setTicket(data.ticket);
          setShowResolutionPrompt(true);
        }
      };

      const handleAiLearned = (data) => {
        if (data && String(data.ticketId) === roomStr) {
          setLearnedBanner(data.kbItem?.title || 'Human Agent Solution Learned');
        }
      };

      const handleUserTyping = (data) => {
        if (data && String(data.ticketId) === roomStr) {
          setIsTyping(true);
          setTypingUser(data.senderName || 'Human Agent');
        }
      };

      const handleUserStoppedTyping = (data) => {
        if (data && String(data.ticketId) === roomStr) {
          setIsTyping(false);
        }
      };

      socket.on('receive_message', handleReceiveMessage);
      socket.on('resolution_proposed', handleResolutionProposed);
      socket.on('ai_learned_new_knowledge', handleAiLearned);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stopped_typing', handleUserStoppedTyping);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('resolution_proposed', handleResolutionProposed);
        socket.off('ai_learned_new_knowledge', handleAiLearned);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stopped_typing', handleUserStoppedTyping);
      };
    }
  }, [ticket]);

  // Handle Customer Resolution Confirmation (YES / NO)
  const handleConfirmResolution = async (userChoice) => {
    if (!ticket) return;
    try {
      setIsLoading(true);
      setShowResolutionPrompt(false);

      const res = await api.confirmResolution(ticket._id, userChoice);

      if (userChoice === 'YES') {
        if (res.data && res.data.ticket) setTicket(res.data.ticket);
        setLearnedBanner(res.data?.learnedChunk?.title || 'Solution learned & saved into RAG Knowledge Base!');
      } else {
        if (res.data && res.data.ticket) setTicket(res.data.ticket);
        setIsEscalated(true);
      }
    } catch (err) {
      console.error('Failed to confirm resolution:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const recentQueries = [
    "What is your delivery timeline & free shipping policy?",
    "Can I pay via UPI Scanner or Cash on Delivery (COD)?",
    "How does the 7-day replacement and instant refund work?",
    "How do I track my order AWB status?",
    "How can I get a B2B GST Tax Invoice for Input Tax Credit?"
  ];

  // Auto initialize chat session
  const initSession = async () => {
    if (!currentUser) return null;
    try {
      setIsLoading(true);
      const res = await api.initCustomerTicket(customerName, customerEmail);
      if (res.data && res.data.ticket) {
        const activeTicket = res.data.ticket;
        setTicket(activeTicket);
        setMessages(res.data.chats || []);
        setIsInitialized(true);
        if (['PENDING_AGENT', 'IN_PROGRESS', 'PENDING_CUSTOMER_CONFIRMATION'].includes(activeTicket.status)) {
          setIsEscalated(true);
        }
        if (activeTicket.status === 'PENDING_CUSTOMER_CONFIRMATION') {
          setShowResolutionPrompt(true);
        }
        return activeTicket;
      }
    } catch (err) {
      console.error('Failed to init ticket', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Periodic polling fallback when escalated
  useEffect(() => {
    let interval = null;
    if (currentUser && isEscalated && ticket && ticket._id) {
      interval = setInterval(async () => {
        try {
          const res = await api.getTicketById(ticket._id);
          if (res.data && res.data.chats) {
            setMessages(res.data.chats);
          }
          if (res.data && res.data.ticket) {
            setTicket(res.data.ticket);
            if (res.data.ticket.status === 'PENDING_CUSTOMER_CONFIRMATION') {
              setShowResolutionPrompt(true);
            }
          }
        } catch (e) {}
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser, isEscalated, ticket]);

  const handleSendMessage = async (e, textOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!currentUser) {
      onLoginClick();
      return;
    }

    const userMsg = textOverride || inputText.trim();
    if (!userMsg) return;

    setInputText('');

    let currentTicket = ticket;
    if (!isInitialized || !currentTicket || !currentTicket._id) {
      currentTicket = await initSession();
    }
    if (!currentTicket || !currentTicket._id) return;

    const ticketIdStr = String(currentTicket._id);

    try {
      if (isEscalated || currentTicket.status === 'PENDING_AGENT' || currentTicket.status === 'IN_PROGRESS') {
        // Send directly to connected human agent
        const res = await api.sendMessage(ticketIdStr, {
          sender: 'CUSTOMER',
          senderName: customerName,
          message: userMsg
        });

        if (res.data && res.data.chat) {
          setMessages((prev) => mergeUniqueMessages(prev, res.data.chat));
        }
      } else {
        setIsLoading(true);

        // 1. Save customer message to DB & trigger room socket broadcast
        const custRes = await api.sendMessage(ticketIdStr, {
          sender: 'CUSTOMER',
          senderName: customerName,
          message: userMsg
        });

        if (custRes.data && custRes.data.chat) {
          setMessages((prev) => mergeUniqueMessages(prev, custRes.data.chat));
        }

        // 2. Query AI Agent RAG Vector Engine
        const ragRes = await api.queryRAG(userMsg);
        const botAnswer = ragRes.data.answer || "I'm checking our knowledge base...";

        // 3. Save Bot response to DB & trigger room socket broadcast
        const botRes = await api.sendMessage(ticketIdStr, {
          sender: 'BOT',
          senderName: 'SyncSupport AI Agent',
          message: botAnswer
        });

        if (botRes.data && botRes.data.chat) {
          setMessages((prev) => mergeUniqueMessages(prev, botRes.data.chat));
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Escalate to Human Agent Queue
  const handleEscalate = async () => {
    if (!currentUser) {
      onLoginClick();
      return;
    }
    if (!ticket) return;
    try {
      setIsLoading(true);
      await api.escalateTicket(ticket._id);
      setIsEscalated(true);
    } catch (err) {
      console.error('Escalation error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 font-sans">
      {isOpen ? (
        <div className="flex h-screen sm:h-[580px] w-screen sm:w-[420px] flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-900 p-4 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 shadow-xs">
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">SyncSupport Desk</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span>{currentUser ? (isEscalated ? 'Human Agent Connected' : 'AI Assistant Active') : 'Sign In Required'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!currentUser && (
                <button
                  onClick={onLoginClick}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub-header Navigation Tabs */}
          {currentUser && (
            <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('CHAT')}
                className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'CHAT'
                    ? 'border-slate-900 text-slate-900 font-bold bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Active Session {ticket?.ticketNumber ? `(${ticket.ticketNumber})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('MY_QUERIES');
                  fetchCustomerTickets();
                }}
                className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'MY_QUERIES'
                    ? 'border-slate-900 text-slate-900 font-bold bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>My History ({customerTickets.length})</span>
              </button>
            </div>
          )}

          {/* REQUIRE SIGN-IN OVERLAY CARD IF NOT LOGGED IN */}
          {!currentUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm">
                <Lock className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">Authentication Required</h4>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                  Please sign in or register to query our AI support assistant, track your tickets, and chat with live representatives.
                </p>
              </div>
              <button
                type="button"
                onClick={onLoginClick}
                className="w-full max-w-xs rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In / Register Account</span>
              </button>
            </div>
          ) : (
            <>
              {/* AI Learned New Knowledge Banner */}
              {learnedBanner && (
                <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 px-4 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
                  <Brain className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">AI Learned Solution: <strong>{learnedBanner}</strong></span>
                </div>
              )}

              {/* TAB 1: ACTIVE CHAT VIEW */}
              {activeTab === 'CHAT' && (
                <>
                  {/* Messages Container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {messages.map((msg, index) => {
                      const isUser = msg.sender === 'CUSTOMER';
                      const isBot = msg.sender === 'BOT';
                      return (
                        <div key={msg._id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              {msg.senderName || (isUser ? 'You' : isBot ? 'SyncSupport AI' : 'Human Agent')}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                              isUser
                                ? 'bg-emerald-600 text-white rounded-br-xs font-medium'
                                : isBot
                                ? 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                                : 'bg-slate-900 text-white border border-slate-800 rounded-bl-xs font-medium'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}

                    {/* Interactive Resolution Confirmation Prompt */}
                    {(showResolutionPrompt || ticket?.status === 'PENDING_CUSTOMER_CONFIRMATION') && (
                      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm text-center space-y-3 my-3">
                        <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span>Is your issue resolved?</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 leading-relaxed">
                          Selecting <strong>Yes</strong> will confirm resolution and train our AI knowledge base in real time!
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmResolution('YES')}
                            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Yes, Resolved!
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmResolution('NO')}
                            className="rounded-xl bg-rose-100 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-200 transition-all cursor-pointer"
                          >
                            No, Need Help
                          </button>
                        </div>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl w-fit border border-slate-200 shadow-2xs">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                        <span>AI Assistant querying knowledge base...</span>
                      </div>
                    )}

                    {isTyping && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl w-fit border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce"></span>
                        <span>{typingUser} is typing...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Escalation Trigger Button */}
                  {!isEscalated && (
                    <div className="border-t border-slate-200 bg-white p-2 text-center shrink-0">
                      <button
                        onClick={handleEscalate}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Escalate to Human Support Agent</span>
                      </button>
                    </div>
                  )}

                  {/* Suggested Queries */}
                  {!isEscalated && (
                    <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 shrink-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Suggested Queries:</span>
                      </div>
                      <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-1">
                        {recentQueries.slice(0, 3).map((queryText, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => handleSendMessage(e, queryText)}
                            className="text-left rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-all cursor-pointer truncate shadow-2xs"
                          >
                            "{queryText}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Footer */}
                  <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isEscalated ? "Message live human agent..." : "Ask your question..."}
                        className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* TAB 2: MY SUPPORT QUERIES LIST VIEW */}
              {activeTab === 'MY_QUERIES' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Start New Inquiry</h4>
                      <p className="text-[11px] text-slate-500">Creates a fresh session</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewQuery}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> New Query
                    </button>
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
                    Your Past & Active Queries
                  </div>

                  {customerTickets.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 space-y-2">
                      <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                      <p>No previous queries found.</p>
                    </div>
                  ) : (
                    customerTickets.map((t) => (
                      <div
                        key={t._id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800">{t.ticketNumber}</span>
                          {getStatusBadge(t.status)}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                          {t.summary || (t.createdAt ? `Inquiry on ${new Date(t.createdAt).toLocaleDateString()}` : 'Support Inquiry')}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>{new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <button
                            type="button"
                            onClick={() => handleSelectPastTicket(t)}
                            className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            {ticket?._id === t._id ? 'Active Session →' : 'View / Continue →'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            if (currentUser && !isInitialized) initSession();
          }}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all animate-pulse-ring cursor-pointer"
        >
          <MessageSquare className="h-6 w-6 text-emerald-400" />
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
        </button>
      )}
    </div>
  );
}
