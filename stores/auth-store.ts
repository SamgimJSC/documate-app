import {
  BIOMETRIC_ENABLED_KEY,
  BIOMETRIC_LOGIN_EMAIL_KEY,
  BIOMETRIC_RESYNC_REQUIRED_KEY,
  PIN_LOGIN_EMAIL_KEY,
  deleteUser,
  getCurrentUser,
  logoutSession,
  rememberBiometricLoginEmail,
  setBiometricLoginEnabled,
  updateNickname as updateNicknameRequest,
} from "@/services/auth";
import { unregisterFcmTokenFromServer } from "@/services/firebaseMessaging";
import {
  createBiometricKeyPair,
  deleteBiometricKeys,
} from "@/services/rnb";
import { useDocStore } from "@/stores/doc-store";
import { useNotificationBannerStore } from "@/stores/notification-banner-store";
import { useReceiptStore } from "@/stores/receipt-store";
import { useToastStore } from "@/stores/toast-store";
import axiosInstance from "@/utils/axios.util";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  storageUsed: number | null;
  storageLimit: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isPinVerified: boolean;
  isPinSet: boolean | null;
  pin: string;
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (pinNumber: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forgetSavedLogin: () => void;
  deleteAccount: () => Promise<void>;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  verifyPinWithServer: (pinNumber: string) => Promise<boolean>;
  changePinWithServer: (currentPin: string, newPin: string) => Promise<void>;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: (email?: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  upgradeToPro: () => Promise<void>;
}

function clearUserCaches(): void {
  useDocStore.getState().reset();
  useReceiptStore.getState().reset();
  useNotificationBannerStore.getState().hide();
  useToastStore.getState().hide();
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isPinVerified: false,
  isPinSet: null,
  pin: "",
  isBiometricEnabled: false,

  login: async (email, password) => {
    await axiosInstance.post("/auth/login", { email, password });
    const userData = await getCurrentUser();
    set({
      user: userData,
      isAuthenticated: true,
      isPinVerified: true,
    });
  },

  loginWithPin: async (pinNumber) => {
    const email = get().user?.email;
    if (!email) return false;

    try {
      await axiosInstance.post("/auth/login/pin", { email, pinNumber });
      set({
        isAuthenticated: true,
        isPinVerified: true,
        pin: pinNumber,
        isPinSet: true,
      });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    const keepBiometricLogin = get().isBiometricEnabled;
    try {
      await unregisterFcmTokenFromServer();
    } catch (error) {
      console.warn("Device token unregister failed; continuing logout.", error);
    }
    try {
      await logoutSession();
    } catch (error) {
      console.warn("Server logout failed; clearing local session.", error);
    }
    await Promise.all([
      SecureStore.deleteItemAsync("accessToken"),
      SecureStore.deleteItemAsync("refreshToken"),
    ]);
    clearUserCaches();
    set({
      user: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: null,
      pin: "",
      isBiometricEnabled: keepBiometricLogin,
    });
  },

  forgetSavedLogin: () => {
    clearUserCaches();
    void Promise.all([
      SecureStore.deleteItemAsync("accessToken"),
      SecureStore.deleteItemAsync("refreshToken"),
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY),
      SecureStore.deleteItemAsync(PIN_LOGIN_EMAIL_KEY),
    ]);
    void deleteBiometricKeys();
    set({
      user: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: null,
      pin: "",
      isBiometricEnabled: false,
    });
  },

  deleteAccount: async () => {
    const userId = get().user?.id || (await getCurrentUser()).id;
    if (!userId) throw new Error("USER_ID_NOT_FOUND");
    await unregisterFcmTokenFromServer().catch((error) => {
      console.warn("Device token unregister failed; continuing withdrawal.", error);
    });
    await deleteUser(userId);
    get().forgetSavedLogin();
  },

  register: async (_email, _password, _nickname) => {},

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
    set({ pin: newPin, isPinSet: true });
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
      SecureStore.deleteItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY),
      rememberBiometricLoginEmail(email),
    ]);
    set({ isBiometricEnabled: true });
  },

  disableBiometric: async () => {
    await setBiometricLoginEnabled(false);
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY),
      deleteBiometricKeys(),
    ]);
    set({ isBiometricEnabled: false });
  },

  updateNickname: async (nickname) => {
    const userId = get().user?.id || (await getCurrentUser()).id;
    if (!userId) throw new Error("USER_ID_NOT_FOUND");
    const savedNickname = await updateNicknameRequest(userId, nickname);
    set((state) => ({
      user: state.user
        ? { ...state.user, id: userId, nickname: savedNickname }
        : null,
    }));
  },

  upgradeToPro: async () => {
    const user = await getCurrentUser();
    set({ user });
  },
}));
