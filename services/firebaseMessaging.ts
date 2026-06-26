// ════════════════════════════════════════════════════════════════════════════
//  firebaseMessaging.ts
//
//  이 파일은 두 개의 섹션으로 구성되어 있습니다.
//
//  ┌─ Section 1 (현재 활성) ──────────────────────────────────────────────┐
//  │  expo-notifications 기반 구현                                         │
//  │  • Expo Go에서 로컬 알림 테스트 가능                                  │
//  │  • 실제 FCM push 수신 불가 (Expo Go 한계)                             │
//  └──────────────────────────────────────────────────────────────────────┘
//
//  ┌─ Section 2 (비활성 — 주석 처리) ────────────────────────────────────┐
//  │  @react-native-firebase/messaging 기반 구현                          │
//  │  • eas build --profile development 빌드 이후 사용                    │
//  │  • 실제 FCM push 수신 가능 (포그라운드 / 백그라운드 / 종료 모두)     │
//  └──────────────────────────────────────────────────────────────────────┘
//
//  ── 전환 방법 (Expo Go → Dev Client) ────────────────────────────────────
//  1. Section 1 전체를 주석 처리
//  2. Section 2 전체의 주석을 해제 (/* ... */ 제거)
//  3. app/_layout.tsx 변경 불필요 (두 섹션의 함수 시그니처가 동일함)
//  4. eas build --profile development --platform android 빌드 & 설치
// ════════════════════════════════════════════════════════════════════════════

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");


// ── Section 1: expo-notifications 기반 (현재 활성) ───────────────────────────
//
// Expo Go에서 동작합니다.
// - registerBackgroundMessageHandler: 로컬 예약 알림은 expo-notifications가 자동
//   처리하므로 별도 핸들러 등록이 필요 없습니다. (no-op)
// - getFcmToken: 실제 FCM 토큰 대신 Expo Push Token을 반환합니다.
//   서버에서 Expo Push API(https://exp.host/--/api/v2/push/send)로 알림을 보내면
//   Expo 인프라가 FCM/APNs로 중계해줍니다.
// - listenForegroundMessages / onNotificationOpenedApp / getInitialNotificationData:
//   Firebase 전용 개념이므로 no-op입니다.
//   포그라운드 알림 표시와 탭 이벤트는 app/_layout.tsx의
//   addNotificationReceivedListener / addNotificationResponseReceivedListener가 담당합니다.

export function registerBackgroundMessageHandler() {
  // expo-notifications 모드에서는 별도 등록 불필요.
  // 로컬 예약 알림은 OS가 직접 표시합니다.
}

export async function getFcmToken(): Promise<string | null> {
  try {
    // 권한 요청
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        console.log("알림 권한이 허용되지 않았습니다.");
        return null;
      }
    }

    // Expo Push Token 발급 (projectId 필요)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("Expo projectId를 찾을 수 없습니다. app.json의 extra.eas.projectId를 확인하세요.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("Expo Push Token:", tokenData.data);
    return tokenData.data;
  } catch (e) {
    console.log("Push 토큰 발급 실패:", e);
    return null;
  }
}

// Expo Go 모드에서는 FCM 포그라운드 수신이 없습니다.
// 포그라운드 로컬 알림 표시는 app/_layout.tsx의 addNotificationReceivedListener가 담당.
export function listenForegroundMessages(): () => void {
  return () => {};
}

// Expo Go 모드에서는 백그라운드 알림 탭 감지가 없습니다.
// 로컬 알림 탭은 app/_layout.tsx의 addNotificationResponseReceivedListener가 담당.
export function onNotificationOpenedApp(
  _handler: (data: Record<string, string>) => void
): () => void {
  return () => {};
}

// Expo Go 모드에서는 종료 상태 알림으로 진입 감지가 없습니다.
export async function getInitialNotificationData(): Promise<Record<string, string> | null> {
  return null;
}
// ── Section 1 끝 ─────────────────────────────────────────────────────────────


// ── Section 2: @react-native-firebase/messaging 기반 (비활성 — 주석 처리) ────
//
// Dev Client / Production 빌드에서 동작합니다.
// - registerBackgroundMessageHandler: 앱 종료 상태에서 FCM data-only 메시지 수신 시
//   JS 엔진이 헤드리스로 깨어나 이 핸들러를 실행합니다.
//   반드시 컴포넌트 밖(모듈 레벨)에서 호출해야 하며,
//   app/_layout.tsx 상단에서 registerBackgroundMessageHandler()를 호출합니다.
// - getFcmToken: Firebase에서 직접 FCM 토큰을 발급합니다.
//   이 토큰을 서버에 등록하면 서버 → Firebase → 기기 경로로 알림이 전송됩니다.
// - listenForegroundMessages: 앱이 켜진 상태에서 FCM 메시지를 수신하면
//   Firebase는 자동으로 알림을 표시하지 않으므로 expo-notifications로 직접 표시합니다.
// - onNotificationOpenedApp: 앱이 백그라운드 상태에서 알림을 탭해 진입한 경우.
// - getInitialNotificationData: 앱이 완전히 종료된 상태에서 알림을 탭해 앱이 시작된 경우.

