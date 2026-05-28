import { create } from 'zustand';
import { Document, MOCK_DOCUMENTS } from '@/constants/mock-data';

interface DocState {
  documents: Document[];
  searchQuery: string;
  selectedCategory: string | null;

  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getFilteredDocuments: () => Document[];
}

export const useDocStore = create<DocState>()((set, get) => ({
  documents: MOCK_DOCUMENTS,
  searchQuery: '',
  selectedCategory: null,

  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),

  removeDocument: (id) =>
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

  toggleFavorite: (id) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
      ),
    })),

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
