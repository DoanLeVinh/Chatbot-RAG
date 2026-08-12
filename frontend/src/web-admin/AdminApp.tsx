import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogiChatLogo } from '../shared/components/LogiChatLogo';
import UserManager from './UserManager';
import DocumentManager from './DocumentManager';
import { Users, FileText, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('logichat_user');
    navigate('/');
  };

  const navItems = [
    { path: '/admin/users', label: 'Tài khoản', icon: Users },
    { path: '/admin/docs', label: 'Tài liệu Pháp lý', icon: FileText },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f4f7fb] text-[#131b2e] font-sans selection:bg-[#d0e1fb] selection:text-[#00236f]">
      {/* Admin Sidebar */}
      <div className="w-[280px] bg-white border-r border-[#e5e9f0] flex flex-col relative z-20">
        <div className="p-6 pb-2 border-b border-[#e5e9f0]/50">
          <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => navigate('/')}>
            <LogiChatLogo className="w-8 h-8" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0038b8] to-[#0057ff]">
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
                    : 'text-[#4a5568] hover:bg-[#f8fafc] hover:text-[#131b2e]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0038b8]' : 'text-[#8c9bab]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e5e9f0]/50 space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#4a5568] hover:bg-[#f8fafc] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[#8c9bab]" />
            <span className="font-medium">Quay lại LogiChat</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#e53e3e] hover:bg-[#fff5f5] transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative">
        <Routes>
          <Route path="/" element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserManager />} />
          <Route path="docs" element={<DocumentManager />} />
        </Routes>
      </div>
    </div>
  );
}
