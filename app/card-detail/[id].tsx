import { CreditCardView } from '@/components/common/CreditCardView';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CardRecommendation, DefaultCard } from '@/services/cards';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RANK_COLORS = ['#1B5E43', '#4A1C8A', '#12306B'];

function formatWon(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  if (value === 0) return '연회비 없음';
  if (value >= 10000) return `${Math.round(value / 10000)}만원`;
  return `${Math.round(value).toLocaleString()}원`;
}

export default function CardDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();

  const card = useMemo<CardRecommendation | DefaultCard | null>(() => {
    try { return data ? JSON.parse(data) : null; }
    catch { return null; }
  }, [data]);

  const rec = card && 'reason' in card ? (card as CardRecommendation) : null;

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 상세</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.gray300} />
          <Text style={styles.errorText}>카드 정보를 찾을 수 없습니다.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cardIndex = (rec as any)?.rank ? (rec as any).rank - 1 : 0;
  const cardColor = RANK_COLORS[cardIndex] ?? RANK_COLORS[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{card.cardName ?? '카드 상세'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 카드 비주얼 — 좌우 패딩 포함해 표준 카드 비율 유지 */}
        <View style={styles.cardWrap}>
          <CreditCardView card={card} color={cardColor} />
        </View>

        {/* 기본 정보 */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>카드사</Text>
            <Text style={styles.infoVal}>{card.issuer ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>연회비</Text>
            <Text style={styles.infoVal}>{formatWon(card.annualFee)}</Text>
          </View>
          {rec?.matchScore !== null && rec?.matchScore !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>AI 매칭 점수</Text>
              <Text style={[styles.infoVal, { color: Colors.pro, fontWeight: '700' }]}>
                {Math.round(rec.matchScore)}점
              </Text>
            </View>
          )}
          {rec?.recommendedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>추천일</Text>
              <Text style={styles.infoVal}>{rec.recommendedAt.slice(0, 10)}</Text>
            </View>
          )}
        </View>

        {/* AI 추천 이유 */}
        {rec?.reason && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={15} color={Colors.pro} />
              <Text style={styles.sectionTitle}>AI 추천 이유</Text>
            </View>
            <Text style={styles.reasonText}>{rec.reason}</Text>
          </View>
        )}

        {/* 면책 고지 */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.gray400} />
          <Text style={styles.disclaimerText}>
            실제 카드 혜택, 전월 실적 조건, 할인 한도는 카드사 정책에 따라 다를 수 있습니다.
          </Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  errorText: { fontSize: 14, color: Colors.gray500, textAlign: 'center' },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.md, paddingBottom: Spacing.xl },

  cardWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    ...shadow,
  },

  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...shadow,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  infoKey: { fontSize: 13, color: Colors.gray500, width: 90 },
  infoVal: { fontSize: 13, fontWeight: '500', color: Colors.gray900, textAlign: 'right' },
  reasonText: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },

  disclaimer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.gray400, lineHeight: 16 },
});
