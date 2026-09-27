import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, MessageSquare, Sparkles, Send, CheckCircle2, Clock, 
  Search, Filter, AlertTriangle, Smile, Meh, Frown, Paperclip, 
  FileText, ChevronRight, RefreshCw, Zap, Shield, Brain, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export default function AgentPortal() {
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

  const activeAgent = {
    name: 'Alex Vance',
    role: 'Senior Support Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
    status: 'ONLINE'
  };

  const chatContainerRef = useRef(null);
  const socketRef = useRef(null);

  const fetchTickets = async () => {
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
    fetchTickets();
  }, [filterStatus, searchQuery]);

  // Polling ticket queue every 3 seconds for guaranteed real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
    }, 3000);
    return () => clearInterval(interval);
  }, [filterStatus, searchQuery]);

  // Polling active chat transcript every 3 seconds for guaranteed real-time messages
  useEffect(() => {
    let interval = null;
    if (selectedTicket && selectedTicket._id) {
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
  }, [selectedTicket]);

  // Socket Connection for Real-time Ticket Queue and AI Learning Loop
  useEffect(() => {
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
  }, []);

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setLearnedNotice(null);
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
  }, [selectedTicket]);

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
        senderName: activeAgent.name,
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

  // PROPOSE RESOLUTION TO CUSTOMER FOR YES/NO FEEDBACK LOOP
  const handleProposeResolution = async () => {
    if (!selectedTicket) return;
    try {
      setIsSummarizing(true);
      const res = await api.proposeResolution(selectedTicket._id);
      if (res.data && res.data.ticket) {
        setSelectedTicket(res.data.ticket);
        socketRef.current?.emit('propose_resolution', { ticketId: selectedTicket._id });
        setLearnedNotice(`📋 Resolution proposed! Customer received interactive Yes/No prompt in chat.`);
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

  // ONE-CLICK RESOLVE & LEARN AS RAG FEEDBACK LOOP
  const handleResolveAndLearn = async () => {
    if (!selectedTicket) return;
    try {
      setIsSummarizing(true);
      const res = await api.resolveAndSummarize(selectedTicket._id);
      if (res.data && res.data.ticket) {
        setSelectedTicket(res.data.ticket);
        setLearnedNotice(`🧠 AI Agent learned solution "${res.data.learnedChunk?.title}" and generated 768-dim vector embedding!`);
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

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-950 font-sans overflow-hidden text-slate-100">
      {/* LEFT PANE: TICKET QUEUE */}
      <div className="w-80 sm:w-96 flex-col border-r border-slate-800 bg-slate-900/60 flex shrink-0">
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
                className={`rounded-md py-1 transition-colors ${
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
      <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md">
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

              {/* RESOLVE & LEARN AS RAG BUTTONS */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTicket.status)}

                {selectedTicket.status !== 'RESOLVED' && (
                  <button
                    onClick={handleProposeResolution}
                    disabled={isSummarizing || selectedTicket.status === 'PENDING_CUSTOMER_CONFIRMATION'}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 text-purple-200" />
                    <span>{selectedTicket.status === 'PENDING_CUSTOMER_CONFIRMATION' ? 'Awaiting Customer Yes/No' : 'Propose Resolution (Ask Customer)'}</span>
                  </button>
                )}

                <button
                  onClick={handleResolveAndLearn}
                  disabled={isSummarizing || selectedTicket.status === 'RESOLVED'}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:scale-105 disabled:opacity-50 transition-all"
                >
                  {isSummarizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  <span>{selectedTicket.status === 'RESOLVED' ? 'Resolution Saved & Learned' : 'Direct Resolve & Train AI'}</span>
                </button>
              </div>
            </div>

            {/* AI Learning Notification Banner */}
            {learnedNotice && (
              <div className="mx-6 mt-4 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 font-semibold">
                  <Brain className="h-5 w-5 text-emerald-400 animate-pulse" />
                  <span>{learnedNotice}</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  Vector Saved
                </span>
              </div>
            )}

            {/* Chat Stream */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/40">
              {chats.map((c, i) => {
                const isCust = c.sender === 'CUSTOMER';
                const isBot = c.sender === 'BOT';
                return (
                  <div key={c._id || i} className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-300">
                        {c.senderName || (isCust ? selectedTicket.customerName : isBot ? 'SyncSupport AI Agent' : activeAgent.name)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md ${
                        isCust
                          ? 'bg-blue-600 text-white rounded-tl-xs'
                          : isBot
                          ? 'bg-purple-950/90 text-purple-100 border border-purple-800/60 rounded-tr-xs'
                          : 'bg-indigo-600 text-white rounded-tr-xs'
                      }`}
                    >
                      {c.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
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
                  placeholder="Provide resolution to customer... (Press Ctrl + Enter to send)"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">Ctrl + Enter to send reply</span>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!messageInput.trim()}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-40 transition-all"
                  >
                    <span>Send Reply</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-sm">Select an escalated ticket to resolve and train the AI Agent.</p>
          </div>
        )}
      </div>

      {/* RIGHT PANE: AI CO-PILOT & SMART REPLIES */}
      <div className="w-80 lg:w-96 flex flex-col border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto space-y-4 shrink-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
            <h3 className="font-bold text-sm text-white">Agent AI Co-Pilot</h3>
          </div>
        </div>

        {selectedTicket ? (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Customer Sentiment
              </span>
              {getSentimentBadge(selectedTicket.sentiment)}
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                <span>Suggested Resolutions</span>
              </div>
              <div className="space-y-2">
                {smartReplies.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessageInput(chip)}
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
                <span>Current Vector Matches</span>
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
  );
}
