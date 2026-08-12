import React, { useState, useEffect } from 'react';
import { Search, Edit2, FileText, Save, X } from 'lucide-react';

export default function DocumentManager() {
  const [chunks, setChunks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingChunk, setEditingChunk] = useState<any>(null);
  const [editForm, setEditForm] = useState({ text: '', article_ids: '', chapter: '' });

  const fetchChunks = async () => {
    try {
      const res = await fetch('/api/admin/chunks');
      const data = await res.json();
      if (data.success) {
        setChunks(data.chunks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChunks();
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editForm.text,
          article_ids: editForm.article_ids.split(',').map(s => s.trim()).filter(Boolean),
          chapter: editForm.chapter,
        }),
      });
      if (res.ok) {
        setChunks(chunks.map(c => c.parent_id === editingChunk.parent_id ? { ...c, text: editForm.text, article_ids: editForm.article_ids.split(',').map(s => s.trim()).filter(Boolean), chapter: editForm.chapter } : c));
        setEditingChunk(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredChunks = chunks.filter(
    (c) =>
      c.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.source?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#131b2e] mb-2">Quản lý Tài liệu (PDF Chunks)</h1>
          <p className="text-[#5c6b8b]">Xem và điều chỉnh nội dung các điều khoản luật đã bóc tách</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e5e9f0] overflow-hidden">
        <div className="p-4 border-b border-[#e5e9f0] flex items-center gap-4 bg-[#fbfcfd]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8c9bab]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo nội dung, tên file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f7fb] text-[#5c6b8b] text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold w-1/4">Nguồn File & Điều</th>
                <th className="px-6 py-4 font-semibold w-2/3">Nội dung (Text)</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9f0]">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[#8c9bab]">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredChunks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[#8c9bab]">
                    Không tìm thấy điều khoản nào
                  </td>
                </tr>
              ) : (
                filteredChunks.map((chunk) => (
                  <tr key={chunk.parent_id} className="hover:bg-[#fbfcfd] transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-[#0038b8] flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          {chunk.source || 'Unknown'}
                        </span>
                        <div className="text-sm text-[#131b2e] font-medium mt-1">
                          {(chunk.article_ids || []).join(', ')}
                        </div>
                        <div className="text-xs text-[#5c6b8b]">{chunk.chapter}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-[#4a5568] line-clamp-3 leading-relaxed">
                        {chunk.text}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <button
                        onClick={() => handleEditClick(chunk)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0038b8] bg-[#eef3fc] hover:bg-[#d0e1fb] rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e5e9f0] flex justify-between items-center bg-[#fbfcfd]">
              <h2 className="text-xl font-bold text-[#131b2e]">Điều chỉnh nội dung Điều khoản</h2>
              <button onClick={() => setEditingChunk(null)} className="p-2 text-[#8c9bab] hover:text-[#131b2e] bg-white rounded-full border border-[#e5e9f0]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Điều Luật (các Điều xuất hiện)</label>
                <input
                  type="text"
                  value={editForm.article_ids}
                  onChange={e => setEditForm({ ...editForm, article_ids: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8]"
                  placeholder="VD: Điều 1, Điều 2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Chương</label>
                <input
                  type="text"
                  value={editForm.chapter}
                  onChange={e => setEditForm({ ...editForm, chapter: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8]"
                  placeholder="VD: CHƯƠNG I"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Nội dung chi tiết</label>
                <textarea
                  value={editForm.text}
                  onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2.5 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8] font-mono text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e5e9f0] bg-[#fbfcfd] flex justify-end gap-3">
              <button
                onClick={() => setEditingChunk(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-[#4a5568] bg-white border border-[#d3dce6] hover:bg-[#f4f7fb] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-[#0038b8] hover:bg-[#002f9c] transition-all shadow-md active:scale-[0.98]"
              >
                <Save className="w-5 h-5" />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
