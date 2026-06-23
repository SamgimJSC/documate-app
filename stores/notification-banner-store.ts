import { create } from 'zustand';

export interface BannerPayload {
  title: string;
  body: string;
  data: Record<string, string>;
}

interface NotificationBannerState {
  payload: BannerPayload | null;
  show: (payload: BannerPayload) => void;
  hide: () => void;
}

export const useNotificationBannerStore = create<NotificationBannerState>((set) => ({
  payload: null,
  show: (payload) => set({ payload }),
  hide: () => set({ payload: null }),
}));
