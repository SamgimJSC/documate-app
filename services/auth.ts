import axiosInstance from "@/utils/axios.util";
import { STORAGE_LIMIT_GB } from "@/constants/storage";
import * as SecureStore from "expo-secure-store";
import {
  createBiometricKeyPair,
  deleteBiometricKeys,
  signBiometricChallenge,
} from "@/services/rnb";

export type BiometricType = "FACE" | "FINGER";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  storageUsed: number | null;
  storageLimit: number;
};

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

function normalizeUserPlan(value: unknown): AuthUser["plan"] {
  const plan = String(value ?? "").trim().toUpperCase();
  if (plan === "FREE") return "free";
  if (plan === "PRO") return "pro";
  throw new Error("USER_PLAN_MISSING");
}

function normalizeStorageBytesToGb(bytes: unknown): number | null {
  if (bytes !== undefined && bytes !== null) {
    const value = Number(bytes);
    return Number.isFinite(value) ? value / 1024 ** 3 : null;
  }
  return null;
}

export const PIN_LOGIN_EMAIL_KEY = "pinLoginEmail";
export const BIOMETRIC_ENABLED_KEY = "biometricEnabled";
export const BIOMETRIC_LOGIN_EMAIL_KEY = "biometricLoginEmail";
export const BIOMETRIC_RESYNC_REQUIRED_KEY = "biometricResyncRequired";

export async function rememberPinLoginEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return;

  await SecureStore.setItemAsync(PIN_LOGIN_EMAIL_KEY, normalizedEmail);
}

export async function loginWithPin(pinNumber: string): Promise<void> {
  const email = await SecureStore.getItemAsync(PIN_LOGIN_EMAIL_KEY);
  if (!email) {
    throw new Error("PIN_LOGIN_EMAIL_NOT_FOUND");
  }

  await axiosInstance.post("/auth/login/pin", {
    email,
    pinNumber,
    stayLoggedIn: true,
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await axiosInstance.get("/users/me");
  const data = unwrapData<Record<string, unknown>>(response);
  const plan = normalizeUserPlan(data.plan ?? data.userPlan ?? data.user_plan);
  const usedBytes =
    data.storageUsedBytes ??
    data.storage_used_bytes;

  return {
    id: String(data.userId ?? data.id ?? ""),
    email: String(data.email ?? ""),
    nickname: String(data.nickname ?? ""),
    plan,
    storageUsed: normalizeStorageBytesToGb(usedBytes),
    storageLimit: STORAGE_LIMIT_GB[plan],
  };
}

export async function updateNickname(
  userId: string,
  nickname: string,
): Promise<string> {
  const response = await axiosInstance.patch(`/users/${userId}`, {
    nickname,
  });
  const data = unwrapData<Record<string, unknown>>(response);
  return String(data.nickname ?? nickname);
}

export async function deleteUser(userId: string): Promise<void> {
  await axiosInstance.delete(`/users/${userId}`);
}

export async function logoutSession(): Promise<void> {
  await axiosInstance.post("/auth/logout");
}

export async function setBiometricLoginEnabled(
  enabled: boolean,
  biometricType?: BiometricType,
  publicKey?: string,
) {
  if (enabled && (!biometricType || !publicKey)) {
    throw new Error("BIOMETRIC_REGISTRATION_REQUIRED");
  }

  const response = await axiosInstance.post("/auth/biometric/enable", {
    enabled,
    ...(enabled
      ? { biometric_type: biometricType, public_key: publicKey }
      : {}),
  });
  return unwrapData<{
    success?: boolean;
    is_biometric_enabled?: boolean;
    biometric_type?: BiometricType | null;
  }>(response);
}

export async function rememberBiometricLoginEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY, email.trim());
}

export async function markBiometricResyncRequired(): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY, "true");
}

export async function refreshSavedBiometricLogin(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error("BIOMETRIC_EMAIL_NOT_FOUND");

  const { biometricType, publicKey } = await createBiometricKeyPair({
    requirePrompt: false,
  });
  try {
    await setBiometricLoginEnabled(true, biometricType, publicKey);
  } catch (error) {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY),
      deleteBiometricKeys(),
    ]);
    throw error;
  }

  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true"),
    SecureStore.deleteItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY),
    rememberBiometricLoginEmail(normalizedEmail),
  ]);
}

export async function biometricChallenge(email: string): Promise<{
  challenge: string;
  challengeId: string;
}> {
  const response = await axiosInstance.post("/auth/biometric/challenge", {
    email,
  });
  const data = unwrapData<Record<string, unknown>>(response);
  const challenge = String(data.challenge ?? "");
  const challengeId = String(data.challenge_id ?? data.challengeId ?? "");
  if (!challenge || !challengeId) throw new Error("INVALID_CHALLENGE_RESPONSE");
  return { challenge, challengeId };
}

export async function loginWithBiometricSignature(): Promise<AuthUser> {
  const email = await SecureStore.getItemAsync(BIOMETRIC_LOGIN_EMAIL_KEY);
  if (!email) throw new Error("BIOMETRIC_EMAIL_NOT_FOUND");

  const { challenge, challengeId } = await biometricChallenge(email);
  const signature = await signBiometricChallenge(challenge);
  await axiosInstance.post("/auth/biometric/verify", {
    challenge_id: challengeId,
    signature,
  });
  return getCurrentUser();
}
