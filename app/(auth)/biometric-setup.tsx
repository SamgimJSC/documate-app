import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/button';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

export default function BiometricSetupScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await enableBiometric(email);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(
        '생체인증 등록 실패',
        '생체인증 키를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🧬</Text>
        </View>
        <Text style={styles.title}>생체인증 설정</Text>
        <Text style={styles.desc}>
          얼굴 인식 또는 지문으로 더 빠르고 안전하게{'\n'}앱에 접근할 수 있습니다.
        </Text>

        <View style={styles.featureList}>
          {['PIN 없이 빠른 접근', '높은 보안 수준', '마이페이지에서 언제든 변경 가능'].map((f) => (
            <View key={f} style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <Button label="생체인증 사용하기" onPress={handleEnable} loading={loading} />
          <Button label="건너뛰기" onPress={handleSkip} variant="ghost" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.gray900, textAlign: 'center' },
  desc: { fontSize: 14, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
  featureList: { gap: Spacing.sm, alignSelf: 'stretch' },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureIcon: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  featureText: { fontSize: 14, color: Colors.gray700 },
  buttons: { gap: Spacing.sm, alignSelf: 'stretch' },
});
