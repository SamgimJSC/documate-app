import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
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
  password: string;
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  checkEmailExists: (email: string) => boolean;
  verifyPassword: (password: string) => boolean;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  updateNickname: (nickname: string) => void;
  upgradeToPro: () => void;
}

const MOCK_USER: User = {
  id: "user-1",
  email: "test@example.com",
  nickname: "홍길동",
  plan: "free",
  storageUsed: 1.2,
  storageLimit: 5,
};

const REGISTERED_EMAILS = new Set([MOCK_USER.email]);

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isPinVerified: false,
  // Dev/test: seed a default PIN and password so login and password change can be tested.
  isPinSet: true,
  pin: "000000",
  password: "test",
  isBiometricEnabled: false,

  login: async (email, _password) => {
    await new Promise((r) => setTimeout(r, 800));
    const currentPassword = get().password;
    if (_password !== currentPassword) {
      throw new Error("INVALID_PASSWORD");
    }
    set({
      user: { ...MOCK_USER, email },
      token: "mock-jwt-token",
      isAuthenticated: true,
      isPinVerified: true,
      isPinSet: true,
      pin: "000000",
    });
  },

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: "",
    }),

  register: async (email, _password, nickname) => {
    await new Promise((r) => setTimeout(r, 800));
    if (REGISTERED_EMAILS.has(email)) {
      throw new Error("EMAIL_TAKEN");
    }
    REGISTERED_EMAILS.add(email);
    set({
      user: { ...MOCK_USER, email, nickname },
      token: "mock-jwt-token",
      isAuthenticated: true,
      isPinVerified: false,
      isPinSet: false,
      password: _password,
    });
  },

  checkEmailExists: (email) => REGISTERED_EMAILS.has(email),

  verifyPassword: (password) => get().password === password,

  updatePassword: async (currentPassword, newPassword) => {
    await new Promise((r) => setTimeout(r, 400));
    const isCorrect = get().password === currentPassword;
    if (!isCorrect) {
      throw new Error("INVALID_PASSWORD");
    }
    set({ password: newPassword });
  },

  setPin: (pin) => set({ pin, isPinSet: true }),

  verifyPin: (pin) => {
    const isCorrect = get().pin === pin;
    if (isCorrect) {
      set({
        user:
          get().user ??
          ({
            ...MOCK_USER,
            email: get().user?.email ?? MOCK_USER.email,
          } as User),
        token: get().token ?? "mock-jwt-token",
        isPinVerified: true,
        isAuthenticated: true,
      });
    }
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
      user: state.user
        ? { ...state.user, plan: "pro", storageLimit: 50 }
        : null,
    })),
}));
