import axiosInstance from "@/utils/axios.util";
import * as SecureStore from "expo-secure-store";

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

const PIN_LOGIN_EMAIL_KEY = "pinLoginEmail";

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
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await axiosInstance.get("/users/me");
  const data = unwrapData<Record<string, unknown>>(response);
  const usedBytes = Number(data.storageUsedBytes ?? 0);
  const quotaBytes = Number(data.storageQuotaBytes ?? 5 * 1024 ** 3);

  return {
    id: String(data.userId ?? data.id ?? ""),
    email: String(data.email ?? ""),
    nickname: String(data.nickname ?? ""),
    plan: data.plan === "PRO" || data.plan === "pro" ? "pro" : "free",
    storageUsed:
      data.storageUsed !== undefined
        ? Number(data.storageUsed)
        : usedBytes / 1024 ** 3,
    storageLimit:
      data.storageLimit !== undefined
        ? Number(data.storageLimit)
        : quotaBytes / 1024 ** 3,
  };
}

export async function setBiometricLoginEnabled(enabled: boolean) {
  const response = await axiosInstance.post("/auth/biometric/enable", {
    enabled,
  });
  return unwrapData<{ success?: boolean; isBiometricEnabled?: boolean }>(
    response,
  );
}
