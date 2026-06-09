import { Colors, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useReceiptStore } from '@/stores/receipt-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_COLORS: Record<string, string> = {
  '식비': '#FF6B6B',
  '마트/편의점': '#4ECDC4',
  '카페': '#45B7D1',
  '뷰티/건강': '#FFA07A',
  '교통': '#98D8C8',
  '통신': '#B8A9C9',
  '구독': '#FFEAA7',
  '기타': '#DFE6E9',
};

const CATEGORY_ICONS: Record<string, string> = {
  '식비': '🍽️',
  '마트/편의점': '🛒',
  '카페': '☕',
  '뷰티/건강': '💄',
  '교통': '🚌',
  '통신': '📱',
  '구독': '📺',
  '기타': '🧾',
};

export default function ReceiptScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { getReceiptsForMonth, getTotalForMonth, getCategoryBreakdown, selectedMonth } = useReceiptStore();

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);
  const receipts = getReceiptsForMonth(currentMonth);
  const total = getTotalForMonth(currentMonth);
  const breakdown = getCategoryBreakdown(currentMonth);

  const isPro = user?.plan === 'pro';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>영수증 관리</Text>
        <Text style={styles.headerMonth}>{currentMonth.replace('-', '년 ')}월</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 이번 달 지출 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>이번 달 총 지출</Text>
          <Text style={styles.summaryAmount}>{total.toLocaleString()}원</Text>
          <Text style={styles.summaryCount}>영수증 {receipts.length}건</Text>
        </View>

        {/* 카테고리별 지출 */}
        {breakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>카테고리별 지출</Text>
            <View style={styles.breakdownList}>
              {breakdown.map((item) => (
                <View key={item.category} style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.catIcon}>{CATEGORY_ICONS[item.category] ?? '🧾'}</Text>
                    <Text style={styles.catLabel}>{item.category}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${item.percent}%` as any,
                            backgroundColor: CATEGORY_COLORS[item.category] ?? Colors.gray300,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.catAmount}>{item.amount.toLocaleString()}원</Text>
                    <Text style={styles.catPercent}>{item.percent}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pro 소비 리포트 유도 */}
        {!isPro && (
          <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push('/pro-promotion' as any)}>
            <View style={styles.proLeft}>
              <Text style={styles.proIcon}>🔷</Text>
              <View>
                <Text style={styles.proTitle}>AI 소비패턴 분석 (Pro)</Text>
                <Text style={styles.proDesc}>월별 리포트 · 카드 추천 · 연간 타임라인</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.pro} />
          </TouchableOpacity>
        )}

        {/* 영수증 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>영수증 목록</Text>
            <Text style={styles.sectionCount}>{receipts.length}건</Text>
          </View>
          {receipts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>이번 달 영수증이 없습니다</Text>
            </View>
          ) : (
            <View style={styles.receiptList}>
              {[...receipts]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((receipt) => (
                  <TouchableOpacity
                    key={receipt.id}
                    style={styles.receiptItem}
                    onPress={() => router.push(`/receipt-detail/${receipt.id}` as any)}>
                    <View style={[styles.receiptIconWrap, { backgroundColor: CATEGORY_COLORS[receipt.category] ?? Colors.gray200 }]}>
                      <Text style={styles.receiptIcon}>{CATEGORY_ICONS[receipt.category] ?? '🧾'}</Text>
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptStore} numberOfLines={1}>{receipt.storeName}</Text>
                      <Text style={styles.receiptDate}>{receipt.date}</Text>
                    </View>
                    <Text style={styles.receiptAmount}>{receipt.amount.toLocaleString()}원</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  headerMonth: { fontSize: 14, color: Colors.gray500 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: TAB_BAR_SPACE },

  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 32, fontWeight: '700', color: Colors.white },
  summaryCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  sectionCount: { fontSize: 13, color: Colors.gray500 },

  breakdownList: { gap: Spacing.sm },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, width: 100 },
  catIcon: { fontSize: 18 },
  catLabel: { fontSize: 13, color: Colors.gray700, fontWeight: '500' },
  breakdownRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownBar: { flex: 1, height: 8, backgroundColor: Colors.gray100, borderRadius: Radius.full, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: Radius.full },
  catAmount: { fontSize: 12, color: Colors.gray700, fontWeight: '600', width: 70, textAlign: 'right' },
  catPercent: { fontSize: 11, color: Colors.gray400, width: 32, textAlign: 'right' },

  proCard: {
    backgroundColor: Colors.proLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.pro,
  },
  proLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  proIcon: { fontSize: 24 },
  proTitle: { fontSize: 14, fontWeight: '700', color: Colors.pro },
  proDesc: { fontSize: 12, color: Colors.pro, opacity: 0.8 },

  receiptList: { gap: Spacing.xs },
  receiptItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  receiptIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  receiptIcon: { fontSize: 20 },
  receiptInfo: { flex: 1 },
  receiptStore: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  receiptDate: { fontSize: 12, color: Colors.gray400 },
  receiptAmount: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },

  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: Colors.gray400 },
});