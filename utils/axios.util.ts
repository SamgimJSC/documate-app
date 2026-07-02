import axios from "axios";
import * as SecureStore from "expo-secure-store";

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
      // 서버가 응답 body에 토큰 넣어주는 경우
      const token = response.data?.data?.accessToken;
      if (token) {
        await SecureStore.setItemAsync("accessToken", token);
      }
    } catch (e) {
      // 저장 실패해도 무시
    }
    return response.data;
  },
  async (error) => {
    const url = error.config?.url ?? '(unknown)';
    const method = (error.config?.method ?? 'GET').toUpperCase();
    if (error.response) {
      const status = error.response.status;
      console.error(`[axios] ${method} ${url} → ${status}`, error.response.data);
    } else if (error.request) {
      console.error(`[axios] ${method} ${url} → 네트워크 연결이 원활하지 않습니다.`);
    } else {
      console.error(`[axios] ${method} ${url} → 에러:`, error.message);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
