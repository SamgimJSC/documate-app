import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  type: ToastType;
}

interface ToastState {
  payload: ToastPayload | null;
  show: (payload: ToastPayload) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  payload: null,
  show: (payload) => set({ payload }),
  hide: () => set({ payload: null }),
}));

// 화면 어디서든 간편하게 부르는 헬퍼
// 예: showToast('저장되었습니다', 'success')
export function showToast(message: string, type: ToastType = 'info') {
  useToastStore.getState().show({ message, type });
}