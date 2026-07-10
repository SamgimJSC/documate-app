import { Document, DocumentCategory } from '@/constants/mock-data';
import type { CreateDocumentBody, DocumentItem } from '@/services/document';
import {
  DocumentCategory as ServerCategory,
  createDocument as apiCreateDocument,
  deleteDocument as apiDeleteDocument,
  getDocumentCategories,
  getDocuments,
  updateDocumentFavorite,
  updateDocumentSecured,
} from '@/services/document';
import { create } from 'zustand';

const CATEGORY_NAME_NORM: Record<string, DocumentCategory> = {
  '계약서': '계약서',
  '보증서': '보증서',
  '보증서/A/S': '보증서',
  '처방전': '처방전',
  '병원/약국': '처방전',
  '보험서류': '보험서류',
  '영수증': '영수증',
  '기타': '기타',
};

function normalizeCategory(name: string | undefined): DocumentCategory {
  if (!name) return '기타';
  return CATEGORY_NAME_NORM[name] ?? '기타';
}

const EXTRACTED_KEY_MAP: Record<string, string> = {
  '계약일': 'contractDate',
  '계약시작일': 'contractDate',
  '계약 시작일': 'contractDate',
  'contract_date': 'contractDate',
  '만료일': 'expiryDate',
  '유효기간': 'expiryDate',
  '계약종료일': 'expiryDate',
  '계약 종료일': 'expiryDate',
  'expiry_date': 'expiryDate',
  '갱신일': 'renewalDate',
  'renewal_date': 'renewalDate',
  '계약자': 'parties',
  '당사자': 'parties',
  '관련자': 'parties',
  '계약당사자': 'parties',
  '제품명': 'productName',
  '제품': 'productName',
  'product_name': 'productName',
  '구매일': 'purchaseDate',
  '구입일': 'purchaseDate',
  'purchase_date': 'purchaseDate',
  '보증기간': 'warrantyPeriod',
  '보증 기간': 'warrantyPeriod',
  'warranty_period': 'warrantyPeriod',
  '수리일': 'repairDate',
  '수리날짜': 'repairDate',
  'repair_date': 'repairDate',
  '병원명': 'hospitalName',
  '병원': 'hospitalName',
  '약국명': 'hospitalName',
  '병원/약국명': 'hospitalName',
  'hospital_name': 'hospitalName',
  '진료일': 'visitDate',
  '방문일': 'visitDate',
  '진료날짜': 'visitDate',
  'visit_date': 'visitDate',
  '금액': 'amount',
  '비용': 'amount',
  '보험금': 'amount',
  '총액': 'amount',
  '결제금액': 'amount',
  '합계': 'amount',
  '결제액': 'amount',
  '지불금액': 'amount',
  '약품명': 'medication',
  '처방약': 'medication',
  '약품': 'medication',
  '약': 'medication',
  '보험사': 'insurer',
  '보험회사': 'insurer',
  '날짜': 'date',
  '일자': 'date',
  '거래일': 'date',
  '주문일': 'date',
  '발행일': 'date',
  '발행처': 'parties',
  '상호': 'parties',
  '업체명': 'parties',
  '가게명': 'parties',
  '매장명': 'parties',
  '판매자': 'parties',
  '공급자': 'parties',
  '메모': 'notes',
  '비고': 'notes',
  '기타사항': 'notes',
};

function normalizeExtractedData(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta') continue;

    const mappedKey =
      EXTRACTED_KEY_MAP[key] ?? EXTRACTED_KEY_MAP[key.toLowerCase()] ?? key;
    let stringValue: string | null = null;

    if (typeof value === 'string' && value) stringValue = value;
    else if (typeof value === 'number') stringValue = String(value);
    else if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === 'string');
      if (strings.length) stringValue = strings.join(', ');
    }

    if (stringValue && !result[mappedKey]) result[mappedKey] = stringValue;
  }
  return result;
}

function toDocument(item: DocumentItem): Document {
  const today = new Date().toISOString().split("T")[0];
  const expiry = item.expiryDate ?? undefined;

  let status: Document["status"] = "active";
  if (expiry) {
    const daysLeft = Math.ceil(
      (new Date(expiry).getTime() - new Date(today).getTime()) / 86400000,
    );
    if (daysLeft <= 0) status = "expired";
    else if (daysLeft <= 30) status = "expiring_soon";
  }

  const raw = (item.extractedData ?? {}) as Record<string, unknown>;
  const extractedData = normalizeExtractedData(raw);
  if (!extractedData.notes && typeof item.ocrText === 'string' && item.ocrText) {
    extractedData.notes = item.ocrText;
  }

  return {
    id: item.documentId,
    categoryId: item.categoryId ?? undefined,
    title: item.title,
    category: normalizeCategory(item.category?.name),
    uploadedAt: item.createdAt?.split("T")[0] ?? today,
    expiryDate: expiry,
    imageUri: item.fileUrl,
    fileType: item.fileType,
    tags: item.documentTags?.map((docTag) => docTag.tag.name) ?? [],
    isFavorite: item.isFavorite ?? false,
    isSecured: false,
    issueDate: item.issueDate ?? undefined,
    renewalDate: item.renewalDate ?? undefined,
    documentTags:
      item.documentTags?.map((dt) => ({
        name: dt.tag.name,
        tagId: dt.tag.tagId,
      })) ?? [],
    aiStatus: item.aiStatus,
    aiConfidence: item.aiConfidence ?? undefined,
    fileSizeBytes: item.fileSizeBytes ? Number(item.fileSizeBytes) : undefined,
    status,
    extractedData,
    notifications: [],
  };
}

