import React, { useState } from 'react';
import { Header } from '../shared/components/Header';
interface LandingPageProps {
  onStartChat: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  currentUser?: { fullName: string } | null;
  onLogout?: () => void;
}

import { motion } from 'motion/react';

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onLoginClick,
  onRegisterClick,
  currentUser,
  onLogout,
}) => {
  const [demoInputValue, setDemoInputValue] = useState('');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoQueryState, setDemoQueryState] = useState<'default' | 'typed' | 'analyzed'>('default');

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoInputValue.trim()) return;
    setDemoQueryState('analyzed');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-700">
      {/* Top Header */}
      <Header
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onGoHome={() => {}}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-4 md:px-8 py-6 md:py-10 relative z-10">
        <div className="max-w-7xl w-full mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Left Hero Text Column */}
          <motion.div 
            className="flex flex-col gap-6 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* AI Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold w-max border border-blue-100">
              <span className="material-symbols-outlined text-[16px] text-blue-600">
                verified
              </span>
              <span>Trợ lý Pháp lý AI</span>
            </motion.div>

            {/* Headline */}
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] tracking-tight max-w-2xl">
                Tra Cứu Luật Hải Quan Chính Xác & Tin Cậy.
              </h1>
            </motion.div>

            {/* Description */}
            <motion.div variants={itemVariants}>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                LogiChat ứng dụng AI tiên tiến để phân tích và giải đáp các quy định xuất nhập khẩu phức tạp, trích xuất dữ liệu trực tiếp từ các văn bản pháp luật chính thức.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={onStartChat}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer text-sm"
              >
                <span>Bắt đầu ngay</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <button
                onClick={() => setShowDemoModal(true)}
                className="bg-white text-slate-800 border border-slate-200 px-5 py-2.5 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
              >
                <span className="material-symbols-outlined text-lg text-slate-600">
                  play_circle
                </span>
                <span>Xem Demo</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Bento Box Case Analysis Engine Graphic */}
          <div className="relative w-full h-[480px] sm:h-[520px]">
            {/* Minimalist Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            {/* Main Interactive Preview Card */}
            <div className="absolute inset-0 bg-white/80 rounded-2xl border border-blue-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex flex-col gap-4 overflow-hidden backdrop-blur-md">
              {/* Card Header */}
              <div className="flex items-center gap-2 border-b border-blue-50 pb-3">
                <span className="material-symbols-outlined text-blue-600 text-xl">
                  gavel
                </span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  HỆ THỐNG PHÂN TÍCH
                </span>
              </div>

              {/* Chat Interface Preview */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                {/* User Message Bubble */}
                <div className="self-end bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] text-xs sm:text-sm font-medium leading-relaxed shadow-sm">
                  {demoQueryState === 'analyzed' && demoInputValue
                    ? demoInputValue
                    : 'Mức thuế nhập khẩu linh kiện điện tử mã HS 8542.31 là bao nhiêu?'}
                </div>

                {/* AI Response Bubble */}
                <div className="self-start bg-white text-slate-900 border border-blue-200 p-3.5 rounded-2xl rounded-tl-none max-w-[92%] text-xs sm:text-sm flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 text-blue-600 mb-2">
                    <span className="material-symbols-outlined text-lg">
                      psychology
                    </span>
                    <span className="font-bold text-xs uppercase tracking-wider">
                      PHÂN TÍCH TỪ LOGICHAT
                    </span>
                  </div>

                  <p className="leading-relaxed text-slate-900">
                    Dựa trên biểu thuế hiện hành, mã HS 8542.31 (Mạch điện tử tích hợp - Bộ xử lý và bộ điều khiển) được hưởng mức thuế nhập khẩu ưu đãi 0% theo Hiệp định Công nghệ Thông tin WTO (ITA).
                  </p>

                  {/* Citation Source Chips */}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded text-[11px] font-mono hover:bg-blue-700 shadow-sm transition-colors cursor-pointer font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                      Nghị định 122/2016/NĐ-CP
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded text-[11px] font-mono hover:bg-blue-700 shadow-sm transition-colors cursor-pointer font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                      Thông tư 65/2017/TT-BTC
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Area Preview */}
              <form onSubmit={handleDemoSubmit} className="mt-auto border border-blue-600 rounded-xl p-1.5 flex items-center bg-blue-50 focus-within:ring-2 focus-within:ring-blue-600/30 transition-all">
                <span className="material-symbols-outlined text-[#757682] mx-2 text-xl">
                  attach_file
                </span>
                <input
                  id="landingDemoInput"
                  name="demoQuery"
                  type="text"
                  value={demoInputValue}
                  onChange={(e) => setDemoInputValue(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc mã HS..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm text-slate-900 placeholder-[#757682]"
                />
                <button
                  type="submit"
                  onClick={onStartChat}
                  className="bg-blue-600 text-white rounded-lg p-2 flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Thử tư vấn ngay"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white text-slate-500 text-xs py-6 px-6 md:px-12 w-full border-t border-blue-100 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-slate-600">
            © 2024 LogiChat AI. Đã đăng ký bản quyền.
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 font-medium">
            <a href="#" className="hover:text-blue-600 transition-colors">
              Điều khoản sử dụng
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Chính sách bảo mật
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Liên hệ hỗ trợ
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Tuyên bố pháp lý
            </a>
          </div>
        </div>
      </footer>

      {/* Watch Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-blue-200 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-blue-200 pb-3">
              <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">
                  smart_toy
                </span>
                Demo Tra Cứu Hải Quan Bằng AI LogiChat
              </h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-slate-600 hover:text-blue-600 p-1"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
              <p className="text-sm text-slate-900 leading-relaxed">
                LogiChat tự động phân tích HS Code, tra cứu biểu thuế ưu đãi đặc biệt (AJCEP, VJEPA, EVFTA...), kiểm tra danh mục quản lý chuyên ngành và trích dẫn văn bản pháp luật Hải quan thời gian thực.
              </p>
              
              <div className="p-4 bg-white rounded-lg border border-blue-600/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  Ví dụ câu hỏi mẫu bạn có thể thử:
                </div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                  <li>"Thuế nhập khẩu linh kiện vi mạch điện tử HS 8542.31 từ Nhật Bản?"</li>
                  <li>"Thủ tục công bố tiêu chuẩn áp dụng cho Thiết bị y tế loại B?"</li>
                  <li>"Hồ sơ xin C/O mẫu E cho hàng dệt may xuất khẩu?"</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  onStartChat();
                }}
                className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Trải nghiệm Chat Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
