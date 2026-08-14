import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogiChatLogo } from '../shared/components/LogiChatLogo';
import { WaterRippleEffect } from '../shared/components/WaterRippleEffect';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.user?.role !== 'admin') {
          setError('Tài khoản này không có quyền Quản trị viên (Admin).');
          return;
        }
        sessionStorage.setItem('logichat_admin_token', data.token);
        onLoginSuccess();
      } else {
        setError(data.error || 'Email hoặc mật khẩu không đúng');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 flex items-center justify-center selection:bg-blue-500/30">
      {/* Background Water Ripple Effect */}
      <div className="absolute inset-0 z-0">
        <WaterRippleEffect interactive={true} opacity={0.4} />
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] z-0 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] z-0 pointer-events-none" />

      {/* Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
            <LogiChatLogo className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            LogiAdmin
          </h1>
          <p className="text-slate-300 text-sm text-center">
            Hệ thống Quản trị & Điều hành Dữ liệu Bảo mật
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="adminEmail" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="adminEmail"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@logichat.vn"
                className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="adminPassword" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="adminPassword"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed border border-blue-400/20"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Đăng nhập hệ thống <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Quay lại LogiChat
          </button>
        </div>
      </div>
    </div>
  );
}
