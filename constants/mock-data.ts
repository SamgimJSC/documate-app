export type DocumentCategory = '계약서' | '보증서' | '처방전' | '보험서류' | '영수증' | '기타';
export type DocumentStatus = 'active' | 'expiring_soon' | 'expired';

export interface Document {
  id: string;
  categoryId?: number;
  title: string;
  category: DocumentCategory;
  uploadedAt: string;
  expiryDate?: string;
  imageUri?: string;
  fileType?: 'PDF' | 'JPG' | 'PNG';
  tags: string[];
  documentTags: { name: string; tagId: string }[];
  isFavorite: boolean;
  isSecured?: boolean;
  issueDate?: string;
  renewalDate?: string;
  aiStatus?: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  aiConfidence?: number;
  fileSizeBytes?: number;
  status: DocumentStatus;
  extractedData: Record<string, string>;
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

