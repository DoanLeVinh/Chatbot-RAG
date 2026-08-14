import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (userName: string, userInfo?: { id: string; email: string; fullName: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        onSuccess(name, data.user);
        onClose();
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
      } else {
        setError(data.error || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } catch (err: any) {
      const name = fullName || email.split('@')[0] || 'Khách hàng LogiChat';
      onSuccess(name, { id: `local-${Date.now()}`, email, fullName: name });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] max-w-md w-full p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] border border-white/30 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-600 hover:text-blue-600 p-1"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Tab Switcher */}
        <div className="flex border-b border-blue-200 mb-6">
          <button
            onClick={() => { setMode('login'); setError(null); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-blue-600'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-blue-600'
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A - Công ty XNK"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="authEmailInput" className="block text-xs font-bold text-slate-900 mb-1">
              Địa chỉ Email
            </label>
            <input
              id="authEmailInput"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doanhnghiep@logichat.vn"
              className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="authPasswordInput" className="block text-xs font-bold text-slate-900 mb-1">
              Mật khẩu
            </label>
            <input
              id="authPasswordInput"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
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

        <div className="mt-4 pt-4 border-t border-blue-200 text-center text-xs text-slate-600">
          Bằng việc đăng nhập, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của LogiChat AI.
        </div>
      </div>
    </div>
  );
};
