import { Document, DocumentCategory } from "@/constants/mock-data";
import {
  DocumentCategory as ServerCategory,
  deleteDocument as apiDeleteDocument,
  getDocumentCategories,
  getDocuments,
  updateDocumentFavorite,
} from "@/services/document";
import type { DocumentItem } from "@/services/document";
import { create } from "zustand";

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

  return {
    id: item.documentId,
    categoryId: item.categoryId ?? undefined,
    title: item.title,
    category: (item.category?.name ?? "기타") as DocumentCategory,
    uploadedAt: item.createdAt?.split("T")[0] ?? today,
    expiryDate: expiry,
    imageUri: item.fileUrl,
    tags: item.documentTags?.map((docTag) => docTag.tag.name) ?? [],
    isFavorite: item.isFavorite ?? false,
    status,
    extractedData: {
      notes: typeof item.ocrText === "string" ? item.ocrText : undefined,
    },
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
  fetchDocuments: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  addDocument: (doc: Document) => void;
  setDocument: (docs: Document[]) => void;
  removeDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getFilteredDocuments: () => Document[];
}

export const useDocStore = create<DocState>()((set, get) => ({
  documents: [],
  categories: [],
  searchQuery: "",
  selectedCategory: null,
  isLoading: false,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const result = await getDocuments({
        limit: 100,
        sort: "createdAt",
        order: "DESC",
      });
      set({ documents: result.items.map(toDocument) });
    } catch (error) {
      console.error("문서 목록 조회 실패:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await getDocumentCategories();
      set({ categories });
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

  setSearchQuery: (q) => set({ searchQuery: q }),

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === id ? { ...document, ...updates } : document,
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
