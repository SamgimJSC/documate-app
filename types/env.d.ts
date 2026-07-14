// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    /** Expo 환경변수: API 기본 주소 */
    readonly EXPO_PUBLIC_API_URL: string;
    /** 웹 소비 리포트로 이동할 웹 앱 기본 주소 */
    readonly EXPO_PUBLIC_WEB_URL?: string;

    // 혹시 다른 환경변수도 쓰고 있다면 아래에 똑같이 추가해 주세요.
    // readonly EXPO_PUBLIC_FIREBASE_KEY: string;

    // 그 외 정의되지 않은 모든 환경변수도 string 혹은 undefined로 인정해주겠다는 설정
    readonly [key: string]: string | undefined;
  }
}
