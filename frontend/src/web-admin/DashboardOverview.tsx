import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Zap,
  Database,
  RefreshCw,
  Server,
  Clock,
  AlertTriangle,
  FileText,
  Award,
  CheckCircle2,
  Calendar,
  Scale,
  ShieldCheck,
  Cpu,
  BarChart3,
  HardDrive,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardData {
  users: {
    total: number;
    pro: number;
    free: number;
    admin: number;
    new7d: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    monthly: number;
    byPlan: {
      monthly: { count: number; revenue: number; name: string };
      biannual: { count: number; revenue: number; name: string };
      annual: { count: number; revenue: number; name: string };
    };
    recentTransactions: Array<{
      orderCode: string;
      planId: string;
      amount: number;
      paidAt: string;
      userName: string;
      userEmail: string;
    }>;
  };
  expiryPipeline: Array<{
    id: string;
    name: string;
    email: string;
    expiry: string;
    daysRemaining: number;
  }>;
  traffic: {
    totalSessions: number;
    totalMessages: number;
    dailyTrends: Array<{
      date: string;
      display: string;
      messages: number;
    }>;
    hourlyDistribution: Array<{
      hour: string;
      count: number;
    }>;
  };
  quota: {
    messagesHitToday: number;
    imagesHitToday: number;
  };
  legal: {
    topCitedLaws: Array<{ title: string; count: number }>;
    totalTaxCalculations: number;
    topHsCodes: Array<{ hsCode: string; productName: string; count: number }>;
    coFormDistribution: Array<{ form: string; count: number }>;
  };
  education: {
    totalQuizzes: number;
    avgQuizScore: number;
    quizScoreDistribution: {
      under50: number;
      from50to70: number;
      from70to90: number;
      above90: number;
    };
    totalCaseStudies: number;
    caseStudyPassRate: number;
  };
  storage: {
    dbSizeMb: number;
    uploadsCount: number;
    uploadsSizeMb: number;
    childNodesCount: number;
    uniqueDocsCount: number;
  };
  aiInfrastructure: {
    providers: Array<{
      provider: string;
      status: string;
      totalKeys: number;
      activeKeys: number;
      failoverPriority: number;
    }>;
    cache: {
      enabled: boolean;
      backend: string;
      hitRatePercent: number;
      estimatedCostSavedUsd: number;
      latencyP50Ms: number;
      latencyP95Ms: number;
    };
    activeModel: string;
  };
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('logichat_admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/analytics/dashboard', {
        headers: getAuthHeaders(),
      });

      if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event('admin_logout'));
        return;
      }

      const json = await res.json();
      if (json.success && json.analytics) {
        setData(json.analytics);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setError(json.detail || 'Không thể tải dữ liệu phân tích hệ thống.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi kết nối tới máy chủ phân tích.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0038b8] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base font-semibold text-slate-700">Đang khởi tạo Dashboard phân tích chuyên sâu...</p>
          <p className="text-xs text-slate-500">Đang tổng hợp 12 chỉ số từ SQLite & RAG Telemetry</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800 mb-1">Không thể tải dữ liệu Dashboard</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData(true)}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const d = data!;

  // Max value calculation for charts
  const maxDailyMsgs = Math.max(...(d.traffic?.dailyTrends?.map((x) => x.messages) || [1]), 1);
  const maxHourlyCount = Math.max(...(d.traffic?.hourlyDistribution?.map((x) => x.count) || [1]), 1);
  const totalScoreSubmissions =
    (d.education?.quizScoreDistribution?.under50 || 0) +
    (d.education?.quizScoreDistribution?.from50to70 || 0) +
    (d.education?.quizScoreDistribution?.from70to90 || 0) +
    (d.education?.quizScoreDistribution?.above90 || 0) || 1;

  return (
    <div className="min-h-full bg-slate-50/60 p-6 md:p-8 space-y-8 font-sans">
      {/* ─── HEADER & REALTIME STATUS ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Báo cáo & Giám sát Hệ thống LogiChat
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-[#0038b8] border border-blue-200/60 rounded-full">
              Enterprise Live
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Giám sát 12 chiều dữ liệu: Hạ tầng AI, Doanh thu VietQR, Lưu lượng truy cập và Nghiệp vụ Hải quan
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              Cập nhật lúc: <strong className="text-slate-600">{lastUpdated}</strong>
            </span>
          )}
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0038b8]' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ─── TIER 1: 4 HIGH-IMPACT KPI SUMMARY CARDS ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/60 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Người dùng Hệ thống</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0038b8] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{d.users.total}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                +{d.users.new7d} tuần này
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Pro: <strong className="text-[#0038b8] font-bold">{d.users.pro}</strong> ({d.users.conversionRate}%)</span>
              <span>Free: <strong className="text-slate-700">{d.users.free}</strong></span>
              <span>Admin: <strong className="text-slate-700">{d.users.admin}</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 2: Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/60 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Doanh thu Tích lũy (VND)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-slate-900">
                {d.revenue.total.toLocaleString('vi-VN')}
              </span>
              <span className="text-sm font-bold text-slate-500">₫</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Tháng này (MRR):</span>
              <strong className="text-emerald-700 font-bold">{d.revenue.monthly.toLocaleString('vi-VN')} ₫</strong>
            </div>
          </div>
        </div>

        {/* KPI 3: Cache & AI Efficiency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/60 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tối ưu RAG & Cache</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{d.aiInfrastructure.cache.hitRatePercent}%</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Hit Rate
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Độ trễ P50: <strong className="text-slate-800">{d.aiInfrastructure.cache.latencyP50Ms}ms</strong></span>
              <span>Tiết kiệm: <strong className="text-emerald-600 font-bold">${d.aiInfrastructure.cache.estimatedCostSavedUsd}</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 4: Storage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/60 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kho dữ liệu & Chunks</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {d.storage.childNodesCount.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                Vectors FAISS
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>CSDL: <strong className="text-slate-800">{d.storage.dbSizeMb} MB</strong></span>
              <span>Văn bản: <strong className="text-slate-800">{d.storage.uniqueDocsCount} PDFs</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PILLAR 1: AI INFRASTRUCTURE & REVENUE BY PLAN ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module 1: AI Multi-LLM Failover Router & Cache Telemetry (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#0038b8] rounded-xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Trụ cột 1: Hạ tầng AI & Định tuyến Multi-LLM Failover
                  </h2>
                  <p className="text-xs text-slate-500">Tình trạng sẵn sàng và ưu tiên chuyển vùng tự động</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> High Availability
              </span>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {d.aiInfrastructure.providers.map((p) => {
                const isOp = p.status === 'operational' || p.status === 'local_ready';
                return (
                  <div
                    key={p.provider}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isOp
                        ? 'bg-slate-50/60 border-slate-200 hover:border-blue-300'
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold uppercase text-slate-700">{p.provider}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        #{p.failoverPriority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOp ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold capitalize ${
                          isOp ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {p.status === 'local_ready' ? 'Local Engine' : p.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Keys: <strong className="text-slate-800">{p.activeKeys}</strong> / {p.totalKeys} sẵn sàng
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Model Banner */}
            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Mô hình AI Đang Phục vụ:</span>
              <span className="font-bold text-[#0038b8]">{d.aiInfrastructure.activeModel}</span>
            </div>
          </div>

          {/* Latency & Cache Meter */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Độ trễ Phản hồi Stream & Semantic Cache</span>
              <span className="text-slate-400 font-normal">P50: {d.aiInfrastructure.cache.latencyP50Ms}ms | P95: {d.aiInfrastructure.cache.latencyP95Ms}ms</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 rounded-l-full"
                style={{ width: `${d.aiInfrastructure.cache.hitRatePercent}%` }}
                title={`Cache Hit: ${d.aiInfrastructure.cache.hitRatePercent}%`}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - d.aiInfrastructure.cache.hitRatePercent}%` }}
                title={`Live LLM Query: ${100 - d.aiInfrastructure.cache.hitRatePercent}%`}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cache Hit ({d.aiInfrastructure.cache.hitRatePercent}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> LLM Generation ({100 - d.aiInfrastructure.cache.hitRatePercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Module 2: Revenue by Plan & Expiry Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Trụ cột 2: Cơ cấu Doanh thu Gói cước
                  </h2>
                  <p className="text-xs text-slate-500">Phân bổ doanh thu theo từng gói thuê bao</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {Object.entries(d.revenue.byPlan).map(([planKey, info]) => {
                const pct = d.revenue.total > 0 ? Math.round((info.revenue / d.revenue.total) * 100) : 0;
                return (
                  <div key={planKey} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-800">{info.name}</span>
                      <span className="text-emerald-700 font-bold">
                        {info.revenue.toLocaleString('vi-VN')} ₫ ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 text-right">
                      {info.count} giao dịch thành công
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expiry Pipeline Mini-Card */}
          <div className="mt-5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Hạn Thuê bao 7 Ngày tới ({d.expiryPipeline.length})
              </span>
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Gia hạn tự động
              </span>
            </div>
            {d.expiryPipeline.length === 0 ? (
              <p className="text-xs text-amber-700 font-medium">Tất cả thuê bao Pro đều trong thời hạn an toàn ({'>'}7 ngày).</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 text-xs">
                {d.expiryPipeline.slice(0, 3).map((u) => (
                  <div key={u.id} className="flex justify-between items-center text-slate-700">
                    <span className="truncate max-w-[160px] font-medium">{u.name || u.email}</span>
                    <span className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded text-[11px]">
                      Còn {u.daysRemaining} ngày
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PILLAR 2 (CONT): RECENT PAID TRANSACTIONS ──────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#0038b8] rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Giao dịch Thanh toán Gần đây (Napas247 / VietQR)</h2>
              <p className="text-xs text-slate-500">Đối soát các lệnh nạp tiền nâng cấp Pro tự động</p>
            </div>
          </div>
        </div>

        {d.revenue.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Chưa có giao dịch phát sinh. Các đơn hàng chuyển khoản VietQR sẽ tự động xuất hiện tại đây.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Mã Giao dịch</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Gói cước</th>
                  <th className="py-3 px-4 text-right">Số tiền</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.revenue.recentTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0038b8]">{tx.orderCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{tx.userName}</div>
                      <div className="text-[11px] text-slate-400">{tx.userEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-[#0038b8] font-bold rounded-md">
                        {tx.planId.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {tx.amount.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-3 px-4 text-slate-500">{tx.paidAt}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> ĐÃ THANH TOÁN
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── PILLAR 3: TRAFFIC ACTIVITY, PEAK HOURS & QUOTA LIMITS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module 6: 7-Day Message Volume Trend (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Trụ cột 3: Xu hướng Tin nhắn Hỏi đáp (7 Ngày qua)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tổng cộng: <strong>{d.traffic.totalMessages}</strong> tin nhắn / <strong>{d.traffic.totalSessions}</strong> phiên tư vấn
                  </p>
                </div>
              </div>
            </div>

            {/* 7-Day Bar Chart */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {d.traffic.dailyTrends.map((day) => {
                const heightPct = Math.max(12, Math.round((day.messages / maxDailyMsgs) * 100));
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.messages}
                    </div>
                    <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-28 overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-[#0038b8] to-blue-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">{day.display}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Trung bình: <strong>{Math.round(d.traffic.totalMessages / Math.max(1, d.traffic.dailyTrends.length))} tin/ngày</strong></span>
            <span className="text-blue-600 font-semibold">Tăng trưởng ổn định</span>
          </div>
        </div>

        {/* Module 7 & 8: Peak Hours & Daily Quota Limits Reached (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Phân bố Giờ cao điểm (00:00 - 23:00)
                  </h2>
                  <p className="text-xs text-slate-500">Mật độ hỏi đáp của Doanh nghiệp XNK trong 14 ngày qua</p>
                </div>
              </div>
            </div>

            {/* Hourly Micro-Bars */}
            <div className="h-28 flex items-end gap-1 pt-4 pb-2 px-1">
              {d.traffic.hourlyDistribution.map((h, idx) => {
                const heightPct = Math.max(8, Math.round((h.count / maxHourlyCount) * 100));
                const isHighlight = idx >= 8 && idx <= 17; // Work hours
                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    title={`${h.hour}: ${h.count} câu hỏi`}
                  >
                    <div
                      className={`w-full rounded-t-xs transition-all duration-300 ${
                        isHighlight
                          ? 'bg-purple-500 group-hover:bg-purple-600'
                          : 'bg-slate-300 group-hover:bg-slate-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
              <span>00h</span>
              <span>06h</span>
              <span>12h (Trưa)</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </div>

          {/* Quota Limit Alert Row */}
          <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50/60 border border-red-200/60 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Chạm trần 10 tin/ngày (Free)</div>
              <div className="text-xl font-black text-red-700 mt-1">
                {d.quota.messagesHitToday} <span className="text-xs font-normal text-slate-500">phiên</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Chạm trần 5 OCR/ngày</div>
              <div className="text-xl font-black text-amber-700 mt-1">
                {d.quota.imagesHitToday} <span className="text-xs font-normal text-slate-500">tài khoản</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PILLAR 4: CUSTOMS DOMAIN & EDUCATIONAL ANALYTICS ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module 10: Top Cited Customs Laws (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-[#0038b8] rounded-xl">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Trụ cột 4: Top 10 Văn bản Pháp luật Trích dẫn nhiều nhất
                </h2>
                <p className="text-xs text-slate-500">Tần suất viện dẫn điều khoản bởi RAG Pipeline</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {d.legal.topCitedLaws.map((law, idx) => {
              const maxCount = d.legal.topCitedLaws[0]?.count || 1;
              const pct = Math.round((law.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[340px]">
                      <span className="text-[#0038b8] font-bold mr-1.5">#{idx + 1}</span> {law.title}
                    </span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {law.count} lần trích dẫn
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 11 & 12: HS Codes, Form C/O & Quiz/Case Study (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Module 11: Tariff HS Codes & Form C/O Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Tra cứu Mã HS & Phân bổ Form C/O Ưu đãi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tổng cộng: <strong>{d.legal.totalTaxCalculations}</strong> lượt tính thuế XNK
                  </p>
                </div>
              </div>
            </div>

            {/* HS Codes List */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {d.legal.topHsCodes.slice(0, 4).map((item) => (
                <div key={item.hsCode} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-xs font-mono font-bold text-[#0038b8]">{item.hsCode}</div>
                  <div className="text-[11px] text-slate-600 truncate font-medium">{item.productName}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{item.count} lượt tra cứu</div>
                </div>
              ))}
            </div>

            {/* Form C/O Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {d.legal.coFormDistribution.map((co) => (
                <span
                  key={co.form}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/60 flex items-center gap-1.5"
                >
                  <span>{co.form}</span>
                  <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 text-[10px] flex items-center justify-center font-bold">
                    {co.count}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Module 12: Quiz & Case Study Assessment Performance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Đánh giá Đào tạo: Trắc nghiệm & Tình huống (Case Studies)
                  </h2>
                  <p className="text-xs text-slate-500">Chất lượng học tập pháp lý của học viên/nhân viên</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="text-xs text-slate-500 font-medium">Điểm TB Trắc nghiệm</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {d.education.avgQuizScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{d.education.totalQuizzes} lượt nộp bài</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="text-xs text-slate-500 font-medium">Tỷ lệ Đạt Tình huống</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {d.education.caseStudyPassRate}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{d.education.totalCaseStudies} bài thực chiến</div>
              </div>
            </div>

            {/* Score distribution bar */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 mb-1.5 flex justify-between">
                <span>Phổ điểm Trắc nghiệm:</span>
                <span className="font-semibold text-slate-700">{totalScoreSubmissions} bài thi</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-red-400 h-full"
                  style={{ width: `${((d.education.quizScoreDistribution.under50 || 0) / totalScoreSubmissions) * 100}%` }}
                  title={`Dưới 50đ: ${d.education.quizScoreDistribution.under50}`}
                />
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${((d.education.quizScoreDistribution.from50to70 || 0) / totalScoreSubmissions) * 100}%` }}
                  title={`50 - 70đ: ${d.education.quizScoreDistribution.from50to70}`}
                />
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${((d.education.quizScoreDistribution.from70to90 || 0) / totalScoreSubmissions) * 100}%` }}
                  title={`70 - 90đ: ${d.education.quizScoreDistribution.from70to90}`}
                />
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${((d.education.quizScoreDistribution.above90 || 0) / totalScoreSubmissions) * 100}%` }}
                  title={`Trên 90đ: ${d.education.quizScoreDistribution.above90}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span className="text-red-600">{'<'}50 ({d.education.quizScoreDistribution.under50})</span>
                <span className="text-amber-600">50-70 ({d.education.quizScoreDistribution.from50to70})</span>
                <span className="text-blue-600">70-90 ({d.education.quizScoreDistribution.from70to90})</span>
                <span className="text-emerald-600">{'>'}90 ({d.education.quizScoreDistribution.above90})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
