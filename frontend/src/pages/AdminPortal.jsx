import React, { useState, useEffect } from 'react';
import { 
  Database, FileText, Layers, Trash2, Plus, Sparkles, CheckCircle2, 
  BarChart3, ShieldCheck, RefreshCw, Cpu, Tag, Search
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPortal() {
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCategory, setDocCategory] = useState('General');

  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  const fetchKnowledgeBase = async () => {
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
    fetchKnowledgeBase();
  }, []);

  const handleIngestDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    try {
      setIsIngesting(true);
      const res = await api.ingestDocument(docTitle, docContent, docCategory);
      if (res.data && res.data.success) {
        setNotification({
          type: 'success',
          message: res.data.message || 'Document ingested & 768-dim vector embeddings generated!'
        });
        setDocTitle('');
        setDocContent('');
        fetchKnowledgeBase();
      }
    } catch (err) {
      console.error('Failed to ingest document:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Ingestion failed.'
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

  const filteredKnowledge = knowledgeList.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.contentChunk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-6 md:p-10 space-y-8">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
              <Database className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">RAG Knowledge Base & Vector Index</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ingest FAQs, API docs, and company policies into MongoDB Atlas Vector Search via Gemini <code className="text-indigo-300">text-embedding-004</code>.
          </p>
        </div>

        <button
          onClick={fetchKnowledgeBase}
          className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all w-fit"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Datatable</span>
        </button>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Vector Chunks</span>
            <Cpu className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white font-mono">{knowledgeList.length}</div>
          <span className="mt-1 block text-[11px] text-emerald-400 font-mono">768-Dim Floating Point</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Support Tickets</span>
            <Layers className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white font-mono">12</div>
          <span className="mt-1 block text-[11px] text-blue-400">Live Agent & Queue</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Sentiment Score</span>
            <BarChart3 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400 font-mono">88.4%</div>
          <span className="mt-1 block text-[11px] text-slate-400">Gemini 2.5 Flash Analyzer</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Bot Resolution Rate</span>
            <ShieldCheck className="h-5 w-5 text-purple-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-purple-300 font-mono">74.2%</div>
          <span className="mt-1 block text-[11px] text-purple-400">Automated Vector RAG</span>
        </div>
      </div>

      {/* Main Ingestion & Datatable Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Ingestion Form */}
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-xl space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Document Ingestion Pipeline</h3>
          </div>

          {notification && (
            <div className={`p-3 rounded-xl text-xs font-medium ${
              notification.type === 'success' ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200' : 'bg-rose-950/50 border border-rose-800 text-rose-200'
            }`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleIngestDocument} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., Enterprise Billing Policy v2"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="General">General</option>
                <option value="Billing">Billing & Subscription</option>
                <option value="Integration">API & Webhooks</option>
                <option value="Widget Customization">Widget & Theme</option>
                <option value="Security">Security & MFA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Content / FAQ Body (~200 word chunks)</label>
              <textarea
                rows={6}
                required
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste knowledge base article, FAQ, or API manual content here..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isIngesting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
            >
              {isIngesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Generate Embeddings & Save to Vector Index</span>
            </button>
          </form>
        </div>

        {/* Datatable of Ingested Knowledge Base Chunks */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white">Ingested Vector Chunks Datatable</h3>
              <p className="text-xs text-slate-400">Total stored vectors: {filteredKnowledge.length}</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter vector chunks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Title & Category</th>
                  <th className="px-4 py-3">Content Chunk Snippet</th>
                  <th className="px-4 py-3">Vector Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredKnowledge.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-bold text-white truncate">{item.title}</div>
                      <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
                        <Tag className="h-2.5 w-2.5" /> {item.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-[320px]">
                      <p className="line-clamp-2 text-slate-400 leading-relaxed text-[11px]">
                        {item.contentChunk}
                      </p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
                        768 Floats (Ready)
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteChunk(item._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                        title="Delete chunk"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredKnowledge.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-slate-500">
                      No vector chunks found in Knowledge Base.
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
