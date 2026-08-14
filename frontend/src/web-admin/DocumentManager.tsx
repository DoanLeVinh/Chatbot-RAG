import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit2, FileText, Save, X, UploadCloud, Loader2, ShieldCheck, ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Trash2, Folder, Bookmark } from 'lucide-react';

export default function DocumentManager() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for TreeView expansion
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [chunksCache, setChunksCache] = useState<Record<string, any[]>>({});
  const [loadingChunks, setLoadingChunks] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingChunk, setEditingChunk] = useState<any>(null);
  const [editForm, setEditForm] = useState({ text: '', article_ids: '', chapter: '' });
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('logichat_admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHierarchy = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/docs/hierarchy', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('admin_logout'));
        return;
      }
      const data = await res.json();
      if (data.success) {
        setHierarchy(data.hierarchy || []);
      } else {
        showToast('error', data.detail || 'Không thể tải danh sách phân cấp.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi kết nối khi tải danh sách.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const toggleDoc = (source: string) => {
    const next = new Set(expandedDocs);
    if (next.has(source)) {
      next.delete(source);
    } else {
      next.add(source);
    }
    setExpandedDocs(next);
  };

  const toggleChapter = async (source: string, chapter: string) => {
    const key = `${source}::${chapter}`;
    const next = new Set(expandedChapters);
    if (next.has(key)) {
      next.delete(key);
      setExpandedChapters(next);
    } else {
      next.add(key);
      setExpandedChapters(next);
      
      // Load chunks if not loaded
      if (!chunksCache[key]) {
        setLoadingChunks(prev => new Set(prev).add(key));
        try {
          const res = await fetch(`/api/admin/docs/${encodeURIComponent(source)}/chunks?chapter=${encodeURIComponent(chapter)}`, {
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (data.success) {
            setChunksCache(prev => ({ ...prev, [key]: data.chunks }));
          }
        } catch (err) {
          showToast('error', 'Lỗi tải điều khoản.');
        } finally {
          setLoadingChunks(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }
      }
    }
  };

  const formatDocName = (src: string) => {
    if (!src) return '';
    return src.replace(/^(?:papers[\\/]|papers:)/i, '');
  };

  const formatChapterName = (chap: string) => {
    if (!chap || chap === 'Không phân chương') return 'Toàn văn điều khoản';
    return chap;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/docs/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Tải lên, bóc tách PDF và tái lập chỉ mục FAISS thành công!');
        if (data.source) {
          setExpandedDocs(prev => new Set(prev).add(data.source));
        }
        fetchHierarchy();
      } else {
        showToast('error', 'Lỗi: ' + (data.error || data.detail));
      }
    } catch (err: any) {
      showToast('error', 'Đã xảy ra lỗi khi tải lên tài liệu.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (source: string) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/docs/${encodeURIComponent(source)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchHierarchy();
        
        // Remove from states
        setExpandedDocs(prev => {
          const next = new Set(prev);
          next.delete(source);
          return next;
        });
      } else {
        showToast('error', data.detail || 'Không thể xóa.');
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối khi xóa.');
    }
  };

  const handleEditClick = (chunk: any) => {
    setEditingChunk(chunk);
    setEditForm({
      text: chunk.text,
      article_ids: (chunk.article_ids || []).join(', '),
      chapter: chunk.chapter || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/admin/chunks/${editingChunk.parent_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          text: editForm.text,
          article_ids: editForm.article_ids.split(',').map((s: string) => s.trim()).filter(Boolean),
          chapter: editForm.chapter,
        }),
      });
      if (res.ok) {
        showToast('success', 'Đã cập nhật Điều khoản thành công!');
        setEditingChunk(null);
        
        // Force refresh the specific chapter
        const key = `${editingChunk.source}::${editForm.chapter || "Không phân chương"}`;
        
        setLoadingChunks(prev => new Set(prev).add(key));
        const resRefresh = await fetch(`/api/admin/docs/${encodeURIComponent(editingChunk.source)}/chunks?chapter=${encodeURIComponent(editForm.chapter || "Không phân chương")}`, {
          headers: getAuthHeaders(),
        });
        const data = await resRefresh.json();
        if (data.success) {
           setChunksCache(prev => ({ ...prev, [key]: data.chunks }));
        }
        setLoadingChunks(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });

      } else {
        const errData = await res.json();
        showToast('error', errData.detail || 'Không thể lưu thay đổi.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi kết nối khi lưu.');
    }
  };

  // Local search filter
  const filteredHierarchy = hierarchy.map(doc => {
    if (!searchTerm) return doc;
    
    // If source matches, keep all chapters
    if (doc.source.toLowerCase().includes(searchTerm.toLowerCase())) {
       return doc;
    }
    
    // Filter chapters
    const matchingChapters = doc.chapters.filter((ch: any) => ch.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (matchingChapters.length > 0) {
      return { ...doc, chapters: matchingChapters };
    }
    
    return null;
  }).filter(Boolean);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Toast feedback banner */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10' 
            : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Quản lý Tài liệu & Chunks Pháp lý</h1>
          <p className="text-slate-600 text-sm mt-1">Cấu trúc phân cấp (Tree View) để quản lý dữ liệu hiệu quả</p>
        </div>
        <div>
          <input 
            type="file" 
            id="pdfFileInput"
            name="pdfFile"
            accept=".pdf" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            disabled={isUploading}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang bóc tách PDF...
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" /> Nạp thêm văn bản PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="docSearchInput"
            name="docSearch"
            type="text"
            placeholder="Tìm kiếm Tài liệu PDF hoặc Chương..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
          />
        </div>
      </div>

      {/* TreeView / Accordion */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-12 text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredHierarchy.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            Không tìm thấy tài liệu nào phù hợp.
          </div>
        ) : (
          filteredHierarchy.map((doc: any, docIdx: number) => {
            const isDocExpanded = expandedDocs.has(doc.source);
            return (
              <div key={docIdx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Level 1: Document */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isDocExpanded ? 'border-b border-slate-100 bg-slate-50' : ''}`}
                  onClick={() => toggleDoc(doc.source)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-700">
                      {isDocExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <div className="flex items-center gap-2">
                       <Folder className="w-5 h-5 text-blue-500" />
                       <span className="font-bold text-slate-800 text-base">{formatDocName(doc.source)}</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                       {doc.total_chunks} chunks
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.source); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                    >
                       <Trash2 className="w-4 h-4" /> Xóa Tài Liệu
                    </button>
                  </div>
                </div>

                {/* Level 2: Chapters */}
                {isDocExpanded && (
                  <div className="bg-slate-50/50">
                    {doc.chapters.length === 0 && (
                      <div className="p-4 text-sm text-slate-500 ml-10">Tài liệu trống.</div>
                    )}
                    {doc.chapters.map((chap: any, chapIdx: number) => {
                      const chapKey = `${doc.source}::${chap.chapter}`;
                      const isChapExpanded = expandedChapters.has(chapKey);
                      const isChapLoading = loadingChunks.has(chapKey);
                      const chunks = chunksCache[chapKey] || [];

                      return (
                        <div key={chapIdx} className="border-b border-slate-100 last:border-0">
                          <div 
                            className="flex items-center justify-between py-3 px-4 pl-12 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleChapter(doc.source, chap.chapter)}
                          >
                             <div className="flex items-center gap-3">
                                <button className="text-slate-400">
                                  {isChapExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <Bookmark className="w-4 h-4 text-emerald-500" />
                                <span className="font-semibold text-slate-700 text-sm">{formatChapterName(chap.chapter)}</span>
                                <span className="text-xs text-slate-500">({chap.chunk_count} điều khoản)</span>
                             </div>
                          </div>

                          {/* Level 3: Chunks */}
                          {isChapExpanded && (
                            <div className="pl-20 pr-4 pb-4">
                              {isChapLoading ? (
                                <div className="py-4 flex items-center gap-2 text-sm text-slate-500">
                                   <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Đang tải điều khoản...
                                </div>
                              ) : chunks.length === 0 ? (
                                <div className="py-4 text-sm text-slate-500">Không có điều khoản nào.</div>
                              ) : (
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                  {chunks.map((chunk: any) => (
                                    <div key={chunk.parent_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-slate-400" />
                                          <span className="font-bold text-slate-800 text-sm">
                                            {(chunk.article_ids || []).length > 0 ? (chunk.article_ids || []).join(', ') : 'Nội dung chung'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">

                                          <button
                                            onClick={() => handleEditClick(chunk)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" /> Sửa
                                          </button>
                                        </div>
                                      </div>
                                      <div className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap">
                                        {chunk.text}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Điều chỉnh nội dung Điều khoản</h2>
                <p className="text-xs text-slate-500 mt-0.5">Parent ID: {editingChunk.parent_id}</p>
              </div>
              <button onClick={() => setEditingChunk(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label htmlFor="editArticleIdsInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Danh sách Điều Luật</label>
                <input
                  id="editArticleIdsInput"
                  name="article_ids"
                  type="text"
                  value={editForm.article_ids}
                  onChange={e => setEditForm({ ...editForm, article_ids: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                  placeholder="VD: Điều 1, Điều 2"
                />
              </div>
              <div>
                <label htmlFor="editChapterInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Chương</label>
                <input
                  id="editChapterInput"
                  name="chapter"
                  type="text"
                  value={editForm.chapter}
                  onChange={e => setEditForm({ ...editForm, chapter: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                  placeholder="VD: CHƯƠNG I"
                />
              </div>
              <div>
                <label htmlFor="editChunkTextInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nội dung chi tiết (Parent Context)</label>
                <textarea
                  id="editChunkTextInput"
                  name="chunkText"
                  value={editForm.text}
                  onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                  rows={9}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setEditingChunk(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
             <div className="p-6">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                   <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa tài liệu</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                   Bạn có chắc chắn muốn xóa toàn bộ tài liệu <strong>{formatDocName(deleteConfirm)}</strong> cùng tất cả các điều khoản bên trong? Hành động này sẽ xóa dữ liệu khỏi SQLite và bộ nhớ truy xuất FAISS. Không thể hoàn tác.
                </p>
                <div className="flex items-center justify-end gap-3">
                   <button 
                     onClick={() => setDeleteConfirm(null)}
                     className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                   >
                     Hủy bỏ
                   </button>
                   <button 
                     onClick={() => handleDeleteDocument(deleteConfirm)}
                     className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl transition-all shadow-sm"
                   >
                     Xác nhận Xóa
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Đang xử lý văn bản PDF</h3>
            <p className="text-xs text-slate-500 mb-6">Hệ thống đang tự động trích xuất cấu trúc Chương/Điều và tạo chỉ mục Vector Search...</p>
            <div className="w-full space-y-3 text-left text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2.5 text-emerald-600 font-semibold bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1. Nạp tệp PDF vào hệ thống máy chủ</span>
              </div>
              <div className="flex items-center gap-2.5 text-blue-600 font-semibold bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>2. Bóc tách Chương & Điều luật (pypdf fast parser)</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"></div>
                <span>3. Tái lập Vector Embedding FAISS & SQLite</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
