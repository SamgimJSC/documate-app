import { unregisterDeviceToken } from "@/services/firebaseMessaging";
import axiosInstance from "@/utils/axios.util";
import * as SecureStore from "expo-secure-store";
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
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (pinNumber: string) => Promise<boolean>;
  logout: () => void;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  checkEmailExists: (email: string) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  verifyPinWithServer: (pinNumber: string) => Promise<boolean>;
  changePinWithServer: (currentPin: string, newPin: string) => Promise<void>;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  updateNickname: (nickname: string) => void;
  upgradeToPro: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isPinVerified: false,
  isPinSet: false,
  pin: "",
  isBiometricEnabled: false,

  login: async (email, password) => {
    await axiosInstance.post("/auth/login", { email, password });
    const userRes = await axiosInstance.get("/users/me");
    const userData = userRes.data;
    set({
      user: {
        id: userData.userId,
        email: userData.email,
        nickname: userData.nickname,
        plan: userData.plan === "PRO" ? "pro" : "free",
        storageUsed: Number(userData.storageUsedBytes) / 1024 / 1024 / 1024,
        storageLimit: userData.storageQuotaBytes
          ? Number(userData.storageQuotaBytes) / 1024 / 1024 / 1024
          : 5,
      },
      token: "logged-in",
      isAuthenticated: true,
      isPinVerified: true,
      isPinSet: userData.hasPinNumber ?? userData.isPinSet ?? false,
    });
  },

  loginWithPin: async (pinNumber) => {
    const email = get().user?.email;
    if (!email) return false;
    try {
      await axiosInstance.post("/auth/login/pin", { email, pinNumber });
      set({ isAuthenticated: true, isPinVerified: true, pin: pinNumber, isPinSet: true });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    unregisterDeviceToken();
    axiosInstance.post("/auth/logout").catch(() => {});
    SecureStore.deleteItemAsync("accessToken").catch(() => {});
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: "",
    });
  },

  // 실제 가입은 pin-setup.tsx에서 /auth/signup을 직접 호출함
  register: async (_email, _password, _nickname) => {},

  checkEmailExists: async (email) => {
    const res = await axiosInstance.get(
      `/auth/check-email?email=${encodeURIComponent(email)}`,
    );
    return res?.exists ?? false;
  },

  verifyPassword: async (password) => {
    try {
      const res = await axiosInstance.post("/auth/password/verify", { password });
      return res?.valid ?? false;
    } catch {
      return false;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    await axiosInstance.post("/auth/password/update", { currentPassword, newPassword });
  },

  setPin: (pin) => set({ pin, isPinSet: true }),

  verifyPin: (pin) => {
    return get().pin === pin;
  },

  verifyPinWithServer: async (pinNumber) => {
    try {
      await axiosInstance.post("/users/me/pin/verify", { pinNumber });
      return true;
    } catch {
      return false;
    }
  },

  changePinWithServer: async (currentPin, newPin) => {
    await axiosInstance.patch("/users/me/pin", { currentPin, newPin });
    set({ pin: newPin });
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
