import React, { useState } from 'react';
import { Mail, Lock, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'forgot';
  onClose: () => void;
  onSuccess: (userName: string, userInfo?: { id: string; email: string; fullName: string }, token?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'verify_reset'>('request_otp');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // State phục vụ quên mật khẩu
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setDemoOtp(null);
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setForgotStep('request_otp');
    resetFormState();
  };

  // Xử lý Đăng nhập & Đăng ký
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp!');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: any = { email, password };
      if (mode === 'register') {
        body.fullName = fullName;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const name = data.user.fullName || fullName || email.split('@')[0] || 'Khách hàng LogiChat';
        onSuccess(name, data.user, data.token);
        onClose();
        resetFormState();
        setEmail('');
        setFullName('');
      } else {
        setError(data.error || 'Đã xảy ra lỗi. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      const name = fullName || email.split('@')[0] || 'Khách hàng LogiChat';
      onSuccess(name, { id: `local-${Date.now()}`, email, fullName: name });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 1: Yêu cầu gửi mã OTP quên mật khẩu
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
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
        setSuccessMessage(data.message || 'Mã xác nhận (OTP) đã được gửi đến email của bạn.');
        if (data.demo_otp) {
          setDemoOtp(data.demo_otp);
        }
        setForgotStep('verify_reset');
      } else {
        setError(data.error || 'Không tìm thấy tài khoản với email này.');
      }
    } catch (err: any) {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!otp.trim() || otp.trim().length < 6) {
      setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
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
        setSuccessMessage('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
        setPassword(newPassword);
        setTimeout(() => {
          setMode('login');
          setForgotStep('request_otp');
          resetFormState();
          setPassword('');
        }, 1800);
      } else {
        setError(data.error || 'Mã xác nhận (OTP) không chính xác hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] max-w-md w-full p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] border border-white/30 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Tab Switcher (Chỉ hiển thị khi ở mode Login hoặc Register) */}
        {mode !== 'forgot' ? (
          <div className="flex border-b border-blue-200 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-blue-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-blue-600'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              {forgotStep === 'request_otp' ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {forgotStep === 'request_otp'
                ? 'Nhập địa chỉ email tài khoản để nhận mã xác thực OTP 6 chữ số.'
                : `Nhập mã xác thực đã gửi tới ${email} và thiết lập mật khẩu mới.`}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Đăng nhập & Đăng ký */}
        {mode !== 'forgot' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="authFullNameInput" className="block text-xs font-bold text-slate-900 mb-1">
                  Họ và tên doanh nghiệp / Cá nhân
                </label>
                <input
                  id="authFullNameInput"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  autoComplete="name"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A - Công ty XNK"
                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label htmlFor="authEmailInput" className="block text-xs font-bold text-slate-900 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  id="authEmailInput"
                  name="email"
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doanhnghiep@logichat.vn"
                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="authPasswordInput" className="block text-xs font-bold text-slate-900">
                  Mật khẩu
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input
                id="authPasswordInput"
                name="password"
                type="password"
                required
                value={password}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="authConfirmPasswordInput" className="block text-xs font-bold text-slate-900 mb-1">
                  Xác nhận lại mật khẩu
                </label>
                <input
                  id="authConfirmPasswordInput"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-[#1e293b] transition-all shadow-[0_8px_16px_-4px_rgba(19,27,46,0.2)] active:scale-[0.98] mt-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  Đang xử lý...
                </span>
              ) : (
                mode === 'login' ? 'Đăng nhập vào LogiChat' : 'Tạo tài khoản miễn phí'
              )}
            </button>
          </form>
        )}

        {/* Form Quên mật khẩu - Bước 1: Nhập email gửi OTP */}
        {mode === 'forgot' && forgotStep === 'request_otp' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="forgotEmailInput" className="block text-xs font-bold text-slate-900 mb-1">
                Địa chỉ Email đã đăng ký
              </label>
              <div className="relative">
                <input
                  id="forgotEmailInput"
                  name="email"
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap-email-cua-ban@domain.vn"
                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang gửi mã xác thực...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Gửi mã xác nhận (OTP)
                </>
              )}
            </button>
          </form>
        )}

        {/* Form Quên mật khẩu - Bước 2: Nhập OTP & Đặt mật khẩu mới */}
        {mode === 'forgot' && forgotStep === 'verify_reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Banner gợi ý OTP nếu chạy chế độ dev/demo */}
            {demoOtp && (
              <div
                onClick={() => setOtp(demoOtp)}
                className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium cursor-pointer hover:bg-amber-100 transition-colors flex items-center justify-between"
                title="Bấm để tự động điền mã OTP này"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <div>
                    <span className="font-bold">Chế độ Thử nghiệm:</span> Mã OTP là{' '}
                    <span className="font-mono font-bold text-amber-700 tracking-wider bg-white px-1.5 py-0.5 rounded border border-amber-200">{demoOtp}</span>
                  </div>
                </div>
                <span className="text-[11px] text-blue-600 underline font-semibold ml-2">Điền nhanh</span>
              </div>
            )}

            <div>
              <label htmlFor="otpInput" className="block text-xs font-bold text-slate-900 mb-1">
                Mã xác nhận (OTP 6 chữ số)
              </label>
              <input
                id="otpInput"
                name="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] font-bold text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="newPasswordInput" className="block text-xs font-bold text-slate-900 mb-1">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <input
                id="newPasswordInput"
                name="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirmNewPasswordInput" className="block text-xs font-bold text-slate-900 mb-1">
                Xác nhận lại mật khẩu mới
              </label>
              <input
                id="confirmNewPasswordInput"
                name="confirmNewPassword"
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang cập nhật mật khẩu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận đổi mật khẩu
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-blue-600 hover:underline font-semibold"
              >
                Gửi lại mã OTP
              </button>
              <button
                type="button"
                onClick={() => setForgotStep('request_otp')}
                className="text-slate-500 hover:text-slate-800"
              >
                Đổi email khác
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-blue-100 text-center text-[11px] text-slate-500">
          Hệ thống bảo mật dữ liệu doanh nghiệp & tài khoản LogiChat AI.
        </div>
      </div>
    </div>
  );
};
