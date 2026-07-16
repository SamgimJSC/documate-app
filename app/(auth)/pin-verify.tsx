import { PinPad } from "@/components/common/pin-pad";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  BIOMETRIC_ENABLED_KEY,
  BIOMETRIC_RESYNC_REQUIRED_KEY,
  getCurrentUser,
  loginWithBiometricSignature,
  loginWithPin,
  markBiometricResyncRequired,
  refreshSavedBiometricLogin,
} from "@/services/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function completeLogin(user: Awaited<ReturnType<typeof getCurrentUser>>, pin?: string) {
  useAuthStore.setState({
    user,
    isAuthenticated: true,
    isPinSet: true,
    isPinVerified: true,
    ...(pin ? { pin } : {}),
  });
}

export default function PinVerifyScreen() {
  const router = useRouter();
  const {
    isBiometricEnabled,
  } = useAuthStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePin = async (value: string) => {
    if (loading) return;

    setPin(value);
    setError("");
    if (value.length !== 6) return;

    setLoading(true);
    try {
      await loginWithPin(value);
      useAuthStore.setState({ pin: value, isPinSet: true });

      const user = await getCurrentUser();
      const savedBiometricEnabled =
        (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
      const biometricResyncRequired =
        (await SecureStore.getItemAsync(BIOMETRIC_RESYNC_REQUIRED_KEY)) === "true";
      if (savedBiometricEnabled || biometricResyncRequired) {
        try {
          await refreshSavedBiometricLogin(user.email);
          useAuthStore.setState({ isBiometricEnabled: true });
        } catch (biometricError) {
          console.warn("Biometric login refresh failed after PIN login.", biometricError);
          const stillBiometricEnabled =
            (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
          useAuthStore.setState({ isBiometricEnabled: stillBiometricEnabled });
        }
      }
      completeLogin(user, value);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPin("");

      const errorCode = isAxiosError(err)
        ? err.response?.data?.errorCode
        : undefined;

      if (
        err instanceof Error &&
        err.message === "PIN_LOGIN_EMAIL_NOT_FOUND"
      ) {
        setError("이 기기에 등록된 계정이 없습니다. 먼저 이메일로 로그인해주세요.");
      } else if (errorCode === "USER_NOT_FOUND") {
        setError("저장된 계정을 찾을 수 없습니다. 이메일로 다시 로그인해주세요.");
      } else if (errorCode === "PIN_NOT_SET") {
        setError("이 계정에는 PIN이 설정되어 있지 않습니다.");
      } else if (errorCode === "PIN_LOCKED" || nextAttempts >= 5) {
        setError("PIN 로그인이 잠겼습니다. 이메일과 비밀번호로 로그인해주세요.");
      } else if (errorCode === "INVALID_PIN") {
        setError("PIN이 올바르지 않습니다. 다시 입력해주세요.");
      } else {
        setError("PIN 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      const user = await loginWithBiometricSignature();
      completeLogin(user);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await markBiometricResyncRequired();
        setError("이 기기의 생체인증 정보가 서버와 맞지 않습니다. PIN 또는 이메일로 로그인하면 다시 등록됩니다.");
      } else {
        setError("생체인식 로그인에 실패했습니다. PIN 또는 이메일로 로그인해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtherAccount = () => {
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={34} color={Colors.primary} />
          </View>
          <Text style={styles.title}>PIN 로그인</Text>
          <Text style={styles.desc}>회원가입 시 설정한 6자리 PIN을 입력해주세요.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.pinArea}>
          <PinPad value={pin} onChange={handlePin} />
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null}
        </View>

        {isBiometricEnabled ? (
          <TouchableOpacity onPress={handleBiometric} style={styles.bioBtn}>
            <Ionicons name="finger-print" size={28} color={Colors.primary} />
            <Text style={styles.bioText}>생체인식으로 로그인</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={handleOtherAccount} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>이메일로 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  top: { alignItems: "center", gap: Spacing.sm },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  desc: { fontSize: 14, color: Colors.gray500, textAlign: "center" },
  error: { fontSize: 13, color: Colors.error, textAlign: "center" },
  pinArea: { position: "relative" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,249,251,0.7)",
  },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  bioText: { fontSize: 15, color: Colors.primary, fontWeight: "600" },
  logoutBtn: { padding: Spacing.sm },
  logoutText: { fontSize: 13, color: Colors.gray500 },
});
