import React, { useState } from 'react';
import { 
  X, 
  MagnifyingGlass, 
  TreeStructure, 
  CaretRight, 
  CaretDown, 
  Info, 
  Scales, 
  ShieldCheck, 
  Calculator, 
  Sparkle
} from '@phosphor-icons/react';

// Định nghĩa cấu trúc node của Cây Biểu thuế HS
export interface HsTreeNode {
  code: string; // 2 số (Chương), 4 số (Nhóm), 6 số (Phân nhóm), 8 số (Dòng thuế)
  level: 'chapter' | 'heading' | 'subheading' | 'tariff_line';
  titleVi: string;
  titleEn: string;
  mfnRate?: number;
  generalRate?: number;
  vatRate?: number;
  ttdbRate?: number;
  ftaRates?: Record<string, { rate: number; agreement: string }>;
  girRule?: string;
  importConditions?: string;
  legalReference?: string;
  children?: HsTreeNode[];
}

// Cơ sở dữ liệu Cây Phả Hệ Biểu thuế XNK Việt Nam (Nghị định 26/2023/NĐ-CP & Thông tư 31/2022/TT-BTC)
const HS_TREE_DATA: HsTreeNode[] = [
  {
    code: '85',
    level: 'chapter',
    titleVi: 'Chương 85: Máy điện và thiết bị điện và các bộ phận của chúng; máy ghi và tái tạo âm thanh, máy ghi và tái tạo hình ảnh và âm thanh truyền hình',
    titleEn: 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television recorders and reproducers',
    children: [
      {
        code: '85.08',
        level: 'heading',
        titleVi: 'Nhóm 85.08: Máy hút bụi (Vacuum cleaners)',
        titleEn: 'Vacuum cleaners',
        children: [
          {
            code: '8508.11',
            level: 'subheading',
            titleVi: 'Phân nhóm 8508.11: Có động cơ điện gắn liền, công suất không quá 1.500 W và có túi chứa bụi hoặc đồ chứa khác có dung tích không quá 20 lít',
            titleEn: 'With self-contained electric motor, power <= 1,500 W and dust bag <= 20L',
            children: [
              {
                code: '8508.11.00',
                level: 'tariff_line',
                titleVi: 'Máy hút bụi gia dụng không dây hoặc có dây cầm tay, công suất <= 1500W, túi bụi <= 20L',
                titleEn: 'Domestic portable cordless/corded vacuum cleaners, power <= 1500W',
                mfnRate: 25.0,
                generalRate: 37.5,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'Việt Nam - Trung Quốc' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'Nội khối ASEAN' },
                  'Form EUR.1 (EVFTA)': { rate: 6.2, agreement: 'Việt Nam - EU' },
                  'Form VK (VKFTA)': { rate: 0.0, agreement: 'Việt Nam - Hàn Quốc' },
                  'Form CPTPP': { rate: 0.0, agreement: 'Hiệp định Đối tác Toàn diện CPTPP' }
                },
                girRule: 'Áp dụng Quy tắc 1 và Quy tắc 6 Tổng quát giải thích phân loại hàng hóa (GIR): Căn cứ câu chữ của Nhóm 85.08 và Chú giải phân nhóm 8508.11.',
                importConditions: 'Kiểm tra chất lượng an toàn điện theo QCVN 4:2009/BKHCN; Dán nhãn năng lượng theo QĐ 04/2017/QĐ-TTg của Thủ tướng Chính phủ.',
                legalReference: 'Nghị định 26/2023/NĐ-CP & Thông tư 31/2022/TT-BTC.'
              }
            ]
          },
          {
            code: '8508.19',
            level: 'subheading',
            titleVi: 'Phân nhóm 8508.19: Loại khác (Công suất lớn hơn 1500W hoặc dung tích bình chứa lớn)',
            titleEn: 'Other vacuum cleaners',
            children: [
              {
                code: '8508.19.10',
                level: 'tariff_line',
                titleVi: 'Máy hút bụi công nghiệp loại sử dụng cho bệnh viện, nhà xưởng',
                titleEn: 'Industrial vacuum cleaners for hospitals or workshops',
                mfnRate: 10.0,
                generalRate: 15.0,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'ACFTA' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ATIGA' },
                  'Form EUR.1 (EVFTA)': { rate: 0.0, agreement: 'EVFTA' }
                },
                girRule: 'Áp dụng Quy tắc 1 & 6 (GIR): Phân loại vào Nhóm 85.08, phân nhóm 8508.19, mã số 8508.19.10.',
                importConditions: 'Kiểm tra an toàn điện công nghiệp; Kiểm tra hồ sơ CO/CQ xuất xứ.',
                legalReference: 'Nghị định 26/2023/NĐ-CP.'
              }
            ]
          }
        ]
      },
      {
        code: '85.16',
        level: 'heading',
        titleVi: 'Nhóm 85.16: Dụng cụ điện đun nước hoặc làm nóng chất lỏng; dụng cụ điện làm nóng không gian; dụng cụ nhiệt điện gia dụng',
        titleEn: 'Electric instantaneous or storage water heaters; electro-thermic appliances',
        children: [
          {
            code: '8516.79',
            level: 'subheading',
            titleVi: 'Phân nhóm 8516.79: Dụng cụ nhiệt điện gia dụng loại khác',
            titleEn: 'Other electro-thermic appliances',
            children: [
              {
                code: '8516.79.90',
                level: 'tariff_line',
                titleVi: 'Nồi chiên không dầu (Air Fryer), bếp chiên chân không điện gia dụng',
                titleEn: 'Electric domestic air fryers',
                mfnRate: 20.0,
                generalRate: 30.0,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'Việt Nam - Trung Quốc' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ASEAN' },
                  'Form EUR.1 (EVFTA)': { rate: 7.5, agreement: 'Việt Nam - EU' },
                  'Form AK (AKFTA)': { rate: 5.0, agreement: 'ASEAN - Hàn Quốc' },
                  'Form VJ (VJEPA)': { rate: 0.0, agreement: 'Việt Nam - Nhật Bản' }
                },
                girRule: 'Áp dụng Quy tắc 1 & 6 (GIR): Phân loại vào Nhóm 85.16, phân nhóm 8516.79, mã số 8516.79.90.',
                importConditions: 'Kiểm tra chất lượng nhà nước sau thông quan và chứng nhận hợp quy (CR) theo QCVN 4:2009/BKHCN; Dán nhãn năng lượng theo QĐ số 04/2017/QĐ-TTg.',
                legalReference: 'Nghị định 26/2023/NĐ-CP.'
              }
            ]
          }
        ]
      },
      {
        code: '85.17',
        level: 'heading',
        titleVi: 'Nhóm 85.17: Bộ điện thoại, kể cả điện thoại thông minh; thiết bị truyền hoặc nhận tiếng, hình ảnh hoặc dữ liệu khác',
        titleEn: 'Telephone sets, including smartphones; other apparatus for transmission of voice or data',
        children: [
          {
            code: '8517.13',
            level: 'subheading',
            titleVi: 'Phân nhóm 8517.13: Điện thoại thông minh (Smartphones)',
            titleEn: 'Smartphones for cellular networks',
            children: [
              {
                code: '8517.13.00',
                level: 'tariff_line',
                titleVi: 'Điện thoại thông minh (iPhone, Samsung Galaxy, Xiaomi...)',
                titleEn: 'Smartphones for cellular networks',
                mfnRate: 0.0,
                generalRate: 5.0,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'ACFTA' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ATIGA' },
                  'Form EUR.1 (EVFTA)': { rate: 0.0, agreement: 'EVFTA' },
                  'Form CPTPP': { rate: 0.0, agreement: 'CPTPP' }
                },
                girRule: 'Áp dụng Quy tắc 1 và 6 (GIR): Hiệp định Công nghệ Thông tin (ITA-1) cam kết thuế suất nhập khẩu 0%.',
                importConditions: 'Chứng nhận hợp quy và công bố hợp quy tần số vô tuyến điện (Bộ TTTT - Thông tư 04/2023/TT-BTTTT); Kiểm tra giấy phép mật mã dân sự nếu có bảo mật đặc thù.',
                legalReference: 'Nghị định 26/2023/NĐ-CP & Thông tư 04/2023/TT-BTTTT.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '84',
    level: 'chapter',
    titleVi: 'Chương 84: Nồi hơi, máy và thiết bị cơ khí; các bộ phận của chúng',
    titleEn: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof',
    children: [
      {
        code: '84.50',
        level: 'heading',
        titleVi: 'Nhóm 84.50: Máy giặt gia đình hoặc trong tiệm giặt, kể cả máy giặt có chức năng sấy khô',
        titleEn: 'Household or laundry-type washing machines, including machines which both wash and dry',
        children: [
          {
            code: '8450.11',
            level: 'subheading',
            titleVi: 'Phân nhóm 8450.11: Máy giặt hoàn toàn tự động, dung tích đồ giặt khô không quá 10 kg',
            titleEn: 'Fully-automatic machines, each of a dry linen capacity not exceeding 10 kg',
            children: [
              {
                code: '8450.11.10',
                level: 'tariff_line',
                titleVi: 'Máy giặt lồng ngang (cửa trước), dung tích <= 10kg, tự động hoàn toàn',
                titleEn: 'Front-loading fully automatic washing machines <= 10kg',
                mfnRate: 25.0,
                generalRate: 37.5,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'ACFTA' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ATIGA' },
                  'Form VK (VKFTA)': { rate: 0.0, agreement: 'VKFTA' },
                  'Form AK (AKFTA)': { rate: 5.0, agreement: 'AKFTA' },
                  'Form EUR.1 (EVFTA)': { rate: 6.2, agreement: 'EVFTA' }
                },
                girRule: 'Áp dụng Quy tắc 1 & 6 (GIR): Nhóm 84.50, phân nhóm 8450.11, mã 8450.11.10.',
                importConditions: 'Kiểm tra hiệu suất năng lượng tối thiểu (QĐ 04/2017/QĐ-TTg); Kiểm tra an toàn điện theo QCVN 4:2009/BKHCN.',
                legalReference: 'Nghị định 26/2023/NĐ-CP.'
              }
            ]
          }
        ]
      },
      {
        code: '84.71',
        level: 'heading',
        titleVi: 'Nhóm 84.71: Máy xử lý dữ liệu tự động và các khối chức năng của chúng (Máy vi tính, Laptop, Máy chủ)',
        titleEn: 'Automatic data processing machines and units thereof',
        children: [
          {
            code: '8471.30',
            level: 'subheading',
            titleVi: 'Phân nhóm 8471.30: Máy xử lý dữ liệu tự động loại xách tay, trọng lượng không quá 10 kg',
            titleEn: 'Portable automatic data processing machines, weighing not more than 10 kg',
            children: [
              {
                code: '8471.30.20',
                level: 'tariff_line',
                titleVi: 'Máy tính xách tay (Laptops, Notebooks, MacBooks) trọng lượng <= 10kg',
                titleEn: 'Laptops and notebooks <= 10kg',
                mfnRate: 0.0,
                generalRate: 5.0,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'ACFTA' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ATIGA' },
                  'Form EUR.1 (EVFTA)': { rate: 0.0, agreement: 'EVFTA' },
                  'Form CPTPP': { rate: 0.0, agreement: 'CPTPP' }
                },
                girRule: 'Áp dụng Quy tắc 1 và 6 (GIR): Phân loại vào Chương 84, nhóm 84.71, mã 8471.30.20 theo cam kết ITA thuế suất 0%.',
                importConditions: 'Hợp quy EMC Bộ Thông tin Truyền thông (Thông tư 04/2023/TT-BTTTT); Dán nhãn năng lượng theo QĐ 04/2017/QĐ-TTg.',
                legalReference: 'Nghị định 26/2023/NĐ-CP.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '22',
    level: 'chapter',
    titleVi: 'Chương 22: Đồ uống, rượu và giấm (Beverages, spirits and vinegar)',
    titleEn: 'Beverages, spirits and vinegar',
    children: [
      {
        code: '22.04',
        level: 'heading',
        titleVi: 'Nhóm 22.04: Rượu vang làm từ nho tươi, kể cả rượu vang tăng cường nồng độ cồn',
        titleEn: 'Wine of fresh grapes, including fortified wines',
        children: [
          {
            code: '2204.21',
            level: 'subheading',
            titleVi: 'Phân nhóm 2204.21: Đóng trong thùng chứa có dung tích không quá 2 lít (đóng chai)',
            titleEn: 'In containers holding 2 litres or less',
            children: [
              {
                code: '2204.21.11',
                level: 'tariff_line',
                titleVi: 'Rượu vang nho nồng độ cồn <= 15% vol, đóng chai <= 2 lít (Vang đỏ, Vang trắng)',
                titleEn: 'Wine of fresh grapes <= 15% vol in bottles <= 2L',
                mfnRate: 50.0,
                generalRate: 75.0,
                vatRate: 10.0,
                ttdbRate: 65.0,
                ftaRates: {
                  'Form EUR.1 (EVFTA)': { rate: 20.0, agreement: 'Việt Nam - EU' },
                  'Form CPTPP': { rate: 22.5, agreement: 'CPTPP' },
                  'Form VK (VKFTA)': { rate: 35.0, agreement: 'Việt Nam - Hàn Quốc' },
                  'Form D (ATIGA)': { rate: 5.0, agreement: 'ATIGA' }
                },
                girRule: 'Áp dụng Quy tắc 1 & 6 (GIR): Chương 22, nhóm 22.04, phân nhóm 2204.21, mã số 2204.21.11.',
                importConditions: 'Chịu thuế Tiêu thụ đặc biệt 65%; Có Giấy phép phân phối/nhập khẩu rượu của Bộ Công Thương; Kiểm tra ATTP nhập khẩu; Dán tem rượu nhập khẩu tại cửa khẩu.',
                legalReference: 'Luật Thuế Tiêu thụ đặc biệt số 27/2008 & Nghị định 105/2017/NĐ-CP.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '33',
    level: 'chapter',
    titleVi: 'Chương 33: Tinh dầu và các chất tựa nhựa; nước hoa, mỹ phẩm hoặc các chế phẩm dùng cho vệ sinh',
    titleEn: 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations',
    children: [
      {
        code: '33.04',
        level: 'heading',
        titleVi: 'Nhóm 33.04: Mỹ phẩm hoặc các chế phẩm trang điểm và các chế phẩm dưỡng da',
        titleEn: 'Beauty or make-up preparations and preparations for the care of the skin',
        children: [
          {
            code: '3304.99',
            level: 'subheading',
            titleVi: 'Phân nhóm 3304.99: Loại khác (Kem dưỡng da, serum, sữa dưỡng ẩm)',
            titleEn: 'Other beauty preparations',
            children: [
              {
                code: '3304.99.90',
                level: 'tariff_line',
                titleVi: 'Kem dưỡng ẩm da, kem chống nắng, serum dưỡng da mặt dạng gel/kem',
                titleEn: 'Skin moisturizing creams, anti-aging serum, lotions',
                mfnRate: 20.0,
                generalRate: 30.0,
                vatRate: 10.0,
                ttdbRate: 0.0,
                ftaRates: {
                  'Form E (ACFTA)': { rate: 0.0, agreement: 'ACFTA' },
                  'Form D (ATIGA)': { rate: 0.0, agreement: 'ATIGA' },
                  'Form AK (AKFTA)': { rate: 10.0, agreement: 'AKFTA' },
                  'Form VK (VKFTA)': { rate: 5.0, agreement: 'VKFTA' },
                  'Form EUR.1 (EVFTA)': { rate: 5.0, agreement: 'EVFTA' }
                },
                girRule: 'Áp dụng Quy tắc 1 và 6 (GIR): Phân loại vào Chương 33, nhóm 33.04, phân nhóm 3304.99, mã 3304.99.90.',
                importConditions: 'Bắt buộc phải có Phiếu công bố sản phẩm mỹ phẩm còn hiệu lực do Cục Quản lý Dược (Bộ Y tế) cấp trước khi thông quan.',
                legalReference: 'Thông tư 06/2011/TT-BYT & Nghị định 26/2023/NĐ-CP.'
              }
            ]
          }
        ]
      }
    ]
  }
];

// Danh sách 6 Quy tắc Tổng quát Giải thích Phân loại Hàng hóa (GIR - General Interpretative Rules)
const GIR_RULES_GUIDE = [
  {
    rule: 'Quy tắc 1 (GIR 1)',
    name: 'Phân loại theo Chú giải và Tên phân nhóm',
    summary: 'Tên của các Phần, Chương và Phân chương chỉ để tiện tra cứu. Phân loại hàng hóa được xác định theo nội dung của từng Nhóm hàng và các Chú giải Phần, Chương liên quan.'
  },
  {
    rule: 'Quy tắc 2 (GIR 2)',
    name: 'Hàng chưa hoàn chỉnh & Hỗn hợp',
    summary: '2(a): Một mặt hàng ở dạng chưa hoàn chỉnh, chưa lắp ráp cũng được phân loại như mặt hàng đã hoàn chỉnh nếu có đặc trưng cơ bản. 2(b): Hỗn hợp các nguyên liệu hoặc chất.'
  },
  {
    rule: 'Quy tắc 3 (GIR 3)',
    name: 'Phân loại khi thoạt nhìn có thể xếp vào 2 hoặc nhiều nhóm',
    summary: '3(a): Nhóm có mô tả cụ thể nhất được ưu tiên. 3(b): Căn cứ vào vật liệu tạo nên đặc trưng cơ bản. 3(c): Xếp vào nhóm có số thứ tự sau cùng trong biểu thuế.'
  },
  {
    rule: 'Quy tắc 4 (GIR 4)',
    name: 'Phân loại theo hàng hóa giống nhất',
    summary: 'Hàng hóa không thể phân loại theo các quy tắc 1, 2, 3 thì được phân loại vào nhóm hàng giống chúng nhất.'
  },
  {
    rule: 'Quy tắc 5 (GIR 5)',
    name: 'Bao bì & Hộp đựng chuyên dụng',
    summary: '5(a): Hộp đựng đàn, máy ảnh, súng được phân loại cùng với hàng hóa nếu thích hợp sử dụng lâu dài. 5(b): Bao bì thông thường đóng gói hàng hóa được phân loại cùng hàng hóa đó.'
  },
  {
    rule: 'Quy tắc 6 (GIR 6)',
    name: 'Phân loại ở cấp Phân nhóm (Mã 6 & 8 số)',
    summary: 'Việc phân loại hàng hóa vào các phân nhóm của một nhóm phải căn cứ theo nội dung của từng phân nhóm, chú giải phân nhóm và chỉ so sánh giữa các phân nhóm cùng cấp độ.'
  }
];

interface HsCodeTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHsCode?: (node: HsTreeNode) => void;
}

export const HsCodeTreeModal: React.FC<HsCodeTreeModalProps> = ({
  isOpen,
  onClose,
  onSelectHsCode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '85': true,
    '85.08': true,
    '8508.11': true,
    '84': true,
    '84.50': true
  });
  const [selectedNode, setSelectedNode] = useState<HsTreeNode | null>(() => {
    return HS_TREE_DATA[0].children?.[0].children?.[0].children?.[0] || null;
  });
  const [showGirGuide, setShowGirGuide] = useState(false);

  if (!isOpen) return null;

  const toggleExpand = (code: string) => {
    setExpandedNodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Hàm lọc tìm kiếm thông minh
  const filterTree = (nodes: HsTreeNode[], query: string): HsTreeNode[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();

    return nodes
      .map(node => {
        const matchesCurrent = 
          node.code.toLowerCase().includes(lower) ||
          node.titleVi.toLowerCase().includes(lower) ||
          node.titleEn.toLowerCase().includes(lower);

        let filteredChildren: HsTreeNode[] = [];
        if (node.children) {
          filteredChildren = filterTree(node.children, query);
        }

        if (matchesCurrent || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          };
        }
        return null;
      })
      .filter(Boolean) as HsTreeNode[];
  };

  const filteredTreeData = filterTree(HS_TREE_DATA, searchQuery);

  // Render đệ quy từng tầng cây
  const renderTreeNode = (node: HsTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes[node.code] || Boolean(searchQuery.trim());
    const isLeaf = !node.children || node.children.length === 0;
    const isSelected = selectedNode?.code === node.code;

    // Badges phân cấp
    const levelBadge = {
      chapter: { label: 'Chương', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      heading: { label: 'Nhóm 4 số', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
      subheading: { label: 'Phân nhóm 6 số', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
      tariff_line: { label: 'Mã số 8 số', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold' }
    }[node.level];

    return (
      <div key={node.code} className="select-none">
        <div 
          onClick={() => {
            if (!isLeaf) {
              toggleExpand(node.code);
            }
            setSelectedNode(node);
          }}
          className={`flex items-center gap-2 py-2 px-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
            isSelected 
              ? 'bg-blue-100/90 text-blue-900 font-semibold shadow-xs border border-blue-300' 
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 18 + 8)}px` }}
        >
          {/* Nút bấm bung / gập */}
          {!isLeaf ? (
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.code);
              }}
              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition-colors"
            >
              {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
            </button>
          ) : (
            <span className="w-5 text-center text-emerald-600 font-bold">•</span>
          )}

          {/* Badge cấp độ */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${levelBadge.bg}`}>
            {node.code}
          </span>

          {/* Tiêu đề */}
          <span className="text-xs truncate flex-1" title={node.titleVi}>
            {node.titleVi}
          </span>

          {/* Thuế suất MFN nếu là dòng thuế */}
          {node.mfnRate !== undefined && (
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
              MFN: {node.mfnRate}%
            </span>
          )}
        </div>

        {/* Render con */}
        {isExpanded && node.children && (
          <div className="border-l border-slate-200/80 ml-4 my-0.5">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
              <TreeStructure size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Cây Tra Cứu Biểu Thuế & Mã HS Thông Minh</span>
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                  NĐ 26/2023/NĐ-CP
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Phân loại theo 4 cấp bậc (Chương → Nhóm → Phân nhóm → Mã 8 số) & 6 Quy tắc Tổng quát GIR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGirGuide(!showGirGuide)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                showGirGuide 
                  ? 'bg-amber-500 text-white border-amber-400 shadow-sm' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Scales size={16} weight="bold" />
              <span>{showGirGuide ? 'Ẩn Hướng dẫn GIR' : '6 Quy tắc GIR'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
              title="Đóng"
            >
              <X size={22} weight="bold" />
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm & Gợi ý nhanh */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên hàng tiếng Việt (máy hút bụi, nồi chiên, laptop, rượu vang...) hoặc mã HS (8508, 8516...)"
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs font-medium text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-[11px]">
            <span className="text-slate-500 shrink-0 font-medium">Gợi ý:</span>
            {[
              'máy hút bụi',
              'nồi chiên không dầu',
              'laptop',
              'điện thoại',
              'rượu vang',
              'kem dưỡng da'
            ].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Banner 6 Quy tắc GIR (Nếu mở) */}
        {showGirGuide && (
          <div className="bg-amber-50/95 border-b border-amber-200 p-4 max-h-48 overflow-y-auto shrink-0 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Scales size={16} weight="fill" className="text-amber-700" />
                <span>6 Quy tắc Tổng quát Giải thích Phân loại Hàng hóa (GIR 1 - GIR 6)</span>
              </h3>
              <span className="text-[11px] text-amber-700 italic">Căn cứ Phụ lục II Thông tư 31/2022/TT-BTC</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {GIR_RULES_GUIDE.map((g, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="font-bold text-blue-900">{g.rule}: <span className="text-slate-800">{g.name}</span></div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{g.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Khung nội dung 2 cột: Cây phân cấp (Trái) & Chi tiết giải trình (Phải) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-50">
          
          {/* CỘT TRÁI: Cây phả hệ phân cấp HS (5/12 cột) */}
          <div className="md:col-span-5 border-r border-slate-200 bg-white p-3 sm:p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Cấu trúc phân cấp Biểu thuế
              </span>
              <span className="text-[11px] text-slate-400">
                {filteredTreeData.length} Chương phù hợp
              </span>
            </div>

            <div className="space-y-1">
              {filteredTreeData.length > 0 ? (
                filteredTreeData.map(node => renderTreeNode(node, 0))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Info size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">Không tìm thấy mã HS phù hợp với từ khóa "{searchQuery}"</p>
                  <p className="text-[11px] text-slate-400 mt-1">Hãy thử tìm theo tên tiếng Việt hoặc gõ 2 chữ số của Chương (ví dụ: 85, 84, 22...)</p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Chi tiết Mã HS, Thuế suất FTAs & Quy tắc GIR (7/12 cột) */}
          <div className="md:col-span-7 p-4 sm:p-6 overflow-y-auto bg-slate-50">
            {selectedNode ? (
              <div className="space-y-4">
                
                {/* Header Thẻ chi tiết */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                      Mã HS: {selectedNode.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium capitalize">
                      Cấp bậc: {selectedNode.level === 'tariff_line' ? 'Dòng thuế chi tiết 8 số' : selectedNode.level}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedNode.titleVi}
                  </h3>
                  <p className="text-xs text-slate-500 italic mt-1 font-sans">
                    {selectedNode.titleEn}
                  </p>
                </div>

                {/* Bảng Các sắc thuế áp dụng */}
                {selectedNode.mfnRate !== undefined ? (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <Calculator size={16} className="text-blue-600" />
                      <span>1. Thuế suất MFN & Các sắc thuế nội địa</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                        <div className="text-[11px] font-semibold text-blue-700">Thuế NK Ưu đãi (MFN)</div>
                        <div className="text-lg font-extrabold text-blue-900 font-mono mt-0.5">{selectedNode.mfnRate}%</div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] font-semibold text-slate-600">Thuế Thông thường</div>
                        <div className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">{selectedNode.generalRate || 0}%</div>
                      </div>

                      <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
                        <div className="text-[11px] font-semibold text-indigo-700">Thuế GTGT (VAT)</div>
                        <div className="text-lg font-extrabold text-indigo-900 font-mono mt-0.5">{selectedNode.vatRate || 10}%</div>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                        <div className="text-[11px] font-semibold text-amber-700">Thuế TTĐB</div>
                        <div className="text-lg font-extrabold text-amber-900 font-mono mt-0.5">{selectedNode.ttdbRate || 0}%</div>
                      </div>
                    </div>

                    {/* Biểu thuế Hiệp định Thương mại Tự do (FTAs) */}
                    {selectedNode.ftaRates && Object.keys(selectedNode.ftaRates).length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">
                          Thuế suất Ưu đãi Đặc biệt theo Hiệp định (C/O FTAs):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {Object.entries(selectedNode.ftaRates).map(([form, data]) => (
                            <div key={form} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                              <span className="font-semibold text-slate-800">{form}</span>
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {data.rate}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Giải trình Quy tắc GIR (General Interpretative Rules) */}
                {selectedNode.girRule && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <Scales size={16} className="text-indigo-600" />
                      <span>2. Căn cứ Phân loại theo 6 Quy tắc GIR (General Interpretative Rules)</span>
                    </h4>
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs sm:text-sm text-indigo-950 leading-relaxed font-sans">
                      {selectedNode.girRule}
                    </div>
                  </div>
                )}

                {/* Chính sách nhập khẩu & Kiểm tra chuyên ngành */}
                {selectedNode.importConditions && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>3. Chính sách mặt hàng & Kiểm tra chuyên ngành</span>
                    </h4>
                    <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs sm:text-sm text-emerald-950 leading-relaxed">
                      {selectedNode.importConditions}
                    </div>
                  </div>
                )}

                {/* Nút hành động */}
                {onSelectHsCode && selectedNode.level === 'tariff_line' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectHsCode(selectedNode);
                        onClose();
                      }}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Sparkle size={18} weight="bold" />
                      <span>Áp Dụng Mã {selectedNode.code} & Tính Thuế Lô Hàng Ngay</span>
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <TreeStructure size={48} className="opacity-40 mb-3" />
                <h4 className="text-sm font-bold text-slate-600">Chọn một mã số HS trên cây bên trái</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Nhấp vào bất kỳ nhánh nào để xem thuế suất MFN, FTAs, căn cứ giải trình 6 quy tắc GIR và điều kiện chuyên ngành.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Quy tắc chuẩn:</span>
            <span>2 số (Chương) → 4 số (Nhóm) → 6 số (Phân nhóm quốc tế) → 8 số (Biểu thuế Hải quan Việt Nam)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
