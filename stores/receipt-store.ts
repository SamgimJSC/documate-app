import { Receipt, ReceiptCategory } from '@/constants/mock-data';
import { getReceipts, updateReceiptFavorite } from '@/services/receipts';
import { create } from 'zustand';

interface ReceiptState {
  receipts: Receipt[];
  selectedMonth: string;
  isLoading: boolean;

  fetchReceipts: (month?: string) => Promise<void>;
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (receipt: Receipt) => void;
  removeReceipt: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSelectedMonth: (month: string) => void;
  getTotalForMonth: (month: string) => number;
  getCategoryBreakdown: (month: string) => { category: string; amount: number; percent: number }[];
  getReceiptsForMonth: (month: string) => Receipt[];
}

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const useReceiptStore = create<ReceiptState>()((set, get) => ({
  receipts: [],
  selectedMonth: getCurrentMonth(),
  isLoading: false,

  fetchReceipts: async (month?: string) => {
    set({ isLoading: true });
    try {
      const data = await getReceipts({ month, sort: 'latest', size: 100 });
      set({ receipts: data });
    } catch (e) {
      console.error('영수증 목록 조회 실패:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addReceipt: (receipt) =>
    set((state) => ({ receipts: [receipt, ...state.receipts] })),

  updateReceipt: (receipt) =>
    set((state) => ({
      receipts: state.receipts.map((r) => (r.id === receipt.id ? receipt : r)),
    })),

  removeReceipt: (id) =>
    set((state) => ({ receipts: state.receipts.filter((r) => r.id !== id) })),

  toggleFavorite: async (id) => {
    const receipt = get().receipts.find((r) => r.id === id);
    if (!receipt) return;

    const newFav = !receipt.isFavorite;
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, isFavorite: newFav } : r
      ),
    }));

    try {
      await updateReceiptFavorite(id, newFav);
    } catch (e) {
      set((state) => ({
        receipts: state.receipts.map((r) =>
          r.id === id ? { ...r, isFavorite: !newFav } : r
        ),
      }));
      console.error('영수증 즐겨찾기 API 실패:', e);
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  getReceiptsForMonth: (month) =>
    get().receipts.filter((r) => r.date.startsWith(month)),

  getTotalForMonth: (month) =>
    get()
      .receipts.filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + Number(r.amount), 0),

  getCategoryBreakdown: (month) => {
    const receipts = get().receipts.filter((r) => r.date.startsWith(month));
    const total = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const map: Record<string, number> = {};
    for (const r of receipts) {
      map[r.category] = (map[r.category] ?? 0) + Number(r.amount);
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  },
}));
