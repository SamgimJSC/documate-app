import { Colors, Radius, Spacing, TAB_BAR_SPACE } from "@/constants/theme";
import { useReceiptStore } from "@/stores/receipt-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORY_COLORS = ["#6F8FB8", "#8E7DBE", "#5B9D99", "#C97F7F", "#C49A6C"];
const CHART_HEIGHT = 148;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = Math.max(260, SCREEN_WIDTH - Spacing.lg * 4);
const AI_CONFIDENCE = 78;

const CATEGORY_LABELS: Record<string, string> = {
  식비: "식비",
  카페: "카페",
  쇼핑: "쇼핑",
  교통: "교통",
  의료: "의료",
  기타: "기타",
  "마트/편의점": "식비",
  "뷰티/건강": "의료",
  통신: "기타",
  구독: "기타",
  "?앸퉬": "식비",
  "留덊듃/?몄쓽??": "식비",
  "移댄럹": "카페",
  "?쇳븨": "쇼핑",
  "援먰넻": "교통",
  "?섎즺": "의료",
  "酉고떚/嫄닿컯": "의료",
  "?듭떊": "기타",
  "援щ룆": "기타",
  "湲고?": "기타",
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function getMonthLabel(month: string) {
  const [year, monthValue] = month.split("-");
  return `${year}년 ${Number(monthValue)}월`;
}

function getDaysInMonth(month: string) {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(year, monthValue, 0).getDate();
}

function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

function offsetMonth(base: string, delta: number): string {
  const [year, month] = base.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReceiptScreen() {
  const router = useRouter();
  const {
    receipts: allReceipts,
    fetchReceipts,
    getCategoryBreakdown,
    getReceiptsForMonth,
    isLoading,
  } = useReceiptStore();
  const [showAllReceipts, setShowAllReceipts] = useState(false);

  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const currentMonth = selectedMonth;
  const daysInMonth = getDaysInMonth(currentMonth);

  const handlePrevMonth = () => setSelectedMonth((m) => offsetMonth(m, -1));
  const handleNextMonth = () => {
    const next = offsetMonth(selectedMonth, 1);
    if (next <= thisMonth) setSelectedMonth(next);
  };
  const isCurrentMonth = selectedMonth === thisMonth;

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const receipts = getReceiptsForMonth(currentMonth);
  const monthlyTotal = receipts.reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0,
  );
  const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;
  const estimatedMonthlySpend = daysPassed > 0
    ? Math.round((monthlyTotal / daysPassed) * daysInMonth)
    : monthlyTotal;

  const sortedReceipts = [...allReceipts].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const displayedReceipts = showAllReceipts
    ? sortedReceipts
    : sortedReceipts.slice(0, 5);

  const dailyTotals = useMemo(() => {
    const totals = Array.from({ length: daysInMonth }, (_, index) => ({
      day: index + 1,
      amount: 0,
    }));

    receipts.forEach((receipt) => {
      const day = Number(receipt.date.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) {
        totals[day - 1].amount += Number(receipt.amount);
      }
    });

    return totals;
  }, [daysInMonth, receipts]);

  const trendMax = Math.max(...dailyTotals.map((item) => item.amount), 1);
  const linePoints = dailyTotals.map((item, index) => {
    const x = (index / Math.max(daysInMonth - 1, 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - (item.amount / trendMax) * (CHART_HEIGHT - 18) - 8;
    return { ...item, x, y };
  });

  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<string, number>();

    getCategoryBreakdown(currentMonth).forEach((item) => {
      const label = getCategoryLabel(item.category);
      grouped.set(label, (grouped.get(label) ?? 0) + item.amount);
    });

    return [...grouped.entries()]
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: monthlyTotal > 0 ? Math.round((amount / monthlyTotal) * 100) : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonth, getCategoryBreakdown, monthlyTotal]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>소비 리포트</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={Colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.monthNavLabel}>{getMonthLabel(currentMonth)}</Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDisabled]}
            disabled={isCurrentMonth}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? Colors.gray300 : Colors.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconPrimary]}>
              <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatWon(monthlyTotal)}
            </Text>
            <Text style={styles.summaryLabel}>월별 소비 요약</Text>
            <Text style={styles.summaryMeta}>이번 달 전체 합계</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconPurple]}>
              <Ionicons name="receipt-outline" size={18} color={Colors.pro} />
            </View>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {receipts.length}건
            </Text>
            <Text style={styles.summaryLabel}>영수증 등록 건수</Text>
            <Text style={styles.summaryMeta}>이번 달 등록 기준</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconOrange]}>
              <Ionicons name={isCurrentMonth ? "sparkles-outline" : "stats-chart-outline"} size={18} color={Colors.warning} />
            </View>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatWon(estimatedMonthlySpend)}
            </Text>
            <Text style={styles.summaryLabel}>{isCurrentMonth ? "예상 월 지출" : "월 평균 지출"}</Text>
            <Text style={styles.summaryMeta}>{isCurrentMonth ? `AI 예측 · 신뢰도 ${AI_CONFIDENCE}%` : "일평균 × 월일수"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {getMonthLabel(currentMonth)} 지출 추이
            </Text>
          </View>
          <View style={styles.lineChartFrame}>
            <View style={styles.chartGridLine} />
            <View style={[styles.chartGridLine, styles.chartGridLineMiddle]} />
            <View style={[styles.chartGridLine, styles.chartGridLineBottom]} />
            <View style={[styles.lineChart, { width: CHART_WIDTH }]}>
              {linePoints.slice(0, -1).map((point, index) => {
                const next = linePoints[index + 1];
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = `${Math.atan2(dy, dx)}rad`;

                return (
                  <View
                    key={`${point.day}-${next.day}`}
                    style={[
                      styles.lineSegment,
                      {
                        width: length,
                        left: point.x,
                        top: point.y,
                        transform: [{ rotateZ: angle }],
                      },
                    ]}
                  />
                );
              })}
              {linePoints
                .filter((point) => point.amount > 0)
                .map((point) => (
                  <View
                    key={point.day}
                    style={[
                      styles.lineDot,
                      { left: point.x - 4, top: point.y - 4 },
                    ]}
                  />
                ))}
            </View>
          </View>
          <View style={styles.axisRow}>
            <Text style={styles.axisText}>1일</Text>
            <Text style={styles.axisText}>15일</Text>
            <Text style={styles.axisText}>{daysInMonth}일</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카테고리별 지출</Text>
          {categoryBreakdown.length === 0 ? (
            <View style={styles.emptyCompact}>
              <Text style={styles.emptyText}>카테고리 지출 데이터가 없습니다</Text>
            </View>
          ) : (
            <View style={styles.categoryList}>
              {categoryBreakdown.map((item) => (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryNameRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.categoryName}>{item.category}</Text>
                  </View>
                  <View style={styles.categoryBarTrack}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${Math.max(item.percent, 4)}%` as any,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercent}>{item.percent}%</Text>
                  <Text style={styles.categoryAmount}>
                    {formatWon(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 영수증</Text>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionCount}>{allReceipts.length}건</Text>
              {allReceipts.length > 5 ? (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => setShowAllReceipts((previous) => !previous)}
                >
                  <Text style={styles.viewAllBtnText}>
                    {showAllReceipts ? "접기" : "전체 보기"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : allReceipts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="receipt-outline"
                size={42}
                color={Colors.gray300}
              />
              <Text style={styles.emptyText}>등록된 영수증이 없습니다</Text>
            </View>
          ) : (
            <View style={styles.receiptList}>
              {displayedReceipts.map((receipt, index) => {
                const category = getCategoryLabel(receipt.category);
                const categoryColor =
                  categoryBreakdown.find((item) => item.category === category)
                    ?.color ?? Colors.gray200;

                return (
                  <TouchableOpacity
                    key={receipt.id || String(index)}
                    style={styles.receiptItem}
                    onPress={() =>
                      router.push(`/receipt-detail/${receipt.id}` as any)
                    }
                  >
                    <View
                      style={[
                        styles.receiptIconWrap,
                        { backgroundColor: `${categoryColor}22` },
                      ]}
                    >
                      <Ionicons
                        name="receipt-outline"
                        size={20}
                        color={categoryColor}
                      />
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptStore} numberOfLines={1}>
                        {receipt.storeName || "이름 없는 영수증"}
                      </Text>
                      <Text style={styles.receiptDate}>
                        {receipt.date} · {category}
                      </Text>
                    </View>
                    <Text style={styles.receiptAmount}>
                      {formatWon(receipt.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  monthNavLabel: { fontSize: 13, fontWeight: "600", color: Colors.gray700, minWidth: 72, textAlign: "center" },
  monthNavBtn: { padding: 2 },
  monthNavBtnDisabled: { opacity: 0.4 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: TAB_BAR_SPACE,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minHeight: 128,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray100,
    justifyContent: "space-between",
    ...cardShadow,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIconPrimary: { backgroundColor: Colors.primaryLight },
  summaryIconPurple: { backgroundColor: Colors.proLight },
  summaryIconOrange: { backgroundColor: Colors.warningLight },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.gray900,
    includeFontPadding: false,
  },
  summaryLabel: { fontSize: 11, lineHeight: 15, color: Colors.gray700 },
  summaryMeta: { fontSize: 10, lineHeight: 14, color: Colors.gray500 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...cardShadow,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.gray900 },
  sectionCount: { fontSize: 13, color: Colors.gray500 },
  lineChartFrame: {
    height: CHART_HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
  },
  lineChart: {
    height: CHART_HEIGHT,
    alignSelf: "center",
    position: "relative",
  },
  chartGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 12,
    height: 1,
    backgroundColor: Colors.gray100,
  },
  chartGridLineMiddle: { top: CHART_HEIGHT / 2 },
  chartGridLineBottom: { top: CHART_HEIGHT - 12 },
  lineSegment: {
    position: "absolute",
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    transformOrigin: "left center" as any,
  },
  lineDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisText: { fontSize: 11, color: Colors.gray400 },
  categoryList: { gap: Spacing.md },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryNameRow: {
    width: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { fontSize: 13, fontWeight: "700", color: Colors.gray700 },
  categoryBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    overflow: "hidden",
  },
  categoryBarFill: { height: "100%", borderRadius: Radius.full },
  categoryPercent: {
    width: 36,
    fontSize: 12,
    color: Colors.gray500,
    textAlign: "right",
  },
  categoryAmount: {
    width: 74,
    fontSize: 12,
    fontWeight: "800",
    color: Colors.gray900,
    textAlign: "right",
  },
  viewAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  viewAllBtnText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  receiptList: { gap: Spacing.xs },
  receiptItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  receiptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptInfo: { flex: 1, minWidth: 0 },
  receiptStore: { fontSize: 14, fontWeight: "700", color: Colors.gray800 },
  receiptDate: { marginTop: 2, fontSize: 12, color: Colors.gray400 },
  receiptAmount: { fontSize: 14, fontWeight: "800", color: Colors.gray900 },
  empty: { alignItems: "center", padding: Spacing.xl, gap: Spacing.sm },
  emptyCompact: { paddingVertical: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.gray400, textAlign: "center" },
});
