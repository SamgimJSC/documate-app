import axios from "axios";
// 토큰 저장에 Expo SecureStore를 쓴다면 import (예시)
import * as SecureStore from "expo-secure-store";

console.log(process.env.EXPO_PUBLIC_API_URL);

// 1. Axios 인스턴스 생성
const axiosInstance = axios.create({
  // 이전 단계에서 설정한 Expo 환경변수를 baseURL로 지정합니다.
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000, // 10초 동안 응답이 없으면 타임아웃
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. 요청(Request) 인터셉터: 서버로 요청을 보내기 직전에 가로챕니다.
axiosInstance.interceptors.request.use(
  async (config) => {
    // 예: 앱 내 저장소에서 로그인 토큰을 가져와 헤더에 자동으로 실어 보냅니다.
    const token = await SecureStore.getItemAsync("userToken");
    // const token = "mock_access_token"; // 예시용 토큰

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // 요청 오류가 발생했을 때 수행할 작업
    return Promise.reject(error);
  },
);

// 3. 응답(Response) 인터셉터: 서버로부터 응답을 받은 직후, 컴포넌트 코드로 가기 전에 가로챕니다.
axiosInstance.interceptors.response.use(
  (response) => {
    // 2xx 범위에 있는 상태 코드는 이 함수를 트리거합니다.
    // 응답 데이터에서 필요한 알짜배기 data만 바로 반환하도록 가공할 수도 있습니다.
    return response.data;
  },
  async (error) => {
    // 2xx 외의 상태 코드는 이 함수를 트리거합니다.
    if (error.response) {
      const status = error.response.status;

      // 예: 401 Unauthorized 에러 처리 (토큰 만료 등)
      //   if (status === 401) {
      //     console.warn(
      //       "인증이 만료되었습니다. 로그아웃 처리 또는 토큰 재발급이 필요합니다.",
      //     );
      //     // 여기서 Refresh Token을 이용해 Access Token을 재발급받는 로직을 짜기도 합니다.
      //   }

      // 예: 500 서버 에러 처리
      if (status === 500) {
        console.error("서버 내부 에러가 발생했습니다.");
      }
    } else if (error.request) {
      // 요청은 갔으나 응답을 아예 받지 못한 경우 (인터넷 끊김 등)
      console.error("네트워크 연결이 원활하지 않습니다.");
    } else {
      // 요쳥 설정 중에 에러가 발생한 경우
      console.error("에러 발생:", error.message);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
