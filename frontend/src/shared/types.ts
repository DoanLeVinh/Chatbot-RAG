export interface LegalCitation {
  id: string;
  code: string; // e.g., "NĐ 119/2022/NĐ-CP" or "TT 04/2023/TT-BTTTT"
  title: string;
  status: 'active' | 'amended' | 'repealed'; // Green (active), Yellow (amended), Red (repealed)
  statusLabel: string; // "Đang có hiệu lực", "Sửa đổi/Bổ sung"
  enactmentDate: string;
  summary: string;
  fullText?: string;
  pdfUrl?: string;
  pageNumber?: number;
  sha256?: string;
  validityStatus?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size?: string;
  type: 'pdf' | 'doc' | 'excel' | 'image';
  subtitle?: string;
  url?: string;
}

export interface TaxBreakdown {
  label: string; // e.g. "Thuế nhập khẩu ưu đãi đặc biệt (VJEPA)"
  rate: string;  // e.g. "0%"
  citationCode?: string;
}

export interface TaxCalculationResult {
  hsCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  exchangeRate: number;
  cifForeign: number;
  vNk: number;
  coForm: string;
  importTaxRate: number;
  importTaxLabel: string;
  tNk: number;
  ttdbRate: number;
  tTtdb: number;
  bvmtRate: number;
  tBvmt: number;
  vVat: number;
  vatRate: number;
  tVat: number;
  totalTax: number;
  girRule?: string;
  importConditions?: string;
  legalReference?: string;
  availableFta?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  hsCode?: string;
  taxes?: TaxBreakdown[];
  inspections?: {
    required: boolean;
    description: string;
    citationCode?: string;
  };
  citations?: LegalCitation[];
  summaryPdf?: {
    title: string;
    downloadUrl?: string;
  };
  isThinking?: boolean;
  followUpQuestions?: string[];
  imageUrl?: string;
  currentStage?: string;
  quiz?: QuizSummary;
  attachment?: Attachment;
  tax?: TaxCalculationResult;
  caseStudy?: CaseStudyDetail;
}

export interface CaseStudyDocument {
  name: string;
  code: string;
  summary: string;
}

export interface CaseStudyRubricItem {
  criterion: string;
  max_points: number;
}

export interface CaseStudyDetail {
  id: string;
  title: string;
  category: string;
  categoryName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  company: string;
  context: string;
  documents: CaseStudyDocument[];
  questions: string[];
  solution?: {
    analysis?: string;
    step_by_step_math?: string[];
    final_numbers?: Record<string, number>;
    legal_citations?: string[];
  };
  rubric: CaseStudyRubricItem[];
  createdAt: string;
}

export interface CaseStudyRubricScore {
  criterion: string;
  maxPoints: number;
  awardedPoints: number;
  comment: string;
}

export interface CaseStudyGradingResult {
  score: number;
  passed: boolean;
  feedback: string;
  rubricScores: CaseStudyRubricScore[];
  solution?: any;
  submissionId?: string;
}

export interface QuizSummary {
  id: string;
  title: string;
  topic?: string;
  sourceType: 'law_database' | 'document_upload';
  sourceName?: string;
  totalQuestions: number;
  timeLimitMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestionItem {
  id: string;
  questionIndex: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  citationCode?: string;
}

export interface QuizDetail {
  id: string;
  sessionId?: string;
  userId?: string;
  title: string;
  topic?: string;
  sourceType: 'law_database' | 'document_upload';
  sourceName?: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: string;
  questions: QuizQuestionItem[];
}

export interface QuestionWithResult {
  id: string;
  questionIndex: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  userOption: 'A' | 'B' | 'C' | 'D' | null;
  correctOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  explanation: string;
  citationCode?: string;
}

export interface QuizSubmissionResult {
  submissionId: string;
  quizId: string;
  title: string;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  completedAt: string;
  questionsWithAnswers: QuestionWithResult[];
}

export interface ChatSession {
  id: string;
  title: string;
  group: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS';
  updatedAt: string;
  categoryTag?: string; // e.g. "Thủ tục hải quan", "Thuế xuất khẩu"
  attachmentCount?: number;
  previewText: string;
  messages: ChatMessage[];
  references: LegalCitation[];
  documents?: Attachment[];
  attachments?: Attachment[];
}

export interface UserUsage {
  plan: 'free' | 'pro';
  expiry: string | null;
  daysRemaining?: number;
  expiryFormatted?: string;
  usage: {
    messages: number;
    images: number;
  };
  limits: {
    messages: number; // -1 means unlimited
    images: number;
  };
}

export type ActiveScreen = 'landing' | 'chat' | 'history';