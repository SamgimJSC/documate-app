import { create } from 'zustand';
import { Receipt, MOCK_RECEIPTS } from '@/constants/mock-data';

interface ReceiptState {
  receipts: Receipt[];
  selectedMonth: string;

  addReceipt: (receipt: Receipt) => void;
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
  receipts: MOCK_RECEIPTS,
  selectedMonth: getCurrentMonth(),

  addReceipt: (receipt) =>
    set((state) => ({ receipts: [receipt, ...state.receipts] })),

  removeReceipt: (id) =>
    set((state) => ({ receipts: state.receipts.filter((r) => r.id !== id) })),

  toggleFavorite: (id) =>
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      ),
    })),

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  getReceiptsForMonth: (month) =>
    get().receipts.filter((r) => r.date.startsWith(month)),

  getTotalForMonth: (month) =>
    get()
      .receipts.filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + r.amount, 0),

  getCategoryBreakdown: (month) => {
    const receipts = get().receipts.filter((r) => r.date.startsWith(month));
    const total = receipts.reduce((sum, r) => sum + r.amount, 0);
    const map: Record<string, number> = {};
    for (const r of receipts) {
      map[r.category] = (map[r.category] ?? 0) + r.amount;
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
