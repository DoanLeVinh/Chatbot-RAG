import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogiChatLogo } from '../shared/components/LogiChatLogo';
import DashboardOverview from './DashboardOverview';
import UserManager from './UserManager';
import DocumentManager from './DocumentManager';
import AdminLogin from './AdminLogin';
import { LayoutDashboard, Users, FileText, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Proactively clean up any stale legacy tokens in localStorage
    localStorage.removeItem('logichat_admin_token');

    const verifyToken = async () => {
      const adminToken = sessionStorage.getItem('logichat_admin_token');
      if (!adminToken) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.role === 'admin') {
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('logichat_admin_token');
            setIsAuthenticated(false);
          }
        } else {
          sessionStorage.removeItem('logichat_admin_token');
          setIsAuthenticated(false);
        }
      } catch (e) {
        sessionStorage.removeItem('logichat_admin_token');
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    verifyToken();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('logichat_admin_token');
    localStorage.removeItem('logichat_admin_token');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const onLogout = () => handleLogout();
    window.addEventListener('admin_logout', onLogout);
    return () => window.removeEventListener('admin_logout', onLogout);
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Đang kiểm tra quyền Quản trị...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const navItems = [
    { path: '/admin/dashboard', label: 'Tổng quan Hệ thống', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Tài khoản', icon: Users },
    { path: '/admin/docs', label: 'Tài liệu Pháp lý', icon: FileText },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Admin Sidebar */}
      <div className="w-[280px] bg-white border-r border-[#e5e9f0] flex flex-col relative z-20">
        <div className="p-6 pb-2 border-b border-[#e5e9f0]/50">
          <div className="flex items-center gap-2.5 mb-2 cursor-pointer" onClick={() => navigate('/')}>
            <LogiChatLogo iconOnly size="sm" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0038b8] to-[#0057ff] translate-y-0.5">
              LogiAdmin
            </h1>
          </div>
          <p className="text-xs text-[#5c6b8b] font-medium tracking-wider uppercase ml-10">Bảng điều khiển</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#eef3fc] text-[#0038b8] shadow-sm font-semibold'
                    : 'text-[#4a5568] hover:bg-[#f8fafc] hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0038b8]' : 'text-[#8c9bab]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#e5e9f0]/50 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#4a5568] hover:bg-[#f8fafc] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[#8c9bab]" />
            <span className="font-medium">Quay lại LogiChat</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#e53e3e] hover:bg-[#fff5f5] transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="users" element={<UserManager />} />
          <Route path="docs" element={<DocumentManager />} />
        </Routes>
      </div>
    </div>
  );
}
