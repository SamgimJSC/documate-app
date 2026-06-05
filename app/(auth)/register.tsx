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
  // ↓ 중복 이메일 예외 처리 함수
  const checkEmailExists = useAuthStore((s) => s.checkEmailExists);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedPush, setAcceptedPush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nickname) e.nickname = "닉네임을 입력해주세요.";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      e.email = "올바른 이메일을 입력해주세요.";
    if (!emailVerified) e.emailCode = "이메일 인증을 완료해주세요.";
    if (!password || password.length < 8)
      e.password = "비밀번호는 8자 이상이어야 합니다.";
    if (password !== confirm) e.confirm = "비밀번호가 일치하지 않습니다.";
    if (!acceptedTerms) e.terms = "이용약관 동의가 필요합니다.";
    if (!acceptedPrivacy) e.privacy = "개인정보처리방침 동의가 필요합니다.";
    if (!acceptedPush) e.push = "알림 수신 동의가 필요합니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email, password, nickname);
      router.replace("/(auth)/pin-setup?source=register" as any);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message === "EMAIL_TAKEN"
          ? "이미 등록된 이메일입니다."
          : "회원가입에 실패했습니다.";
      setErrors({ general: message });
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
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailVerified(false);
                  setEmailSent(false);
                  setEnteredCode("");
                }}
                keyboardType="email-address"
                error={errors.email}
              />
              <Button
                label={emailSent ? "인증번호 재요청" : "이메일 인증번호 받기"}
                onPress={() => {
                  if (!email || !/\S+@\S+\.\S+/.test(email)) {
                    setErrors((prev) => ({
                      ...prev,
                      email: "올바른 이메일을 입력해주세요.",
                    }));
                    return;
                  }
                  if (checkEmailExists(email)) {
                    setErrors((prev) => ({
                      ...prev,
                      general: "이미 등록된 이메일입니다.",
                    }));
                    return;
                  }
                  setEmailCode("123456");
                  setEmailSent(true);
                  setEmailVerified(false);
                  setErrors((prev) => ({
                    ...prev,
                    email: undefined,
                    emailCode: undefined,
                    general: undefined,
                  }));
                }}
                variant="outline"
                disabled={emailSent && emailVerified}
                style={styles.verifyButton}
              />
              {emailSent ? (
                <>
                  <Input
                    label="인증번호"
                    placeholder="인증번호 6자리 입력"
                    value={enteredCode}
                    onChangeText={(text) => {
                      setEnteredCode(text);
                      setErrors((prev) => ({ ...prev, emailCode: undefined }));
                    }}
                    keyboardType="numeric"
                    error={errors.emailCode}
                  />
                  <Button
                    label={emailVerified ? "인증완료" : "인증번호 확인"}
                    onPress={() => {
                      if (
                        enteredCode === emailCode &&
                        enteredCode.length === 6
                      ) {
                        setEmailVerified(true);
                        setErrors((prev) => ({
                          ...prev,
                          emailCode: undefined,
                        }));
                      } else {
                        setErrors((prev) => ({
                          ...prev,
                          emailCode: "인증번호가 올바르지 않습니다.",
                        }));
                      }
                    }}
                    disabled={emailVerified}
                    variant={emailVerified ? "secondary" : "primary"}
                    style={styles.verifyButton}
                  />
                </>
              ) : null}
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

            <View style={styles.checkboxWrap}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedTerms((prev) => !prev)}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedTerms && styles.checkboxChecked,
                  ]}
                >
                  {acceptedTerms && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>서비스 이용약관 동의</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedPrivacy((prev) => !prev)}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedPrivacy && styles.checkboxChecked,
                  ]}
                >
                  {acceptedPrivacy && (
                    <Text style={styles.checkboxMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>개인정보처리방침 동의</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedPush((prev) => !prev)}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedPush && styles.checkboxChecked,
                  ]}
                >
                  {acceptedPush && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>알림 푸시 수신 동의</Text>
              </TouchableOpacity>
            </View>
            {errors.terms && (
              <Text style={styles.smallError}>{errors.terms}</Text>
            )}
            {errors.privacy && (
              <Text style={styles.smallError}>{errors.privacy}</Text>
            )}
            {errors.push && (
              <Text style={styles.smallError}>{errors.push}</Text>
            )}

            <Button
              label="다음 단계"
              onPress={handleRegister}
              loading={loading}
              disabled={
                !emailVerified ||
                !acceptedTerms ||
                !acceptedPrivacy ||
                !acceptedPush ||
                loading
              }
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
  verifyButton: { marginTop: -Spacing.sm, marginBottom: Spacing.md },
  checkboxWrap: { gap: Spacing.sm, marginTop: Spacing.sm },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxMark: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 14, color: Colors.gray700 },
  smallError: { fontSize: 12, color: Colors.error, marginTop: -Spacing.sm },
});
