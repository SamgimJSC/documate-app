import { NotificationBanner } from "@/components/common/NotificationBanner";
import { Toast } from "@/components/common/toast";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getFcmToken,
  getInitialNotificationData,
  listenForegroundMessages,
  onNotificationOpenedApp,
  registerBackgroundMessageHandler,
  registerFcmTokenToServer,
} from "@/services/firebaseMessaging";
import {
  registerNotifications,
  setupNotificationHandler,
} from "@/services/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationBannerStore } from "@/stores/notification-banner-store";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import {
  router,
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

// 백그라운드/종료 상태 FCM 핸들러 — 컴포넌트 밖에서 앱 시작 시 등록
registerBackgroundMessageHandler();

// 포그라운드 로컬 알림 표시 핸들러 등록
setupNotificationHandler();

// push 알림 데이터 → 화면 이동
function navigateFromNotification(data: Record<string, string>) {
  if (data.document_id) {
    router.push(`/document/${data.document_id}` as any);
  } else {
    router.push("/notification" as any);
  }
}

function AuthGuard() {
  const { isAuthenticated, isPinVerified, isPinSet } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // 종료 상태 알림 클릭으로 앱 진입했을 때 사용할 pending 데이터
  const pendingNotifData = useRef<Record<string, string> | null>(null);

  // 종료 상태 알림 데이터 수집 (네비게이션 준비 전에 먼저 가져옴)
  useEffect(() => {
    getInitialNotificationData().then((data) => {
      if (data) pendingNotifData.current = data;
    });
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    // 종료 상태 알림으로 진입한 경우 pending 데이터로 이동
    if (pendingNotifData.current) {
      const data = pendingNotifData.current;
      pendingNotifData.current = null;
      navigateFromNotification(data);
      return;
    }

    const seg = segments as string[];
    const inAuth = seg[0] === "(auth)";
    const authScreen = seg[1] ?? "";
    const authEntryScreens = ["login", "register", "forgot-password"];

    const timeoutId = setTimeout(() => {
      if (!isAuthenticated && !inAuth) {
        router.replace("/(auth)/login" as any);
      } else if (
        isAuthenticated &&
        isPinSet === true &&
        !isPinVerified &&
        !inAuth
      ) {
        router.replace("/(auth)/pin-verify" as any);
      } else if (
        isAuthenticated &&
        (isPinVerified || isPinSet === false) &&
        inAuth &&
        authEntryScreens.includes(authScreen)
      ) {
        router.replace("/(tabs)");
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    isAuthenticated,
    isPinVerified,
    isPinSet,
    segments,
    router,
    navigationState,
  ]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Android 알림 채널 생성 + 권한 요청
  useEffect(() => {
    registerNotifications();
  }, []);

  // FCM 토큰 발급 및 서버 등록
  useEffect(() => {
    if (!isAuthenticated) return;

    const initFcmToken = async () => {
      try {
        const fcmToken = await getFcmToken();
        if (!fcmToken) {
          console.log("FCM 토큰을 발급받지 못했습니다.");
          return;
        }
        console.log("발급된 FCM 토큰:", fcmToken);

        await registerFcmTokenToServer(fcmToken);
      } catch (error) {
        console.log("FCM 토큰 처리 실패:", error);
      }
    };
    initFcmToken();
  }, [isAuthenticated]);

  // 포그라운드 FCM 수신 → 로컬 알림으로 표시
  useEffect(() => {
    const unsubscribe = listenForegroundMessages();
    return () => unsubscribe();
  }, []);

  // 포그라운드 로컬 알림 클릭 → 이동
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        useNotificationBannerStore.getState().show({
          title: title ?? "새 알림",
          body: body ?? "",
          data: (data ?? {}) as Record<string, string>,
        });
      }
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
        navigateFromNotification(data);
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // 백그라운드 FCM 알림 클릭 → 이동
  useEffect(() => {
    const unsubscribe = onNotificationOpenedApp(navigateFromNotification);
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthGuard />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="upload-progress" options={{ headerShown: false }} />
        <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="document/edit/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="receipt-detail/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="notification" options={{ headerShown: false }} />
        <Stack.Screen name="pro-promotion" options={{ headerShown: false }} />
        <Stack.Screen name="card-recommendation" options={{ headerShown: false }} />
        <Stack.Screen name="card-detail/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="processing-center" options={{ headerShown: false }} />
      </Stack>
      <NotificationBanner />
      <Toast />
      <StatusBar style="auto" />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
