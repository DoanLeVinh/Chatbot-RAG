import React, { useState, useEffect, useRef } from 'react';
import { QuizDetail, QuizSubmissionResult } from '../../shared/types';
import { 
  X, Clock, CheckCircle2, XCircle, Award, RotateCcw, 
  ChevronRight, ChevronLeft, AlertCircle, BookOpen, 
  Check, ArrowRight, ShieldAlert, Sparkles, HelpCircle, Loader2
} from 'lucide-react';

interface QuizRunnerModalProps {
  quizId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  getAuthHeaders?: () => Record<string, string>;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  quizId,
  isOpen,
  onClose,
  userId,
  getAuthHeaders = () => ({}),
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  
  // Quiz progress state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'take' | 'result' | 'review'>('take');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Fetch quiz detail when modal opens
  useEffect(() => {
    if (!isOpen || !quizId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setActiveTab('take');
    setShowConfirmSubmit(false);

    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) {
          throw new Error('Không thể tải bài trắc nghiệm. Vui lòng thử lại.');
        }
        const data: QuizDetail = await res.json();
        if (isMounted) {
          setQuiz(data);
          const limitSeconds = (data.timeLimitMinutes || 15) * 60;
          setTimeLeft(limitSeconds);
          startTimeRef.current = Date.now();
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Lỗi khi tải dữ liệu đề thi');
          setLoading(false);
        }
      }
    };

