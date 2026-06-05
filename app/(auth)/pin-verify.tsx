import { PinPad } from "@/components/common/pin-pad";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PinVerifyScreen() {
  const router = useRouter();
  const { verifyPin, isBiometricEnabled, logout, user } = useAuthStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handlePin = (val: string) => {
    setPin(val);
    if (val.length === 6) {
      if (verifyPin(val)) {
        // Ensure auth flags are set on the store (avoid race with guard)
        useAuthStore.setState({ isAuthenticated: true, isPinVerified: true });
        router.replace("/(tabs)");
      } else {
        setAttempts((a) => a + 1);
        setError(
          attempts >= 2
            ? "5회 오류 시 계정이 잠깁니다."
            : "잘못된 PIN입니다. 다시 시도해주세요.",
        );
        setPin("");
      }
    }
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "DocuMate에 접근합니다",
        cancelLabel: "취소",
      });
      if (result.success) {
        useAuthStore.setState({ isAuthenticated: true, isPinVerified: true });
        router.replace("/(tabs)");
      }
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.welcome}>
            안녕하세요, {user?.nickname ?? ""}님
          </Text>
          <Text style={styles.desc}>PIN을 입력해 앱에 접근하세요</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PinPad value={pin} onChange={handlePin} />

        {isBiometricEnabled && (
          <TouchableOpacity onPress={handleBiometric} style={styles.bioBtn}>
            <Ionicons name="finger-print" size={28} color={Colors.primary} />
            <Text style={styles.bioText}>생체인증 사용</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>다른 계정으로 로그인</Text>
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
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: { fontSize: 20, fontWeight: "700", color: Colors.gray900 },
  desc: { fontSize: 14, color: Colors.gray500 },
  error: { fontSize: 13, color: Colors.error, textAlign: "center" },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  bioText: { fontSize: 15, color: Colors.primary, fontWeight: "600" },
  logoutBtn: { padding: Spacing.sm },
  logoutText: { fontSize: 13, color: Colors.gray400 },
});
