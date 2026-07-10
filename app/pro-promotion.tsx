import { Button } from '@/components/common/button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  PaymentHistoryItem,
  PRO_MONTHLY_AMOUNT,
  SubscriptionInfo,
  approveKakaoSubscription,
  cancelSubscription,
  getPaymentHistory,
  getSubscription,
  readyKakaoSubscription,
} from '@/services/payments';
import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_TID_KEY = 'kakaoSubscriptionTid';

interface Feature {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  proOnly: boolean;
}

const FEATURES: Feature[] = [
  { icon: 'bar-chart-outline', title: '월간 소비 리포트', desc: 'AI가 월간 지출을 분석하고 리포트를 생성합니다.', proOnly: true },
  { icon: 'analytics-outline', title: 'AI 소비패턴 분석', desc: '반복 소비를 학습해 맞춤형 절약 제안을 제공합니다.', proOnly: true },
  { icon: 'calendar-outline', title: '연간 지출 타임라인', desc: '1년치 소비 내역을 한눈에 확인할 수 있습니다.', proOnly: true },
  { icon: 'card-outline', title: '카드 혜택 추천', desc: '소비 패턴에 맞는 카드를 추천합니다.', proOnly: true },
  { icon: 'eye-off-outline', title: '이미지 마스킹', desc: '주민번호, 서명 등 민감 정보를 자동으로 가립니다.', proOnly: true },
  { icon: 'attach-outline', title: 'PDF 병합 다운로드', desc: '여러 문서를 하나의 PDF로 묶어 다운로드할 수 있습니다.', proOnly: true },
  { icon: 'cloud-outline', title: '50GB 스토리지', desc: 'Free 플랜 5GB에서 50GB로 저장 공간이 확장됩니다.', proOnly: true },
  { icon: 'notifications-outline', title: '알림 & 업로드', desc: '문서 업로드, 만료일 알림, 검색 기능은 Free에서도 제공됩니다.', proOnly: false },
];