/*
import messaging from "@react-native-firebase/messaging";

export function registerBackgroundMessageHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("백그라운드/종료 FCM 수신:", remoteMessage);

    // notification payload가 있으면 Firebase가 자동으로 알림을 표시합니다.
    // data-only 메시지(서버가 notification 필드 없이 data만 보낸 경우)는
    // 아래처럼 직접 로컬 알림으로 표시해야 합니다.
    const data = remoteMessage.data ?? {};
    if (!remoteMessage.notification) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: String(data.title ?? "새 알림"),
          body: String(data.body ?? "새로운 알림이 도착했습니다."),
          data,
          sound: true,
        },
        trigger: null,
      });
    }
  });
}

export async function getFcmToken(): Promise<string | null> {
  try {
    // Android는 requestPermission 없이도 토큰 발급 가능하지만
    // iOS는 사용자 권한 승인이 필요합니다.
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("FCM 알림 권한이 허용되지 않았습니다.");
      return null;
    }

    // iOS에서는 APNs 등록을 먼저 해야 FCM 토큰 발급이 가능합니다.
    await messaging().registerDeviceForRemoteMessages();

    const token = await messaging().getToken();
    console.log("FCM Token:", token);
    return token;
  } catch (e) {
    console.log("FCM 토큰 발급 실패:", e);
    return null;
  }
}

// 앱이 포그라운드 상태일 때 FCM 메시지 수신.
// Firebase는 포그라운드에서 알림을 자동 표시하지 않으므로
// expo-notifications를 통해 직접 배너로 표시합니다.
export function listenForegroundMessages(): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("포그라운드 FCM 수신:", remoteMessage);
    const data = remoteMessage.data ?? {};
    await Notifications.scheduleNotificationAsync({
      content: {
        title: String(remoteMessage.notification?.title ?? data.title ?? "새 알림"),
        body: String(remoteMessage.notification?.body ?? data.body ?? "새로운 알림이 도착했습니다."),
        data,
        sound: true,
      },
      trigger: null, // trigger: null 이면 즉시 표시
    });
  });
}

// 앱이 백그라운드 상태에서 알림을 탭했을 때 호출됩니다.
// remoteMessage.data 안에 서버가 보낸 페이로드가 들어 있습니다.
export function onNotificationOpenedApp(
  handler: (data: Record<string, string>) => void
): () => void {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("백그라운드 알림 탭:", remoteMessage);
    handler((remoteMessage.data ?? {}) as Record<string, string>);
  });
}

// 앱이 완전히 종료된 상태에서 알림을 탭해 앱이 시작된 경우 호출합니다.
// app/_layout.tsx의 AuthGuard에서 navigation이 준비된 시점에 처리합니다.
export async function getInitialNotificationData(): Promise<Record<string, string> | null> {
  const remoteMessage = await messaging().getInitialNotification();
  if (!remoteMessage) return null;
  console.log("종료 상태 알림 탭으로 앱 진입:", remoteMessage);
  return (remoteMessage.data ?? {}) as Record<string, string>;
}
*/
// ── Section 2 끝 ─────────────────────────────────────────────────────────────


// ── 공통: FCM 토큰 서버 등록 (두 섹션 모두 이 함수를 사용) ─────────────────────
//
// 서버에 등록된 토큰으로 푸시 알림을 발송합니다.
// Section 1(Expo Push Token)과 Section 2(FCM Token) 모두 이 함수로 서버에 등록합니다.
// TODO [배포 전]: 인증 방식 확정 후 credentials 방식 통일 (document.ts 참고)
export async function registerFcmTokenToServer(fcmToken: string) {
  if (!BASE_URL) {
    console.log("EXPO_PUBLIC_API_URL이 설정되어 있지 않아 서버 등록을 생략합니다.");
    return;
  }

  const response = await fetch(`${BASE_URL}/notifications/push-token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: fcmToken,
      platform: Platform.OS,
      // Section 1: provider를 "EXPO"로 변경하도록 백엔드와 협의 필요
      // Section 2: "FCM" 사용
      provider: "FCM",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM 토큰 등록 실패: ${response.status} ${errorText}`);
  }

  return response.json();
}
