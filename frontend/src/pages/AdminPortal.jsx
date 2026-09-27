import React, { useState, useEffect } from 'react';
import { 
  Database, FileText, Layers, Trash2, Plus, Sparkles, CheckCircle2, 
  BarChart3, ShieldCheck, RefreshCw, Cpu, Tag, Search, Lock, LogIn, Shield, Activity
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPortal({ currentUser, onLoginClick }) {
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCategory, setDocCategory] = useState('General');

  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [notification, setNotification] = useState(null);

  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  const fetchKnowledgeBase = async () => {
    if (!isAdmin) return;
    try {
      setIsLoading(true);
      const res = await api.getKnowledgeBase();
      if (res.data && res.data.data) {
        setKnowledgeList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchKnowledgeBase();
    }
  }, [isAdmin]);

  const handleIngestDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    try {
      setIsIngesting(true);
      const res = await api.ingestDocument(docTitle, docContent, docCategory);
      if (res.data && res.data.success) {
        setNotification({
          type: 'success',
          message: res.data.message || 'Document ingested and vector embeddings generated!'
        });
        setDocTitle('');
        setDocContent('');
        fetchKnowledgeBase();
      }
    } catch (err) {
      console.error('Failed to ingest document:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Ingestion failed. Ensure you have Admin privileges.'
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDeleteChunk = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vector chunk?')) return;
    try {
      await api.deleteKnowledgeChunk(id);
      setKnowledgeList((prev) => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('Failed to delete chunk:', err);
    }
  };

  const categoriesList = ['ALL', ...Array.from(new Set(knowledgeList.map(i => i.category || 'General')))];

  const filteredKnowledge = knowledgeList.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contentChunk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategoryTab === 'ALL' || item.category === selectedCategoryTab;
    return matchesSearch && matchesCat;
  });

  // RESTRICT ACCESS IF NOT ADMIN
  if (!isAdmin) {
    return (
      <div className="flex-1 min-h-[80vh] flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-100 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 border border-zinc-800 text-purple-400 shadow-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The RAG Knowledge Base & Vector Index dashboard is restricted to system administrators. Please sign in with an Administrator account to ingest documents or modify vectors.
            </p>
          </div>
          <button
            onClick={onLoginClick}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In as System Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 font-sans text-zinc-100 p-4 sm:p-6 md:p-8 space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-xl bg-zinc-900 p-2 text-emerald-400 border border-zinc-800">
              <Database className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">RAG Knowledge Base & Vector Index</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Ingest FAQs, e-commerce policies, and manuals into MongoDB Atlas Vector Index via Gemini embeddings.
          </p>
        </div>

        <button
          onClick={fetchKnowledgeBase}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-all shrink-0 cursor-pointer w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Vector Store</span>
        </button>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Stored Vector Chunks</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{knowledgeList.length}</div>
          <span className="mt-1 block text-[10px] text-emerald-400 font-mono">768-Dim Vector Floats</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Categories</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{categoriesList.length - 1}</div>
          <span className="mt-1 block text-[10px] text-cyan-400">Shipping, Billing, Returns & Learned</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Vector Search Engine</span>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">Active</div>
          <span className="mt-1 block text-[10px] text-zinc-400">Atlas $vectorSearch + Cosine</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Role Status</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-300 font-mono">Administrator</div>
          <span className="mt-1 block text-[10px] text-purple-400">{currentUser?.email}</span>
        </div>
      </div>

      {/* Main Ingestion & Datatable Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document Ingestion Form */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 shadow-xl space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Document Ingestion Pipeline</h3>
          </div>

          {notification && (
            <div className={`p-3 rounded-xl text-xs font-medium ${
              notification.type === 'success' ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200' : 'bg-rose-950/50 border border-rose-800 text-rose-200'
            }`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleIngestDocument} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., Extended Warranty & Servicing Guidelines"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="General">General</option>
                <option value="Shipping & Delivery">Shipping & Delivery</option>
                <option value="Payments & Billing">Payments & Billing</option>
                <option value="Returns & Refunds">Returns & Refunds</option>
                <option value="GST & Invoicing">GST & Invoicing</option>
                <option value="Product Warranty">Product Warranty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Content / Policy Body</label>
              <textarea
                rows={5}
                required
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste knowledge base article, FAQ, or policy content here..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <button
              type="submit"
              disabled={isIngesting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isIngesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Generate Embeddings & Save to Vector Index</span>
            </button>
          </form>
        </div>

        {/* Datatable of Ingested Knowledge Base Chunks */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Ingested Vector Chunks</h3>
              <p className="text-xs text-zinc-400">Total matching chunks: {filteredKnowledge.length}</p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter vectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryTab(cat)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategoryTab === cat ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 min-w-[500px]">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[9px] tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5">Title & Category</th>
                  <th className="px-3.5 py-2.5">Content Chunk Snippet</th>
                  <th className="px-3.5 py-2.5">Vector Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredKnowledge.map((item) => (
                  <tr key={item._id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-3.5 py-3 max-w-[180px]">
                      <div className="font-bold text-white truncate">{item.title}</div>
                      <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 border border-zinc-800">
                        <Tag className="h-2.5 w-2.5 text-emerald-400" /> {item.category}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 max-w-[280px]">
                      <p className="line-clamp-2 text-zinc-400 leading-relaxed text-[11px]">
                        {item.contentChunk}
                      </p>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        768 Floats (Ready)
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteChunk(item._id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete chunk"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredKnowledge.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-zinc-500">
                      No matching vector chunks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