function formatWon(value: number) {
  return `${value.toLocaleString()}원`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default function ProPromotionScreen() {
  const router = useRouter();
  const { pg_token: pgTokenParam } = useLocalSearchParams<{ pg_token?: string }>();
  const { user, upgradeToPro } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);

  const isPro = user?.plan === 'pro' || subscription?.status === 'ACTIVE';
  const isCanceled = !!subscription?.is_canceled;

  const loadBilling = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [subscriptionInfo, history] = await Promise.all([
        getSubscription().catch(() => ({ status: 'NONE' as const })),
        getPaymentHistory().catch(() => []),
      ]);
      setSubscription(subscriptionInfo);
      setPayments(history);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const approvePayment = useCallback(
    async (pgToken: string) => {
      const tid = await SecureStore.getItemAsync(KAKAO_TID_KEY);
      if (!tid) {
        Alert.alert('결제 승인 실패', '결제 정보를 찾을 수 없습니다. 다시 시도해주세요.');
        return;
      }

      setApproving(true);
      try {
        const result = await approveKakaoSubscription(tid, pgToken);
        await SecureStore.deleteItemAsync(KAKAO_TID_KEY);
        if (result.success) {
          upgradeToPro();
          await loadBilling();
          Alert.alert(
            '구독 등록 완료',
            `DocuMate Pro가 활성화되었습니다.\n월 ${formatWon(PRO_MONTHLY_AMOUNT)} 정기결제가 등록되었습니다.`,
            [{ text: '확인', onPress: () => router.replace('/(tabs)/mypage' as any) }],
          );
        }
      } catch (error) {
        console.log('카카오페이 승인 실패:', error);
        Alert.alert('결제 승인 실패', '카카오페이 결제 승인에 실패했습니다.');
      } finally {
        setApproving(false);
      }
    },
    [loadBilling, router, upgradeToPro],
  );

  useEffect(() => {
    if (!pgTokenParam) return;
    void approvePayment(String(pgTokenParam));
  }, [approvePayment, pgTokenParam]);

  const handleUpgrade = async () => {
    Alert.alert(
      'Pro 업그레이드',
      `카카오페이로 월 ${formatWon(PRO_MONTHLY_AMOUNT)} 정기결제를 등록할까요?\n\n결제는 매달 자동 갱신됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '결제하기',
          onPress: async () => {
            setLoading(true);
            try {
              const ready = await readyKakaoSubscription();
              const redirectUrl =
                Platform.OS === 'web'
                  ? ready.next_redirect_pc_url
                  : ready.next_redirect_mobile_url ?? ready.next_redirect_pc_url;

              if (!ready.tid || !redirectUrl) {
                throw new Error('INVALID_KAKAO_READY_RESPONSE');
              }

              await SecureStore.setItemAsync(KAKAO_TID_KEY, ready.tid);
              const returnUrl = Linking.createURL('/pro-promotion');
              const result = await WebBrowser.openAuthSessionAsync(redirectUrl, returnUrl);

              if (result.type === 'success' && result.url) {
                const parsed = Linking.parse(result.url);
                const pgToken = parsed.queryParams?.pg_token;
                if (pgToken) {
                  await approvePayment(String(pgToken));
                }
              }
            } catch (error: any) {
              console.log('카카오페이 준비 실패:', error);
              const code = error?.response?.data?.code ?? error?.response?.data?.errorCode;
              Alert.alert(
                '결제 시작 실패',
                code === 'ALREADY_SUBSCRIBED'
                  ? '이미 Pro 구독 중입니다.'
                  : '카카오페이 결제창을 여는 데 실패했습니다.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      '플랜 해지 예약',
      '현재 결제 주기 종료일까지 Pro 기능을 사용할 수 있고, 다음 결제일부터 자동 갱신이 중단됩니다.',
      [
        { text: '계속 사용하기', style: 'cancel' },
        {
          text: '해지 예약',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cancelSubscription();
              await loadBilling();
              Alert.alert('해지 예약 완료', `${formatDate(result.current_period_end)}까지 Pro를 사용할 수 있습니다.`);
            } catch (error: any) {
              console.log('구독 해지 실패:', error);
              const code = error?.response?.data?.code ?? error?.response?.data?.errorCode;
              Alert.alert(
                '해지 실패',
                code === 'NO_ACTIVE_SUBSCRIPTION'
                  ? '활성화된 구독이 없습니다.'
                  : '구독 해지 예약에 실패했습니다.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pro 플랜</Text>
        <TouchableOpacity onPress={loadBilling} style={styles.backBtn}>
          {statusLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="diamond-outline" size={48} color={Colors.white} />
          <Text style={styles.heroTitle}>DocuMate Pro</Text>
          <Text style={styles.heroDesc}>AI 소비분석으로 더 스마트한 자산 관리</Text>
          <View style={styles.priceWrap}>
            <Text style={styles.price}>월 {formatWon(PRO_MONTHLY_AMOUNT)}</Text>
            <View style={styles.freeTag}>
              <Text style={styles.freeTagText}>자동 갱신</Text>
            </View>
          </View>
          {isPro && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.activeBadgeText}>
                {isCanceled ? '해지 예약됨' : '현재 이용 중'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.billingCard}>
          <Text style={styles.featureTitle}>구독 상태</Text>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>상태</Text>
            <Text style={styles.billingValue}>
              {subscription?.status === 'ACTIVE' ? (isCanceled ? '해지 예약' : '활성') : 'Free'}
            </Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>결제 수단</Text>
            <Text style={styles.billingValue}>{subscription?.payment_method ?? '-'}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>다음 갱신/종료일</Text>
            <Text style={styles.billingValue}>{formatDate(subscription?.current_period_end)}</Text>
          </View>
        </View>

        <View style={styles.featureSection}>
          <Text style={styles.featureTitle}>Pro 기능</Text>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureItem}>
              <Ionicons name={feature.icon} size={22} color={Colors.primary} style={styles.featureIcon} />
              <View style={styles.featureInfo}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureName}>{feature.title}</Text>
                  {!feature.proOnly && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>Free 포함</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={feature.proOnly ? Colors.pro : Colors.success}
              />
            </View>
          ))}
        </View>

        <View style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareCol} />
            <Text style={[styles.compareCol, styles.compareFree]}>Free</Text>
            <Text style={[styles.compareCol, styles.comparePro]}>Pro</Text>
          </View>
          {[
            ['스토리지', '5GB', '50GB'],
            ['AI 분류', 'O', 'O'],
            ['알림', 'O', 'O'],
            ['소비 리포트', 'X', 'O'],
            ['마스킹', 'X', 'O'],
            ['PDF 병합', 'X', 'O'],
          ].map(([label, free, pro]) => (
            <View key={label} style={styles.compareRow}>
              <Text style={[styles.compareCol, styles.compareLabel]}>{label}</Text>
              <Text style={[styles.compareCol, styles.compareValue]}>{free}</Text>
              <Text style={[styles.compareCol, styles.compareValuePro]}>{pro}</Text>
            </View>
          ))}
        </View>

        <View style={styles.billingCard}>
          <Text style={styles.featureTitle}>결제 내역</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>결제 내역이 없습니다.</Text>
          ) : (
            payments.slice(0, 5).map((payment) => (
              <View key={payment.payment_id} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentStatus}>{payment.status}</Text>
                  <Text style={styles.paymentDate}>{formatDate(payment.approved_at)}</Text>
                </View>
                <Text style={styles.paymentAmount}>{formatWon(payment.amount)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.ctaSection}>
          {isPro ? (
            <>
              <Button label={isCanceled ? '해지 예약됨' : '현재 Pro 플랜 이용 중'} onPress={() => {}} disabled />
              {!isCanceled && (
                <Button label="플랜 해지 예약" onPress={handleCancel} variant="ghost" loading={loading} />
              )}
            </>
          ) : (
            <>
              <Button
                label="카카오페이로 업그레이드"
                onPress={handleUpgrade}
                loading={loading || approving}
              />
              <Text style={styles.disclaimer}>
                구독은 매달 자동 갱신됩니다.{'\n'}
                카카오페이 정기결제로 월 {formatWon(PRO_MONTHLY_AMOUNT)}이 청구됩니다.
              </Text>
            </>
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

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
  backBtn: { width: 40, padding: Spacing.xs, alignItems: 'center' },
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
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.white },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  price: { fontSize: 22, fontWeight: '700', color: Colors.white },
  freeTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  freeTagText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  activeBadgeText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  billingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...cardShadow,
  },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  billingLabel: { fontSize: 13, color: Colors.gray500 },
  billingValue: { flex: 1, fontSize: 13, color: Colors.gray900, fontWeight: '700', textAlign: 'right' },
  featureSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...cardShadow,
  },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  featureIcon: { width: 32 },
  featureInfo: { flex: 1, gap: 3 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  featureName: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  featureDesc: { fontSize: 12, color: Colors.gray500 },
  freeBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  freeBadgeText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  compareCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...cardShadow,
  },
  compareHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  compareRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
  compareCol: { flex: 1, textAlign: 'center', fontSize: 13 },
  compareFree: { fontWeight: '700', color: Colors.gray500 },
  comparePro: { fontWeight: '800', color: Colors.pro },
  compareLabel: { textAlign: 'left', color: Colors.gray600 },
  compareValue: { color: Colors.gray400 },
  compareValuePro: { fontWeight: '700', color: Colors.pro },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  paymentStatus: { fontSize: 13, fontWeight: '700', color: Colors.gray900 },
  paymentDate: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  paymentAmount: { fontSize: 14, fontWeight: '800', color: Colors.gray900 },
  emptyText: { fontSize: 13, color: Colors.gray400 },
  ctaSection: { gap: Spacing.md },
  disclaimer: { fontSize: 12, color: Colors.gray400, textAlign: 'center', lineHeight: 18 },
});
