import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, UserCheck, Sparkles, RefreshCw, ChevronDown, CheckCircle2, Brain, FileText, Plus } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export default function ChatWidget({ currentUser, onLoginClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const customerName = currentUser?.name || 'Customer Visitor';
  const customerEmail = currentUser?.email || 'customer@syncsupport.io';
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
    if (customerEmail) {
      fetchCustomerTickets();
    }
  }, [customerEmail]);

  const handleSelectPastTicket = async (t) => {
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
        return <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">PENDING QUEUE</span>;
      case 'IN_PROGRESS':
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold text-blue-400">HUMAN LIVE</span>;
      case 'PENDING_CUSTOMER_CONFIRMATION':
        return <span className="rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[9px] font-bold text-purple-400 animate-pulse">AWAITING YES/NO</span>;
      case 'RESOLVED':
        return <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">RESOLVED & LEARNED</span>;
      default:
        return <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold text-indigo-400">AI ACTIVE</span>;
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
          setMessages((prev) => {
            if (prev.some(m => String(m._id) === String(data.chat._id))) return prev;
            return [...prev, data.chat];
          });
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
      socketRef.current?.emit('confirm_resolution', { ticketId: ticket._id, userChoice });

      if (userChoice === 'YES') {
        if (res.data && res.data.ticket) setTicket(res.data.ticket);
        setLearnedBanner(res.data?.learnedChunk?.title || 'Solution learned & saved into RAG Knowledge Base in real time!');
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

  // Periodic polling fallback when escalated to ensure human agent replies reflect immediately
  useEffect(() => {
    let interval = null;
    if (isEscalated && ticket && ticket._id) {
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
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isEscalated, ticket]);

  const handleSendMessage = async (e, textOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const userMsg = textOverride || inputText.trim();
    if (!userMsg) return;

    setInputText('');

    let currentTicket = ticket;
    if (!isInitialized || !currentTicket || !currentTicket._id) {
      currentTicket = await initSession();
    }
    if (!currentTicket || !currentTicket._id) return;

    const ticketIdStr = String(currentTicket._id);

    // Optimistically render customer message immediately
    const tempMsg = {
      _id: Date.now().toString(),
      sender: 'CUSTOMER',
      senderName: customerName,
      message: userMsg,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);

    // Socket real-time emit
    socketRef.current?.emit('send_message', {
      ticketId: ticketIdStr,
      sender: 'CUSTOMER',
      senderName: customerName,
      message: userMsg
    });

    try {
      if (isEscalated || currentTicket.status === 'PENDING_AGENT' || currentTicket.status === 'IN_PROGRESS') {
        // Send directly to connected human agent
        const res = await api.sendMessage(ticketIdStr, {
          sender: 'CUSTOMER',
          senderName: customerName,
          message: userMsg
        });

        if (res.data && res.data.chat) {
          setMessages((prev) => {
            const filtered = prev.filter(m => m._id !== tempMsg._id);
            if (filtered.some(m => String(m._id) === String(res.data.chat._id))) return filtered;
            return [...filtered, res.data.chat];
          });
        }
      } else {
        setIsLoading(true);

        // 1. Save customer message to DB
        await api.sendMessage(ticketIdStr, {
          sender: 'CUSTOMER',
          senderName: customerName,
          message: userMsg
        });

        // 2. Query AI Agent RAG Vector Engine
        const ragRes = await api.queryRAG(userMsg);
        const botAnswer = ragRes.data.answer || "I'm checking our knowledge base...";

        // 3. Save Bot response to DB
        const botRes = await api.sendMessage(ticketIdStr, {
          sender: 'BOT',
          senderName: 'SyncSupport AI Agent',
          message: botAnswer
        });

        if (botRes.data && botRes.data.chat) {
          setMessages((prev) => {
            const exists = prev.some(m => String(m._id) === String(botRes.data.chat._id));
            if (exists) return prev;
            return [...prev, botRes.data.chat];
          });
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
    if (!ticket) return;
    try {
      setIsLoading(true);
      await api.escalateTicket(ticket._id);
      setIsEscalated(true);

      socketRef.current?.emit('escalate_ticket', { ticketId: ticket._id });

      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(),
          sender: 'BOT',
          senderName: 'System Queue',
          message: '🚨 AI Agent could not fully resolve your query. Ticket escalated to Human Agent Queue. A human support agent will join shortly!'
        }
      ]);
    } catch (err) {
      console.error('Escalation error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen ? (
        <div className="flex h-[580px] w-[380px] sm:w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Bot className="h-6 w-6 text-white" />
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm">SyncSupport AI Agent</h3>
                <div className="flex items-center gap-1.5 text-xs text-indigo-100">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span>{isEscalated ? 'Connected to Human Agent' : 'Self-Learning RAG Active'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!currentUser && (
                <button
                  onClick={onLoginClick}
                  className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition-all"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub-header Navigation Tabs */}
          <div className="grid grid-cols-2 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('CHAT')}
              className={`py-2 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'CHAT'
                  ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Active Chat {ticket?.ticketNumber ? `(${ticket.ticketNumber})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('MY_QUERIES');
                fetchCustomerTickets();
              }}
              className={`py-2 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'MY_QUERIES'
                  ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>My Queries ({customerTickets.length})</span>
            </button>
          </div>

          {/* AI Learned New Knowledge Banner */}
          {learnedBanner && (
            <div className="bg-emerald-950/90 border-b border-emerald-500/30 p-2.5 px-4 text-emerald-200 text-xs flex items-center gap-2 shrink-0">
              <Brain className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="truncate">AI Learned Solution: <strong>{learnedBanner}</strong></span>
            </div>
          )}

          {/* TAB 1: ACTIVE CHAT VIEW */}
          {activeTab === 'CHAT' && (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                {messages.map((msg, index) => {
                  const isUser = msg.sender === 'CUSTOMER';
                  const isBot = msg.sender === 'BOT';
                  return (
                    <div key={msg._id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {msg.senderName || (isUser ? 'You' : isBot ? 'SyncSupport AI Agent' : 'Human Agent')}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : isBot
                            ? 'bg-purple-950/90 text-purple-100 border border-purple-800/60 rounded-bl-xs'
                            : 'bg-indigo-600 text-white rounded-bl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}

                {/* Interactive Resolution Confirmation Prompt */}
                {(showResolutionPrompt || ticket?.status === 'PENDING_CUSTOMER_CONFIRMATION') && (
                  <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/90 p-4 shadow-xl text-center space-y-3 my-3">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Is your problem resolved?</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Our Support Agent provided a resolution. If resolved, selecting <strong>Yes</strong> will train our AI RAG Knowledge Base in real time for future inquiries!
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleConfirmResolution('YES')}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Yes, Resolved!
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmResolution('NO')}
                        className="rounded-xl bg-rose-600/30 border border-rose-500/40 px-4 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-600/50 transition-all cursor-pointer"
                      >
                        No, Need Help
                      </button>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 p-2.5 rounded-xl w-fit border border-slate-800">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    <span>AI Agent searching vector knowledge...</span>
                  </div>
                )}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/60 p-2.5 rounded-xl w-fit border border-indigo-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span>{typingUser} is typing a response...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Escalation Trigger Button */}
              {!isEscalated && (
                <div className="border-t border-slate-800 bg-slate-900/90 p-2.5 text-center shrink-0">
                  <button
                    onClick={handleEscalate}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>AI couldn't solve it? Escalate to Human Support Agent</span>
                  </button>
                </div>
              )}

              {/* Recent & Suggested Queries (Quick Click to Ask) */}
              {!isEscalated && (
                <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/90 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 mb-1.5 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    <span>Recent Queries (Click to Ask):</span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                    {recentQueries.map((queryText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => handleSendMessage(e, queryText)}
                        className="text-left rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:border-indigo-500 hover:bg-slate-800 hover:text-white transition-all cursor-pointer truncate"
                      >
                        "{queryText}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Footer */}
              <form onSubmit={handleSendMessage} className="border-t border-slate-800 bg-slate-900 p-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isEscalated ? "Message live human support agent..." : "Type custom query or select recent query above..."}
                    className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 disabled:opacity-40 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* TAB 2: MY SUPPORT QUERIES LIST VIEW */}
          {activeTab === 'MY_QUERIES' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/80">
              <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl">
                <div>
                  <h4 className="font-bold text-xs text-white">Start a New Inquiry?</h4>
                  <p className="text-[11px] text-slate-400">Creates a fresh AI & Agent support session</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewQuery}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Start New Query
                </button>
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">
                Your Previous & Active Queries
              </div>

              {customerTickets.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                  <FileText className="h-8 w-8 text-slate-700 mx-auto" />
                  <p>No previous queries found for <strong>{customerEmail}</strong>.</p>
                </div>
              ) : (
                customerTickets.map((t) => (
                  <div
                    key={t._id}
                    className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 hover:border-indigo-500/50 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-400">{t.ticketNumber}</span>
                      {getStatusBadge(t.status)}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {t.summary || (t.createdAt ? `Support inquiry created on ${new Date(t.createdAt).toLocaleDateString()}` : 'Support Inquiry')}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                      <span>{new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectPastTicket(t)}
                        className="rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                      >
                        {ticket?._id === t._id ? 'Active Session →' : 'View / Continue →'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            if (!isInitialized) initSession();
          }}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all animate-pulse-ring"
        >
          <MessageSquare className="h-7 w-7" />
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
        </button>
      )}
    </div>
  );
}
