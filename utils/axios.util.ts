import axios from "axios";
import * as SecureStore from "expo-secure-store";

console.log(process.env.EXPO_PUBLIC_API_URL);

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터: 저장된 토큰을 쿠키 헤더에 붙여서 보냄
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("X-Access-Token");
      if (token) {
        config.headers["Cookie"] = `X-Access-Token=${token}`;
      }
    } catch (e) {
      // 토큰 없으면 그냥 넘어감
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 응답 인터셉터: set-cookie 헤더에서 토큰 꺼내서 SecureStore에 저장
axiosInstance.interceptors.response.use(
  async (response) => {
    try {
      const setCookie = response.headers["set-cookie"];
      console.log("쿠키:", setCookie);
      if (setCookie) {
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const cookie of cookies) {
          const match = cookie.match(/X-Access-Token=([^;]+)/);
          if (match) {
            await SecureStore.setItemAsync("X-Access-Token", match[1]);
          }
        }
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
