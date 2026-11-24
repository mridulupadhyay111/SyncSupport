import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, Image, Sparkles, CheckCircle2, 
  AlertCircle, X, Tag, FileUp, Loader2, ArrowRight, Brain, Info
} from 'lucide-react';
import { api } from '../services/api';

const PRESET_CATEGORIES = [
  'Troubleshooting',
  'Product Manuals',
  'Hardware & Devices',
  'Billing & Accounts',
  'Policies & Returns',
  'Technical Specs',
  'General Support'
];

export default function UploadKnowledgeModal({ isOpen, onClose, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Troubleshooting');
  const [customCategory, setCustomCategory] = useState('');
  const [notes, setNotes] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // 'reading' | 'analyzing' | 'vectorizing' | 'success'
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (file) => {
    if (!file) return;

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit. Please choose a smaller document or photo.');
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    setSuccessResult(null);

    // Auto-populate Title if empty
    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    if (!docTitle) {
      setDocTitle(cleanName);
    }

    // Generate preview & base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      setFileBase64(result);
      if (file.type.startsWith('image/')) {
        setFilePreview(result);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileBase64(null);
    setDocTitle('');
    setNotes('');
    setUploadStep('');
    setErrorMsg('');
    setSuccessResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      setErrorMsg('Please select a photo or document to upload.');
      return;
    }

    const finalCategory = customCategory.trim() || docCategory || 'General Support';

    try {
      setIsUploading(true);
      setErrorMsg('');
      setUploadStep('analyzing');

      const payload = {
        fileData: fileBase64,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        category: finalCategory,
        notes: notes.trim(),
        title: docTitle.trim()
      };

      const res = await api.uploadKnowledgeFile(payload);

      if (res.data && res.data.success) {
        setUploadStep('success');
        setSuccessResult(res.data);
        if (onUploadSuccess) {
          onUploadSuccess(res.data);
        }
      } else {
        setErrorMsg(res.data?.message || 'Failed to ingest file into RAG index.');
        setUploadStep('');
      }
    } catch (err) {
      console.error('File upload & learning error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Error processing file. Please try again.');
      setUploadStep('');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const isImageFile = selectedFile && (
    selectedFile.type.startsWith('image/') || 
    /\.(png|jpe?g|webp|gif|svg)$/i.test(selectedFile.name)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Teach AI RAG: Upload Docs & Photos
              </h2>
              <p className="text-[11px] text-slate-500">
                Multimodal AI extracts facts, visual guides, & procedures into 768-D vectors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successResult ? (
            /* Success State */
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  AI RAG Successfully Trained!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {successResult.message}
                </p>
              </div>

              <div className="rounded-xl bg-white border border-emerald-200 p-3 text-left space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Indexed Title:</span>
                  <span className="font-semibold text-slate-800">{successResult.title}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Source Type:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    {successResult.sourceType === 'PHOTO' ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    {successResult.sourceType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Chunks Vectorized:</span>
                  <span className="font-semibold text-slate-800">{successResult.chunks?.length || 1} Chunk(s)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Upload Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drag and Drop Box */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    accept="image/*,.pdf,.txt,.md,.json,.csv,.doc,.docx"
                    className="hidden"
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <UploadCloud className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Click to browse or drag & drop documents or photos
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports Photos (PNG, JPG, WEBP) & Documents (PDF, TXT, MD, DOC) up to 10MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">📷 Error Screenshots</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">📄 Product Manuals</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">📑 Policy Docs</span>
                  </div>
                </div>
              ) : (
                /* Selected File Preview Box */
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageFile && filePreview ? (
                        <img
                          src={filePreview}
                          alt="Upload preview"
                          className="h-14 w-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs shrink-0">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {selectedFile.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                          <span>{formatFileSize(selectedFile.size)}</span>
                          <span>•</span>
                          <span className="uppercase">{selectedFile.type || 'Document'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isUploading}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {isImageFile && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span>Multimodal Vision AI will parse UI text, error codes, and workflows from this photo.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Title Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Knowledge Title / Subject</span>
                  <span className="text-[10px] font-normal text-slate-400">Used for search indexing</span>
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Wi-Fi Router Reset Procedures & Port Forwarding"
                  disabled={isUploading}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  <span>Category</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setDocCategory(cat);
                        setCustomCategory('');
                      }}
                      disabled={isUploading}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        docCategory === cat && !customCategory
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Notes / Guidance */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Human Agent Notes & Context (Optional)</span>
                  <span className="text-[10px] font-normal text-slate-400">Helps AI understand photo/doc nuances</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                  placeholder="e.g. When customers see the yellow LED indicator, instruct them to hold the power button for 10 seconds."
                  className="w-full rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing & Vectorizing...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="h-3.5 w-3.5" />
                      <span>Upload & Teach RAG</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
