import axios from "axios";
import * as SecureStore from "expo-secure-store";

type TokenContainer = Record<string, unknown>;

function findTokenValue(
  value: unknown,
  names: readonly string[],
  depth = 0,
): unknown {
  if (value === null || typeof value !== "object" || depth > 5) return undefined;

  const record = value as TokenContainer;
  for (const name of names) {
    if (typeof record[name] === "string" && record[name]) return record[name];
  }

  for (const child of Object.values(record)) {
    const found = findTokenValue(child, names, depth + 1);
    if (found) return found;
  }
  return undefined;
}

export function describeResponseShape(value: unknown): string {
  if (value === null || typeof value !== "object") return typeof value;
  const root = value as TokenContainer;
  const rootKeys = Object.keys(root);
  const data = root.data;
  const dataKeys =
    data !== null && typeof data === "object"
      ? Object.keys(data as TokenContainer)
      : [];
  return `root=[${rootKeys.join(", ")}], data=[${dataKeys.join(", ")}]`;
}

export async function persistTokensFromResponse(data: unknown): Promise<{
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}> {
  const accessToken = findTokenValue(data, [
    "access_token",
    "accessToken",
    "token",
  ]);
  const refreshToken = findTokenValue(data, [
    "refresh_token",
    "refreshToken",
  ]);

  await Promise.all([
    accessToken
      ? SecureStore.setItemAsync("accessToken", String(accessToken))
      : Promise.resolve(),
    refreshToken
      ? SecureStore.setItemAsync("refreshToken", String(refreshToken))
      : Promise.resolve(),
  ]);

  return {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
  };
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터: 저장된 토큰을 Authorization 헤더에 붙여서 보냄
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      // 토큰 없으면 그냥 넘어감
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 응답 인터셉터: 응답에서 토큰 꺼내서 SecureStore에 저장
axiosInstance.interceptors.response.use(
  async (response) => {
    try {
      await persistTokensFromResponse(response.data);
    } catch (e) {
      // 저장 실패해도 무시
    }
    return response.data;
  },
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 500) {
        console.error("서버 내부 에러가 발생했습니다.");
      }
    } else if (error.request) {
      console.error("네트워크 연결이 원활하지 않습니다.");
    } else {
      console.error("에러 발생:", error.message);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
