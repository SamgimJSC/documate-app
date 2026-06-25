import { Document, DocumentCategory } from '@/constants/mock-data';
import type { CreateDocumentBody, DocumentItem } from '@/services/document';
import {
  DocumentCategory as ServerCategory,
  createDocument as apiCreateDocument,
  deleteDocument as apiDeleteDocument,
  getDocumentCategories,
  getDocuments,
  updateDocumentFavorite,
} from '@/services/document';
import { create } from 'zustand';

// 서버 DocumentItem → 로컬 Document 변환
function toDocument(item: DocumentItem): Document {
  const today = new Date().toISOString().split('T')[0];
  const expiry = item.expiryDate ?? undefined;

  let status: 'active' | 'expiring_soon' | 'expired' = 'active';
  if (expiry) {
    const daysLeft = Math.ceil(
      (new Date(expiry).getTime() - new Date(today).getTime()) / 86400000
    );
    if (daysLeft <= 0) status = 'expired';
    else if (daysLeft <= 30) status = 'expiring_soon';
  }

  // 서버 extractedData(자유 형식)에서 화면이 쓰는 필드만 안전하게 꺼냄
  // TODO [서버 연동 시 확인]: 실제 CLOVA OCR 응답의 키 이름을 보고 매핑 조정 필요.
  //   서버가 date/amount/parties 외 다른 키(예: issue_date, total_amount)로 줄 수 있음.
  const raw = (item.extractedData ?? {}) as Record<string, unknown>;
  const asString = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;
  const asStringArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

  const extractedData = {
    date: asString(raw.date),
    amount: asString(raw.amount),
    parties: asStringArray(raw.parties),
    // notes는 추출데이터에 있으면 그걸, 없으면 OCR 원문(ocrText)을 폴백으로
    notes: asString(raw.notes) ?? (typeof item.ocrText === 'string' ? item.ocrText : undefined),
  };

  return {
    id: item.documentId,
    categoryId: item.categoryId ?? undefined,
    title: item.title,
    category: (item.category?.name ?? '기타') as DocumentCategory,
    uploadedAt: item.createdAt?.split('T')[0] ?? today,
    expiryDate: expiry,
    imageUri: item.fileUrl,
    tags: item.documentTags?.map((dt) => dt.tag.name) ?? [],
    isFavorite: item.isFavorite ?? false,
    status,
    extractedData,
    notifications: [],
  };
}

// 로컬에서만 만든 임시 문서인지 판단 (서버 동기화 대상 아님)
function isLocalDraft(id: string) {
  return id.startsWith('doc-');
}

interface DocState {
  documents: Document[];
  categories: ServerCategory[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;

  fetchDocuments: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getFilteredDocuments: () => Document[];
  // 수기 등록: 서버에 문서를 새로 생성하고 진짜 documentId를 반환
  createDocumentOnServer: (body: CreateDocumentBody) => Promise<string>;
  // 로컬 임시 id(doc-xxx)를 서버가 준 진짜 id로 교체
  replaceDocumentId: (oldId: string, newId: string) => void;
}

export const useDocStore = create<DocState>()((set, get) => ({
  documents: [],
  categories: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const result = await getDocuments({ limit: 100, sort: 'createdAt', order: 'DESC' });
      set({ documents: result.items.map(toDocument) });
    } catch (e) {
      console.error('문서 목록 조회 실패:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const cats = await getDocumentCategories();
      set({ categories: cats });
    } catch (e) {
      console.error('카테고리 조회 실패:', e);
    }
  },

  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),

  removeDocument: async (id) => {
    // 화면에서는 즉시 제거 (optimistic)
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));

    if (!isLocalDraft(id)) {
      try {
        await apiDeleteDocument(id);
      } catch (e) {
        console.error('문서 삭제 API 실패:', e);
      }
    }
  },

  toggleFavorite: async (id) => {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;

    const newFav = !doc.isFavorite;

    // 화면에서는 즉시 반영 (optimistic)
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isFavorite: newFav } : d
      ),
    }));

    if (!isLocalDraft(id)) {
      try {
        await updateDocumentFavorite(id, newFav);
      } catch (e) {
        // 실패 시 롤백
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, isFavorite: !newFav } : d
          ),
        }));
        console.error('즐겨찾기 API 실패:', e);
      }
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  // 수기 등록: 서버에 새 문서 생성 → 진짜 documentId 반환 (실패 시 throw)
  createDocumentOnServer: async (body) => {
    const created = await apiCreateDocument(body);
    return created.documentId;
  },

  // 로컬 임시 id를 서버가 준 진짜 id로 교체
  replaceDocumentId: (oldId, newId) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === oldId ? { ...d, id: newId } : d
      ),
    })),

  getFilteredDocuments: () => {
    const { documents, searchQuery, selectedCategory } = get();
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        !selectedCategory || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  },
}));