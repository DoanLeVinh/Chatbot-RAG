import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Shield, Zap, Sparkles, AlertCircle } from 'lucide-react';

interface PricingPageProps {
  onBack: () => void;
  userId: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, userId }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
    {
      id: 'monthly',
      name: 'Gói Tháng',
      price: '99.000đ',
      period: '/tháng',
      description: 'Lựa chọn linh hoạt cho nhu cầu ngắn hạn.',
      features: [
        'Không giới hạn số lượt hỏi đáp',
        'Tải ảnh & phân tích không giới hạn',
        'Mở khóa Logi Think (Suy luận sâu)',
        'Hỗ trợ qua Email'
      ],
      recommended: false
    },
    {
      id: 'biannual',
      name: 'Gói 6 Tháng',
      price: '495.000đ',
      period: '/6 tháng',
      description: 'Tiết kiệm 1 tháng so với gói tháng.',
      features: [
        'Mọi tính năng của Gói Tháng',
        'Truy cập sớm các tính năng mới',
        'Hỗ trợ ưu tiên (Zalo)'
      ],
      recommended: true
    },
    {
      id: 'annual',
      name: 'Gói Năm',
      price: '890.000đ',
      period: '/năm',
      description: 'Lựa chọn tiết kiệm nhất (tặng 3 tháng).',
      features: [
        'Mọi tính năng của Gói 6 Tháng',
        'Hỗ trợ 1-1 qua Video Call',
        'Huấn luyện riêng cho tài liệu nội bộ'
      ],
      recommended: false
    }
  ];

  const handleCheckout = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);
    
    try {
      const res = await fetch(`/api/payment/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId, userId })
      });
      
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        // Mô phỏng hiển thị QR Code thay vì chuyển trang thật
        setCheckoutUrl(data.checkoutUrl);
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <button 
          onClick={onBack}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 mb-8 transition-colors"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Quay lại
        </button>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-semibold mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nâng cấp Logi Pro</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6"
          >
            Nâng tầm trí tuệ pháp lý của bạn
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 dark:text-slate-300"
          >
            Chọn gói phù hợp để không bao giờ bị gián đoạn công việc và mở khóa Logi Think phân tích sâu sắc nhất.
          </motion.p>
        </div>

        {!checkoutUrl ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`relative bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl ${
                  plan.recommended 
                    ? 'ring-2 ring-blue-500 scale-105 md:-translate-y-4 shadow-blue-500/20' 
                    : 'border border-slate-200 dark:border-slate-800'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                      Phổ biến nhất
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{plan.description}</p>
                </div>

                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1 font-medium">{plan.period}</span>
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isLoading && selectedPlan === plan.id}
                  className={`w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 ${
                    plan.recommended
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-600/30'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  {isLoading && selectedPlan === plan.id ? 'Đang xử lý...' : 'Chọn gói này'}
                </button>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mr-3" />
                      <span className="text-slate-700 dark:text-slate-300 text-sm leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8 text-center"
          >
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Nâng cấp thủ công (Demo)</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
              Đây là trang giả lập (Mock). Bạn vui lòng yêu cầu Admin kích hoạt gói Pro cho tài khoản của bạn trên trang Quản trị viên.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col items-center justify-center h-48 border-dashed">
               <Shield className="w-8 h-8 text-slate-400 mb-2" />
               <span className="text-slate-500 text-sm font-medium">QR Code Placeholder</span>
            </div>
            <button
              onClick={() => setCheckoutUrl(null)}
              className="w-full py-3 px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy thanh toán
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
