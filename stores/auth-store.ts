import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  storageUsed: number;
  storageLimit: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isPinVerified: boolean;
  isPinSet: boolean;
  pin: string;
  password: string;
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  checkEmailExists: (email: string) => boolean;
  verifyPassword: (password: string) => boolean;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  setPinVerified: (verified: boolean) => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  updateNickname: (nickname: string) => void;
  upgradeToPro: () => void;
}

// TODO [배포 전]: MOCK_USER, REGISTERED_EMAILS 전체 삭제
const MOCK_USER: User = {
  id: "user-1",
  email: "test@example.com",
  nickname: "홍길동",
  plan: "free",
  storageUsed: 1.2,
  storageLimit: 5,
};

const REGISTERED_EMAILS = new Set([MOCK_USER.email]);

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isPinVerified: false,
  // TODO [배포 전]: isPinSet: false, pin: "", password: "" 으로 초기화
  isPinSet: true,
  pin: "000000",
  password: "test",
  isBiometricEnabled: false,

  // TODO [배포 전]: POST /auth/login API 실제 호출로 교체.
  //   - 백엔드가 JWT를 response body로 반환하면 → token 저장 후 Authorization: Bearer <token> 헤더 방식 사용
  //   - 백엔드가 HttpOnly 쿠키를 사용하면 → react-native-cookies 라이브러리로 쿠키 수동 관리 필요
  //   - 응답에서 받은 실제 user 정보(id, nickname, plan, storageUsed 등)로 set() 해야 함
  login: async (email, _password) => {
    await new Promise((r) => setTimeout(r, 800));
    // API에서 이미 인증됨 → Mock 검증 제거
    set({
      user: { ...MOCK_USER, email },
      token: "mock-jwt-token",
      isAuthenticated: true,
      isPinVerified: true,
      isPinSet: true,
      pin: "000000",
    });
  },

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPinVerified: false,
      isPinSet: false,
      pin: "",
    }),

  // TODO [배포 전]: POST /auth/register API 실제 호출로 교체.
  //   - 서버에서 이메일 중복 체크를 담당하므로 REGISTERED_EMAILS Set 제거
  //   - 회원가입 성공 시 서버에서 반환한 user 정보로 set() 해야 함
  register: async (email, _password, nickname) => {
    await new Promise((r) => setTimeout(r, 800));
    if (REGISTERED_EMAILS.has(email)) {
      throw new Error("EMAIL_TAKEN");
    }
    REGISTERED_EMAILS.add(email);
    set({
      user: { ...MOCK_USER, email, nickname },
      token: "mock-jwt-token",
      isAuthenticated: true,
      isPinVerified: false,
      isPinSet: false,
      password: _password,
    });
  },

  // TODO [배포 전]: GET /auth/check-email?email= API 호출로 교체 (클라이언트 Set 제거)
  checkEmailExists: (email) => REGISTERED_EMAILS.has(email),

  // TODO [배포 전]: 비밀번호를 클라이언트 store에 평문 저장하지 말 것.
  //   - verifyPassword는 POST /auth/verify-password API 호출로 교체
  //   - updatePassword는 PATCH /auth/password API 호출로 교체
  verifyPassword: (password) => get().password === password,

  updatePassword: async (currentPassword, newPassword) => {
    await new Promise((r) => setTimeout(r, 400));
    const isCorrect = get().password === currentPassword;
    if (!isCorrect) {
      throw new Error("INVALID_PASSWORD");
    }
    set({ password: newPassword });
  },

  setPin: (pin) => set({ pin, isPinSet: true }),

  verifyPin: (pin) => {
    const isCorrect = get().pin === pin;
    if (isCorrect) {
      set({
        user:
          get().user ??
          ({
            ...MOCK_USER,
            email: get().user?.email ?? MOCK_USER.email,
          } as User),
        token: get().token ?? "mock-jwt-token",
        isPinVerified: true,
        isAuthenticated: true,
      });
    }
    return isCorrect;
  },

  setPinVerified: (verified) => set({ isPinVerified: verified }),

  enableBiometric: () => set({ isBiometricEnabled: true }),

  disableBiometric: () => set({ isBiometricEnabled: false }),

  updateNickname: (nickname) =>
    set((state) => ({
      user: state.user ? { ...state.user, nickname } : null,
    })),

  upgradeToPro: () =>
    set((state) => ({
      user: state.user
        ? { ...state.user, plan: "pro", storageLimit: 50 }
        : null,
    })),
}));
