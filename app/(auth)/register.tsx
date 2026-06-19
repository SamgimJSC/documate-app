import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { useAuthStore } from "@/stores/auth-store";
import axiosInstance from "@/utils/axios.util";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./register.styles";

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedPush, setAcceptedPush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termFocus, setTermFocus] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [termsY, setTermsY] = useState<number>(0);
  const [emailVerificationId, setEmailVerificationId] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  const passwordHasLetter = password.length > 0 && /[a-z]/i.test(password);
  const passwordHasNumber = password.length > 0 && /\d/.test(password);
  const passwordHasSymbol =
    password.length > 0 && /[^A-Za-z0-9]/.test(password);
  const passwordTypeCount = [
    passwordHasLetter,
    passwordHasNumber,
    passwordHasSymbol,
  ].filter(Boolean).length;
  const passwordCriteriaMatched = passwordTypeCount >= 2;
  const passwordStrengthLabel =
    password.length === 0
      ? ""
      : passwordTypeCount === 1
        ? "약함"
        : passwordTypeCount === 2
          ? "보통"
          : "강함";
  const passwordStrengthColor =
    password.length === 0
      ? "#9CA3AF"
      : passwordTypeCount === 1
        ? "#EF4444"
        : passwordTypeCount === 2
          ? "#F59E0B"
          : "#10B981";

  const canProceed =
    emailVerified &&
    password.length >= 8 &&
    passwordCriteriaMatched &&
    confirm.length > 0 &&
    password === confirm &&
    acceptedTerms &&
    acceptedPrivacy &&
    !loading;

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrors((prev) => {
      const next = { ...prev };
      if (confirm.length > 0 && text !== confirm)
        next.confirm = "비밀번호가 일치하지 않습니다.";
      else delete next.confirm;
      return next;
    });
  };

  const handleConfirmChange = (text: string) => {
    setConfirm(text);
    setErrors((prev) => {
      const next = { ...prev };
      if (text.length > 0 && text !== password)
        next.confirm = "비밀번호가 일치하지 않습니다.";
      else delete next.confirm;
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nickname) e.nickname = "닉네임을 입력해주세요.";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      e.email = "올바른 이메일을 입력해주세요.";
    if (!emailVerified) e.emailCode = "이메일 인증을 완료해주세요.";
    if (!password || password.length < 8)
      e.password = "비밀번호는 8자 이상이어야 합니다.";
    else if (!passwordCriteriaMatched)
      e.password = "영문, 숫자, 특수문자 중 2가지 이상 포함해야 합니다.";
    if (password !== confirm) e.confirm = "비밀번호가 일치하지 않습니다.";
    if (!acceptedTerms) e.terms = "이용약관 동의가 필요합니다.";
    if (!acceptedPrivacy) e.privacy = "개인정보처리방침 동의가 필요합니다.";
    setErrors(e);
    const termIssue = !acceptedTerms || !acceptedPrivacy;
    setTermFocus(termIssue);
    if (termIssue && scrollRef.current)
      scrollRef.current.scrollTo({ y: termsY - 20, animated: true });
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    router.push({
      pathname: "/(auth)/pin-setup",
      params: {
        source: "register",
        email,
        password,
        nickname,
        emailVerificationId,
      },
    });
  };

  const handleSendCode = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors((prev) => ({
        ...prev,
        email: "올바른 이메일을 입력해주세요.",
      }));
      return;
    }
    try {
      const response = await axiosInstance.post(
        "/auth/email-verification/send",
        { email, purpose: "SIGNUP" },
      );
      setEmailVerificationId(response.data.data?.emailVerificationId || "");
      setEmailAvailable(true);
      setEmailSent(true);
      setEmailVerified(false);
      setErrors((prev) => ({
        ...prev,
        email: undefined,
        emailCode: undefined,
        general: undefined,
      }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "인증번호 발송 실패";
      setEmailAvailable(false);
      setErrors((prev) => ({ ...prev, general: errMsg }));
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode || enteredCode.length !== 6) {
      setErrors((prev) => ({
        ...prev,
        emailCode: "인증번호 6자리를 입력해주세요.",
      }));
      return;
    }
    try {
      const response = await axiosInstance.post(
        "/auth/email-verification/verify",
        {
          emailVerificationId,
          codeNumber: enteredCode,
        },
      );
      setEmailVerified(true);
      setEmailVerificationId(
        response.data.data?.emailVerificationId || emailVerificationId,
      );
      setErrors((prev) => ({ ...prev, emailCode: undefined }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "인증 실패";
      setErrors((prev) => ({ ...prev, emailCode: errMsg }));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>회원가입</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>DocuMate 시작하기</Text>
            <Text style={styles.subtitle}>
              계정을 만들어 스마트한 문서 관리를 경험하세요
            </Text>

            {/* 그룹 1: 이메일 + 인증번호 */}
            <View style={styles.group}>
              <View style={styles.emailRow}>
                <View style={styles.emailInputWrap}>
                  <Input
                    label="이메일"
                    placeholder="이메일 주소 입력"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailVerified(false);
                      setEmailSent(false);
                      setEmailAvailable(null);
                      setEnteredCode("");
                    }}
                    keyboardType="email-address"
                    error={errors.email}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    emailVerified && styles.sendBtnDisabled,
                  ]}
                  onPress={handleSendCode}
                  disabled={emailVerified}
                >
                  <Text
                    style={[
                      styles.sendBtnText,
                      emailVerified && styles.sendBtnTextDisabled,
                    ]}
                  >
                    {emailSent ? "재발송" : "인증번호\n받기"}
                  </Text>
                </TouchableOpacity>
              </View>

              {emailAvailable === false && (
                <Text style={styles.unavailableText}>
                  이미 등록된 이메일입니다.
                </Text>
              )}
              {emailAvailable === true && !emailVerified && (
                <Text style={styles.availableText}>
                  인증번호를 발송했습니다.
                </Text>
              )}

              {emailSent && (
                <>
                  <View style={styles.emailRow}>
                    <View style={styles.emailInputWrap}>
                      <Input
                        label="인증번호"
                        placeholder="6자리 입력"
                        value={enteredCode}
                        onChangeText={(text) => {
                          setEnteredCode(text);
                          setErrors((prev) => ({
                            ...prev,
                            emailCode: undefined,
                          }));
                        }}
                        keyboardType="numeric"
                        error={errors.emailCode}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.sendBtn,
                        emailVerified && styles.sendBtnDisabled,
                      ]}
                      onPress={handleVerifyCode}
                      disabled={emailVerified}
                    >
                      <Text
                        style={[
                          styles.sendBtnText,
                          emailVerified && styles.sendBtnTextDisabled,
                        ]}
                      >
                        {emailVerified ? "인증\n완료" : "확인"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {emailVerified && (
                    <Text style={styles.successMessage}>
                      ✓ 인증이 완료되었습니다!
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* 그룹 2: 비밀번호 + 확인 */}
            <View style={styles.group}>
              <Input
                label="비밀번호"
                placeholder="8자 이상 입력"
                value={password}
                onChangeText={handlePasswordChange}
                isPassword
                error={errors.password}
              />
              {password.length > 0 && (
                <Text
                  style={[
                    styles.passwordStrength,
                    { color: passwordStrengthColor },
                  ]}
                >
                  강도: {passwordStrengthLabel} · 영문, 숫자, 특수문자 중 2개
                  이상
                </Text>
              )}
              <Input
                label="비밀번호 확인"
                placeholder="비밀번호 재입력"
                value={confirm}
                onChangeText={handleConfirmChange}
                isPassword
                error={errors.confirm}
              />
            </View>

            {/* 그룹 3: 닉네임 */}
            <View style={styles.group}>
              <Input
                label="닉네임"
                placeholder="사용할 닉네임 입력"
                value={nickname}
                onChangeText={setNickname}
                error={errors.nickname}
              />
            </View>

            {errors.general && (
              <Text style={styles.generalError}>{errors.general}</Text>
            )}

            {/* 이용약관 */}
            <View
              style={styles.checkboxWrap}
              onLayout={(e) => setTermsY(e.nativeEvent.layout.y)}
            >
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setAcceptedTerms((p) => !p);
                  setTermFocus(false);
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedTerms && styles.checkboxChecked,
                  ]}
                >
                  {acceptedTerms && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  서비스 이용약관 동의
                  <Text
                    style={
                      termFocus && !acceptedTerms
                        ? styles.checkboxRequiredError
                        : styles.checkboxRequired
                    }
                  >
                    {" "}
                    (필수)
                  </Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setAcceptedPrivacy((p) => !p);
                  setTermFocus(false);
                }}
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
                <Text style={styles.checkboxLabel}>
                  개인정보처리방침 동의
                  <Text
                    style={
                      termFocus && !acceptedPrivacy
                        ? styles.checkboxRequiredError
                        : styles.checkboxRequired
                    }
                  >
                    {" "}
                    (필수)
                  </Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setAcceptedPush((p) => !p);
                  setTermFocus(false);
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedPush && styles.checkboxChecked,
                  ]}
                >
                  {acceptedPush && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  알림 푸시 수신 동의 (선택)
                </Text>
              </TouchableOpacity>
            </View>

            {errors.terms && (
              <Text style={styles.smallError}>{errors.terms}</Text>
            )}
            {errors.privacy && (
              <Text style={styles.smallError}>{errors.privacy}</Text>
            )}

            <Button
              label="다음 단계"
              onPress={handleRegister}
              loading={loading}
              disabled={!canProceed}
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
