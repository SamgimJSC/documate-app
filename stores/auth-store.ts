import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  nickname: string;
  plan: 'free' | 'pro';
  storageUsed: number;
  storageLimit: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isPinVerified: boolean;
  isPinSet: boolean;
  pin: string;
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  updateNickname: (nickname: string) => void;
  upgradeToPro: () => void;
}

const MOCK_USER: User = {
  id: 'user-1',
  email: 'test@example.com',
  nickname: '홍길동',
  plan: 'free',
  storageUsed: 1.2,
  storageLimit: 5,
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isPinVerified: false,
  isPinSet: false,
  pin: '',
  isBiometricEnabled: false,

  login: async (email, _password) => {
    await new Promise((r) => setTimeout(r, 800));
    set({
      user: { ...MOCK_USER, email },
      token: 'mock-jwt-token',
      isAuthenticated: true,
      isPinVerified: false,
    });
  },

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: '',
    }),

  register: async (email, _password, nickname) => {
    await new Promise((r) => setTimeout(r, 800));
    set({
      user: { ...MOCK_USER, email, nickname },
      token: 'mock-jwt-token',
      isAuthenticated: true,
      isPinVerified: false,
      isPinSet: false,
    });
  },

  setPin: (pin) => set({ pin, isPinSet: true }),

  verifyPin: (pin) => {
    const isCorrect = get().pin === pin;
    if (isCorrect) set({ isPinVerified: true });
    return isCorrect;
  },

  setPinVerified: (verified) => set({ isPinVerified: verified }),

  enableBiometric: () => set({ isBiometricEnabled: true }),

  disableBiometric: () => set({ isBiometricEnabled: false }),

  updateNickname: (nickname) =>
    set((state) => ({
      user: state.user ? { ...state.user, nickname } : null,
    })),

  upgradeToPro: () =>
    set((state) => ({
      user: state.user ? { ...state.user, plan: 'pro', storageLimit: 50 } : null,
    })),
}));
