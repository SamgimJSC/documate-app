export type DocumentCategory = '계약서' | '보증서' | '처방전' | '보험서류' | '기타';
export type DocumentStatus = 'active' | 'expiring_soon' | 'expired';

export interface Document {
  id: string;
  categoryId?: number;
  title: string;
  category: DocumentCategory;
  uploadedAt: string;
  expiryDate?: string;
  imageUri?: string;
  tags: string[];
  isFavorite: boolean;
  status: DocumentStatus;
  extractedData: {
    date?: string;
    amount?: string;
    parties?: string[];
    notes?: string;
  };
  notifications: {
    id: string;
    date: string;
    label: string;
    enabled: boolean;
  }[];
}

export type ReceiptCategory = '식비' | '마트/편의점' | '카페' | '뷰티/건강' | '교통' | '통신' | '구독' | '기타';

export interface Receipt {
  id: string;
  storeName: string;
  category: ReceiptCategory;
  amount: number;
  date: string;
  imageUri?: string;
  isFavorite: boolean;
  items?: { name: string; price: number }[];
  storeAddress?: string;
  paymentItem?: string;
  memo?: string;
  inputMethod?: 'OCR' | 'MANUAL' | string;
}

const today = new Date();
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const subDays = (days: number) => addDays(-days);

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    title: '신촌 아파트 임대차 계약서',
    category: '계약서',
    uploadedAt: subDays(180),
    expiryDate: addDays(90),
    tags: ['임대차', '아파트', '신촌'],
    isFavorite: true,
    status: 'active',
    extractedData: {
      date: subDays(180),
      parties: ['홍길동', '(주)신촌부동산'],
      notes: '보증금 3,000만원 / 월세 80만원',
    },
    notifications: [
      { id: 'n1', date: addDays(0), label: '만기 3개월 전 알림', enabled: true },
    ],
  },
  {
    id: 'doc-2',
    title: '화재보험 증권',
    category: '보험서류',
    uploadedAt: subDays(330),
    expiryDate: addDays(14),
    tags: ['보험', '화재'],
    isFavorite: false,
    status: 'expiring_soon',
    extractedData: {
      date: subDays(330),
      amount: '연 120,000원',
      notes: '삼성화재 / 보험번호 2024-12345',
    },
    notifications: [
      { id: 'n2', date: addDays(0), label: '만기 1개월 전 알림', enabled: true },
      { id: 'n3', date: addDays(7), label: '만기 2주 전 알림', enabled: true },
    ],
  },
  {
    id: 'doc-3',
    title: '자동차 보험 (현대해상)',
    category: '보험서류',
    uploadedAt: subDays(350),
    expiryDate: addDays(7),
    tags: ['자동차보험', '현대해상'],
    isFavorite: true,
    status: 'expiring_soon',
    extractedData: {
      date: subDays(350),
      amount: '연 890,000원',
      notes: '차량번호 12가 3456',
    },
    notifications: [
      { id: 'n4', date: addDays(0), label: '만기 1개월 전 알림', enabled: true },
    ],
  },
  {
    id: 'doc-4',
    title: '삼성 냉장고 무상 보증서',
    category: '보증서',
    uploadedAt: subDays(60),
    expiryDate: addDays(180),
    tags: ['삼성', '냉장고', '보증서'],
    isFavorite: false,
    status: 'active',
    extractedData: {
      date: subDays(60),
      notes: '모델명 RS84T5081B4 / S/N: ZBF94CMA123456',
    },
    notifications: [
      { id: 'n5', date: addDays(150), label: '만기 1개월 전 알림', enabled: false },
    ],
  },
  {
    id: 'doc-5',
    title: '안과 처방전',
    category: '처방전',
    uploadedAt: subDays(10),
    tags: ['처방전', '안경'],
    isFavorite: false,
    status: 'active',
    extractedData: {
      date: subDays(10),
      notes: '우안 -2.50 / 좌안 -3.00',
    },
    notifications: [],
  },
  {
    id: 'doc-6',
    title: '정보처리기사 자격증',
    category: '기타',
    uploadedAt: subDays(365),
    tags: ['자격증', '정보처리'],
    isFavorite: true,
    status: 'active',
    extractedData: {
      date: subDays(365),
      notes: '한국산업인력공단 발행',
    },
    notifications: [],
  },
];

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'r-1',
    storeName: 'GS25 신촌점',
    category: '마트/편의점',
    amount: 5200,
    date: subDays(1),
    isFavorite: false,
    items: [
      { name: '삼각김밥', price: 1500 },
      { name: '아메리카노 캔', price: 1800 },
      { name: '과자', price: 1900 },
    ],
  },
  {
    id: 'r-2',
    storeName: '이마트 신촌점',
    category: '마트/편의점',
    amount: 45800,
    date: subDays(3),
    isFavorite: false,
    items: [
      { name: '라면 4개입', price: 4200 },
      { name: '우유 1L', price: 2800 },
      { name: '채소류', price: 12500 },
      { name: '고기류', price: 18000 },
      { name: '기타', price: 8300 },
    ],
  },
  {
    id: 'r-3',
    storeName: '스타벅스 연세대점',
    category: '카페',
    amount: 8500,
    date: subDays(2),
    isFavorite: true,
    items: [
      { name: '아이스 아메리카노 Tall', price: 5000 },
      { name: '초코 머핀', price: 3500 },
    ],
  },
  {
    id: 'r-4',
    storeName: '올리브영 신촌점',
    category: '뷰티/건강',
    amount: 32000,
    date: subDays(7),
    isFavorite: false,
  },
  {
    id: 'r-5',
    storeName: '맥도날드',
    category: '식비',
    amount: 9900,
    date: subDays(5),
    isFavorite: false,
    items: [
      { name: '빅맥 세트', price: 8400 },
      { name: '소프트콘', price: 1500 },
    ],
  },
  {
    id: 'r-6',
    storeName: 'KT 통신요금',
    category: '통신',
    amount: 55000,
    date: subDays(15),
    isFavorite: false,
  },
  {
    id: 'r-7',
    storeName: '넷플릭스',
    category: '구독',
    amount: 17000,
    date: subDays(20),
    isFavorite: false,
  },
  {
    id: 'r-8',
    storeName: '버거킹 신촌점',
    category: '식비',
    amount: 12500,
    date: subDays(4),
    isFavorite: false,
  },
];
