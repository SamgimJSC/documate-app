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
import { useAuthStore } from "@/stores/auth-store";

function AuthGuard() {
  const { isAuthenticated, isPinVerified, isPinSet } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const seg = segments as string[];
    const inAuth = seg[0] === "(auth)";

    if (!isAuthenticated && !inAuth) {
      router.replace("/(auth)/login" as any);
    } else if (isAuthenticated && !isPinSet && !inAuth) {
      router.replace("/(auth)/pin-setup" as any);
    } else if (isAuthenticated && isPinSet && !isPinVerified && !inAuth) {
      router.replace("/(auth)/pin-verify" as any);
    } else if (isAuthenticated && isPinVerified && inAuth) {
      router.replace("/(tabs)");
    }
  }, [
    isAuthenticated,
    isPinVerified,
    isPinSet,
    segments,
    router,
    navigationState?.key,
  ]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* <AuthGuard /> */}
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
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
