import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const setPinVerified = useAuthStore((s) => s.setPinVerified);
  const [email, setEmail] = useState("test@test");
  const [password, setPassword] = useState("test");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isPinSet = useAuthStore((s) => s.isPinSet);

  const handlePinLogin = () => {
    setError("");
    if (!isPinSet) {
      router.push("/(auth)/pin-setup" as any);
      return;
    }
    router.push("/(auth)/pin-verify" as any);
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled) {
      router.push("/(auth)/biometric-setup" as any);
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "DocuMate에 접근합니다",
        cancelLabel: "취소",
      });

      if (result.success) {
        await login(email || "biometric@documate.test", "");
        setPinVerified(true);
        router.replace("/(tabs)");
      }
    } catch {
      setError("생체인증에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleKakaoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login("kakao@documate.test", "");
      router.replace("/(tabs)");
    } catch {
      setError("카카오 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Ionicons name="document-text" size={36} color={Colors.white} />
            </View>
            <Text style={styles.appName}>DocuMate</Text>
            <Text style={styles.tagline}>
              서류를 찍으면 AI가 알아서 정리해요
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>로그인</Text>

            <View style={styles.form}>
              <Input
                label="이메일"
                placeholder="이메일 주소 입력"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                label="비밀번호"
                placeholder="비밀번호 입력"
                value={password}
                onChangeText={setPassword}
                isPassword
                error={error || undefined}
              />
            </View>

            <Button label="로그인" onPress={handleLogin} loading={loading} />

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password" as any)}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.altButtons}>
              <Button
                label={
                  isBiometricEnabled ? "생체인증으로 로그인" : "생체인증 설정"
                }
                onPress={handleBiometricLogin}
                variant={isBiometricEnabled ? "secondary" : "outline"}
                size="sm"
                fullWidth={false}
                style={styles.altButton}
                textStyle={styles.altButtonText}
              />
              <Button
                label="PIN으로 로그인"
                onPress={handlePinLogin}
                variant="outline"
                size="sm"
                fullWidth={false}
                style={styles.altButton}
                textStyle={styles.altButtonText}
              />
            </View>

            <View style={styles.kakaoLoginRow}>
              <Button
                label="카카오로 로그인"
                onPress={handleKakaoLogin}
                variant="ghost"
                size="md"
                fullWidth={true}
              />
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerLabel}>아직 계정이 없으신가요?</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/register" as any)}
              >
                <Text style={styles.registerLink}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { alignItems: "center", paddingVertical: Spacing.xxl },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  form: { gap: Spacing.md },
  forgotBtn: { alignItems: "center" },
  forgotText: { fontSize: 14, color: Colors.primary },
  divider: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontSize: 13, color: Colors.gray400 },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  registerLabel: { fontSize: 14, color: Colors.gray500 },
  registerLink: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  altButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  altButton: { flex: 1 },
  altButtonText: { fontSize: 14 },
  kakaoLoginRow: { marginTop: Spacing.md },
});
