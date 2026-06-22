import { Document, DocumentCategory } from '@/constants/mock-data';
import {
  DocumentCategory as ServerCategory,
  deleteDocument as apiDeleteDocument,
  getDocumentCategories,
  getDocuments,
  updateDocumentFavorite,
} from '@/services/document';
import type { DocumentItem } from '@/services/document';
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
    extractedData: {
      notes: typeof item.ocrText === 'string' ? item.ocrText : undefined,
    },
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
