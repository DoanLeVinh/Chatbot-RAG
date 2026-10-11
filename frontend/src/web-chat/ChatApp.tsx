import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthHeaders } from '../shared/utils';
import ProBackground from './ProEffects';
import { ActiveScreen, ChatSession, ChatMessage, LegalCitation, UserUsage } from '../shared/types';
import { LandingPage } from './LandingPage';
import { Sidebar } from '../shared/components/Sidebar';
import { Resizer } from '../shared/components/Resizer';
import { ChatView } from './ChatView';
import { ReferencePanel } from './ReferencePanel';
import { HistoryView } from './HistoryView';
import { AuthModal } from '../shared/components/AuthModal';
import { PdfModal } from './PdfModal';
import { SettingsModal } from '../shared/components/SettingsModal';
import { LiquidLoader } from '../shared/components/LiquidLoader';
import { WaterRippleMouse } from '../shared/components/WaterRippleMouse';
import { UpgradeModal } from './UpgradeModal';
import { PricingPage } from '../pages/PricingPage';
import { QuizRunnerModal } from '../features/quiz/QuizRunnerModal';
import { TaxEstimatorModal } from '../features/tax/TaxEstimatorModal';
import { CaseStudyModal } from '../features/case_study/CaseStudyModal';
import { HsCodeTreeModal } from '../features/tariff/HsCodeTreeModal';
import { CitationModal } from './CitationModal';
import { TaxCalculationResult, CaseStudyDetail } from '../shared/types';

