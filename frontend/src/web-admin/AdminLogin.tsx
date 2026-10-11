import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogiChatLogo } from '../shared/components/LogiChatLogo';
import { WaterRippleEffect } from '../shared/components/WaterRippleEffect';
import { Lock, Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot_request' | 'forgot_reset'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setDemoOtp(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của Quản trị viên.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Mã OTP đã được gửi đến email quản trị.');
        if (data.demo_otp) {
          setDemoOtp(data.demo_otp);
        }
        setView('forgot_reset');
      } else {
        setError(data.error || 'Không tìm thấy tài khoản với email này.');
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp.trim() || otp.trim().length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không trùng khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('Đổi mật khẩu Quản trị viên thành công! Vui lòng đăng nhập.');
        setTimeout(() => {
          setView('login');
          resetState();
        }, 1800);
      } else {
        setError(data.error || 'Mã OTP không đúng hoặc đã hết hạn.');
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ. Vui lòng thử lại.');
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
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20 shadow-inner">
            <LogiChatLogo className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
            LogiAdmin
          </h1>
          <p className="text-slate-400 text-xs text-center">
            {view === 'login' && 'Hệ thống Quản trị & Điều hành Dữ liệu Bảo mật'}
            {view === 'forgot_request' && 'Khôi phục Mật khẩu Quản trị viên'}
            {view === 'forgot_reset' && 'Xác thực OTP & Thiết lập Mật khẩu Mới'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* View 1: Form Đăng nhập Admin */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="adminEmail" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="adminEmail"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@logichat.vn"
                  className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="adminPassword" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot_request');
                    resetState();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="adminPassword"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed border border-blue-400/20 text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Đăng nhập hệ thống <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* View 2: Form Quên mật khẩu Admin - Bước 1: Yêu cầu OTP */}
        {view === 'forgot_request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="adminForgotEmail" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Email Quản trị viên
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="adminForgotEmail"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@logichat.vn"
                  className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Gửi mã xác thực (OTP)
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  resetState();
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* View 3: Form Quên mật khẩu Admin - Bước 2: Nhập OTP & Đặt mật khẩu */}
        {view === 'forgot_reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            {demoOtp && (
              <div
                onClick={() => setOtp(demoOtp)}
                className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center justify-between"
                title="Bấm để tự điền mã OTP này"
              >
                <div>💡 Mã OTP demo: <span className="font-mono font-bold text-amber-200">{demoOtp}</span></div>
                <span className="text-[11px] text-blue-400 underline font-semibold">Điền</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="adminOtp" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Mã OTP (6 chữ số)
              </label>
              <input
                id="adminOtp"
                name="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-slate-800/50 border border-white/10 text-white font-mono text-center tracking-[0.3em] font-bold text-base py-2 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="adminNewPassword" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Mật khẩu mới
              </label>
              <input
                id="adminNewPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 px-4 py-2 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="adminConfirmNewPassword" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="adminConfirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 px-4 py-2 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận đổi mật khẩu
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                Gửi lại OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  resetState();
                }}
                className="hover:text-white"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            &larr; Quay lại giao diện người dùng LogiChat
          </button>
        </div>
      </div>
    </div>
  );
}
