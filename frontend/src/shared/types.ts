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
}

export interface UserUsage {
  plan: 'free' | 'pro';
  expiry: string | null;
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