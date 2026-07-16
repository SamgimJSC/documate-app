import { Colors, Radius, Spacing, TAB_BAR_SPACE } from "@/constants/theme";
import {
  MonthlySpendItem,
  TopStoreItem,
  WeekdaySummaryItem,
  getMonthlySpend,
  getTopStores,
  getWeekdaySummary,
} from "@/services/reports";
import { getCardRecommendations, requestCardAi } from "@/services/cards";
import { getSubscription } from "@/services/subscriptions";
import { getCurrentUser } from "@/services/auth";
import { useReceiptStore } from "@/stores/receipt-store";
import { useAuthStore } from "@/stores/auth-store";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const ANNUAL_BAR_HEIGHT = 96;
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const WEB_REPORT_URL = `${process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, "") ?? ""}/finance/report`;

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

function getReportMonth(value: string | number): number {
  if (typeof value === "number") return value;
  const match = value.match(/(\d{1,2})$/);
  return match ? Number(match[1]) : 0;
}

function getStoreName(store: TopStoreItem): string {
  return store.storeName ?? store.store_name ?? store.name ?? "이름 없는 매장";
}

function getStoreAmount(store: TopStoreItem): number {
  return Number(
    store.totalSpend ??
      store.total_spend ??
      store.totalAmount ??
      store.total_amount ??
      store.amount ??
      0,
  );
}

function getStoreCount(store: TopStoreItem): number {
  return Number(
    store.visitCount ??
      store.visit_count ??
      store.receiptCount ??
      store.receipt_count ??
      store.count ??
      0,
  );
}

function getSavingRate(category: string): number {
  if (category.includes("식비") || category.includes("카페") || category.includes("마트")) {
    return 0.2;
  }
  if (category.includes("의료") || category.includes("뷰티") || category.includes("건강")) {
    return 0.15;
  }
  if (category.includes("교통") || category.includes("통신") || category.includes("구독")) {
    return 0.1;
  }
  return 0.1;
}

