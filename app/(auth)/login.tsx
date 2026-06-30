import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { getCurrentUser, rememberPinLoginEmail } from "@/services/auth";
import { useAuthStore } from "@/stores/auth-store";
import axiosInstance from "@/utils/axios.util";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import React, { useEffect, useState } from "react";
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
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    SecureStore.getItemAsync("biometricEnabled").then((enabled) => {
      if (enabled === "true") enableBiometric();
    });
  }, [enableBiometric]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await axiosInstance.post("/auth/login", { email, password });
      await rememberPinLoginEmail(email);

      const userRes = await axiosInstance.get("/users/me");
      const userData = userRes.data;

      useAuthStore.setState({
        isAuthenticated: true,
        isPinVerified: true,
        token: "logged-in",
        user: {
          id: userData.userId,
          email: userData.email,
          nickname: userData.nickname,
          plan: userData.plan === "PRO" ? "pro" : "free",
          storageUsed: Number(userData.storageUsedBytes) / 1024 / 1024 / 1024,
          storageLimit: userData.storageQuotaBytes
            ? Number(userData.storageQuotaBytes) / 1024 / 1024 / 1024
            : 5,
        },
      });

      router.replace("/(tabs)");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverError = err.response?.data;
        if (serverError?.errorCode === "USER_NOT_FOUND") {
          setError("존재하지 않는 이메일입니다.");
        } else if (serverError?.errorCode === "INVALID_PASSWORD") {
          setError("비밀번호가 올바르지 않습니다.");
        } else {
          setError("로그인에 실패했습니다.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = () => {
    setError("");
    router.push("/(auth)/pin-verify" as any);
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled) {
      setError("먼저 이메일로 로그인한 뒤 생체인식을 설정해주세요.");
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "DocuMate에 접근합니다",
        cancelLabel: "취소",
      });

      if (result.success) {
        const user = await getCurrentUser();
        useAuthStore.setState({
          user,
          token: "session",
          isAuthenticated: true,
          isPinSet: true,
          isPinVerified: true,
          isBiometricEnabled: true,
        });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("로그인 정보가 만료되었습니다. 이메일로 다시 로그인해주세요.");
      } else {
        setError("생체인증에 실패했습니다. 다시 시도해주세요.");
      }
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
                label="생체인증으로 로그인"
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
});
