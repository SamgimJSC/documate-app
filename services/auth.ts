import axiosInstance from "@/utils/axios.util";
import * as SecureStore from "expo-secure-store";
import { signBiometricChallenge } from "@/services/rnb";

export type BiometricType = "FACE" | "FINGER";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  storageUsed: number;
  storageLimit: number;
};

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export const PIN_LOGIN_EMAIL_KEY = "pinLoginEmail";
export const BIOMETRIC_ENABLED_KEY = "biometricEnabled";
export const BIOMETRIC_LOGIN_EMAIL_KEY = "biometricLoginEmail";

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
  const usedBytes = Number(
    data.storageUsedBytes ??
      data.storage_used_bytes ??
      data.usedStorageBytes ??
      data.used_storage_bytes ??
      0,
  );
  const quotaBytes = Number(
    data.storageQuotaBytes ??
      data.storage_quota_bytes ??
      data.storageLimitBytes ??
      data.storage_limit_bytes ??
      5 * 1024 ** 3,
  );

  return {
    id: String(data.userId ?? data.id ?? ""),
    email: String(data.email ?? ""),
    nickname: String(data.nickname ?? ""),
    plan: data.plan === "PRO" || data.plan === "pro" ? "pro" : "free",
    storageUsed:
      (data.storageUsed ?? data.storage_used) !== undefined
        ? Number(data.storageUsed ?? data.storage_used)
        : usedBytes / 1024 ** 3,
    storageLimit:
      (data.storageLimit ?? data.storage_limit) !== undefined
        ? Number(data.storageLimit ?? data.storage_limit)
        : quotaBytes / 1024 ** 3,
  };
}

export async function updateNickname(nickname: string): Promise<string> {
  const response = await axiosInstance.patch("/users/me/nickname", {
    nickname,
  });
  const data = unwrapData<Record<string, unknown>>(response);
  return String(data.nickname ?? nickname);
}

export async function verifyCurrentPassword(password: string): Promise<boolean> {
  const response = await axiosInstance.post("/auth/password/verify", {
    password,
  });
  const data = unwrapData<Record<string, unknown>>(response);
  return data.valid === true;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await axiosInstance.post("/auth/password/update", {
    current_password: currentPassword,
    new_password: newPassword,
  });
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
