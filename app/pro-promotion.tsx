import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Button } from '@/components/common/button';
import { useAuthStore } from '@/stores/auth-store';

interface Feature {
  icon: string;
  title: string;
  desc: string;
  proOnly: boolean;
}

const FEATURES: Feature[] = [
  { icon: '📊', title: '월별 소비 리포트', desc: 'AI가 월별 지출을 자동으로 분석하고 리포트를 생성합니다', proOnly: true },
  { icon: '🧠', title: 'AI 소비패턴 분석', desc: '반복 소비를 학습해 맞춤형 절약 제안을 제공합니다', proOnly: true },
  { icon: '📅', title: '연간 지출 타임라인', desc: '1년치 소비 내역을 한눈에 확인할 수 있습니다', proOnly: true },
  { icon: '💳', title: '카드 혜택 추천', desc: '소비 패턴에 맞는 최적의 카드를 추천해드립니다', proOnly: true },
  { icon: '🔒', title: '이미지 마스킹', desc: '주민번호, 서명 등 민감 정보를 자동으로 가립니다', proOnly: true },
  { icon: '📎', title: 'PDF 병합 다운로드', desc: '여러 문서를 하나의 PDF로 합쳐 다운로드할 수 있습니다', proOnly: true },
  { icon: '💾', title: '50GB 스토리지', desc: 'Free 플랜 5GB에서 50GB로 용량이 대폭 확장됩니다', proOnly: true },
  { icon: '🔔', title: '알림 & 업로드', desc: '문서 업로드, 만료일 알림, 검색 기능 (Free에도 제공)', proOnly: false },
];

export default function ProPromotionScreen() {
  const router = useRouter();
  const { user, upgradeToPro } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const isPro = user?.plan === 'pro';

  const handleUpgrade = async () => {
    Alert.alert(
      'Pro 업그레이드',
      '카카오페이로 결제하시겠습니까?\n\n월 9,900원 (첫 달 무료)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '결제하기',
          onPress: async () => {
            setLoading(true);
            await new Promise((r) => setTimeout(r, 1500));
            upgradeToPro();
            setLoading(false);
            Alert.alert('업그레이드 완료!', 'Pro 플랜이 활성화되었습니다 🎉', [
              { text: '확인', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      '플랜 해지',
      '정말 Pro 플랜을 해지하시겠습니까?\n해지 시 Pro 기능에 즉시 접근이 제한됩니다.',
      [
        { text: '계속 사용하기', style: 'cancel' },
        { text: '해지하기', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pro 플랜</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 히어로 */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔷</Text>
          <Text style={styles.heroTitle}>DocuMate Pro</Text>
          <Text style={styles.heroDesc}>AI 소비분석으로 더 스마트한 자산 관리</Text>
          {!isPro && (
            <View style={styles.priceWrap}>
              <Text style={styles.price}>월 9,900원</Text>
              <View style={styles.freeTag}>
                <Text style={styles.freeTagText}>첫 달 무료</Text>
              </View>
            </View>
          )}
          {isPro && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.activeBadgeText}>현재 이용 중</Text>
            </View>
          )}
        </View>

        {/* 기능 목록 */}
        <View style={styles.featureSection}>
          <Text style={styles.featureTitle}>Pro 기능</Text>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureInfo}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureName}>{f.title}</Text>
                  {!f.proOnly && <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Free 포함</Text></View>}
                </View>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
              {f.proOnly ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.pro} />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              )}
            </View>
          ))}
        </View>

        {/* 플랜 비교 */}
        <View style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareCol} />
            <Text style={[styles.compareCol, styles.compareFree]}>Free</Text>
            <Text style={[styles.compareCol, styles.comparePro]}>Pro</Text>
          </View>
          {[
            ['스토리지', '5GB', '50GB'],
            ['AI 분류', '✓', '✓'],
            ['알림', '✓', '✓'],
            ['소비 리포트', '—', '✓'],
            ['마스킹', '—', '✓'],
            ['PDF 병합', '—', '✓'],
          ].map(([label, free, pro]) => (
            <View key={label} style={styles.compareRow}>
              <Text style={[styles.compareCol, styles.compareLabel]}>{label}</Text>
              <Text style={[styles.compareCol, styles.compareValue]}>{free}</Text>
              <Text style={[styles.compareCol, styles.compareValuePro]}>{pro}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          {isPro ? (
            <>
              <Button label="현재 Pro 플랜 이용 중" onPress={() => {}} disabled />
              <Button label="플랜 해지" onPress={handleCancel} variant="ghost" />
            </>
          ) : (
            <>
              <Button label="카카오페이로 업그레이드" onPress={handleUpgrade} loading={loading} />
              <Text style={styles.disclaimer}>
                구독은 언제든지 취소할 수 있습니다.{'\n'}첫 달 무료 후 월 9,900원이 청구됩니다.
              </Text>
            </>
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.xl },
  hero: {
    backgroundColor: Colors.pro,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.white },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  price: { fontSize: 22, fontWeight: '700', color: Colors.white },
  freeTag: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  freeTagText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  activeBadgeText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  featureSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  featureIcon: { fontSize: 24, width: 32 },
  featureInfo: { flex: 1, gap: 3 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  featureName: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  featureDesc: { fontSize: 12, color: Colors.gray500 },
  freeBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  freeBadgeText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  compareCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  compareHeader: { flexDirection: 'row', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  compareRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
  compareCol: { flex: 1, textAlign: 'center', fontSize: 13 },
  compareFree: { fontWeight: '700', color: Colors.gray500 },
  comparePro: { fontWeight: '800', color: Colors.pro },
  compareLabel: { textAlign: 'left', color: Colors.gray600 },
  compareValue: { color: Colors.gray400 },
  compareValuePro: { fontWeight: '700', color: Colors.pro },
  ctaSection: { gap: Spacing.md },
  disclaimer: { fontSize: 12, color: Colors.gray400, textAlign: 'center', lineHeight: 18 },
});
