import axios from "axios";
import * as SecureStore from "expo-secure-store";

console.log(process.env.EXPO_PUBLIC_API_URL);

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
    console.log("응답 data:", JSON.stringify(response.data, null, 2)); // 확인용
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
    console.log(JSON.stringify(error?.response?.data, null, 2));
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