export default function ReceiptScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    receipts: allReceipts,
    fetchReceipts,
    getCategoryBreakdown,
    getReceiptsForMonth,
    isLoading,
  } = useReceiptStore();
  const [showAllReceipts, setShowAllReceipts] = useState(false);
  const [serverMonthlySpend, setServerMonthlySpend] = useState<MonthlySpendItem[]>([]);
  const [serverTopStores, setServerTopStores] = useState<TopStoreItem[]>([]);
  const [serverWeekdaySummary, setServerWeekdaySummary] = useState<WeekdaySummaryItem[]>([]);
  const [annualReportLoading, setAnnualReportLoading] = useState(false);
  const [cardRecommendationRequesting, setCardRecommendationRequesting] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<"free" | "pro" | null>(null);

  const handleOpenWebReport = async () => {
    if (!process.env.EXPO_PUBLIC_WEB_URL) {
      Alert.alert("웹 주소 확인 필요", "EXPO_PUBLIC_WEB_URL이 설정되어 있지 않습니다.");
      return;
    }

    try {
      await Linking.openURL(WEB_REPORT_URL);
    } catch (error) {
      console.log("웹 소비 리포트 열기 실패:", error);
      Alert.alert("페이지 열기 실패", "웹 소비 리포트 페이지를 열 수 없습니다.");
    }
  };

  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const currentMonth = selectedMonth;
  const selectedYear = Number(currentMonth.slice(0, 4));
  const isPro = user?.plan === "pro" || subscriptionPlan === "pro";
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

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setSubscriptionPlan(null);
      return;
    }

    const syncPlanFromSubscription = async () => {
      try {
        const subscription = await getSubscription();
        if (!mounted) return;
        const nextPlan = subscription.status === "ACTIVE" ? "pro" : "free";
        setSubscriptionPlan(nextPlan);
        if (nextPlan !== user.plan) {
          const refreshedUser = await getCurrentUser();
          if (!mounted) return;
          useAuthStore.setState({
            user: refreshedUser,
          });
        }
      } catch (error) {
        if (!mounted) return;
        console.log("구독 상태 조회 실패:", error);
        setSubscriptionPlan(null);
      }
    };

    void syncPlanFromSubscription();

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.plan]);

  useEffect(() => {
    if (!isPro) return;

    const loadAnnualReports = async () => {
      const selectedMonthNumber = Number(currentMonth.slice(5, 7));
      setAnnualReportLoading(true);
      try {
        const [monthlySpend, topStores, weekdaySummary] = await Promise.all([
          getMonthlySpend({ year: selectedYear }),
          getTopStores({ year: selectedYear, month: selectedMonthNumber, limit: 5 }),
          getWeekdaySummary({ year: selectedYear }),
        ]);
        setServerMonthlySpend(monthlySpend);
        setServerTopStores(topStores);
        setServerWeekdaySummary(weekdaySummary);
      } catch (error) {
        console.log("연간 리포트 조회 실패:", error);
        setServerMonthlySpend([]);
        setServerTopStores([]);
        setServerWeekdaySummary([]);
      } finally {
        setAnnualReportLoading(false);
      }
    };

    void loadAnnualReports();
  }, [currentMonth, isPro, selectedYear]);

  const handleRequestCardRecommendation = async () => {
    if (!isPro) {
      router.push("/pro-promotion" as any);
      return;
    }

    if (cardRecommendationRequesting) return;

    setCardRecommendationRequesting(true);
    try {
      const currentRecommendations = await getCardRecommendations();
      const previousRecommendedAt = currentRecommendations.reduce(
        (latest, recommendation) =>
          recommendation.recommendedAt > latest
            ? recommendation.recommendedAt
            : latest,
        "",
      );

      await requestCardAi();
      router.push({
        pathname: "/card-recommendation",
        params: {
          refresh: "1",
          previousRecommendedAt,
        },
      } as any);
    } catch (error) {
      console.log("AI 카드 추천 요청 실패:", error);
      Alert.alert("카드 추천 요청 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setCardRecommendationRequesting(false);
    }
  };

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

  const annualReport = useMemo(() => {
    const monthlyTotals = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      label: MONTH_LABELS[index],
      amount: 0,
    }));

    if (serverMonthlySpend.length > 0) {
      serverMonthlySpend.forEach((item) => {
        const month = getReportMonth(item.month);
        if (month >= 1 && month <= 12) {
          monthlyTotals[month - 1].amount = Number(item.amount);
        }
      });
    } else {
      allReceipts.forEach((receipt) => {
        const receiptYear = Number(receipt.date.slice(0, 4));
        const receiptMonth = Number(receipt.date.slice(5, 7));
        if (receiptYear === selectedYear && receiptMonth >= 1 && receiptMonth <= 12) {
          monthlyTotals[receiptMonth - 1].amount += Number(receipt.amount);
        }
      });
    }

    const annualTotal = monthlyTotals.reduce((sum, item) => sum + item.amount, 0);
    const activeMonths = monthlyTotals.filter((item) => item.amount > 0);
    const average = activeMonths.length > 0 ? Math.round(annualTotal / activeMonths.length) : 0;
    const peakMonth = [...monthlyTotals].sort((a, b) => b.amount - a.amount)[0];
    const quietMonth = [...activeMonths].sort((a, b) => a.amount - b.amount)[0] ?? null;
    const topMonths = [...monthlyTotals]
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    const peakOverAverageRate =
      average > 0 && peakMonth.amount > average
        ? Math.round(((peakMonth.amount - average) / average) * 100)
        : 0;
    const maxAmount = Math.max(...monthlyTotals.map((item) => item.amount), 1);
    const weekdayTotals = Array.from({ length: 7 }, (_, index) => ({
      weekday: index,
      label: WEEKDAY_LABELS[index],
      amount: 0,
    }));

    if (serverWeekdaySummary.length > 0) {
      serverWeekdaySummary.forEach((item) => {
        if (item.weekday >= 0 && item.weekday <= 6) {
          weekdayTotals[item.weekday].amount = Number(item.amount);
        }
      });
    } else {
      allReceipts.forEach((receipt) => {
        const receiptYear = Number(receipt.date.slice(0, 4));
        if (receiptYear !== selectedYear) return;
        const date = new Date(receipt.date);
        if (Number.isNaN(date.getTime())) return;
        weekdayTotals[date.getDay()].amount += Number(receipt.amount);
      });
    }
    const topWeekday = [...weekdayTotals].sort((a, b) => b.amount - a.amount)[0];
    const weekdayMaxAmount = Math.max(...weekdayTotals.map((item) => item.amount), 1);
    const categoryMap = new Map<string, number>();

    allReceipts.forEach((receipt) => {
      const receiptYear = Number(receipt.date.slice(0, 4));
      if (receiptYear !== selectedYear) return;
      const label = getCategoryLabel(receipt.category);
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + Number(receipt.amount));
    });

    const categoryTotals = [...categoryMap.entries()]
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: annualTotal > 0 ? Math.round((amount / annualTotal) * 100) : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const savingOpportunities = categoryTotals.map((item) => {
      const rate = getSavingRate(item.category);
      return {
        ...item,
        rate,
        saving: Math.round(item.amount * rate),
      };
    });
    const totalPotentialSaving = savingOpportunities.reduce(
      (sum, item) => sum + item.saving,
      0,
    );

    const insight =
      annualTotal === 0
        ? "아직 분석할 영수증 데이터가 없습니다."
        : peakOverAverageRate >= 50
          ? `${peakMonth.label} 지출이 월평균보다 ${peakOverAverageRate}% 높아요. 해당 달의 큰 결제나 반복 소비를 점검해보세요.`
          : peakOverAverageRate >= 20
            ? `${peakMonth.label} 지출이 평소보다 눈에 띄게 높아요. 소비가 몰린 항목을 확인해보면 좋아요.`
            : "연간 지출이 비교적 고르게 분포되어 있어요. 큰 변동 없이 소비가 관리되고 있습니다.";
    const coachingTips =
      annualTotal === 0
        ? ["영수증이 쌓이면 소비가 몰리는 월과 절약 포인트를 자동으로 보여드릴게요."]
        : [
          peakOverAverageRate > 0
            ? `${peakMonth.label} 지출이 월평균보다 ${peakOverAverageRate}% 높았어요. 해당 월의 반복 결제와 큰 금액 영수증부터 확인해보세요.`
            : "월별 지출 변동이 크지 않아요. 이 패턴을 유지하면서 고정비만 가볍게 점검해보세요.",
          categoryTotals[0]
            ? `${categoryTotals[0].category} 지출이 연간 소비의 ${categoryTotals[0].percent}%를 차지해요. 이 항목에서 작은 절약 목표를 잡는 게 효과적이에요.`
            : "카테고리 데이터가 더 쌓이면 많이 쓰는 항목을 기준으로 코칭을 보여드릴게요.",
          topWeekday.amount > 0
            ? `${topWeekday.label}요일에 지출이 가장 많았어요. 해당 요일 전후의 소비 루틴을 확인해보세요.`
            : "요일별 지출 데이터가 더 쌓이면 소비 루틴을 분석해드릴게요.",
        ];

    return {
      monthlyTotals,
      annualTotal,
      average,
      peakMonth,
      quietMonth,
      topMonths,
      peakOverAverageRate,
      maxAmount,
      weekdayTotals,
      topWeekday,
      weekdayMaxAmount,
      categoryTotals,
      savingOpportunities,
      totalPotentialSaving,
      coachingTips,
      insight,
    };
  }, [allReceipts, selectedYear, serverMonthlySpend, serverWeekdaySummary]);

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

        <View style={[styles.section, styles.annualSection]}>
          <View style={styles.sectionHeader}>
            <View style={styles.annualTitleBlock}>
              <Text style={styles.sectionTitle}>{selectedYear} 연간 소비 리포트</Text>
              <Text style={styles.annualSubtitle}>월별 지출 편차를 분석해 소비가 몰린 달을 찾아요</Text>
            </View>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </View>

          {isPro ? (
            <>
              <View style={styles.annualSummaryGrid}>
                <View style={styles.annualMetric}>
                  <Text style={styles.annualMetricLabel}>연간 총 지출</Text>
                  <Text style={styles.annualMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatWon(annualReport.annualTotal)}
                  </Text>
                </View>
                <View style={styles.annualMetric}>
                  <Text style={styles.annualMetricLabel}>활동 월평균</Text>
                  <Text style={styles.annualMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatWon(annualReport.average)}
                  </Text>
                </View>
              </View>

              <View style={styles.annualHighlight}>
                <View style={styles.annualHighlightIcon}>
                  <Ionicons name="trending-up-outline" size={18} color={Colors.warning} />
                </View>
                <View style={styles.annualHighlightText}>
                  <Text style={styles.annualHighlightTitle}>
                    {annualReport.peakMonth.label} 지출이 가장 높아요
                  </Text>
                  <Text style={styles.annualHighlightDesc}>
                    {annualReport.peakOverAverageRate > 0
                      ? `월평균 대비 ${annualReport.peakOverAverageRate}% 높음 · ${formatWon(annualReport.peakMonth.amount)}`
                      : `${formatWon(annualReport.peakMonth.amount)} 사용`}
                  </Text>
                </View>
              </View>

              <View style={styles.annualChart}>
                {annualReport.monthlyTotals.map((item) => {
                  const barHeight = Math.max(
                    item.amount > 0 ? 8 : 2,
                    (item.amount / annualReport.maxAmount) * ANNUAL_BAR_HEIGHT,
                  );
                  const isPeak = item.month === annualReport.peakMonth.month && item.amount > 0;
                  return (
                    <View key={item.month} style={styles.annualBarItem}>
                      <View style={styles.annualBarTrack}>
                        <View
                          style={[
                            styles.annualBarFill,
                            {
                              height: barHeight,
                              backgroundColor: isPeak ? Colors.warning : Colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.annualBarLabel, isPeak && styles.annualBarLabelPeak]}>
                        {item.month}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.annualInsightBox}>
                <Ionicons name="sparkles-outline" size={17} color={Colors.pro} />
                <Text style={styles.annualInsightText}>{annualReport.insight}</Text>
              </View>

              {annualReport.topMonths.length > 0 ? (
                <View style={styles.topMonthList}>
                  {annualReport.topMonths.map((item, index) => (
                    <View key={item.month} style={styles.topMonthRow}>
                      <Text style={styles.topMonthRank}>{index + 1}</Text>
                      <Text style={styles.topMonthName}>{item.label}</Text>
                      <View style={styles.topMonthBarTrack}>
                        <View
                          style={[
                            styles.topMonthBarFill,
                            { width: `${Math.max((item.amount / annualReport.maxAmount) * 100, 4)}%` as any },
                          ]}
                        />
                      </View>
                      <Text style={styles.topMonthAmount}>{formatWon(item.amount)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.reportSubSection}>
                <Text style={styles.reportSubTitle}>연간 소비 패턴</Text>
                {annualReport.categoryTotals.length > 0 ? (
                  <View style={styles.patternList}>
                    {annualReport.categoryTotals.map((item) => (
                      <View key={item.category} style={styles.patternRow}>
                        <View style={styles.patternHeader}>
                          <Text style={styles.patternName}>{item.category}</Text>
                          <Text style={styles.patternAmount}>
                            {item.percent}% · {formatWon(item.amount)}
                          </Text>
                        </View>
                        <View style={styles.patternTrack}>
                          <View
                            style={[
                              styles.patternFill,
                              {
                                width: `${Math.max(item.percent, 6)}%` as any,
                                backgroundColor: item.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.reportEmptyText}>
                    올해 등록된 영수증이 쌓이면 소비 패턴을 보여드릴게요.
                  </Text>
                )}
              </View>

              <View style={styles.savingBox}>
                <View style={styles.savingHeader}>
                  <Text style={styles.savingTitle}>절약 가능 금액</Text>
                  <Text style={styles.savingTotal}>
                    연 {formatWon(annualReport.totalPotentialSaving)}
                  </Text>
                </View>
                {annualReport.savingOpportunities.length > 0 ? (
                  annualReport.savingOpportunities.map((item) => (
                    <View key={item.category} style={styles.savingRow}>
                      <View style={styles.savingInfo}>
                        <Text style={styles.savingCategory}>{item.category}</Text>
                        <Text style={styles.savingDesc}>
                          월별 소비 루틴에서 {Math.round(item.rate * 100)}% 줄이면
                        </Text>
                      </View>
                      <Text style={styles.savingAmount}>
                        {formatWon(item.saving)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.reportEmptyText}>
                    절약 시뮬레이션에 필요한 소비 데이터가 아직 부족해요.
                  </Text>
                )}
              </View>

              <View style={styles.coachingBox}>
                <View style={styles.coachingHeader}>
                  <Ionicons name="bulb-outline" size={17} color={Colors.primary} />
                  <Text style={styles.coachingTitle}>AI 소비 코칭</Text>
                </View>
                {annualReport.coachingTips.map((tip, index) => (
                  <View key={`${tip}-${index}`} style={styles.coachingTipRow}>
                    <View style={styles.coachingTipDot} />
                    <Text style={styles.coachingTipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              {annualReportLoading ? (
                <View style={styles.reportLoadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.reportLoadingText}>서버 리포트를 불러오는 중입니다</Text>
                </View>
              ) : null}

              {serverTopStores.length > 0 ? (
                <View style={styles.reportSubSection}>
                  <Text style={styles.reportSubTitle}>TOP 방문 매장</Text>
                  {serverTopStores.map((store, index) => (
                    <View key={`${getStoreName(store)}-${index}`} style={styles.storeRow}>
                      <Text style={styles.storeRank}>{index + 1}</Text>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName} numberOfLines={1}>
                          {getStoreName(store)}
                        </Text>
                        <Text style={styles.storeMeta}>{getStoreCount(store)}회 방문</Text>
                      </View>
                      <Text style={styles.storeAmount}>{formatWon(getStoreAmount(store))}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.reportSubSection}>
                <View style={styles.weekdayHeader}>
                  <Text style={styles.reportSubTitle}>요일별 지출</Text>
                  <Text style={styles.weekdayPeak}>
                    {annualReport.topWeekday.label}요일 최다
                  </Text>
                </View>
                <View style={styles.weekdayChart}>
                  {annualReport.weekdayTotals.map((item) => {
                    const width = `${Math.max((item.amount / annualReport.weekdayMaxAmount) * 100, item.amount > 0 ? 6 : 2)}%` as any;
                    return (
                      <View key={item.weekday} style={styles.weekdayRow}>
                        <Text style={styles.weekdayLabel}>{item.label}</Text>
                        <View style={styles.weekdayTrack}>
                          <View style={[styles.weekdayFill, { width }]} />
                        </View>
                        <Text style={styles.weekdayAmount}>{formatWon(item.amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.webGuideBox}
                onPress={() => void handleOpenWebReport()}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Ionicons name="desktop-outline" size={17} color={Colors.gray500} />
                <Text style={styles.webGuideText}>
                  더 자세한 내역은 web에서 확인해주세요.
                </Text>
                <Ionicons name="open-outline" size={15} color={Colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.annualLocked}
              onPress={() => router.push("/pro-promotion" as any)}
              activeOpacity={0.85}
            >
              <View style={styles.annualLockedIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.pro} />
              </View>
              <View style={styles.annualLockedText}>
                <Text style={styles.annualLockedTitle}>Pro에서 연간 소비 리포트를 볼 수 있어요</Text>
                <Text style={styles.annualLockedDesc}>
                  지출이 몰린 달, 월평균 대비 초과율, 연간 소비 패턴을 자동으로 분석합니다.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.pro} />
            </TouchableOpacity>
          )}
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

        {/* 카드 추천 요약 */}
        <View
          style={styles.cardRecommendBanner}
        >
          <View style={styles.cardRecommendHeader}>
            <View style={styles.cardRecommendTitleRow}>
              <Ionicons name="card-outline" size={19} color={Colors.pro} />
              <Text style={styles.cardRecommendTitle}>카드 추천</Text>
              <View style={styles.cardRecommendProBadge}>
                <Text style={styles.cardRecommendProText}>PRO</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardRecommendFeature}>
            <View style={styles.cardRecommendFeatureIcon}>
              <Ionicons name="sparkles-outline" size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.cardRecommendCopy}>
              <Text style={styles.cardRecommendHeadline}>
                소비 패턴에 맞는{"\n"}혜택 카드를 추천해드려요.
              </Text>
              <Text style={styles.cardRecommendSub}>
                등록된 영수증의 카테고리와 지출 흐름을 기준으로 예상 혜택이 높은
                카드를 정리했어요.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cardRecommendFooter}
            onPress={() => void handleRequestCardRecommendation()}
            activeOpacity={0.85}
            disabled={cardRecommendationRequesting}
          >
            {cardRecommendationRequesting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Text style={styles.cardRecommendBtnText}>나에게 맞는 카드 추천받기</Text>
                <Ionicons name="chevron-forward" size={15} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
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
  annualSection: { borderWidth: 1, borderColor: Colors.proLight },
  annualTitleBlock: { flex: 1, gap: 3 },
  annualSubtitle: { fontSize: 12, color: Colors.gray500, lineHeight: 16 },
  proPill: {
    borderRadius: Radius.full,
    backgroundColor: Colors.pro,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proPillText: { fontSize: 10, fontWeight: "900", color: Colors.white },
  annualSummaryGrid: { flexDirection: "row", gap: Spacing.sm },
  annualMetric: {
    flex: 1,
    minHeight: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  annualMetricLabel: { fontSize: 12, color: Colors.gray500 },
  annualMetricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.gray900,
    includeFontPadding: false,
  },
  annualHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
  },
  annualHighlightIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  annualHighlightText: { flex: 1, minWidth: 0 },
  annualHighlightTitle: { fontSize: 14, fontWeight: "800", color: Colors.gray900 },
  annualHighlightDesc: { marginTop: 2, fontSize: 12, color: Colors.gray600 },
  annualChart: {
    height: ANNUAL_BAR_HEIGHT + 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  annualBarItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  annualBarTrack: {
    width: "100%",
    maxWidth: 16,
    height: ANNUAL_BAR_HEIGHT,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  annualBarFill: {
    width: "100%",
    borderTopLeftRadius: Radius.full,
    borderTopRightRadius: Radius.full,
  },
  annualBarLabel: { fontSize: 10, color: Colors.gray400, fontWeight: "700" },
  annualBarLabelPeak: { color: Colors.warning },
  annualInsightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.proLight,
    padding: Spacing.md,
  },
  annualInsightText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.gray800 },
  topMonthList: { gap: Spacing.sm },
  topMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  topMonthRank: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "900",
  },
  topMonthName: { width: 36, fontSize: 13, fontWeight: "800", color: Colors.gray700 },
  topMonthBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    overflow: "hidden",
  },
  topMonthBarFill: { height: "100%", borderRadius: Radius.full, backgroundColor: Colors.primary },
  topMonthAmount: {
    width: 86,
    fontSize: 12,
    fontWeight: "800",
    color: Colors.gray900,
    textAlign: "right",
  },
  reportLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray50,
    padding: Spacing.sm,
  },
  reportLoadingText: { fontSize: 12, color: Colors.gray500 },
  reportSubSection: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: Spacing.md,
  },
  reportSubTitle: { fontSize: 14, fontWeight: "800", color: Colors.gray900 },
  reportEmptyText: { fontSize: 12, lineHeight: 17, color: Colors.gray500 },
  patternList: { gap: Spacing.sm },
  patternRow: { gap: 6 },
  patternHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  patternName: { fontSize: 13, fontWeight: "800", color: Colors.gray800 },
  patternAmount: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    color: Colors.gray500,
    textAlign: "right",
  },
  patternTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    overflow: "hidden",
  },
  patternFill: { height: "100%", borderRadius: Radius.full },
  savingBox: {
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
  },
  savingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  savingTitle: { fontSize: 14, fontWeight: "900", color: Colors.gray900 },
  savingTotal: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
    color: Colors.primary,
    textAlign: "right",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
  },
  savingInfo: { flex: 1, minWidth: 0 },
  savingCategory: { fontSize: 13, fontWeight: "800", color: Colors.gray800 },
  savingDesc: { marginTop: 2, fontSize: 11, lineHeight: 15, color: Colors.gray500 },
  savingAmount: {
    width: 86,
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
    textAlign: "right",
  },
  coachingBox: {
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.white,
    padding: Spacing.md,
  },
  coachingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coachingTitle: { fontSize: 14, fontWeight: "900", color: Colors.gray900 },
  coachingTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  coachingTipDot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  coachingTipText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.gray700 },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storeRank: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.proLight,
    color: Colors.pro,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "900",
  },
  storeInfo: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 13, fontWeight: "800", color: Colors.gray800 },
  storeMeta: { marginTop: 1, fontSize: 11, color: Colors.gray400 },
  storeAmount: {
    width: 88,
    fontSize: 12,
    fontWeight: "900",
    color: Colors.gray900,
    textAlign: "right",
  },
  weekdayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  weekdayPeak: { fontSize: 12, fontWeight: "800", color: Colors.pro },
  weekdayChart: { gap: 7 },
  weekdayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weekdayLabel: { width: 18, fontSize: 12, fontWeight: "800", color: Colors.gray600 },
  weekdayTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    overflow: "hidden",
  },
  weekdayFill: { height: "100%", borderRadius: Radius.full, backgroundColor: Colors.pro },
  weekdayAmount: {
    width: 78,
    fontSize: 11,
    fontWeight: "800",
    color: Colors.gray700,
    textAlign: "right",
  },
  webGuideBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: Spacing.md,
  },
  webGuideText: { fontSize: 12, fontWeight: "700", color: Colors.gray500 },
  annualLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.proLight,
    padding: Spacing.md,
  },
  annualLockedIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  annualLockedText: { flex: 1, minWidth: 0, gap: 2 },
  annualLockedTitle: { fontSize: 14, fontWeight: "800", color: Colors.gray900 },
  annualLockedDesc: { fontSize: 12, lineHeight: 17, color: Colors.gray600 },
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

  // 카드 추천 배너
  cardRecommendBanner: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.proLight,
    ...cardShadow,
  },
  cardRecommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardRecommendTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  cardRecommendTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  cardRecommendProBadge: {
    backgroundColor: Colors.pro,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardRecommendProText: { fontSize: 10, fontWeight: "800", color: Colors.white },
  cardRecommendFeature: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.chipBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: Spacing.sm,
  },
  cardRecommendFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRecommendCopy: { flex: 1, gap: 5 },
  cardRecommendHeadline: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.darkText,
    lineHeight: 23,
    letterSpacing: -0.4,
  },
  cardRecommendSub: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.muted,
    lineHeight: 18,
  },
  cardRecommendFooter: {
    backgroundColor: Colors.pro,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardRecommendBtnText: { fontSize: 13, fontWeight: "700", color: Colors.white },
});
