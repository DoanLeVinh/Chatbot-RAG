import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../shared/utils';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Building2, 
  RefreshCw,
  QrCode,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface PricingPageProps {
  onBack: () => void;
  userId: string;
  onRequireAuth?: () => void;
  onPaymentSuccess?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ 
  onBack, 
  userId, 
  onRequireAuth, 
  onPaymentSuccess 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15:00
  const [isSimulating, setIsSimulating] = useState(false);

  const plans = [
    {
      id: 'monthly',
      name: 'Gói Tháng',
      price: '99.000đ',
      period: '/tháng',
      durationText: 'Thời hạn 30 ngày',
      description: 'Lựa chọn linh hoạt cho nhu cầu ngắn hạn.',
      features: [
        'Không giới hạn số lượt hỏi đáp mỗi ngày',
        'Tải ảnh & phân tích chứng từ không giới hạn',
        'Mở khóa mô hình Logi Think (Deep Reasoning 70B)',
        'Trích xuất & xuất báo cáo PDF pháp lý không giới hạn',
        'Hỗ trợ kỹ thuật qua Email'
      ],
      recommended: false
    },
    {
      id: 'biannual',
      name: 'Gói 6 Tháng',
      price: '495.000đ',
      period: '/6 tháng',
      durationText: 'Thời hạn 180 ngày (Tiết kiệm 1 tháng)',
      description: 'Gói tiết kiệm phổ biến nhất cho chuyên viên XNK.',
      features: [
        'Toàn bộ đặc quyền của Gói Tháng',
        'Cộng dồn thời hạn linh hoạt nếu đang dùng gói Pro',
        'Ưu tiên băng thông đường truyền & phản hồi siêu tốc',
        'Truy cập sớm các tính năng & văn bản pháp lý mới',
        'Hỗ trợ ưu tiên qua Zalo 24/7'
      ],
      recommended: true
    },
    {
      id: 'annual',
      name: 'Gói Năm',
      price: '890.000đ',
      period: '/năm',
      durationText: 'Thời hạn 365 ngày (Tặng 3 tháng)',
      description: 'Lựa chọn tối ưu chi phí nhất cho doanh nghiệp & văn phòng.',
      features: [
        'Toàn bộ đặc quyền của Gói 6 Tháng',
        'Hạn sử dụng 12 tháng trọn vẹn',
        'Hỗ trợ tư vấn 1-1 qua Video Call',
        'Huấn luyện RAG riêng cho bộ chứng từ doanh nghiệp',
        'Cam kết thời gian hoạt động 99.9%'
      ],
      recommended: false
    }
  ];

  // Countdown timer for active checkout
  useEffect(() => {
    if (!checkoutData || isPaid) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutData, isPaid]);

  // Status Polling every 2.5s
  useEffect(() => {
    if (!checkoutData || isPaid) return;
    const orderCode = checkoutData.orderCode;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${orderCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            setIsPaid(true);
            clearInterval(interval);
            if (onPaymentSuccess) {
              setTimeout(() => {
                onPaymentSuccess();
              }, 2500);
            }
          }
        }
      } catch (e) {
        // silent polling catch
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [checkoutData, isPaid, onPaymentSuccess]);

  const handleCheckout = async (planId: string) => {
    if (!userId) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert("Vui lòng đăng nhập hoặc tạo tài khoản để kích hoạt gói Pro.");
      }
      return;
    }

    setSelectedPlan(planId);
    setIsLoading(true);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      const res = await fetch(`/api/payment/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: planId, userId })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setCheckoutData(data);
        setTimeLeft(900);
        setIsPaid(false);
      } else {
        alert(data.detail || "Có lỗi xảy ra trong quá trình tạo đơn hàng.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ thanh toán.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!checkoutData) return;
    setIsSimulating(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const res = await fetch(`/api/payment/simulate-success/${checkoutData.orderCode}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setIsPaid(true);
        if (onPaymentSuccess) {
          setTimeout(() => {
            onPaymentSuccess();
          }, 2500);
        }
      } else {
        alert("Mô phỏng kích hoạt thất bại.");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <button 
          onClick={onBack}
          className="flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 mb-8 transition-colors group cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" /> 
          Quay lại trò chuyện
        </button>

        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/60 dark:to-purple-950/60 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-xs border border-blue-200/50 dark:border-blue-800/50"
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>NÂNG CẤP TÀI KHOẢN LOGI PRO</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
          >
            Đột phá hiệu suất Pháp lý Hải quan & XNK
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
          >
            Mở khóa khả năng suy luận chuyên sâu Logi Think (Llama 70B), không giới hạn lượt hỏi đáp và xử lý ảnh chứng từ phục vụ công việc hàng ngày.
          </motion.p>
        </div>

        {!checkoutData ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.1 }}
                className={`relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl transition-all duration-300 ${
                  plan.recommended 
                    ? 'ring-2 ring-purple-600 scale-105 md:-translate-y-3 shadow-purple-500/15 border-transparent' 
                    : 'border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md whitespace-nowrap">
                      ⭐ Lựa chọn tối ưu nhất
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      {plan.durationText}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{plan.description}</p>
                  </div>

                  <div className="mb-6 flex items-baseline">
                    <span className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:to-purple-200">
                      {plan.price}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 ml-1 font-semibold text-sm">{plan.period}</span>
                  </div>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading && selectedPlan === plan.id}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    {isLoading && selectedPlan === plan.id ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang tạo mã VietQR...
                      </span>
                    ) : (
                      'Nâng cấp ngay'
                    )}
                  </button>

                  <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

                  <ul className="space-y-3.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/60 flex items-center justify-center shrink-0 mr-3 mt-0.5 text-green-600 dark:text-green-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 text-sm leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-center">
                  <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Kích hoạt tự động qua VietQR Napas247
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* VietQR Checkout Modal / Screen */
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto"
          >
            {isPaid ? (
              /* Success State */
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20"
                >
                  <CheckCircle2 className="w-14 h-14" />
                </motion.div>
                <h2 className="text-3xl font-extrabold mb-3 text-slate-900 dark:text-white">
                  Thanh toán thành công!
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-base max-w-md mx-auto mb-6">
                  Tài khoản của bạn đã được nâng cấp lên <strong className="text-purple-600 font-bold">Logi Pro</strong>. Toàn bộ tính năng Deep Reasoning và tải ảnh đã được mở khóa!
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  Đang đồng bộ và chuyển bạn về cuộc trò chuyện...
                </div>
              </div>
            ) : (
              /* Active Payment with VietQR */
              <div className="grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                {/* Left: QR Code Preview */}
                <div className="md:col-span-5 p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/60 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-4">
                    <QrCode className="w-3.5 h-3.5" /> Quét mã VietQR Napas247
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-[260px] w-full mb-4">
                    <img 
                      src={checkoutData.qrUrl} 
                      alt="VietQR Payment Code"
                      className="w-full h-auto rounded-xl object-contain aspect-square"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" /> 
                    Mã QR có hiệu lực trong: <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{formatTime(timeLeft)}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Mở ứng dụng Ngân hàng (MB, Vietcombank, Techcombank,...) quét mã QR để thanh toán nhanh trong 5 giây.
                  </p>
                </div>

                {/* Right: Transfer Details */}
                <div className="md:col-span-7 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Chi tiết thanh toán
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {checkoutData.planName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                          {checkoutData.amountFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm mb-6">
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" /> Ngân hàng thụ hưởng:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {checkoutData.bankInfo.bankName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4" /> Số tài khoản:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {checkoutData.bankInfo.accountNo}
                          </span>
                          <button
                            onClick={() => handleCopy(checkoutData.bankInfo.accountNo, 'stk')}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
                            title="Sao chép số tài khoản"
                          >
                            {copyFeedback === 'stk' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {checkoutData.bankInfo.accountName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 bg-blue-50/80 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
                        <div>
                          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                            Nội dung chuyển khoản (Bắt buộc giữ nguyên):
                          </div>
                          <div className="font-mono font-black text-blue-900 dark:text-blue-200 text-base">
                            {checkoutData.bankInfo.transferContent}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(checkoutData.bankInfo.transferContent, 'content')}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          {copyFeedback === 'content' ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Sao chép
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl mb-6">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                      <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                        Hệ thống đang tự động lắng nghe giao dịch chuyển khoản... Gói Pro sẽ kích hoạt ngay lập tức sau khi tiền vào.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleSimulatePayment}
                        disabled={isSimulating}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                      >
                        {isSimulating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Đang mô phỏng...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" /> Mô phỏng thanh toán thành công (Test Dev)
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setCheckoutData(null)}
                        className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        Hủy đơn hàng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
