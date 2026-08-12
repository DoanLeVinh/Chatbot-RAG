import React, { useState } from 'react';
import { Header } from '../shared/components/Header';
import { WaterRippleEffect } from '../shared/components/WaterRippleEffect';

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
    <div className="min-h-[100dvh] flex flex-col bg-[#faf8ff] text-[#131b2e] font-sans relative overflow-x-hidden selection:bg-[#d0e1fb] selection:text-[#00236f]">
      {/* Interactive Water Ripple Canvas Layer */}
      <WaterRippleEffect interactive={true} opacity={0.65} />

      {/* Top Header */}
      <Header
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onGoHome={() => {}}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center hero-pattern px-4 md:px-8 py-12 md:py-20 relative z-10">
        <div className="max-w-7xl w-full mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Left Hero Text Column */}
          <motion.div 
            className="flex flex-col gap-6 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* AI Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-[#e2e7ff] text-[#00236f] px-3 py-1 rounded-full text-xs font-semibold w-max border border-[#c5c5d3] shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-[#00236f]">
                verified
              </span>
              <span>AI-Powered Legal Assistant</span>
            </motion.div>

            {/* Headline */}
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#131b2e] leading-[1.15] tracking-tight max-w-2xl">
                Navigate Customs Law with Absolute Precision.
              </h1>
            </motion.div>

            {/* Description */}
            <motion.div variants={itemVariants}>
              <p className="text-base sm:text-lg text-[#444651] max-w-xl leading-relaxed">
                LogiChat leverages advanced AI to provide instant, accurate interpretations of complex import-export regulations, sourcing directly from official legal codes.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={onStartChat}
                className="bg-[#131b2e] text-white px-6 py-3.5 rounded-xl font-bold hover:bg-[#1e293b] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(19,27,46,0.15)] hover:shadow-[0_8px_20px_rgba(19,27,46,0.2)] cursor-pointer text-base"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>

              <button
                onClick={() => setShowDemoModal(true)}
                className="bg-white/80 backdrop-blur-sm text-[#131b2e] border border-[#c5c5d3] px-6 py-3.5 rounded-xl font-bold hover:bg-[#f2f3ff] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-base shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              >
                <span className="material-symbols-outlined text-xl text-[#131b2e]">
                  play_circle
                </span>
                <span>Watch Demo</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Bento Box Case Analysis Engine Graphic */}
          <div className="relative w-full h-[480px] sm:h-[520px]">
            {/* Background glowing water blobs */}
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-[#dce1ff] rounded-full blur-3xl opacity-50 animate-water-pulse pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-56 h-56 bg-[#d3e4fe] rounded-full blur-3xl opacity-50 animate-float-water pointer-events-none" />

            {/* Main Interactive Preview Card */}
            <div className="absolute inset-0 bg-white rounded-2xl border border-[#c5c5d3] shadow-[0_12px_40px_rgba(0,35,111,0.08)] p-5 flex flex-col gap-4 overflow-hidden backdrop-blur-sm">
              {/* Card Header */}
              <div className="flex items-center gap-2 border-b border-[#c5c5d3] pb-3">
                <span className="material-symbols-outlined text-[#00236f] text-xl">
                  gavel
                </span>
                <span className="text-xs font-bold text-[#444651] uppercase tracking-wider">
                  CASE ANALYSIS ENGINE
                </span>
              </div>

              {/* Chat Interface Preview */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                {/* User Message Bubble */}
                <div className="self-end bg-[#1e3a8a] text-[#90a8ff] p-3 rounded-2xl rounded-tr-none max-w-[85%] text-xs sm:text-sm font-medium leading-relaxed shadow-2xs">
                  {demoQueryState === 'analyzed' && demoInputValue
                    ? demoInputValue
                    : 'What are the tariff implications for importing electronic components under HS Code 8542.31?'}
                </div>

                {/* AI Response Bubble */}
                <div className="self-start bg-white text-[#131b2e] border border-[#c5c5d3] p-3.5 rounded-2xl rounded-tl-none max-w-[92%] text-xs sm:text-sm flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 text-[#00236f]">
                    <span className="material-symbols-outlined text-[18px]">
                      psychology
                    </span>
                    <span className="font-bold text-xs uppercase tracking-wider">
                      LogiChat Analysis
                    </span>
                  </div>

                  <p className="leading-relaxed text-[#131b2e]">
                    Based on the current customs tariff schedule, HS Code 8542.31 (Electronic integrated circuits - Processors and controllers) is subject to a standard import duty of 0% under the WTO Information Technology Agreement (ITA).
                  </p>

                  {/* Citation Source Chips */}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-[#e2e7ff] text-[#444651] px-2 py-1 rounded text-[11px] font-mono border border-[#c5c5d3] hover:bg-[#d2d9f4] transition-colors cursor-pointer">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Decree 122/2016/ND-CP
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#e2e7ff] text-[#444651] px-2 py-1 rounded text-[11px] font-mono border border-[#c5c5d3] hover:bg-[#d2d9f4] transition-colors cursor-pointer">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Circular 65/2017/TT-BTC
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Area Preview */}
              <form onSubmit={handleDemoSubmit} className="mt-auto border border-[#00236f] rounded-xl p-1.5 flex items-center bg-[#faf8ff] focus-within:ring-2 focus-within:ring-[#00236f]/30 transition-all">
                <span className="material-symbols-outlined text-[#757682] mx-2 text-xl">
                  attach_file
                </span>
                <input
                  type="text"
                  value={demoInputValue}
                  onChange={(e) => setDemoInputValue(e.target.value)}
                  placeholder="Enter scenario or HS code..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm text-[#131b2e] placeholder-[#757682]"
                />
                <button
                  type="submit"
                  onClick={onStartChat}
                  className="bg-[#00236f] text-white rounded-lg p-2 flex items-center justify-center hover:bg-[#1e3a8a] transition-all active:scale-95 cursor-pointer shadow-2xs"
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
      <footer className="bg-[#f2f3ff] text-[#505f76] text-xs py-6 px-6 md:px-12 w-full border-t border-[#c5c5d3] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-[#00236f]">
            © 2024 LogiChat AI. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 font-medium">
            <a href="#" className="hover:text-[#00236f] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#00236f] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#00236f] transition-colors">
              Contact Support
            </a>
            <a href="#" className="hover:text-[#00236f] transition-colors">
              Legal Disclaimer
            </a>
          </div>
        </div>
      </footer>

      {/* Watch Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#c5c5d3] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#c5c5d3] pb-3">
              <h3 className="font-bold text-lg text-[#00236f] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00236f]">
                  smart_toy
                </span>
                Demo Tra Cứu Hải Quan Bằng AI LogiChat
              </h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-[#444651] hover:text-[#00236f] p-1"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="bg-[#faf8ff] p-4 rounded-xl border border-[#c5c5d3] space-y-3">
              <p className="text-sm text-[#131b2e] leading-relaxed">
                LogiChat tự động phân tích HS Code, tra cứu biểu thuế ưu đãi đặc biệt (AJCEP, VJEPA, EVFTA...), kiểm tra danh mục quản lý chuyên ngành và trích dẫn văn bản pháp luật Hải quan thời gian thực.
              </p>
              
              <div className="p-4 bg-white rounded-lg border border-[#00236f]/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00236f]">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  Ví dụ câu hỏi mẫu bạn có thể thử:
                </div>
                <ul className="text-xs text-[#444651] space-y-1 list-disc pl-4">
                  <li>"Thuế nhập khẩu linh kiện vi mạch điện tử HS 8542.31 từ Nhật Bản?"</li>
                  <li>"Thủ tục công bố tiêu chuẩn áp dụng cho Thiết bị y tế loại B?"</li>
                  <li>"Hồ sơ xin C/O mẫu E cho hàng dệt may xuất khẩu?"</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[#444651] hover:bg-[#f2f3ff] rounded-lg transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  onStartChat();
                }}
                className="px-5 py-2 text-sm font-bold bg-[#00236f] text-white rounded-lg hover:bg-[#1e3a8a] transition-all"
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
