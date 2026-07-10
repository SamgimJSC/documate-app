import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { validatePassword } from '@/utils/validation';
import axiosInstance from '@/utils/axios.util';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'email' | 'verify' | 'reset' | 'done';

type ApiPayload<T> = {
  data?: T;
};

function unwrapData<T>(response: unknown): T {
  const payload = response as ApiPayload<T> | T;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return ((payload as ApiPayload<T>).data ?? payload) as T;
  }
  return payload as T;
}

async function sendResetVerificationCode(email: string): Promise<string> {
  const response = await axiosInstance.post('/auth/email-verification/send', {
    email,
    purpose: 'RESET_PW',
  });
  const data = unwrapData<{ emailVerificationId?: string }>(response);
  const emailVerificationId = data.emailVerificationId;
  if (!emailVerificationId) throw new Error('EMAIL_VERIFICATION_ID_NOT_FOUND');
  return emailVerificationId;
}

async function verifyResetCode(
  emailVerificationId: string,
  codeNumber: string,
): Promise<string> {
  const response = await axiosInstance.post('/auth/email-verification/verify', {
    emailVerificationId,
    codeNumber,
  });
  const data = unwrapData<{ emailVerificationId?: string }>(response);
  return data.emailVerificationId ?? emailVerificationId;
}

async function resetPassword(
  emailVerificationId: string,
  newPassword: string,
): Promise<void> {
  await axiosInstance.post('/auth/password/reset', {
    emailVerificationId,
    newPassword,
  });
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailVerificationId, setEmailVerificationId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = email.trim();
  const emailValid = /\S+@\S+\.\S+/.test(normalizedEmail);
  const passwordError = useMemo(() => validatePassword(password), [password]);
  const confirmError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? '비밀번호가 일치하지 않습니다.'
      : '';
  const canReset =
    !passwordError &&
    !confirmError &&
    confirmPassword.length > 0 &&
    !loading;

  const handleSendCode = async () => {
    if (!emailValid) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextVerificationId =
        await sendResetVerificationCode(normalizedEmail);
      setEmailVerificationId(nextVerificationId);
      setCode('');
      setStep('verify');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : '인증코드 발송에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!emailVerificationId) {
      setError('인증코드를 다시 발송해주세요.');
      setStep('email');
      return;
    }
    if (code.trim().length !== 6) {
      setError('6자리 인증코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextVerificationId = await verifyResetCode(
        emailVerificationId,
        code.trim(),
      );
      setEmailVerificationId(nextVerificationId);
      setStep('reset');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(emailVerificationId, password);
      setStep('done');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : '비밀번호 재설정에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setEmailVerificationId('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 찾기</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'done' ? (
            <View style={styles.doneContainer}>
              <View style={styles.doneIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={54}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.doneTitle}>비밀번호가 재설정되었습니다</Text>
              <Text style={styles.doneDesc}>
                새 비밀번호로 다시 로그인해주세요.
              </Text>
              <Button
                label="로그인으로 돌아가기"
                onPress={() => router.replace('/(auth)/login' as any)}
              />
            </View>
          ) : (
            <>
              <View style={styles.stepHeader}>
                <Text style={styles.title}>
                  {step === 'email'
                    ? '이메일 인증'
                    : step === 'verify'
                      ? '인증코드 입력'
                      : '새 비밀번호 설정'}
                </Text>
                <Text style={styles.desc}>
                  {step === 'email'
                    ? '가입한 이메일 주소로 비밀번호 재설정 인증코드를 보냅니다.'
                    : step === 'verify'
                      ? `${normalizedEmail}로 받은 6자리 코드를 입력해주세요.`
                      : '인증이 완료되었습니다. 새 비밀번호를 입력해주세요.'}
                </Text>
              </View>

              <View style={styles.progressRow}>
                {(['email', 'verify', 'reset'] as const).map((item, index) => {
                  const currentIndex = ['email', 'verify', 'reset'].indexOf(step);
                  const active = index <= currentIndex;
                  return (
                    <View
                      key={item}
                      style={[
                        styles.progressDot,
                        active && styles.progressDotActive,
                      ]}
                    />
                  );
                })}
              </View>

              {step === 'email' ? (
                <View style={styles.form}>
                  <Input
                    label="이메일"
                    placeholder="가입한 이메일 주소 입력"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <Button
                    label="인증코드 받기"
                    onPress={handleSendCode}
                    loading={loading}
                    disabled={!emailValid}
                  />
                </View>
              ) : null}

              {step === 'verify' ? (
                <View style={styles.form}>
                  <Input
                    label="인증코드"
                    placeholder="6자리 코드 입력"
                    value={code}
                    onChangeText={(value) => {
                      setCode(value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    label="인증 확인"
                    onPress={handleVerifyCode}
                    loading={loading}
                    disabled={code.length !== 6}
                  />
                  <Button
                    label="인증코드 다시 받기"
                    onPress={handleSendCode}
                    variant="outline"
                    loading={loading}
                  />
                  <TouchableOpacity
                    onPress={handleChangeEmail}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonLabel}>이메일 변경</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {step === 'reset' ? (
                <View style={styles.form}>
                  <Input
                    label="새 비밀번호"
                    placeholder="8자 이상 입력"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError('');
                    }}
                    isPassword
                    error={password.length > 0 ? passwordError ?? undefined : undefined}
                  />
                  <Input
                    label="새 비밀번호 확인"
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setError('');
                    }}
                    isPassword
                    error={confirmError || undefined}
                  />
                  <Button
                    label="비밀번호 재설정"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={!canReset}
                  />
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.white },
  card: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  stepHeader: { gap: Spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  desc: { fontSize: 14, color: Colors.gray500, lineHeight: 22 },
  progressRow: { flexDirection: 'row', gap: Spacing.sm },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray200,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  form: { gap: Spacing.sm },
  error: { fontSize: 13, color: Colors.error, lineHeight: 20 },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  cancelText: { fontSize: 14, color: Colors.gray500 },
  textButton: { alignItems: 'center', paddingVertical: Spacing.xs },
  textButtonLabel: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    textAlign: 'center',
  },
  doneDesc: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
});