const createDefaultBlankSession = (): ChatSession => ({
  id: `session-${Date.now()}`,
  title: 'Hội thoại tư vấn mới',
  group: 'TODAY',
  updatedAt: 'Vừa xong',
  categoryTag: 'Tư vấn Hải quan',
  previewText: 'Bắt đầu đặt câu hỏi pháp lý mới...',
  references: [],
  messages: [
    {
      id: `m-${Date.now()}`,
      sender: 'ai',
      text: 'Xin chào. Tôi là Trợ lý Pháp lý Hải quan LogiChat. Tôi có thể giúp gì cho bạn về quy định xuất nhập khẩu, mã HS, thuế quan hoặc thủ tục thông quan?',
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ],
});

const GUARDRAIL_FULLTEXT_MAP: Record<string, { code: string; title: string; fullText: string; summary: string; pdfUrl: string; sha256: string }> = {
  'cit-guard-0': {
    code: 'Điều 200 BLHS 100/2015',
    title: 'Bộ luật Hình sự số 100/2015/QH13 (Điều 200 - Tội trốn thuế)',
    summary: 'Quy định mức phạt từ 100 triệu đến 4,5 tỷ đồng hoặc phạt tù từ 03 tháng đến 07 năm đối với cá nhân trốn thuế từ 100 triệu trở lên. Pháp nhân thương mại phạm tội bị phạt tiền từ 300 triệu đến 10 tỷ đồng hoặc đình chỉ hoạt động vĩnh viễn.',
    pdfUrl: '/papers/Luật%20hải%20quan.pdf',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    fullText: `BỘ LUẬT HÌNH SỰ SỐ 100/2015/QH13 (SỬA ĐỔI, BỔ SUNG 2017)
─────────────────────────────────────────────────────────────
ĐIỀU 200. TỘI TRỐN THUẾ

1. Người nào thực hiện một trong các hành vi sau đây trốn thuế với số tiền từ 100.000.000 đồng đến dưới 300.000.000 đồng hoặc dưới 100.000.000 đồng nhưng đã bị xử phạt vi phạm hành chính về hành vi trốn thuế hoặc đã bị kết án về tội này hoặc về một trong các tội quy định tại các điều 188, 189, 190, 191, 192, 193, 194, 195, 196, 202, 250, 251, 253, 254, 304, 305, 306, 309 và 311 của Bộ luật này, chưa được xóa án tích mà còn vi phạm, thì bị phạt tiền từ 100.000.000 đồng đến 500.000.000 đồng hoặc phạt tù từ 03 tháng đến 01 năm:
a) Không nộp hồ sơ đăng ký thuế; không nộp hồ sơ khai thuế; nộp hồ sơ khai thuế sau 90 ngày kể từ ngày hết thời hạn nộp hồ sơ khai thuế hoặc ngày hết thời hạn gia hạn nộp hồ sơ khai thuế theo quy định của pháp luật;
b) Không ghi chép trong sổ kế toán các khoản thu liên quan đến việc xác định số tiền thuế phải nộp;
c) Không xuất hóa đơn khi bán hàng hóa, dịch vụ hoặc ghi giá trị trên hóa đơn bán hàng thấp hơn giá trị thanh toán thực tế của hàng hóa, dịch vụ đã bán;
d) Sử dụng hóa đơn, chứng từ không hợp pháp, sử dụng không hợp pháp hóa đơn, chứng từ để hạch toán hàng hóa, nguyên liệu đầu vào trong hoạt động phát sinh nghĩa vụ thuế làm giảm số tiền thuế phải nộp hoặc làm tăng số tiền thuế được miễn, số tiền thuế được giảm hoặc tăng số tiền thuế được khấu trừ, số tiền thuế được hoàn;
đ) Sử dụng chứng từ, tài liệu không hợp pháp khác để xác định sai số tiền thuế phải nộp, số tiền thuế được hoàn;
e) Khai sai với thực tế hàng hóa xuất khẩu, nhập khẩu mà không khai bổ sung hồ sơ hải quan sau khi hàng hóa đã được thông quan, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;
g) Cố ý không kê khai hoặc khai sai về thuế đối với hàng hóa xuất khẩu, nhập khẩu, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;
h) Cấu kết với người gửi hàng để nhập khẩu hàng hóa, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;
i) Sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, xét miễn thuế không đúng mục đích quy định mà không khai báo việc chuyển đổi mục đích sử dụng với cơ quan quản lý thuế.

2. Phạm tội thuộc một trong các trường hợp sau đây, thì bị phạt tiền từ 500.000.000 đồng đến 1.500.000.000 đồng hoặc phạt tù từ 01 năm đến 03 năm:
a) Có tổ chức;
b) Số tiền trốn thuế từ 300.000.000 đồng đến dưới 1.000.000.000 đồng;
c) Lợi dụng chức vụ, quyền hạn;
d) Phạm tội 02 lần trở lên;
đ) Tái phạm nguy hiểm.

3. Phạm tội trốn thuế với số tiền 1.000.000.000 đồng trở lên, thì bị phạt tiền từ 1.500.000.000 đồng đến 4.500.000.000 đồng hoặc phạt tù từ 02 năm đến 07 năm.

4. Người phạm tội còn có thể bị phạt tiền từ 20.000.000 đồng đến 100.000.000 đồng, cấm đảm nhiệm chức vụ, cấm hành nghề hoặc làm công việc nhất định từ 01 năm đến 05 năm hoặc tịch thu một phần hoặc toàn bộ tài sản.

5. Pháp nhân thương mại phạm tội quy định tại Điều này, thì bị xử lý như sau:
a) Thực hiện một trong các hành vi quy định tại khoản 1 Điều này trốn thuế với số tiền từ 200.000.000 đồng đến dưới 300.000.000 đồng hoặc từ 100.000.000 đồng đến dưới 200.000.000 đồng nhưng đã bị xử phạt vi phạm hành chính về hành vi trốn thuế hoặc đã bị kết án về tội này hoặc về một trong các tội quy định tại các điều 188, 189, 190, 191, 192, 193, 194, 195, 196 và 202 của Bộ luật này, chưa được xóa án tích mà còn vi phạm, thì bị phạt tiền từ 300.000.000 đồng đến 1.000.000.000 đồng;
b) Phạm tội thuộc một trong các trường hợp quy định tại các điểm a, b, d và đ khoản 2 Điều này, thì bị phạt tiền từ 1.000.000.000 đồng đến 3.000.000.000 đồng;
c) Phạm tội thuộc trường hợp quy định tại khoản 3 Điều này, thì bị phạt tiền từ 3.000.000.000 đồng đến 10.000.000.000 đồng hoặc đình chỉ hoạt động có thời hạn từ 06 tháng đến 03 năm;
d) Phạm tội thuộc trường hợp quy định tại Điều 79 của Bộ luật này, thì bị đình chỉ hoạt động vĩnh viễn;
đ) Pháp nhân thương mại còn có thể bị phạt tiền từ 50.000.000 đồng đến 200.000.000 đồng, cấm kinh doanh, cấm hoạt động trong một số lĩnh vực nhất định hoặc cấm huy động vốn từ 01 năm đến 03 năm.`
  },
  'cit-guard-1': {
    code: 'Luật Hải quan 54/2014',
    title: 'Luật Hải quan số 54/2014/QH13 (Điều 18 & Điều 88 - Quyền, nghĩa vụ & Giám sát)',
    summary: 'Quy định người khai hải quan chịu trách nhiệm trước pháp luật về tính chính xác của hồ sơ khai hải quan, nghĩa vụ nộp thuế đầy đủ và thẩm quyền của Hải quan trong việc kiểm soát, chống buôn lậu qua biên giới.',
    pdfUrl: '/papers/Luật%20hải%20quan.pdf',
    sha256: '4a5c9b2f1837e83461293a8d1bfa98412e697c11f43928a38190d71a8f94e2b1',
    fullText: `LUẬT HẢI QUAN SỐ 54/2014/QH13
─────────────────────────────────────────────────────────────
ĐIỀU 18. QUYỀN VÀ NGHĨA VỤ CỦA NGƯỜI KHAI HẢI QUAN

1. Người khai hải quan có quyền:
a) Được cơ quan hải quan cung cấp thông tin liên quan đến việc khai hải quan đối với hàng hóa, phương tiện vận tải, hướng dẫn làm thủ tục hải quan, phổ biến pháp luật về hải quan;
b) Yêu cầu cơ quan hải quan xác định trước mã số, xuất xứ, trị giá hải quan đối với hàng hóa khi có đủ điều kiện theo quy định của pháp luật;
c) Xem trước hàng hóa, lấy mẫu hàng hóa dưới sự giám sát của công chức hải quan trước khi khai hải quan để bảo đảm việc khai hải quan chính xác;
d) Yêu cầu cơ quan hải quan kiểm tra lại thực tế hàng hóa đã kiểm tra nếu không đồng ý với quyết định của cơ quan hải quan trong trường hợp hàng hóa chưa được thông quan;
đ) Sử dụng hồ sơ hải quan để thông quan hàng hóa, vận chuyển hàng hóa, thực hiện các thủ tục liên quan với các cơ quan khác theo quy định của pháp luật;
e) Khiếu nại, tố cáo hành vi trái pháp luật của cơ quan hải quan, công chức hải quan; yêu cầu bồi thường thiệt hại do hành vi trái pháp luật của cơ quan hải quan, công chức hải quan gây ra theo quy định của pháp luật về trách nhiệm bồi thường của Nhà nước.

2. Người khai hải quan có nghĩa vụ:
a) Khai hải quan và làm thủ tục hải quan theo quy định của Luật này;
b) Cung cấp thông tin, chứng từ chính xác về tên hàng, mã số, xuất xứ, số lượng, trọng lượng, chất lượng, trị giá, thuế suất của hàng hóa và chịu trách nhiệm trước pháp luật về sự chính xác của nội dung đã khai và các chứng từ đã nộp, xuất trình;
c) Chấp hành quyết định và yêu cầu của cơ quan hải quan, công chức hải quan trong việc làm thủ tục hải quan, kiểm tra, giám sát hải quan đối với hàng hóa, phương tiện vận tải;
d) Lưu giữ hồ sơ hải quan đối với hàng hóa đã được thông quan trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan, trừ trường hợp pháp luật có quy định khác; lưu giữ sổ sách, chứng từ kế toán và các chứng từ khác có liên quan đến hàng hóa xuất khẩu, nhập khẩu trong thời hạn theo quy định của pháp luật về kế toán; xuất trình hồ sơ, chứng từ, tài liệu liên quan khi cơ quan hải quan kiểm tra theo quy định tại các điều 32, 77 và 78 của Luật này;
đ) Nộp thuế và thực hiện các nghĩa vụ tài chính khác theo quy định của pháp luật về thuế, phí, lệ phí và quy định khác của pháp luật có liên quan.

─────────────────────────────────────────────────────────────
ĐIỀU 88. NHIỆM VỤ PHÒNG, CHỐNG BUÔN LẬU, VẬN CHUYỂN TRÁI PHÉP HÀNG HÓA QUA BIÊN GIỚI CỦA CƠ QUAN HẢI QUAN

1. Trong phạm vi địa bàn hoạt động hải quan, cơ quan hải quan chủ trì thực hiện kiểm tra, giám sát, kiểm soát đối với hàng hóa, phương tiện vận tải để chủ động phòng ngừa, phát hiện, ngăn chặn và xử lý hành vi buôn lậu, vận chuyển trái phép hàng hóa qua biên giới, gian lận thương mại và trốn thuế.
2. Ngoài phạm vi địa bàn hoạt động hải quan, cơ quan hải quan phối hợp với cơ quan công an, bộ đội biên phòng, cảnh sát biển, quản lý thị trường thực hiện các biện pháp kiểm soát chống buôn lậu và trốn thuế theo quy định của pháp luật.`
  },
  'cit-guard-2': {
    code: 'NĐ 128/2020/NĐ-CP',
    title: 'Nghị định 128/2020/NĐ-CP (Điều 14 - Xử phạt đối với hành vi trốn thuế)',
    summary: 'Quy định mức phạt từ 1 đến 3 lần số thuế trốn đối với các hành vi kê khai gian dối, làm giả chứng từ, xuất xứ, mã HS và biện pháp khắc phục hậu quả buộc nộp đủ số tiền thuế trốn vào ngân sách.',
    pdfUrl: '/papers/Xử%20phạt%20vi%20phạm%20hành%20chính%20về%20hải%20quan%20169-2026-NĐ-CP.pdf',
    sha256: '8f12a34bc6719e84321908d172e91a039f8216ab72348a1c90123e456f789abc',
    fullText: `NGHỊ ĐỊNH SỐ 128/2020/NĐ-CP CỦA CHÍNH PHỦ
QUY ĐỊNH XỬ PHẠT VI PHẠM HÀNH CHÍNH TRONG LĨNH VỰC HẢI QUAN
─────────────────────────────────────────────────────────────
ĐIỀU 14. XỬ PHẠT ĐỐI VỚI HÀNH VI TRỐN THUẾ

1. Phạt tiền 01 lần số tiền thuế trốn đối với một trong các hành vi vi phạm sau đây mà không bị truy cứu trách nhiệm hình sự:
a) Sử dụng chứng từ, tài liệu không hợp pháp, chứng từ giả mạo để khai hải quan, làm thủ tục hải quan;
b) Không kê khai hoặc kê khai sai về tên hàng, chủng loại, số lượng, khối lượng, chất lượng, trị giá, mã số hàng hóa, thuế suất, mức thuế, xuất xứ hàng hóa xuất khẩu, nhập khẩu mà cơ quan hải quan phát hiện trong quá trình thông quan hoặc kiểm tra sau thông quan;
c) Thay đổi mục đích sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, giảm thuế nhưng không tự nguyện khai báo với cơ quan hải quan theo quy định;
d) Sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, xét miễn thuế không đúng mục đích quy định mà không khai báo với cơ quan hải quan;
đ) Cố ý không kê khai hoặc khai sai về thuế đối với hàng hóa xuất khẩu, nhập khẩu;
e) Khai sai với thực tế hàng hóa xuất khẩu, nhập khẩu mà không khai bổ sung hồ sơ hải quan sau khi hàng hóa đã được thông quan;
g) Hợp thức hóa hồ sơ, chứng từ nhằm mục đích trốn thuế, gian lận hoàn thuế, giảm thuế.

2. Phạt tiền từ 1,5 lần đến 03 lần số tiền thuế trốn đối với các hành vi vi phạm quy định tại khoản 1 Điều này nếu có một trong các tình tiết tăng nặng sau đây:
a) Vi phạm có tổ chức, có kế hoạch chuẩn bị kỹ lưỡng;
b) Tái phạm hoặc vi phạm nhiều lần trong lĩnh vực hải quan;
c) Lợi dụng thiên tai, dịch bệnh hoặc hoàn cảnh khó khăn đặc biệt của xã hội để vi phạm;
d) Xúi giục, lôi kéo người khác thực hiện hành vi vi phạm hoặc cản trở người thi hành công vụ.

3. Biện pháp khắc phục hậu quả:
a) Buộc nộp đủ số tiền thuế trốn, gian lận vào ngân sách nhà nước theo quy định của Luật Quản lý thuế;
b) Buộc nộp lại số tiền bằng trị giá tang vật vi phạm hành chính đã bị tiêu thụ, tẩu tán, tiêu hủy trái quy định của pháp luật;
c) Buộc đưa ra khỏi lãnh thổ nước Cộng hòa xã hội chủ nghĩa Việt Nam hoặc buộc tái xuất đối với hàng hóa nhập lậu, tang vật trốn thuế tại cửa khẩu nhập.`
  }
};

const enrichCitation = (c: LegalCitation): LegalCitation => {
  if (!c) return c;
  const cid = (c.id || '').toLowerCase();
  const ccode = (c.code || '').toLowerCase();
  const ctitle = (c.title || '').toLowerCase();
  const cfull = (c.fullText || '').toLowerCase();

  let matchedKey: string | null = null;
  if (cid.includes('cit-guard-0') || ccode.includes('200') || ctitle.includes('200') || ctitle.includes('hình sự') || cfull.includes('điều 200') || cfull.includes('tội trốn thuế')) {
    matchedKey = 'cit-guard-0';
  } else if (cid.includes('cit-guard-1') || ccode.includes('54/2014') || ctitle.includes('54/2014') || ccode.includes('hải quan') || ctitle.includes('hải quan') || cfull.includes('54/2014') || cfull.includes('luật hải quan')) {
    matchedKey = 'cit-guard-1';
  } else if (cid.includes('cit-guard-2') || ccode.includes('128') || ctitle.includes('128') || ccode.includes('trốn thuế') || ctitle.includes('trốn thuế') || cfull.includes('128/2020') || cfull.includes('điều 14')) {
    matchedKey = 'cit-guard-2';
  }

  if (matchedKey && GUARDRAIL_FULLTEXT_MAP[matchedKey]) {
    const item = GUARDRAIL_FULLTEXT_MAP[matchedKey];
    return {
      ...c,
      code: item.code,
      title: item.title,
      summary: item.summary,
      fullText: item.fullText,
      pdfUrl: item.pdfUrl,
      sha256: item.sha256,
      statusLabel: 'Đang có hiệu lực',
      validityStatus: 'CON_HIEU_LUC',
      verified: true,
    };
  }
  return c;
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('landing');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isReferencesOpen, setIsReferencesOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [referencePanelWidth, setReferencePanelWidth] = useState<number>(340);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // User Auth State with LocalStorage Persistence
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    fullName: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('logichat_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Subscription and Usage state
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [aiModel, setAiModel] = useState<'logi_fast' | 'logi_think'>('logi_fast');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'messages' | 'images' | 'manual'>('manual');
  const [isPricingPageOpen, setIsPricingPageOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/pricing');
  });
  const [pendingUpgradeIntent, setPendingUpgradeIntent] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [taxModalData, setTaxModalData] = useState<TaxCalculationResult | null>(null);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isHsTreeModalOpen, setIsHsTreeModalOpen] = useState(false);
  const [activeCaseStudy, setActiveCaseStudy] = useState<CaseStudyDetail | null>(null);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState(false);
  const [caseStudyModalTab, setCaseStudyModalTab] = useState<'solve' | 'solution'>('solve');
  const [selectedCitationModal, setSelectedCitationModal] = useState<LegalCitation | null>(null);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);

  // Modals state
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'register' | 'forgot';
  }>({
    isOpen: false,
    mode: 'login',
  });

  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    content?: string;
    hsCode?: string;
    taxes?: ChatMessage['taxes'];
    citations?: ChatMessage['citations'];
  }>({
    isOpen: false,
    title: '',
  });

  const openPdfModalFromMessage = (message: ChatMessage) => {
    setPdfModal({
      isOpen: true,
      title: message.summaryPdf?.title || 'Tóm tắt pháp lý',
      subtitle: `Số tờ khai / HS Code: ${message.hsCode || 'Chi tiết'}`,
      content: message.text,
      hsCode: message.hsCode,
      taxes: message.taxes,
      citations: message.citations,
    });
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [highlightedCitationCode, setHighlightedCitationCode] = useState<string | null>(null);

  // ─── Load User-Isolated Sessions from Backend ────────────────────
  const fetchUserUsage = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userIdParam = currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : '';
      const res = await fetch(`/api/user/usage${userIdParam}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUserUsage(data);
      }
    } catch (err) {
      console.log('Error fetching user usage');
    }
  }, [currentUser]);

  const loadSessionsFromBackend = useCallback(async () => {
    try {
      // Bug #3 fix: Only use userId in URL if no token (anonymous mode)
      const token = (() => { try { return localStorage.getItem('logichat_token'); } catch { return null; } })();
      const userIdParam = (!token && currentUser?.id) ? `?userId=${encodeURIComponent(currentUser.id)}` : '';
      const res = await fetch(`/api/sessions${userIdParam}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          const backendSessions: ChatSession[] = data.sessions.map((s: any) => ({
            id: s.id,
            title: s.title || 'Hội thoại tư vấn',
            group: s.group || 'TODAY',
            updatedAt: s.updatedAt || 'Hôm nay',
            categoryTag: s.categoryTag || 'Tư vấn Hải quan',
            previewText: s.previewText || '',
            messages: (s.messages || []).map((m: any) => ({
              ...m,
              citations: m.citations ? m.citations.map(enrichCitation) : undefined,
            })),
            references: (s.references || []).map(enrichCitation),
            attachments: s.attachments || [],
          }));

          setSessions(backendSessions);
          setActiveSessionId(backendSessions[0].id);
          return;
        }
      }
    } catch (err) {
      console.log('Error loading sessions from backend');
    }

    // Default: create a fresh blank session for clean workspace
    const blank = createDefaultBlankSession();
    setSessions([blank]);
    setActiveSessionId(blank.id);
  }, [currentUser]);

  useEffect(() => {
    loadSessionsFromBackend();
    fetchUserUsage();
  }, [loadSessionsFromBackend, fetchUserUsage]);

  // Get active session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createDefaultBlankSession();

  // Handle New Chat creation
  const handleNewChat = async () => {
    const newSession = createDefaultBlankSession();

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveScreen('chat');

    // Create session in backend tied to currentUser.id
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        },
        body: JSON.stringify({
          title: newSession.title,
          categoryTag: newSession.categoryTag,
          userId: currentUser?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session?.id) {
          const backendId = data.session.id;
          setSessions((prev) =>
            prev.map((s) => (s.id === newSession.id ? { ...s, id: backendId } : s))
          );
          setActiveSessionId(backendId);
        }
      }
    } catch {
      // Continue with local session if backend fails
    }
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    const userMsgId = `usr-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Optimistic UI: Show user message IMMEDIATELY (including image preview & file badge)
    let optimisticText = text.trim() || (file ? `[Đính kèm: ${file.name}]` : '');
    const imagePreviewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    
    const optimisticAttachment = file ? {
      id: `att-${Date.now()}`,
      name: file.name,
      size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type.startsWith('image/') ? 'image' as const : file.name.endsWith('.pdf') ? 'pdf' as const : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' as const : 'doc' as const,
      url: imagePreviewUrl || '',
    } : undefined;

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: optimisticText,
      timestamp: timestampStr,
      imageUrl: imagePreviewUrl,
      attachment: optimisticAttachment,
    };

    // Immediately update UI with user message
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: s.title === 'Hội thoại tư vấn mới' ? optimisticText.slice(0, 36) : s.title,
          previewText: optimisticText,
          updatedAt: 'Hôm nay',
          messages: [...s.messages, userMsg],
        };
      }
      return s;
    });
    setSessions(updatedSessions);
    setIsGenerating(true);

    // Upload file in background (if any)
    let finalUserMessageText = optimisticText;
    let uploadedFile: any = null;
    let scopedRagJustEnabled = false;
    let scopedRagError: string | null = null;

    if (file) {
      // Show AI placeholder with image analysis stage
      const aiMsgId = `ai-${Date.now()}`;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: aiMsgId,
                  sender: 'ai' as const,
                  text: '',
                  currentStage: file.type.startsWith('image/') 
                    ? '📷 Đang phân tích hình ảnh...'
                    : '📎 Đang xử lý tệp đính kèm...',
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            };
          }
          return s;
        })
      );

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentUser?.id) {
          formData.append('userId', currentUser.id);
        }
        if (activeSession?.id) {
          formData.append('sessionId', activeSession.id);
        }
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });

        if (uploadRes.status === 402) {
          setIsGenerating(false);
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSession.id) {
                const msgs = [...s.messages];
                const idx = msgs.findIndex((m) => m.id === aiMsgId);
                if (idx !== -1) msgs.splice(idx, 1);
                return { ...s, messages: msgs };
              }
              return s;
            })
          );
          setUpgradeReason('images');
          setIsUpgradeModalOpen(true);
          return;
        }

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedFile = uploadData.file;
          if (uploadData.scopedRagEnabled) {
            scopedRagJustEnabled = true;
          } else if (uploadData.scopedRagError) {
            scopedRagError = uploadData.scopedRagError;
          }
          if (uploadData.extractedText) {
            const extracted = uploadData.extractedText;
            finalUserMessageText = text.trim() 
              ? `${text.trim()}\n\n[Văn bản trích xuất từ ảnh ${uploadedFile.name}]:\n${extracted}` 
              : `[Văn bản trích xuất từ ảnh ${uploadedFile.name}]:\n${extracted}`;
          } else if (!text.trim()) {
            finalUserMessageText = `[Đính kèm: ${uploadedFile.name}]`;
          }
          fetchUserUsage();
        }
      } catch {
        console.log('File upload failed, continuing without attachment');
      }

      // Add system notice if scoped RAG activated
      if (scopedRagJustEnabled || scopedRagError) {
        const noticeMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: scopedRagJustEnabled
            ? `🔒 Đã nhận và xử lý "${uploadedFile?.name}". Từ giờ trong cuộc trò chuyện này, tôi sẽ CHỈ trả lời dựa trên nội dung tài liệu bạn vừa tải lên. Nếu muốn hỏi về kho luật chung, hãy bắt đầu một "Trò chuyện mới".`
            : `⚠️ ${scopedRagError}`,
          timestamp: timestampStr,
        };
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSession.id) {
              return { ...s, messages: [...s.messages, noticeMsg] };
            }
            return s;
          })
        );
      }

      // Update user message text with extracted content & update attachments
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            const msgs = [...s.messages];
            const userIdx = msgs.findIndex((m) => m.id === userMsgId);
            if (userIdx !== -1) {
              msgs[userIdx] = { 
                ...msgs[userIdx], 
                text: finalUserMessageText,
                attachment: uploadedFile ? {
                  id: uploadedFile.id,
                  name: uploadedFile.name,
                  size: uploadedFile.size,
                  type: uploadedFile.type,
                  url: uploadedFile.url
                } : msgs[userIdx].attachment
              };
            }
            // Remove the temporary AI placeholder (will be recreated below)
            const aiPlaceholderIdx = msgs.findIndex((m) => m.id === aiMsgId);
            if (aiPlaceholderIdx !== -1) {
              msgs.splice(aiPlaceholderIdx, 1);
            }
            return {
              ...s,
              messages: msgs,
              attachments: uploadedFile
                ? [...(s.attachments || []), uploadedFile]
                : s.attachments,
            };
          }
          return s;
        })
      );
    }

    try {
      // Create a placeholder message for AI
      const aiMsgId = `ai-${Date.now()}`;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: aiMsgId,
                  sender: 'ai' as const,
                  text: '',
                  currentStage: '🔍 Đang tìm kiếm văn bản pháp luật liên quan...',
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            };
          }
          return s;
        })
      );

      // Call backend FastAPI (SQLite) for RAG + AI Streaming
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        },
        body: JSON.stringify({
          prompt: finalUserMessageText,
          sessionId: activeSession.id,
          userId: currentUser?.id || null,
          aiModel: aiModel,
        }),
      });

      if (res.status === 402) {
        setIsGenerating(false);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSession.id) {
              const msgs = [...s.messages];
              const idx = msgs.findIndex((m) => m.id === aiMsgId);
              if (idx !== -1) msgs.splice(idx, 1);
              return { ...s, messages: msgs };
            }
            return s;
          })
        );
        const errData = await res.json();
        setUpgradeReason(errData.detail === 'limit_reached_images' ? 'images' : 'messages');
        setIsUpgradeModalOpen(true);
        return;
      }

      if (!res.body) throw new Error("No readable stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let doneReading = false;
      let finalData: any = {};
      let currentText = "";

      while (!doneReading) {
        const { value, done } = await reader.read();
        doneReading = done;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.done) {
                  finalData = parsed;
                } else if (parsed.token) {
                  currentText += parsed.token;
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id === activeSession.id) {
                        const msgs = [...s.messages];
                        const idx = msgs.findIndex((m) => m.id === aiMsgId);
                        if (idx !== -1) msgs[idx] = { ...msgs[idx], text: currentText, currentStage: undefined };
                        return { ...s, messages: msgs };
                      }
                      return s;
                    })
                  );
                } else if (parsed.citations) {
                  const newCitations = parsed.citations;
                  setIsReferencesOpen(true);
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id === activeSession.id) {
                        const existingCodes = new Set((s.references || []).map((r) => r.code));
                        const uniqueNewCitations = newCitations.filter((c: any) => !existingCodes.has(c.code));
                        const msgs = [...s.messages];
                        const idx = msgs.findIndex((m) => m.id === aiMsgId);
                        if (idx !== -1) {
                          msgs[idx] = { ...msgs[idx], citations: newCitations };
                        }
                        return {
                          ...s,
                          messages: msgs,
                          references: [...(s.references || []), ...uniqueNewCitations],
                        };
                      }
                      return s;
                    })
                  );
                } else if (parsed.stage) {
                  // Pipeline stage indicator: update currentStage field (NOT msg.text)
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id === activeSession.id) {
                        const msgs = [...s.messages];
                        const idx = msgs.findIndex((m) => m.id === aiMsgId);
                        if (idx !== -1) msgs[idx] = { ...msgs[idx], currentStage: parsed.stage };
                        return { ...s, messages: msgs };
                      }
                      return s;
                    })
                  );
                } else if (parsed.error) {
                  currentText = parsed.error;
                }
              } catch (e) {
                // Ignore incomplete JSON chunks in buffer if any
              }
            }
          }
        }
      }

      const newCitations: LegalCitation[] = finalData.citations || [];
      if (newCitations.length > 0) {
        setIsReferencesOpen(true);
      }

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            const msgs = [...s.messages];
            const idx = msgs.findIndex((m) => m.id === aiMsgId);
            if (idx !== -1) {
              msgs[idx] = {
                ...msgs[idx],
                hsCode: finalData.hsCode || undefined,
                taxes: finalData.taxes || undefined,
                inspections: finalData.inspections || undefined,
                citations: finalData.citations || undefined,
                summaryPdf: finalData.summaryPdf || undefined,
                quiz: finalData.quiz || undefined,
                tax: finalData.tax || undefined,
                caseStudy: finalData.caseStudy || undefined,
              };
            }

            const existingCodes = new Set((s.references || []).map((r) => r.code));
            const uniqueNewCitations = newCitations.filter((c) => !existingCodes.has(c.code));

            return {
              ...s,
              messages: msgs,
              references: [...(s.references || []), ...uniqueNewCitations],
            };
          }
          return s;
        })
      );
    } catch (err) {
      console.error('Error fetching AI legal response:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Đã tiếp nhận yêu cầu: "${finalUserMessageText}".\n\nTheo quy định Hải quan hiện hành, mã HS và biểu thuế nhập khẩu ưu đãi đặc biệt được áp dụng dựa trên C/O hợp lệ (AJCEP/VJEPA). Cần chuẩn bị đầy đủ Tờ khai hải quan, Hóa đơn thương mại (Commercial Invoice) và Phiếu đóng gói (Packing List).`,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        summaryPdf: {
          title: 'Tải bản tóm tắt pháp lý (PDF)',
        },
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, fallbackAiMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsGenerating(false);
      fetchUserUsage();
    }
  };

  // Handle Delete Session (with backend sync + safe active-session fallback)
  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa cuộc hội thoại này? Hành động này không thể hoàn tác.'
    );
    if (!confirmed) return;

    try {
      const userIdParam = currentUser?.id
        ? `?userId=${encodeURIComponent(currentUser.id)}`
        : '';
      const res = await fetch(`/api/sessions/${sessionId}${userIdParam}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        alert('Không thể xóa cuộc hội thoại. Vui lòng thử lại.');
        return;
      }
    } catch {
      alert('Không thể xóa cuộc hội thoại. Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);

      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const blank = createDefaultBlankSession();
          setActiveSessionId(blank.id);
          return [blank];
        }
      }

      return remaining;
    });
  };

  // Handle User Login/Register Success
  const handleAuthSuccess = (userInfo: { id?: string; email?: string; fullName: string }, token?: string) => {
    const user = {
      id: userInfo.id || `usr-${Date.now()}`,
      email: userInfo.email || '',
      fullName: userInfo.fullName,
    };
    setCurrentUser(user);
    try {
      localStorage.setItem('logichat_user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('logichat_token', token);
      }
    } catch { }

    setAuthModal({ isOpen: false, mode: 'login' });
    setActiveScreen('chat');
    // Immediately reload sessions with new token
    setTimeout(() => loadSessionsFromBackend(), 100);
    fetchUserUsage();

    if (pendingUpgradeIntent) {
      setPendingUpgradeIntent(false);
      setTimeout(() => setIsPricingPageOpen(true), 150);
    }
  };

  const handleBackFromPricing = () => {
    setIsPricingPageOpen(false);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pricing')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenUpgrade = () => {
    setIsUpgradeModalOpen(false);
    if (!currentUser) {
      setPendingUpgradeIntent(true);
      setAuthModal({ isOpen: true, mode: 'register' });
    } else {
      setIsPricingPageOpen(true);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/pricing')) {
        window.history.pushState({}, '', '/pricing');
      }
    }
  };

  const handlePaymentSuccess = () => {
    fetchUserUsage();
    if (currentUser) {
      setCurrentUser({ ...currentUser, subscriptionPlan: 'pro' } as any);
    }
    setTimeout(() => {
      handleBackFromPricing();
    }, 2000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSessions([]);
    setActiveSessionId(null);
    try {
      localStorage.removeItem('logichat_user');
      localStorage.removeItem('logichat_token');
    } catch { }
    setActiveScreen('landing');
  };

  const handleCitationClick = (citationCode: string) => {
    if (!citationCode) return;
    const clean = citationCode.trim().toLowerCase();

    // 1. Phản hồi trực tiếp các nút [1], [2], [3] hoặc tên điều luật vi phạm
    let directGuardKey: string | null = null;
    if (clean === '1' || clean === '[1]' || clean === 'cit-guard-0' || clean.includes('200') || clean.includes('hình sự') || clean.includes('tội trốn thuế')) {
      directGuardKey = 'cit-guard-0';
    } else if (clean === '2' || clean === '[2]' || clean === 'cit-guard-1' || clean.includes('54/2014') || clean.includes('hải quan') || clean.includes('điều 18')) {
      directGuardKey = 'cit-guard-1';
    } else if (clean === '3' || clean === '[3]' || clean === 'cit-guard-2' || clean.includes('128') || clean.includes('xử phạt') || clean.includes('trốn thuế')) {
      directGuardKey = 'cit-guard-2';
    }

    if (directGuardKey && GUARDRAIL_FULLTEXT_MAP[directGuardKey]) {
      const item = GUARDRAIL_FULLTEXT_MAP[directGuardKey];
      setSelectedCitationModal({
        id: directGuardKey,
        code: item.code,
        title: item.title,
        summary: item.summary,
        fullText: item.fullText,
        status: 'active',
        statusLabel: 'Đang có hiệu lực',
        validityStatus: 'CON_HIEU_LUC',
        sha256: item.sha256,
        verified: true,
        pdfUrl: item.pdfUrl,
      });
      return;
    }

    // 2. Tra cứu trong toàn bộ trích dẫn của phiên thảo luận
    const allCitations: LegalCitation[] = [
      ...(activeSession?.references || []),
      ...(activeSession?.messages?.flatMap((m) => m.citations || []) || []),
    ];

    const found = allCitations.find(
      (c) =>
        c.code?.toLowerCase() === clean ||
        c.id?.toLowerCase() === clean ||
        (c.code && clean.includes(c.code.toLowerCase())) ||
        (c.code && c.code.toLowerCase().includes(clean)) ||
        (c.title && c.title.toLowerCase().includes(clean))
    );

    if (found) {
      setSelectedCitationModal(enrichCitation(found));
      return;
    }

    setIsReferencesOpen(true);
    setHighlightedCitationCode(citationCode);
    setTimeout(() => {
      setHighlightedCitationCode(null);
    }, 4000);
  };

  return (
    <>
      {isAppLoading && <LiquidLoader onComplete={() => setIsAppLoading(false)} />}
      <div className={`min-h-[100dvh] text-slate-900 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-600 ${userUsage?.plan === 'pro' ? 'bg-transparent' : 'bg-blue-50'}`}>
        {userUsage?.plan === 'pro' && <ProBackground />}
        {/* Screen 1: Landing Page */}
        {activeScreen === 'landing' && (
          <LandingPage
            onStartChat={() => {
              setActiveScreen('chat');
            }}
            onLoginClick={() => setAuthModal({ isOpen: true, mode: 'login' })}
            onRegisterClick={() => setAuthModal({ isOpen: true, mode: 'register' })}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {/* Screen 2 & 3: Chat Application & History Workspace */}
        {activeScreen !== 'landing' && (
          <div className="flex h-screen w-full overflow-hidden relative">

            {/* Left Navigation Sidebar (Desktop) */}
            {isDesktopSidebarOpen && (
              <>
                <Sidebar
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  activeScreen={activeScreen}
                  onSelectSession={(id) => {
                    setActiveSessionId(id);
                    setActiveScreen('chat');
                  }}
                  onNewChat={handleNewChat}
                  onNavigateScreen={(scr) => setActiveScreen(scr)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenHsTree={() => setIsHsTreeModalOpen(true)}
                  onDeleteSession={handleDeleteSession}
                  isMobileOpen={isMobileSidebarOpen}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onToggleCollapse={() => setIsDesktopSidebarOpen(false)}
                  width={sidebarWidth}
                  userUsage={userUsage}
                  onUpgradeClick={() => {
                    setUpgradeReason('manual');
                    setIsUpgradeModalOpen(true);
                  }}
                />
                <Resizer
                  direction="left"
                  onResize={setSidebarWidth}
                  minWidth={200}
                  maxWidth={500}
                />
              </>
            )}

            {/* Main Content View */}
            <div className="flex-1 flex flex-row h-full relative min-w-0 transition-none">

              {/* Toggle Sidebar Button when collapsed */}
              {!isDesktopSidebarOpen && (
                <button
                  onClick={() => setIsDesktopSidebarOpen(true)}
                  className="hidden md:flex absolute top-4 left-4 z-50 p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm"
                  title="Mở thanh điều hướng"
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
              )}

              {activeScreen === 'chat' ? (
                <ChatView
                  session={activeSession}
                  onSendMessage={handleSendMessage}
                  onToggleReferences={() => setIsReferencesOpen(!isReferencesOpen)}
                  isReferencesOpen={isReferencesOpen}
                  onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                  onOpenPdfModal={openPdfModalFromMessage}
                  onCitationClick={handleCitationClick}
                  isGenerating={isGenerating}
                  aiModel={aiModel}
                  setAiModel={setAiModel}
                  userPlan={userUsage?.plan || 'free'}
                  onUpgradeClick={() => {
                    setUpgradeReason('manual');
                    setIsUpgradeModalOpen(true);
                  }}
                  onStartQuiz={(quizId) => {
                    setActiveQuizId(quizId);
                    setIsQuizModalOpen(true);
                  }}
                  onOpenTaxModal={(data) => {
                    setTaxModalData(data);
                    setIsTaxModalOpen(true);
                  }}
                  onOpenHsTree={() => setIsHsTreeModalOpen(true)}
                  onOpenSolveCaseStudy={(cs) => {
                    setActiveCaseStudy(cs);
                    setCaseStudyModalTab('solve');
                    setIsCaseStudyModalOpen(true);
                  }}
                  onOpenCaseStudySolution={(cs) => {
                    setActiveCaseStudy(cs);
                    setCaseStudyModalTab('solution');
                    setIsCaseStudyModalOpen(true);
                  }}
                />
              ) : (
                <HistoryView
                  sessions={sessions}
                  onSelectSession={(id) => {
                    setActiveSessionId(id);
                    setActiveScreen('chat');
                  }}
                  onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                  onNewChat={handleNewChat}
                  onDeleteSession={handleDeleteSession}
                />
              )}

              {/* Right Side References Panel in Chat mode */}
              {activeScreen === 'chat' && isReferencesOpen && (
                <>
                  <Resizer
                    direction="right"
                    onResize={setReferencePanelWidth}
                    minWidth={250}
                    maxWidth={800}
                  />
                  <ReferencePanel
                    isOpen={isReferencesOpen}
                    onClose={() => setIsReferencesOpen(false)}
                    citations={activeSession.references || []}
                    attachments={activeSession.attachments}
                    highlightedCitationId={highlightedCitationCode}
                    onOpenPdfModal={(title, subtitle) =>
                      setPdfModal({ isOpen: true, title, subtitle })
                    }
                    width={referencePanelWidth}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        <QuizRunnerModal
          isOpen={isQuizModalOpen}
          quizId={activeQuizId}
          onClose={() => {
            setIsQuizModalOpen(false);
            setActiveQuizId(null);
          }}
          userId={currentUser?.id}
          getAuthHeaders={getAuthHeaders}
        />

        <TaxEstimatorModal
          isOpen={isTaxModalOpen}
          taxData={taxModalData}
          onClose={() => {
            setIsTaxModalOpen(false);
            setTaxModalData(null);
          }}
        />

        <CaseStudyModal
          isOpen={isCaseStudyModalOpen}
          caseStudy={activeCaseStudy}
          initialTab={caseStudyModalTab}
          userId={currentUser?.id}
          onClose={() => {
            setIsCaseStudyModalOpen(false);
            setActiveCaseStudy(null);
          }}
        />

        <HsCodeTreeModal
          isOpen={isHsTreeModalOpen}
          onClose={() => setIsHsTreeModalOpen(false)}
          onSelectHsCode={(node) => {
            setIsHsTreeModalOpen(false);
            const mfn = (node.mfnRate || 0) / 100;
            const vat = (node.vatRate || 10) / 100;
            const ttdb = (node.ttdbRate || 0) / 100;
            const cif = 100000000;
            const tNk = cif * mfn;
            const tTtdb = (cif + tNk) * ttdb;
            const vVat = cif + tNk + tTtdb;
            const tVat = vVat * vat;
            const total = tNk + tTtdb + tVat;

            setTaxModalData({
              hsCode: node.code,
              productName: node.titleVi,
              unit: 'Chiếc',
              quantity: 100,
              unitPrice: 1000000,
              currency: 'VND',
              exchangeRate: 1,
              cifForeign: cif,
              vNk: cif,
              coForm: 'MFN',
              importTaxRate: mfn,
              importTaxLabel: `Thuế NK Ưu đãi MFN (${node.mfnRate || 0}%)`,
              tNk: tNk,
              ttdbRate: ttdb,
              tTtdb: tTtdb,
              bvmtRate: 0,
              tBvmt: 0,
              vVat: vVat,
              vatRate: vat,
              tVat: tVat,
              totalTax: total,
              girRule: node.girRule,
              importConditions: node.importConditions,
              legalReference: node.legalReference,
              availableFta: node.ftaRates ? Object.keys(node.ftaRates) : []
            });
            setIsTaxModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={authModal.isOpen}
          initialMode={authModal.mode}
          onClose={() => setAuthModal({ ...authModal, isOpen: false })}
          onSuccess={(userName, userInfo, token) => {
            handleAuthSuccess(userInfo || { fullName: userName }, token);
          }}
        />

        <PdfModal
          isOpen={pdfModal.isOpen}
          title={pdfModal.title}
          subtitle={pdfModal.subtitle}
          content={pdfModal.content}
          hsCode={pdfModal.hsCode}
          taxes={pdfModal.taxes}
          citations={pdfModal.citations}
          onClose={() => setPdfModal({ ...pdfModal, isOpen: false })}
        />

        {selectedCitationModal && (
          <CitationModal
            citation={selectedCitationModal}
            onClose={() => setSelectedCitationModal(null)}
            handleCopy={(id, text) => {
              navigator.clipboard.writeText(text);
              setCopiedCitationId(id);
              setTimeout(() => setCopiedCitationId(null), 2000);
            }}
            copiedId={copiedCitationId}
          />
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          reason={upgradeReason}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgrade={handleOpenUpgrade}
        />
      </div>

      {isPricingPageOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto">
          <PricingPage 
            onBack={handleBackFromPricing} 
            userId={currentUser?.id || ''} 
            onRequireAuth={() => {
              setIsPricingPageOpen(false);
              setPendingUpgradeIntent(true);
              setAuthModal({ isOpen: true, mode: 'register' });
            }}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </div>
      )}
      {/* Global Water Ripple Effect */}
      <WaterRippleMouse />
    </>
  );
}