import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, Shield, ShieldAlert, CheckCircle2, AlertCircle, X, User, Lock, Mail } from 'lucide-react';

export default function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', email: '', full_name: '', password: '', role: 'user', subscription_plan: 'free' });
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('logichat_admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('admin_logout'));
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        showToast('error', data.detail || 'Không thể tải danh sách tài khoản.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi kết nối khi tải người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('admin_logout'));
        return;
      }
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id));
        showToast('success', 'Đã xóa tài khoản thành công.');
      } else {
        const errData = await res.json();
        showToast('error', errData.detail || 'Không thể xóa tài khoản.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi kết nối khi xóa.');
    } finally {
      setDeleteConfirmUser(null);
    }
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setIsEditMode(true);
      setFormData({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        password: '',
        role: user.role || 'user',
        subscription_plan: user.subscription_plan || 'free',
      });
    } else {
      setIsEditMode(false);
      setFormData({
        id: '',
        email: '',
        full_name: '',
        password: '',
        role: 'user',
        subscription_plan: 'free',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        const payload: any = {
          email: formData.email,
          fullName: formData.full_name,
          role: formData.role,
          subscription_plan: formData.subscription_plan,
        };
        if (formData.password) payload.password = formData.password;
        
        const res = await fetch(`/api/admin/users/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          showToast('success', 'Đã cập nhật thông tin người dùng thành công.');
          fetchUsers();
          setIsModalOpen(false);
        } else {
          const errData = await res.json();
          showToast('error', errData.detail || 'Không thể cập nhật người dùng.');
        }
      } else {
        const payload = {
          email: formData.email,
          fullName: formData.full_name,
          password: formData.password || '123456',
          role: formData.role,
        };
        const res = await fetch(`/api/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          showToast('success', 'Tạo tài khoản người dùng mới thành công.');
          fetchUsers();
          setIsModalOpen(false);
        } else {
          const errData = await res.json();
          showToast('error', errData.detail || 'Không thể tạo người dùng.');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi kết nối khi lưu.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Toast */}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Quản lý Tài khoản & Phân quyền</h1>
          <p className="text-slate-600 text-sm mt-1">Danh sách người dùng hệ thống LogiChat và gán quyền Quản trị viên (RBAC)</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm người dùng</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="userSearchInput"
              name="userSearch"
              type="text"
              placeholder="Tìm theo email hoặc họ tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            {filteredUsers.length} tài khoản
          </span>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3.5">Người dùng</th>
                <th className="px-6 py-3.5">Vai trò (Role)</th>
                <th className="px-6 py-3.5">Gói cước</th>
                <th className="px-6 py-3.5">Ngày tạo</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Không tìm thấy người dùng nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{user.full_name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Shield className="w-3.5 h-3.5 text-amber-600" />
                          Quản trị viên
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                          Người dùng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.subscription_plan === 'pro' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          Logi Pro
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          Miễn phí
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {user.created_at || 'Mặc định'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa"
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

      {/* User Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                {isEditMode ? 'Chỉnh sửa tài khoản' : 'Thêm người dùng mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label htmlFor="userFullNameInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Họ và Tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="userFullNameInput"
                    name="fullName"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="userEmailInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="userEmailInput"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="userPasswordInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isEditMode ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="userPasswordInput"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                    placeholder={isEditMode ? '••••••••' : 'Nhập mật khẩu (mặc định: 123456)'}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="userRoleSelect" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Vai trò (Phân quyền)</label>
                <select
                  id="userRoleSelect"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-medium"
                >
                  <option value="user">Người dùng thông thường (User)</option>
                  <option value="admin">Quản trị viên hệ thống (Admin)</option>
                </select>
              </div>

              <div>
                <label htmlFor="userSubscriptionSelect" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Gói cước (Subscription)</label>
                <select
                  id="userSubscriptionSelect"
                  name="subscription_plan"
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-medium"
                >
                  <option value="free">Gói Miễn phí (Free)</option>
                  <option value="pro">Gói Cao cấp (Pro)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3 font-bold">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg text-slate-900">Xác nhận xóa tài khoản</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteConfirmUser.email}</strong> ({deleteConfirmUser.full_name})? Toàn bộ lịch sử hội thoại và tài liệu đính kèm liên quan sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmUser.id)}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-sm"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
