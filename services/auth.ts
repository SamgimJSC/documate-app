import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

// 로그인 → 토큰 저장
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });

  const token = res.data.token; // 서버 응답 구조에 따라 바꾸기
  await AsyncStorage.setItem("token", token);

  return res.data;
}

// 토큰 가져오기
export async function getToken() {
  return await AsyncStorage.getItem("token");
}

// 로그아웃 → 토큰 삭제
export async function logout() {
  await AsyncStorage.removeItem("token");
}