function isLocalDraft(id: string) {
  return id.startsWith("doc-");
}

interface DocState {
  documents: Document[];
  categories: ServerCategory[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  reset: () => void;
  fetchDocuments: (silent?: boolean) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addDocument: (doc: Document) => void;
  setDocument: (docs: Document[]) => void;
  removeDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleSecured: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getFilteredDocuments: () => Document[];
  createDocumentOnServer: (body: CreateDocumentBody) => Promise<string>;
  replaceDocumentId: (oldId: string, newId: string) => void;
}

let requestGeneration = 0;

export const useDocStore = create<DocState>()((set, get) => ({
  documents: [],
  categories: [],
  searchQuery: "",
  selectedCategory: null,
  isLoading: false,

  reset: () => {
    requestGeneration += 1;
    set({
      documents: [],
      categories: [],
      searchQuery: "",
      selectedCategory: null,
      isLoading: false,
    });
  },

  fetchDocuments: async (silent = false) => {
    const generation = requestGeneration;
    if (!silent) set({ isLoading: true });
    try {
      const result = await getDocuments({
        limit: 100,
        sort: "createdAt",
        order: "DESC",
      });
      if (generation === requestGeneration) {
        set((state) => ({
          documents: result.items.map((item) => {
            const local = state.documents.find((doc) => doc.id === item.documentId);
            return { ...toDocument(item), isSecured: local?.isSecured ?? false };
          }),
        }));
      }
    } catch (error) {
      console.error("문서 목록 조회 실패:", error);
    } finally {
      if (!silent && generation === requestGeneration) set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    const generation = requestGeneration;
    try {
      const categories = await getDocumentCategories();
      if (generation === requestGeneration) set({ categories });
    } catch (error) {
      console.error("카테고리 조회 실패:", error);
    }
  },

  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),

  setDocument: (docs) => set({ documents: docs }),

  removeDocument: async (id) => {
    const previousDocuments = get().documents;
    set((state) => ({
      documents: state.documents.filter((document) => document.id !== id),
    }));

    if (!isLocalDraft(id)) {
      try {
        await apiDeleteDocument(id);
      } catch (error) {
        set({ documents: previousDocuments });
        console.error("문서 삭제 API 실패:", error);
        throw error;
      }
    }
  },

  toggleFavorite: async (id) => {
    const doc = get().documents.find((document) => document.id === id);
    if (!doc) return;

    const nextFavorite = !doc.isFavorite;
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === id
          ? { ...document, isFavorite: nextFavorite }
          : document,
      ),
    }));

    if (!isLocalDraft(id)) {
      try {
        await updateDocumentFavorite(id, nextFavorite);
      } catch (error) {
        set((state) => ({
          documents: state.documents.map((document) =>
            document.id === id
              ? { ...document, isFavorite: !nextFavorite }
              : document,
          ),
        }));
        console.error("즐겨찾기 API 실패:", error);
      }
    }
  },

  toggleSecured: (id) => {
    const doc = get().documents.find((document) => document.id === id);
    if (!doc) return;

    const nextSecured = !doc.isSecured;
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === id ? { ...document, isSecured: nextSecured } : document,
      ),
    }));

    if (!isLocalDraft(id)) {
      updateDocumentSecured(id, nextSecured).catch((error) => {
        console.error("문서 보안 설정 API 실패:", error);
      });
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === id ? { ...document, ...updates } : document,
      ),
    })),

  createDocumentOnServer: async (body) => {
    const created = await apiCreateDocument(body);
    return created.documentId;
  },

  replaceDocumentId: (oldId, newId) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === oldId ? { ...document, id: newId } : document,
      ),
    })),

  getFilteredDocuments: () => {
    const { documents, searchQuery, selectedCategory } = get();
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedQuery ||
        document.title.toLowerCase().includes(normalizedQuery) ||
        document.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesCategory =
        !selectedCategory || document.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  },
}));
