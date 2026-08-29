import React, { useState, useEffect } from 'react';
import { Header } from '../shared/components/Header';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onStartChat: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  currentUser?: { fullName: string } | null;
  onLogout?: () => void;
}

const SCENARIOS = [
  {
    q: "Mức thuế nhập khẩu linh kiện điện tử mã HS 8542.31 là bao nhiêu?",
    a: "Dựa trên biểu thuế hiện hành, mã HS 8542.31 (Mạch điện tử tích hợp) được hưởng mức thuế nhập khẩu ưu đãi 0% theo Hiệp định Công nghệ Thông tin WTO (ITA).",
    tags: ["Nghị định 122/2016/NĐ-CP", "Thông tư 65/2017/TT-BTC"]
  },
  {
    q: "Hồ sơ xin C/O mẫu E cho hàng dệt may xuất khẩu bao gồm những gì?",
    a: "Theo quy định, hồ sơ bao gồm: Đơn đề nghị cấp C/O, Tờ khai hải quan xuất khẩu, Bản sao B/L hoặc AWB, Hóa đơn thương mại và Bảng kê chi tiết nguyên phụ liệu.",
    tags: ["Thông tư 36/2010/TT-BCT", "Nghị định 31/2018/NĐ-CP"]
  },
  {
    q: "Thủ tục hoàn thuế GTGT hàng xuất khẩu cần nộp giấy tờ gì?",
    a: "Hồ sơ hoàn thuế GTGT bao gồm: Giấy đề nghị hoàn trả khoản thu NSNN (Mẫu 01/HT), Tờ khai hải quan xuất khẩu đã thông quan, và Chứng từ thanh toán qua ngân hàng.",
    tags: ["Luật Thuế GTGT 2008", "Thông tư 219/2013/TT-BTC"]
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onLoginClick,
  onRegisterClick,
  currentUser,
  onLogout,
}) => {
  const [activeScenario, setActiveScenario] = useState(0);
  const [demoState, setDemoState] = useState<'TYPING' | 'SUBMITTED' | 'LOADING' | 'STREAMING' | 'COMPLETE' | 'FADEOUT'>('TYPING');
  const [typedText, setTypedText] = useState('');
  const [streamedText, setStreamedText] = useState('');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const current = SCENARIOS[activeScenario];

    if (demoState === 'TYPING') {
      let i = 0;
      setTypedText('');
      setStreamedText('');
      const interval = setInterval(() => {
        i += 2; 
        setTypedText(current.q.slice(0, i));
        if (i >= current.q.length) {
          clearInterval(interval);
          timeoutId = setTimeout(() => setDemoState('SUBMITTED'), 800);
        }
      }, 25);
      return () => { clearInterval(interval); clearTimeout(timeoutId); };
    }

    if (demoState === 'SUBMITTED') {
      timeoutId = setTimeout(() => setDemoState('LOADING'), 400);
    }

    if (demoState === 'LOADING') {
      timeoutId = setTimeout(() => setDemoState('STREAMING'), 1000);
    }

    if (demoState === 'STREAMING') {
      let i = 0;
      const interval = setInterval(() => {
        i += 3;
        setStreamedText(current.a.slice(0, i));
        if (i >= current.a.length) {
          clearInterval(interval);
          timeoutId = setTimeout(() => setDemoState('COMPLETE'), 500);
        }
      }, 25);
      return () => { clearInterval(interval); clearTimeout(timeoutId); };
    }

    if (demoState === 'COMPLETE') {
      timeoutId = setTimeout(() => setDemoState('FADEOUT'), 4500);
    }

    if (demoState === 'FADEOUT') {
      timeoutId = setTimeout(() => {
        setActiveScenario((prev) => (prev + 1) % SCENARIOS.length);
        setDemoState('TYPING');
      }, 600);
    }

    return () => clearTimeout(timeoutId);
  }, [demoState, activeScenario]);


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0, opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-700">
      
      {/* Background Loop */}
      <div className="absolute inset-0 z-0 overflow-hidden animated-grid-bg pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 40, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-blue-600/10 rounded-full blur-3xl mix-blend-multiply"
        />
        <motion.div
          animate={{ x: [0, -30, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.85, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-indigo-600/10 rounded-full blur-3xl mix-blend-multiply"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header
          onLoginClick={onLoginClick}
          onRegisterClick={onRegisterClick}
          onGoHome={() => {}}
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <main className="flex-1 flex flex-col justify-center px-4 md:px-8 py-8 md:py-12 w-full">
          <div className="max-w-7xl w-full mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
            
            {/* Left Hero Text Column */}
            <motion.div 
              className="flex flex-col gap-6 text-left"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-full text-xs font-bold w-max border border-blue-100 shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-blue-600 icon-fill">
                  verified
                </span>
                <span>Trợ lý Pháp lý AI Chuyên Sâu</span>
              </motion.div>

              <motion.div variants={itemVariants}>
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.15] tracking-tight">
                  Tra Cứu Luật Hải Quan <br />
                  <span className="animated-gradient-text">Chính Xác & Tin Cậy.</span>
                </h1>
              </motion.div>

              <motion.div variants={itemVariants}>
                <p className="text-base md:text-lg text-slate-600 max-w-xl leading-relaxed font-medium">
                  LogiChat ứng dụng AI tiên tiến để phân tích và giải đáp các quy định xuất nhập khẩu phức tạp, trích xuất dữ liệu trực tiếp từ các văn bản pháp luật chính thức.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={onStartChat}
                  className="group relative bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] cursor-pointer text-sm overflow-hidden btn-shimmer"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Bắt đầu ngay
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </span>
                </button>
              </motion.div>
            </motion.div>

            {/* Right Interactive Mockup Simulator */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative w-full h-[520px] md:h-[580px] lg:h-[620px] flex items-center justify-center"
            >
              
              {/* Floating Badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="hidden md:flex absolute top-[10%] -left-8 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[18px] icon-fill">shield_locked</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xác thực SHA-256</span>
                  <span className="text-sm font-extrabold text-slate-800">100% Chính xác</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                className="hidden md:flex absolute bottom-[15%] -right-6 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined text-[18px] icon-fill">bolt</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tốc độ phản hồi</span>
                  <span className="text-sm font-extrabold text-slate-800">0.38s</span>
                </div>
              </motion.div>

              {/* Main Chat Mockup Container */}
              <div className="w-full max-w-[480px] h-[90%] bg-white/80 rounded-[2rem] border border-blue-100 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)] flex flex-col overflow-hidden backdrop-blur-xl">
                
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-slate-100/80 px-5 py-4 bg-white/50">
                  <span className="material-symbols-outlined text-blue-600 text-xl icon-fill">
                    psychology
                  </span>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    HỆ THỐNG PHÂN TÍCH TỰ ĐỘNG
                  </span>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto overflow-x-hidden relative">
                  <AnimatePresence mode="wait">
                    {demoState !== 'FADEOUT' && (
                      <motion.div
                        key={`scenario-${activeScenario}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col gap-4 min-h-full"
                      >
                        {/* User Message - Only show if SUBMITTED or later */}
                        {demoState !== 'TYPING' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="self-end bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-sm max-w-[85%] text-[13px] font-medium leading-relaxed shadow-sm"
                          >
                            {SCENARIOS[activeScenario].q}
                          </motion.div>
                        )}

                        {/* AI Loading Skeleton */}
                        {demoState === 'LOADING' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="self-start bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm max-w-[90%] shadow-sm flex gap-1 items-center h-[54px] px-5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-[bounce_0.8s_ease-in-out_infinite]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-[bounce_0.8s_ease-in-out_0.15s_infinite]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-[bounce_0.8s_ease-in-out_0.3s_infinite]" />
                          </motion.div>
                        )}

                        {/* AI Response Streaming / Complete */}
                        {(demoState === 'STREAMING' || demoState === 'COMPLETE') && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="self-start bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm max-w-[92%] shadow-sm flex flex-col gap-3"
                          >
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <span className="material-symbols-outlined text-[18px] icon-fill">
                                robot_2
                              </span>
                              <span className="font-bold text-[11px] uppercase tracking-wider">
                                LOGICHAT
                              </span>
                            </div>

                            <p className="leading-relaxed text-[13px] text-slate-800">
                              {streamedText}
                              {demoState === 'STREAMING' && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-500 animate-pulse align-middle" />}
                            </p>

                            {/* Tags pop-in only when COMPLETE */}
                            <AnimatePresence>
                              {demoState === 'COMPLETE' && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="flex gap-2 flex-wrap pt-2 border-t border-slate-100"
                                >
                                  {SCENARIOS[activeScenario].tags.map((tag, idx) => (
                                    <motion.span 
                                      key={idx}
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ type: "spring", delay: idx * 0.15 }}
                                      className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-slate-200"
                                    >
                                      <span className="material-symbols-outlined text-[14px] text-blue-600">description</span>
                                      {tag}
                                    </motion.span>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/80 border-t border-slate-100">
                  <div className={`relative flex items-center bg-slate-50 border rounded-xl p-2 transition-all duration-300 ${demoState === 'TYPING' ? 'border-blue-400 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]' : 'border-slate-200'}`}>
                    <span className="material-symbols-outlined text-slate-400 mx-2 text-xl">
                      attach_file
                    </span>
                    <input
                      type="text"
                      value={typedText}
                      readOnly
                      placeholder={demoState === 'TYPING' ? '' : "Hệ thống đang tự động demo..."}
                      className="flex-1 bg-transparent border-none focus:outline-none text-[13px] font-medium text-slate-800 placeholder:text-slate-400 pointer-events-none"
                    />
                    <motion.div 
                      animate={demoState === 'SUBMITTED' ? { scale: 0.9, backgroundColor: "#1d4ed8" } : { scale: 1, backgroundColor: "#2563eb" }}
                      className="text-white rounded-lg p-2 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_upward
                      </span>
                    </motion.div>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </main>

        <footer className="bg-white/80 backdrop-blur-sm text-slate-500 text-xs py-6 px-6 md:px-12 w-full border-t border-slate-200/60 z-10 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-bold text-slate-600">
              © 2024 LogiChat AI. Đã đăng ký bản quyền.
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 font-medium">
              <a href="#" className="hover:text-blue-600 transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Liên hệ hỗ trợ</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
