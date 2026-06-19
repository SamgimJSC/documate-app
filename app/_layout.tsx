import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerNotifications, setupNotificationHandler } from "@/services/notifications";
import { useAuthStore } from "@/stores/auth-store";

// 앱이 켜져 있을 때도 알림이 뜨도록 핸들러 등록 (모듈 로드 시 1회)
setupNotificationHandler();

function AuthGuard() {
  const { isAuthenticated, isPinVerified, isPinSet } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // [안전장치 1]: 네비게이션이 아직 준비 안 됐다면 절대 대기
    if (!navigationState || !navigationState?.key) {
      return;
    }

    const seg = segments as string[];
    const inAuth = seg[0] === "(auth)";
    const authScreen = seg[1] ?? "";
    const authEntryScreens = ["login", "register", "forgot-password"];

    // [안전장치 2]: 다음 틱에 안전하게 실행되도록 반 박자 늦추기
    const timeoutId = setTimeout(() => {
      if (!isAuthenticated && !inAuth) {
        router.replace("/(auth)/login" as any);
      } else if (isAuthenticated && isPinSet && !isPinVerified && !inAuth) {
        router.replace("/(auth)/pin-verify" as any);
      } else if (
        isAuthenticated &&
        (isPinVerified || !isPinSet) &&
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

  // 앱 시작 시 알림 권한 요청
  useEffect(() => {
    registerNotifications();
  }, []);

  return (
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
        <Stack.Screen name="document/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="receipt-detail/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="notification" options={{ headerShown: false }} />
        <Stack.Screen name="pro-promotion" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}