import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/input';
import { Button } from '@/components/common/button';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 찾기</Text>
        </View>

        <View style={styles.card}>
          {sent ? (
            <View style={styles.sentContainer}>
              <View style={styles.sentIcon}>
                <Ionicons name="mail" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.sentTitle}>이메일을 전송했습니다</Text>
              <Text style={styles.sentDesc}>
                {email}로 비밀번호 재설정 링크를 전송했습니다.{'\n'}
                이메일을 확인해주세요.
              </Text>
              <Button label="로그인으로 돌아가기" onPress={() => router.replace('/(auth)/login' as any)} />
            </View>
          ) : (
            <>
              <Text style={styles.title}>비밀번호 찾기</Text>
              <Text style={styles.desc}>
                가입 시 사용한 이메일 주소를 입력하시면{'\n'}비밀번호 재설정 링크를 보내드립니다.
              </Text>
              <Input
                label="이메일"
                placeholder="이메일 주소 입력"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <Button label="재설정 링크 전송" onPress={handleSend} loading={loading} />
              <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  desc: { fontSize: 14, color: Colors.gray500, lineHeight: 22 },
  cancelBtn: { alignItems: 'center' },
  cancelText: { fontSize: 14, color: Colors.gray500 },
  sentContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  sentIcon: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { fontSize: 20, fontWeight: '700', color: Colors.gray900 },
  sentDesc: { fontSize: 14, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
});
