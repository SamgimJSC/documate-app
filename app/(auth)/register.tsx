import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Colors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { Ionicons } from "@expo/vector-icons";
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

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nickname) e.nickname = "닉네임을 입력해주세요.";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      e.email = "올바른 이메일을 입력해주세요.";
    if (!password || password.length < 8)
      e.password = "비밀번호는 8자 이상이어야 합니다.";
    if (password !== confirm) e.confirm = "비밀번호가 일치하지 않습니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email, password, nickname);
      router.replace("/(auth)/pin-setup?source=register" as any);
    } catch {
      setErrors({ general: "회원가입에 실패했습니다." });
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
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>회원가입</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>DocuMate 시작하기</Text>
            <Text style={styles.subtitle}>
              계정을 만들어 스마트한 문서 관리를 경험하세요
            </Text>

            <View style={styles.form}>
              <Input
                label="닉네임"
                placeholder="사용할 닉네임 입력"
                value={nickname}
                onChangeText={setNickname}
                error={errors.nickname}
              />
              <Input
                label="이메일"
                placeholder="이메일 주소 입력"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="비밀번호"
                placeholder="8자 이상 입력"
                value={password}
                onChangeText={setPassword}
                isPassword
                error={errors.password}
              />
              <Input
                label="비밀번호 확인"
                placeholder="비밀번호 재입력"
                value={confirm}
                onChangeText={setConfirm}
                isPassword
                error={errors.confirm}
              />
            </View>

            {errors.general && (
              <Text style={styles.generalError}>{errors.general}</Text>
            )}

            <Text style={styles.terms}>
              가입 시 <Text style={styles.termsLink}>이용약관</Text> 및{" "}
              <Text style={styles.termsLink}>개인정보처리방침</Text>에 동의하게
              됩니다.
            </Text>

            <Button
              label="회원가입"
              onPress={handleRegister}
              loading={loading}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>이미 계정이 있으신가요?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>로그인</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: "600", color: Colors.white },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  subtitle: { fontSize: 14, color: Colors.gray500, marginTop: -Spacing.sm },
  form: { gap: Spacing.md },
  generalError: { fontSize: 14, color: Colors.error, textAlign: "center" },
  terms: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: { color: Colors.primary, fontWeight: "600" },
  loginRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.xs },
  loginLabel: { fontSize: 14, color: Colors.gray500 },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
});
