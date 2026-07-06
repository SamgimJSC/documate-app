import {
  BIOMETRIC_ENABLED_KEY,
  BIOMETRIC_LOGIN_EMAIL_KEY,
  PIN_LOGIN_EMAIL_KEY,
  changePassword,
  getCurrentUser,
  rememberBiometricLoginEmail,
  setBiometricLoginEnabled,
  updateNickname as updateNicknameRequest,
  verifyCurrentPassword,
} from "@/services/auth";
import {
  createBiometricKeyPair,
  deleteBiometricKeys,
} from "@/services/rnb";
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
  forgetSavedLogin: () => void;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  checkEmailExists: (email: string) => boolean;
  verifyPassword: (password: string) => Promise<boolean>;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  verifyPinWithServer: (pinNumber: string) => Promise<boolean>;
  changePinWithServer: (currentPin: string, newPin: string) => Promise<void>;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: (email?: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  upgradeToPro: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isPinVerified: false,
  // TODO [배포 전]: isPinSet: false, pin: "", password: "" 으로 초기화
  isPinSet: true,
  pin: "",
  password: "test",
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
    const keepBiometricLogin = get().isBiometricEnabled;
    void SecureStore.deleteItemAsync("accessToken");
    if (!keepBiometricLogin) {
      void SecureStore.deleteItemAsync("refreshToken");
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: "",
      isBiometricEnabled: keepBiometricLogin,
    });
  },

  forgetSavedLogin: () => {
    void Promise.all([
      SecureStore.deleteItemAsync("accessToken"),
      SecureStore.deleteItemAsync("refreshToken"),
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY),
      SecureStore.deleteItemAsync(PIN_LOGIN_EMAIL_KEY),
    ]);
    void deleteBiometricKeys();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: "",
      isBiometricEnabled: false,
    });
  },

  register: async (_email, _password, _nickname) => {},

  checkEmailExists: async (email) => {
    const res = await axiosInstance.get(
      `/auth/check-email?email=${encodeURIComponent(email)}`,
    );
    return res?.data?.exists ?? false;
  },

  verifyPassword: async (password) => verifyCurrentPassword(password),

  updatePassword: async (currentPassword, newPassword) => {
    await changePassword(currentPassword, newPassword);
  },

  setPin: (pin) => {
    set({ pin, isPinSet: true });
  },

  verifyPin: (pin) => get().pin === pin,

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

  enableBiometric: async (requestedEmail) => {
    const email =
      requestedEmail || get().user?.email || (await getCurrentUser()).email;
    if (!email) throw new Error("BIOMETRIC_EMAIL_NOT_FOUND");

    const { biometricType, publicKey } = await createBiometricKeyPair();
    try {
      await setBiometricLoginEnabled(true, biometricType, publicKey);
    } catch (error) {
      await deleteBiometricKeys();
      throw error;
    }
    await Promise.all([
      SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true"),
      rememberBiometricLoginEmail(email),
    ]);
    set({ isBiometricEnabled: true });
  },

  disableBiometric: async () => {
    await setBiometricLoginEnabled(false);
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY),
      deleteBiometricKeys(),
    ]);
    set({ isBiometricEnabled: false });
  },

  updateNickname: async (nickname) => {
    const savedNickname = await updateNicknameRequest(nickname);
    set((state) => ({
      user: state.user ? { ...state.user, nickname: savedNickname } : null,
    }));
  },

  upgradeToPro: () =>
    set((state) => ({
      user: state.user ? { ...state.user, plan: "pro", storageLimit: 50 } : null,
    })),
}));
