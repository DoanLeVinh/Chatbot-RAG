import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, Shield } from 'lucide-react';

export default function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', email: '', full_name: '', password: '' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setIsEditMode(true);
      setFormData({ id: user.id, email: user.email, full_name: user.full_name, password: '' });
    } else {
      setIsEditMode(false);
      setFormData({ id: '', email: '', full_name: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        const payload: any = { email: formData.email, fullName: formData.full_name };
        if (formData.password) payload.password = formData.password;
        const res = await fetch(`/api/admin/users/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) fetchUsers();
      } else {
        const payload = { email: formData.email, fullName: formData.full_name, password: formData.password || '123456' };
        const res = await fetch(`/api/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) fetchUsers();
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#131b2e] mb-2">Quản lý Tài khoản</h1>
          <p className="text-[#5c6b8b]">Xem và quản lý danh sách người dùng hệ thống</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#0038b8] hover:bg-[#002f9c] text-white px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(0,56,184,0.3)] active:scale-[0.98]">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Thêm người dùng</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e5e9f0] overflow-hidden">
        <div className="p-4 border-b border-[#e5e9f0] flex items-center gap-4 bg-[#fbfcfd]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8c9bab]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email, tên..."
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
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold">Quyền hạn</th>
                <th className="px-6 py-4 font-semibold">Ngày tham gia</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9f0]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#8c9bab]">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#8c9bab]">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#fbfcfd] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0038b8] to-[#0057ff] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#131b2e]">{user.full_name}</div>
                          <div className="text-sm text-[#5c6b8b]">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eef3fc] text-[#0038b8] text-sm font-medium border border-[#d0e1fb]">
                        <Shield className="w-3.5 h-3.5" />
                        Người dùng
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5c6b8b] text-sm">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(user)} className="p-2 text-[#5c6b8b] hover:text-[#0038b8] hover:bg-[#eef3fc] rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-[#5c6b8b] hover:text-[#e53e3e] hover:bg-[#fff5f5] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#e5e9f0]">
              <h2 className="text-xl font-bold text-[#131b2e]">
                {isEditMode ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
              </h2>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#131b2e] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#131b2e] mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#131b2e] mb-1.5">
                  Mật khẩu {isEditMode && <span className="text-xs text-[#8c9bab] font-normal">(Bỏ trống nếu không đổi)</span>}
                </label>
                <input
                  type={isEditMode ? "password" : "text"}
                  required={!isEditMode}
                  value={formData.password}
                  placeholder={!isEditMode ? "Mặc định: 123456" : ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-[#d3dce6] rounded-xl outline-none focus:border-[#0038b8] focus:ring-1 focus:ring-[#0038b8]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#d3dce6] text-[#4a5568] font-medium rounded-xl hover:bg-[#f8fafc] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0038b8] text-white font-medium rounded-xl hover:bg-[#002f9c] transition-colors"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
