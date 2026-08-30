import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit2, FileText, Save, X, UploadCloud, Loader2, Plus, ChevronLeft, ChevronRight, ChevronDown, Trash2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

const TreeNode = ({ node, openEdit, handleDeleteChunk }: any) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className="mb-2">
      <div 
        className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {hasChildren ? (
            expanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />
          ) : (
            <div className="w-[18px]"></div>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
              {node.chapter}
            </span>
            {node.article_ids && node.article_ids.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                {node.article_ids.join(', ')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => openEdit(node)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Sửa chunk"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteChunk(node.node_id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Xóa chunk"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="ml-6 mt-2 pl-4 border-l-2 border-slate-200">
          {node.text && (
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-3 p-3 bg-slate-50 rounded-lg">
              {node.text}
            </div>
          )}
          {hasChildren && node.children.map((child: any) => (
            <TreeNode 
              key={child.node_id} 
              node={child} 
              openEdit={openEdit} 
              handleDeleteChunk={handleDeleteChunk} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DocumentManager() {
  // Navigation State
  const [view, setView] = useState<'docs' | 'chunks' | 'search'>('docs');
  
  // Data State
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Bulk Delete State
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Edit/Add State
  const [editingChunk, setEditingChunk] = useState<any>(null);
  const [editForm, setEditForm] = useState({ source: '', text: '', article_ids: '', chapter: '' });
  const [isAdding, setIsAdding] = useState(false);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('logichat_admin_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/docs/hierarchy', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.dispatchEvent(new Event('admin_logout'));
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDocs(data.hierarchy || []);
      }
    } catch (err: any) {
      showToast('error', 'Lỗi kết nối khi tải danh sách.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === 'docs') {
      fetchDocs();
      
      // Auto-refresh logic if any document is processing
      interval = setInterval(() => {
        setDocs(prevDocs => {
          if (prevDocs.some(d => d.status === 'processing')) {
            fetch('/api/admin/docs/hierarchy', { headers: getAuthHeaders() })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setDocs(data.hierarchy || []);
                }
              })
              .catch(() => {});
          }
          return prevDocs;
        });
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view]);
  const loadChunksForSource = async (source: string) => {
    setIsLoading(true);
    setSelectedSource(source);
    setView('chunks');
    try {
      const res = await fetch(`/api/admin/docs/${encodeURIComponent(source)}/chunks`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setChunks(data.chunks);
      }
    } catch (err) {
      showToast('error', 'Lỗi tải danh sách chunk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setView('docs');
      return;
    }
    
    setIsLoading(true);
    setView('search');
    try {
      const res = await fetch(`/api/admin/chunks/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.chunks);
      } else {
        showToast('error', 'Lỗi tìm kiếm.');
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối khi tìm kiếm.');
    } finally {
      setIsLoading(false);
    }
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
        headers: {
           // Don't set Content-Type here, let browser set it for FormData
          'Authorization': `Bearer ${sessionStorage.getItem('logichat_admin_token')}`
        },
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Tải lên thành công!');
        fetchDocs();
      } else {
        showToast('error', 'Lỗi: ' + (data.error || data.detail));
      }
    } catch (err: any) {
      showToast('error', 'Lỗi tải lên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/docs/sync-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Đang bắt đầu quét & đồng bộ tất cả PDF...');
        fetchDocs();
      } else {
        showToast('error', 'Lỗi: ' + (data.detail || data.error));
      }
    } catch (err: any) {
      showToast('error', 'Lỗi kết nối khi gửi lệnh đồng bộ.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDoc = async (source: string) => {
    if (!window.confirm(`Bạn có chắc chắn xóa TẤT CẢ chunk của tài liệu "${source}"? Hành động này không thể hoàn tác.`)) return;
    
    try {
      const res = await fetch(`/api/admin/docs/${encodeURIComponent(source)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('success', 'Đã xóa tài liệu.');
        setSelectedDocs(prev => prev.filter(s => s !== source));
        fetchDocs();
      } else {
        showToast('error', 'Không thể xóa tài liệu.');
      }
    } catch (err) {
      showToast('error', 'Lỗi xóa tài liệu.');
    }
  };

  const handleDeleteSelectedDocs = async () => {
    if (selectedDocs.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn xóa ${selectedDocs.length} tài liệu đã chọn? Hành động này không thể hoàn tác.`)) return;

    setIsLoading(true);
    try {
      let successCount = 0;
      await Promise.all(
        selectedDocs.map(async (source) => {
          const res = await fetch(`/api/admin/docs/${encodeURIComponent(source)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (res.ok) successCount++;
        })
      );
      
      if (successCount > 0) {
        showToast('success', `Đã xóa thành công ${successCount}/${selectedDocs.length} tài liệu.`);
        setSelectedDocs([]);
        fetchDocs();
      } else {
        showToast('error', 'Không thể xóa tài liệu nào.');
      }
    } catch (err) {
      showToast('error', 'Lỗi khi xóa hàng loạt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChunk = async (parentId: string) => {
    if (!window.confirm('Bạn có chắc chắn xóa chunk này?')) return;
    try {
      const res = await fetch(`/api/admin/chunks/${encodeURIComponent(parentId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('success', 'Đã xóa chunk.');
        if (view === 'chunks' && selectedSource) loadChunksForSource(selectedSource);
        if (view === 'search') handleSearch({ preventDefault: () => {} } as any);
      }
    } catch (err) {
      showToast('error', 'Lỗi xóa chunk.');
    }
  };

  const handleSaveChunk = async () => {
    try {
      const payload = {
        source: editForm.source,
        text: editForm.text,
        chapter: editForm.chapter,
        article_ids: editForm.article_ids.split(',').map(x => x.trim()).filter(Boolean)
      };

      let res;
      if (isAdding) {
        res = await fetch(`/api/admin/chunks`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/admin/chunks/${encodeURIComponent(editingChunk.parent_id)}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast('success', isAdding ? 'Thêm chunk thành công' : 'Đã cập nhật chunk');
        setEditingChunk(null);
        setIsAdding(false);
        if (view === 'chunks' && selectedSource) loadChunksForSource(selectedSource);
        if (view === 'search') handleSearch({ preventDefault: () => {} } as any);
      }
    } catch (err) {
      showToast('error', 'Lỗi lưu chunk.');
    }
  };

  const openEdit = (chunk: any) => {
    setEditingChunk(chunk);
    setIsAdding(false);
    setEditForm({
      source: chunk.source || '',
      text: chunk.text || '',
      article_ids: (chunk.article_ids || []).join(', '),
      chapter: chunk.chapter || ''
    });
  };

  const openAdd = () => {
    setEditingChunk(null);
    setIsAdding(true);
    setEditForm({
      source: selectedSource || '',
      text: '',
      article_ids: '',
      chapter: ''
    });
  };

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Tài liệu & Chunks</h1>
            <p className="text-slate-500 text-sm mt-1">Tìm kiếm tương đồng, chỉnh sửa ngữ nghĩa pháp luật</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-70"
              title="Tự động băm nhỏ và cập nhật toàn bộ PDF chưa xử lý trong thư mục papers/"
            >
              {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {isSyncing ? 'Đang đồng bộ AI...' : '⚡ Đồng bộ tất cả PDF'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              {isUploading ? 'Đang tải lên...' : 'Tải PDF lên'}
            </button>
          </div>
        </div>

        {/* Semantic Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm tương đồng (VD: Thuế tiêu thụ đặc biệt ô tô, Điều 184)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-32 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm font-medium shadow-sm"
          />
          <div className="absolute inset-y-1.5 right-1.5 flex gap-2">
            {view === 'search' && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setView('docs'); }}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors shadow-sm"
              >
                X
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Breadcrumbs / View Header */}
          {(view === 'chunks' || view === 'search') && (
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200/60 bg-slate-50/50">
              <button 
                onClick={() => setView('docs')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <ChevronLeft size={18} />
                Quay lại danh sách
              </button>
              
              <button
                onClick={openAdd}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={16} /> Thêm Chunk
              </button>
            </div>
          )}

          {/* VIEW: DOCS */}
          {view === 'docs' && (
            <div className="flex flex-col">
              {docs.length === 0 ? (
                <div className="p-10 text-center text-slate-500">Chưa có tài liệu nào.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDocs.length === docs.length && docs.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocs(docs.map(d => d.source));
                          } else {
                            setSelectedDocs([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-slate-600">
                        {selectedDocs.length > 0 ? `Đã chọn ${selectedDocs.length} tài liệu` : 'Chọn tất cả'}
                      </span>
                    </div>
                    {selectedDocs.length > 0 && (
                      <button
                        onClick={handleDeleteSelectedDocs}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Trash2 size={16} />
                        Xóa mục đã chọn
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {docs.map((doc, idx) => {
                      const isProcessing = doc.status === 'processing';
                      const isSelected = selectedDocs.includes(doc.source);
                      return (
                      <div key={idx} className={`flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocs(prev => [...prev, doc.source]);
                              } else {
                                setSelectedDocs(prev => prev.filter(s => s !== doc.source));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isProcessing ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                          </div>
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-1">{doc.source}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {isProcessing ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                              Đang xử lý AI...
                            </span>
                          ) : (
                            <p className="text-sm text-slate-500 font-medium">{doc.total_chunks} chunks</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteDoc(doc.source)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (isProcessing) {
                            showToast('error', 'Tài liệu đang được phân tích và bóc tách. Vui lòng chờ...');
                          } else {
                            loadChunksForSource(doc.source);
                          }
                        }}
                        className={`px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                          isProcessing 
                            ? 'text-slate-400 cursor-not-allowed opacity-70' 
                            : 'text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        Xem các chunk
                      </button>
                    </div>
                  </div>
                )})}
                </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: CHUNKS or SEARCH RESULTS */}
          {(view === 'chunks' || view === 'search') && (
            <div className="p-6 bg-slate-50/50 flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                {view === 'search' ? `Kết quả tìm kiếm cho "${searchQuery}"` : `Các chunk của ${selectedSource}`}
              </h2>
              
              <div className="flex flex-col gap-2">
                {((view === 'chunks' ? chunks : searchResults) || []).map((chunk: any, idx: number) => (
                  <TreeNode 
                    key={chunk.node_id || idx} 
                    node={chunk} 
                    openEdit={openEdit} 
                    handleDeleteChunk={handleDeleteChunk} 
                  />
                ))}
                
                {((view === 'chunks' ? chunks : searchResults) || []).length === 0 && (
                  <div className="text-center py-10 text-slate-500">
                    Không có dữ liệu phù hợp.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {(editingChunk || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {isAdding ? 'Thêm Chunk Mới' : 'Sửa Chunk Nội Dung'}
              </h2>
              <button 
                onClick={() => { setEditingChunk(null); setIsAdding(false); }}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              {isAdding && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tài liệu Nguồn (Source)</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    value={editForm.source}
                    onChange={(e) => setEditForm({...editForm, source: e.target.value})}
                    placeholder="Tên tài liệu gốc..."
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Chương / Phần</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    value={editForm.chapter}
                    onChange={(e) => setEditForm({...editForm, chapter: e.target.value})}
                    placeholder="VD: Chương I"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mã Điều Khoản (Article IDs)</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    value={editForm.article_ids}
                    onChange={(e) => setEditForm({...editForm, article_ids: e.target.value})}
                    placeholder="VD: Điều 1, Điều 2..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nội dung Chunk (Text)</label>
                <textarea
                  className="w-full h-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none leading-relaxed"
                  value={editForm.text}
                  onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                  placeholder="Nhập nội dung chi tiết của chunk..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => { setEditingChunk(null); setIsAdding(false); }}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200/50 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveChunk}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Save size={18} /> Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Scrollbar CSS inject */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