    fetchQuiz();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, quizId]);

  // Countdown timer
  useEffect(() => {
    if (!quiz || activeTab !== 'take' || loading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz, activeTab, loading]);

  const handleAutoSubmit = () => {
    handleSubmit(true);
  };

  const handleSelectOption = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async (isAuto = false) => {
    if (!quiz || isSubmitting) return;

    if (!isAuto && Object.keys(selectedAnswers).length < quiz.questions.length && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }

    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          answers: selectedAnswers,
          timeSpentSeconds: timeSpent,
          userId: userId || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Nộp bài không thành công. Vui lòng thử lại.');
      }

      const resData: QuizSubmissionResult = await res.json();
      setResult(resData);
      setActiveTab('result');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    if (quiz) {
      setTimeLeft((quiz.timeLimitMinutes || 15) * 60);
      startTimeRef.current = Date.now();
    }
    setResult(null);
    setActiveTab('take');
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = quiz?.questions.length || 0;
  const currentQuestion = quiz?.questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl h-[90vh] max-h-[820px] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg truncate flex items-center gap-2">
                {quiz?.title || 'Bài trắc nghiệm pháp lý'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {quiz?.sourceType === 'document_upload' 
                  ? `Nguồn: ${quiz?.sourceName || 'Tài liệu tải lên'}`
                  : 'Nguồn: Hệ thống Văn bản Quy phạm Pháp luật Hải quan & XNK'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer (only during active quiz) */}
            {activeTab === 'take' && !loading && !error && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-xs sm:text-sm border transition-colors ${
                timeLeft <= 120 
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800 animate-pulse'
                  : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
              }`}>
                <Clock size={16} />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium">Đang tải đề thi và chuẩn bị bài trắc nghiệm...</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Không thể tải đề thi</h4>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ─── TAB 1: TAKING QUIZ ─── */}
          {!loading && !error && quiz && activeTab === 'take' && (
            <div className="flex flex-col h-full justify-between gap-6">
              <div>
                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1.5">
                    <span>Câu hỏi {currentIdx + 1} / {totalCount}</span>
                    <span>Đã làm: {answeredCount} / {totalCount}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                {currentQuestion && (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 mb-2">
                        Câu {currentIdx + 1}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {currentQuestion.questionText}
                      </h2>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optKey = `option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                        const text = currentQuestion[optKey];
                        if (!text) return null;
                        
                        const isSelected = selectedAnswers[currentQuestion.id] === opt;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(currentQuestion.id, opt)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {opt}
                            </span>
                            <span className="text-sm sm:text-base leading-relaxed pt-0.5 flex-1">
                              {text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigator & Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {/* Question number pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {quiz.questions.map((q, idx) => {
                    const isAnswered = Boolean(selectedAnswers[q.id]);
                    const isCurrent = idx === currentIdx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isCurrent
                            ? 'ring-2 ring-blue-500 bg-blue-600 text-white shadow-xs'
                            : isAnswered
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                    disabled={currentIdx === 0}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <ChevronLeft size={16} />
                    <span>Câu trước</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {currentIdx < totalCount - 1 ? (
                      <button
                        onClick={() => setCurrentIdx((p) => Math.min(totalCount - 1, p + 1))}
                        className="px-5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Câu tiếp</span>
                        <ChevronRight size={16} />
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      <span>Nộp bài</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONFIRM SUBMIT MODAL (IF UNANSWERED QUESTIONS) ─── */}
          {showConfirmSubmit && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle size={26} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chưa hoàn thành tất cả câu hỏi</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Bạn mới trả lời <strong className="text-blue-600">{answeredCount}/{totalCount}</strong> câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50"
                  >
                    Làm tiếp
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
                  >
                    Xác nhận nộp bài
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: RESULT SUMMARY VIEW ─── */}
          {!loading && result && activeTab === 'result' && (
            <div className="max-w-2xl mx-auto py-6 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25">
                <Award size={40} className="stroke-[2]" />
              </div>

              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                  result.passed
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {result.percentage >= 90 ? '🌟 Xuất sắc' : result.percentage >= 70 ? '🎉 Đạt yêu cầu' : '📖 Cần ôn tập thêm'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  Kết Quả Bài Trắc Nghiệm
                </h2>
                <p className="text-sm text-slate-500 mt-1">{result.title}</p>
              </div>

              {/* Score Metric Cards */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-xs text-slate-500 font-medium">Điểm số</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{result.score}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-xs text-slate-500 font-medium">Số câu đúng</p>
                  <p className="text-2xl sm:text-3xl font-black text-green-600 mt-1">
                    {result.totalCorrect}/{result.totalQuestions}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-xs text-slate-500 font-medium">Thời gian</p>
                  <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">
                    {formatTimer(result.timeSpentSeconds)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={() => setActiveTab('review')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
                >
                  <BookOpen size={18} />
                  <span>Xem lại chi tiết bài làm & Căn cứ luật</span>
                </button>
                <button
                  onClick={handleRetake}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  <span>Làm lại bài thi</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 3: REVIEW DETAILED EXPLANATIONS ─── */}
          {!loading && result && activeTab === 'review' && (
            <div className="space-y-6 max-w-3xl mx-auto pb-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Xem Lại Chi Tiết & Căn Cứ Pháp Lý</h3>
                  <p className="text-xs text-slate-500">Đúng {result.totalCorrect}/{result.totalQuestions} câu ({result.score}%)</p>
                </div>
                <button
                  onClick={() => setActiveTab('result')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Quay lại kết quả
                </button>
              </div>

              <div className="space-y-5">
                {result.questionsWithAnswers.map((q, idx) => (
                  <div 
                    key={q.id}
                    className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                      q.isCorrect
                        ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800/60'
                        : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          q.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                          {q.questionText}
                        </h4>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {q.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {q.isCorrect ? 'Chính xác' : 'Chưa đúng'}
                      </span>
                    </div>

                    {/* Options breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optKey = `option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                        const text = q[optKey];
                        if (!text) return null;

                        const isCorrectOpt = q.correctOption === opt;
                        const isUserOpt = q.userOption === opt;

                        let optClass = 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                        if (isCorrectOpt) {
                          optClass = 'bg-green-100/80 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-900 dark:text-green-100 font-semibold';
                        } else if (isUserOpt && !q.isCorrect) {
                          optClass = 'bg-red-100/80 dark:bg-red-900/40 border-red-400 dark:border-red-600 text-red-900 dark:text-red-100 line-through';
                        }

                        return (
                          <div key={opt} className={`p-2.5 rounded-xl border flex items-start gap-2 ${optClass}`}>
                            <span className="font-bold shrink-0">{opt}.</span>
                            <span className="flex-1">{text}</span>
                            {isCorrectOpt && <Check size={14} className="text-green-600 shrink-0 mt-0.5" />}
                            {isUserOpt && !isCorrectOpt && <X size={14} className="text-red-600 shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation & Legal Citation Box */}
                    <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
                        <Sparkles size={14} />
                        <span>Căn cứ pháp lý & Giải thích chi tiết:</span>
                        {q.citationCode && (
                          <span className="ml-auto px-2 py-0.5 rounded-md bg-blue-200/70 dark:bg-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 font-mono">
                            {q.citationCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-5">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold"
                >
                  Đóng & Quay lại cuộc trò chuyện
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
