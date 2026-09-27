import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, MessageSquare, Sparkles, Send, CheckCircle2, Clock, 
  Search, Filter, AlertTriangle, Smile, Meh, Frown, Paperclip, 
  FileText, ChevronRight, RefreshCw, Zap, Shield, Brain, ArrowRight, Lock, LogIn, Headset
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export default function AgentPortal({ currentUser, onLoginClick, activeAgentStatus, onStatusChange }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chats, setChats] = useState([]);
  const [smartReplies, setSmartReplies] = useState([]);
  const [knowledgeSnippets, setKnowledgeSnippets] = useState([]);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [learnedNotice, setLearnedNotice] = useState(null);

  // Mobile viewport tab state: 'QUEUE' | 'CHAT' | 'COPILOT'
  const [mobileTab, setMobileTab] = useState('QUEUE');

  const chatContainerRef = useRef(null);
  const socketRef = useRef(null);

  const isStaff = currentUser && ['AGENT', 'ADMIN'].includes(currentUser.role);
  const agentName = currentUser?.name || 'Support Executive';

  const fetchTickets = async () => {
    if (!isStaff) return;
    try {
      setIsLoading(true);
      const res = await api.getTickets({ status: filterStatus, search: searchQuery });
      if (res.data && res.data.data) {
        setTickets(res.data.data);
        if (!selectedTicket && res.data.data.length > 0) {
          handleSelectTicket(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      fetchTickets();
    }
  }, [isStaff, filterStatus, searchQuery]);

  // Polling ticket queue every 3 seconds
  useEffect(() => {
    if (!isStaff) return;
    const interval = setInterval(() => {
      fetchTickets();
    }, 3000);
    return () => clearInterval(interval);
  }, [isStaff, filterStatus, searchQuery]);

  // Polling active chat transcript every 3 seconds
  useEffect(() => {
    let interval = null;
    if (isStaff && selectedTicket && selectedTicket._id) {
      interval = setInterval(async () => {
        try {
          const res = await api.getTicketById(selectedTicket._id);
          if (res.data && res.data.chats) {
            setChats(res.data.chats);
          }
        } catch (e) {}
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStaff, selectedTicket]);

  // Socket Connection for Real-time Ticket Queue and AI Learning Loop
  useEffect(() => {
    if (!isStaff) return;
    const socket = getSocket();
    socketRef.current = socket;

    const handleNewPending = () => fetchTickets();
    const handleActivity = () => fetchTickets();
    const handleAiLearned = () => {
      setLearnedNotice(`AI Learned New Solution from Ticket! Embedded into RAG Vector Store.`);
      fetchTickets();
    };

    socket.on('new_ticket_pending', handleNewPending);
    socket.on('ticket_activity', handleActivity);
    socket.on('ai_learned_new_knowledge', handleAiLearned);

    return () => {
      socket.off('new_ticket_pending', handleNewPending);
      socket.off('ticket_activity', handleActivity);
      socket.off('ai_learned_new_knowledge', handleAiLearned);
    };
  }, [isStaff]);

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setLearnedNotice(null);
    setMobileTab('CHAT');
    try {
      const res = await api.getTicketById(ticket._id);
      if (res.data) {
        setChats(res.data.chats || []);
        setSmartReplies(res.data.smartReplies || []);
      }

      const lastCust = [...(res.data.chats || [])].reverse().find(c => c.sender === 'CUSTOMER');
      if (lastCust) {
        const ragRes = await api.queryRAG(lastCust.message);
        if (ragRes.data && ragRes.data.matchedChunks) {
          setKnowledgeSnippets(ragRes.data.matchedChunks);
        }
      }

      getSocket().emit('join_room', String(ticket._id));
    } catch (err) {
      console.error('Failed to load ticket details', err);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    const socket = getSocket();
    if (socket && selectedTicket && selectedTicket._id) {
      const roomStr = String(selectedTicket._id);
      socket.emit('join_room', roomStr);

      const handleReceiveMsg = (data) => {
        if (data && String(data.ticketId) === roomStr) {
          if (data.chat) {
            setChats((prev) => {
              const isDup = prev.some(m =>
                String(m._id) === String(data.chat._id) ||
                (m.sender === data.chat.sender && m.message === data.chat.message && Math.abs(new Date(m.timestamp || Date.now()) - new Date(data.chat.timestamp || Date.now())) < 4000)
              );
              if (isDup) return prev;
              return [...prev, data.chat];
            });
          }
          if (data.ticketSentiment) {
            setSelectedTicket((prev) => ({ ...prev, sentiment: data.ticketSentiment }));
          }
          if (data.smartReplies) {
            setSmartReplies(data.smartReplies);
          }
        }
      };

      socket.on('receive_message', handleReceiveMsg);
      return () => {
        socket.off('receive_message', handleReceiveMsg);
      };
    }
  }, [isStaff, selectedTicket]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, selectedTicket]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || messageInput.trim();
    if (!text || !selectedTicket) return;

    if (!textToSend) setMessageInput('');

    try {
      const res = await api.sendMessage(selectedTicket._id, {
        sender: 'AGENT',
        senderName: agentName,
        message: text
      });

      if (res.data && res.data.chat) {
        setChats((prev) => {
          if (prev.some(m => String(m._id) === String(res.data.chat._id))) return prev;
          return [...prev, res.data.chat];
        });
      }
    } catch (err) {
      console.error('Error sending agent message:', err);
    }
  };

  const handleProposeResolution = async () => {
    if (!selectedTicket) return;
    try {
      setIsSummarizing(true);
      const res = await api.proposeResolution(selectedTicket._id);
      if (res.data && res.data.ticket) {
        setSelectedTicket(res.data.ticket);
        socketRef.current?.emit('propose_resolution', { ticketId: selectedTicket._id });
        setLearnedNotice(`📋 Resolution proposed! Customer received interactive Yes/No prompt.`);
        fetchTickets();
        const chatRes = await api.getTicketById(selectedTicket._id);
        if (chatRes.data) setChats(chatRes.data.chats || []);
      }
    } catch (err) {
      console.error('Failed to propose resolution:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleResolveAndLearn = async () => {
    if (!selectedTicket) return;
    try {
      setIsSummarizing(true);
      const res = await api.resolveAndSummarize(selectedTicket._id);
      if (res.data && res.data.ticket) {
        setSelectedTicket(res.data.ticket);
        setLearnedNotice(`🧠 AI Agent learned solution "${res.data.learnedChunk?.title}" and generated vector embedding!`);
        fetchTickets();
        const chatRes = await api.getTicketById(selectedTicket._id);
        if (chatRes.data) setChats(chatRes.data.chats || []);
      }
    } catch (err) {
      console.error('Failed to resolve and learn:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'Satisfied':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            <Smile className="h-3.5 w-3.5" /> Satisfied
          </span>
        );
      case 'Frustrated':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">
            <Frown className="h-3.5 w-3.5" /> Frustrated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
            <Meh className="h-3.5 w-3.5" /> Neutral
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_AGENT':
        return (
          <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Pending Queue
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            In Progress
          </span>
        );
      case 'PENDING_CUSTOMER_CONFIRMATION':
        return (
          <span className="rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider animate-pulse">
            Awaiting Customer Yes/No
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Resolved & Learned
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Bot Handled
          </span>
        );
    }
  };

  // RESTRICT ACCESS IF NOT STAFF (AGENT / ADMIN)
  if (!isStaff) {
    return (
      <div className="flex-1 min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-xl">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Staff Authentication Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Support Agent Desk is restricted to authenticated support representatives and system administrators. You must sign in with an active Staff account to manage queues and reply to customer tickets.
            </p>
          </div>
          <button
            onClick={onLoginClick}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In as Support Agent / Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-950 font-sans overflow-hidden text-slate-100">
      
      {/* MOBILE TOP TAB NAVIGATION (<1024px) */}
      <div className="lg:hidden grid grid-cols-3 bg-slate-950 border-b border-slate-800 text-xs font-bold shrink-0">
        <button
          onClick={() => setMobileTab('QUEUE')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            mobileTab === 'QUEUE' ? 'border-indigo-500 text-indigo-400 bg-slate-900/60' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Queue ({tickets.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('CHAT')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            mobileTab === 'CHAT' ? 'border-indigo-500 text-indigo-400 bg-slate-900/60' : 'border-transparent text-slate-400'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Active Chat</span>
        </button>
        <button
          onClick={() => setMobileTab('COPILOT')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            mobileTab === 'COPILOT' ? 'border-indigo-500 text-indigo-400 bg-slate-900/60' : 'border-transparent text-slate-400'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Co-Pilot</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: TICKET QUEUE */}
        <div className={`w-full lg:w-80 xl:w-96 flex-col border-r border-slate-800 bg-slate-900/60 shrink-0 ${
          mobileTab === 'QUEUE' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <h2 className="font-bold text-sm text-white">Live Escalation Queue</h2>
              </div>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                {tickets.length} Tickets
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800 text-[11px] font-medium">
              {['ALL', 'PENDING_AGENT', 'IN_PROGRESS', 'RESOLVED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`rounded-md py-1 transition-colors cursor-pointer ${
                    filterStatus === tab ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'PENDING_AGENT' ? 'Pending' : tab === 'IN_PROGRESS' ? 'Active' : tab === 'RESOLVED' ? 'Learned' : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {tickets.map((t) => {
              const isSelected = selectedTicket && selectedTicket._id === t._id;
              return (
                <div
                  key={t._id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-3.5 cursor-pointer transition-all hover:bg-slate-800/50 ${
                    isSelected ? 'bg-slate-800/80 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-300">{t.ticketNumber}</span>
                    {getStatusBadge(t.status)}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-white truncate max-w-[160px]">{t.customerName}</h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {getSentimentBadge(t.sentiment)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANE: ACTIVE WORKSPACE */}
        <div className={`flex-1 flex-col bg-slate-950 min-w-0 ${
          mobileTab === 'CHAT' ? 'flex' : 'hidden lg:flex'
        }`}>
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 py-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
                    {selectedTicket.customerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{selectedTicket.customerName}</h3>
                      <span className="font-mono text-xs text-indigo-400">{selectedTicket.ticketNumber}</span>
                    </div>
                    <p className="text-xs text-slate-400">{selectedTicket.customerEmail}</p>
                  </div>
                </div>

                {/* RESOLVE & LEARN BUTTONS */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTicket.status !== 'RESOLVED' && (
                    <button
                      onClick={handleProposeResolution}
                      disabled={isSummarizing || selectedTicket.status === 'PENDING_CUSTOMER_CONFIRMATION'}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{selectedTicket.status === 'PENDING_CUSTOMER_CONFIRMATION' ? 'Awaiting Yes/No' : 'Propose Resolution'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleResolveAndLearn}
                    disabled={isSummarizing || selectedTicket.status === 'RESOLVED'}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSummarizing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                    <span>{selectedTicket.status === 'RESOLVED' ? 'Resolved & Learned' : 'Resolve & Train AI'}</span>
                  </button>
                </div>
              </div>

              {/* AI Notification Banner */}
              {learnedNotice && (
                <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2 font-semibold">
                    <Brain className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>{learnedNotice}</span>
                  </div>
                </div>
              )}

              {/* Chat Stream */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/40">
                {chats.map((c, i) => {
                  const isCust = c.sender === 'CUSTOMER';
                  const isBot = c.sender === 'BOT';
                  return (
                    <div key={c._id || i} className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-300">
                          {c.senderName || (isCust ? selectedTicket.customerName : isBot ? 'SyncSupport AI Agent' : agentName)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                          isCust
                            ? 'bg-blue-600 text-white rounded-tl-xs font-medium'
                            : isBot
                            ? 'bg-purple-950/90 text-purple-100 border border-purple-800/60 rounded-tr-xs'
                            : 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                        }`}
                      >
                        {c.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900">
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Reply as ${agentName}... (Ctrl + Enter to send)`}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Replying as: <strong>{agentName}</strong></span>
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!messageInput.trim()}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer ml-auto"
                    >
                      <span>Send Reply</span>
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
              <MessageSquare className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-sm">Select an escalated ticket to respond and assist the customer.</p>
            </div>
          )}
        </div>

        {/* RIGHT PANE: AI CO-PILOT & SMART REPLIES */}
        <div className={`w-full lg:w-80 xl:w-96 flex-col border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto space-y-4 shrink-0 ${
          mobileTab === 'COPILOT' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <h3 className="font-bold text-sm text-white">Agent AI Co-Pilot</h3>
            </div>
          </div>

          {selectedTicket ? (
            <>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Customer Sentiment
                </span>
                <div>{getSentimentBadge(selectedTicket.sentiment)}</div>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-2">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  <span>Suggested Smart Replies</span>
                </div>
                <div className="space-y-2">
                  {smartReplies.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMessageInput(chip);
                        setMobileTab('CHAT');
                      }}
                      className="w-full text-left rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 hover:border-indigo-500 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      "{chip}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
                  <Brain className="h-4 w-4 text-emerald-400" />
                  <span>Knowledge Base Matches</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {knowledgeSnippets.map((kb, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 text-[11px]">
                      <div className="font-semibold text-indigo-300 mb-1">{kb.title}</div>
                      <p className="text-slate-400 line-clamp-3 leading-relaxed">{kb.contentChunk}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-slate-500 py-10">
              Select a ticket to activate AI Co-Pilot.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
