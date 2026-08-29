import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Zap, BrainCircuit, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  reason?: 'messages' | 'images' | 'manual';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, reason = 'manual' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-white/20"
            >
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/10 rounded-full z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative p-8 md:p-10 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 z-0"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 transform rotate-3">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                    {reason === 'messages' ? 'Bạn đã hết lượt hỏi miễn phí hôm nay' : 
                     reason === 'images' ? 'Bạn đã đạt giới hạn tải ảnh hôm nay' : 
                     'Nâng cấp lên Logi Pro'}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                    Mở khóa toàn bộ sức mạnh của AI Pháp lý với Logi Pro để làm việc hiệu quả và chuyên sâu hơn.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center space-x-3 mb-3 text-slate-800 dark:text-slate-100 font-semibold">
                        <Zap className="w-5 h-5 text-blue-500" />
                        <span>Gói Miễn phí</span>
                      </div>
                      <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                        <li className="flex items-center"><X className="w-4 h-4 mr-2 text-red-400 shrink-0" /> Giới hạn 10 tin nhắn / ngày</li>
                        <li className="flex items-center"><X className="w-4 h-4 mr-2 text-red-400 shrink-0" /> Tối đa 5 ảnh tải lên / ngày</li>
                        <li className="flex items-center"><X className="w-4 h-4 mr-2 text-red-400 shrink-0" /> Phân tích cơ bản (Logi Fast)</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/50">
                      <div className="flex items-center space-x-3 mb-3 text-blue-700 dark:text-blue-300 font-semibold">
                        <BrainCircuit className="w-5 h-5 text-purple-500" />
                        <span>Logi Pro (Đề xuất)</span>
                      </div>
                      <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500 shrink-0" /> Không giới hạn nhắn tin</li>
                        <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500 shrink-0" /> Tải ảnh không giới hạn</li>
                        <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500 shrink-0" /> Mở khóa Logi Think (Suy luận sâu)</li>
                      </ul>
                    </div>
                  </div>

                  <button 
                    onClick={() => { onClose(); onUpgrade(); }}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Xem bảng giá & Nâng cấp ngay
                  </button>
                  <p className="mt-4 text-xs text-slate-400">Thanh toán an toàn - Kích hoạt ngay lập tức</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
