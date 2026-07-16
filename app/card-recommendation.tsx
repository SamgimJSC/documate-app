import { CreditCardView } from "@/components/common/CreditCardView";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  CardRecommendation,
  DefaultCard,
  checkCards,
  getCardDetail,
  getCardRecommendations,
  requestCardAi,
} from "@/services/cards";
import { useAuthStore } from "@/stores/auth-store";
import { useReceiptStore } from "@/stores/receipt-store";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RANK_COLORS = [Colors.primaryDark, Colors.primary, Colors.primarySoft];

function formatWon(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "연회비 없음";
  if (value >= 10000) return `${Math.round(value / 10000)}만원`;
  return `${Math.round(value).toLocaleString()}원`;
}

export default function CardRecommendationScreen() {
  const router = useRouter();
  const { refresh, previousRecommendedAt } = useLocalSearchParams<{
    refresh?: string;
    previousRecommendedAt?: string;
  }>();
  const { user } = useAuthStore();
  const { getCategoryBreakdown, receipts } = useReceiptStore();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  type ScreenState = "loading" | "no_receipt" | "ai_pending" | "done" | "error";
  const [state, setState] = useState<ScreenState>("loading");
  const [recommendations, setRecommendations] = useState<CardRecommendation[]>(
    [],
  );
  const [defaultCards, setDefaultCards] = useState<DefaultCard[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiRequesting, setAiRequesting] = useState(false);
  const [openingCardId, setOpeningCardId] = useState<string | null>(null);

  // 로컬 카테고리 분석
  const localBreakdown = useMemo(() => {
    const breakdown = getCategoryBreakdown(currentMonth);
    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    return breakdown
      .map((b) => ({
        ...b,
        percent: total > 0 ? Math.round((b.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts, currentMonth]);

  const topCategory = localBreakdown[0];
  const loadData = async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const check = await checkCards();
      if (!check.hasReceipt) {
        setDefaultCards(check.defaultCards);
        setState("no_receipt");
        return;
      }
      const recs = await getCardRecommendations();
      if (recs.length === 0) {
        setState("ai_pending");
      } else {
        setRecommendations(recs);
        setState("done");
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? "데이터를 불러오지 못했습니다.");
      setState("error");
    }
  };

  const handleRequestAi = async () => {
    setAiRequesting(true);
    try {
      await requestCardAi();
      setState("ai_pending");
    } catch (e: any) {
      setErrorMsg(e.message);
      setState("error");
    } finally {
      setAiRequesting(false);
    }
  };

  const handleOpenCardSite = async (cardId: string) => {
    if (openingCardId) return;

    setOpeningCardId(cardId);
    try {
      const detail = await getCardDetail(cardId);
      const sourceUrl = detail.sourceUrl?.trim();
      if (!sourceUrl) {
        Alert.alert(
          "카드 페이지 없음",
          "이 카드의 외부 페이지가 등록되어 있지 않습니다.",
        );
        return;
      }

      if (!/^https?:\/\//i.test(sourceUrl)) {
        Alert.alert(
          "카드 페이지 오류",
          "서버에 등록된 카드 URL 형식이 올바르지 않습니다.",
        );
        return;
      }

      await Linking.openURL(sourceUrl);
    } catch (error) {
      console.log("카드 외부 페이지 열기 실패:", error);
      Alert.alert("페이지 열기 실패", "카드 외부 페이지를 열 수 없습니다.");
    } finally {
      setOpeningCardId(null);
    }
  };

  useEffect(() => {
    if (user?.plan !== "pro") {
      router.replace("/pro-promotion" as any);
      return;
    }
    if (refresh === "1") {
      setRecommendations([]);
      setState("ai_pending");
      return;
    }
    void loadData();
  }, []);

  useEffect(() => {
    if (state !== "ai_pending") return;

    const interval = setInterval(() => {
      void getCardRecommendations()
        .then((recs) => {
          if (recs.length === 0) return;
          const freshRecommendations =
            refresh === "1" && previousRecommendedAt
              ? recs.filter(
                  (recommendation) =>
                    recommendation.recommendedAt > previousRecommendedAt,
                )
              : recs;
          if (freshRecommendations.length === 0) return;
          setRecommendations(freshRecommendations);
          setState("done");
        })
        .catch((error) => {
          console.log("AI 카드 추천 결과 자동 조회 실패:", error);
        });
    }, 2500);

    return () => clearInterval(interval);
  }, [previousRecommendedAt, refresh, state]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>카드 추천</Text>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>

      {state === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>소비 패턴 분석 중...</Text>
        </View>
      )}

      {state === "error" && (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.gray300}
          />
          <Text style={styles.centerText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === "ai_pending" && (
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={48} color={Colors.pro} />
          <Text style={styles.pendingTitle}>AI 분석 중이에요</Text>
          <Text style={styles.pendingDesc}>
            소비 패턴을 분석해 맞춤 카드를 추천하고 있어요.{"\n"}조금만
            기다려주세요.
          </Text>
        </View>
      )}

      {(state === "no_receipt" || state === "done") && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 통계 칩 */}
          {(topCategory || state === "done") && (
            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Ionicons
                  name="cafe-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.statChipTitle}>TOP 카테고리</Text>
                <Text style={styles.statChipValue}>
                  {topCategory?.category ?? "-"}
                </Text>
                <Text style={styles.statChipSub}>
                  전체 소비의 {topCategory?.percent ?? 0}%
                </Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons
                  name="stats-chart-outline"
                  size={20}
                  color={Colors.pro}
                />
                <Text style={styles.statChipTitle}>추천 카드 수</Text>
                <Text style={[styles.statChipValue, { color: Colors.pro }]}>
                  {state === "done" ? `${recommendations.length}개` : "-"}
                </Text>
                <Text style={styles.statChipSub}>AI 매칭 결과</Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={Colors.warning}
                />
                <Text style={styles.statChipTitle}>추천 기준</Text>
                <Text style={styles.statChipValue}>혜택 중심</Text>
                <Text style={styles.statChipSub}>연회비 낮은 순</Text>
              </View>
            </View>
          )}

          {/* AI 배너 (분석된 경우) */}
          {state === "done" && topCategory && (
            <View style={styles.aiBanner}>
              <View style={styles.aiBannerHeader}>
                <Ionicons name="sparkles" size={15} color={Colors.pro} />
                <Text style={styles.aiBannerTitle}>
                  AI가 분석한 소비 패턴 결과예요!
                </Text>
              </View>
              <Text style={styles.aiBannerText}>
                {topCategory.category} 지출 비중이 가장 높아요.{" "}
                {topCategory.category} 관련 소비 횟수나 금액을 한 번만 줄여도
                다음 달 지출 관리에 도움이 됩니다.
              </Text>
            </View>
          )}

          {/* ── AI 추천 카드 목록 ── */}
          {state === "done" && recommendations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                추천 카드 TOP {recommendations.length}
              </Text>
              {recommendations.map((card, i) => (
                <TouchableOpacity
                  key={card.recommendationId}
                  style={[styles.cardItem, i === 0 && styles.cardItemTop]}
                  onPress={() => void handleOpenCardSite(card.cardId)}
                  disabled={openingCardId !== null}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardImgWrap}>
                    <CreditCardView
                      card={{ ...card, rank: i + 1 }}
                      color={RANK_COLORS[i]}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardNameRow}>
                      <View>
                        <Text style={styles.cardName}>{card.cardName}</Text>
                        {card.issuer && (
                          <Text style={styles.cardIssuer}>{card.issuer}</Text>
                        )}
                      </View>
                      {i === 0 && (
                        <View style={styles.bestBadge}>
                          <Text style={styles.bestBadgeText}>BEST</Text>
                        </View>
                      )}
                    </View>

                    {/* 연회비 + 매칭 점수 */}
                    <View style={styles.cardStats}>
                      <View style={styles.cardStat}>
                        <Text style={styles.cardStatValue}>
                          {formatWon(card.annualFee)}
                        </Text>
                        <Text style={styles.cardStatLabel}>연회비</Text>
                      </View>
                      {card.matchScore !== null && (
                        <>
                          <View style={styles.cardStatDivider} />
                          <View style={styles.cardStat}>
                            <Text
                              style={[
                                styles.cardStatValue,
                                { color: Colors.pro },
                              ]}
                            >
                              {Math.round(card.matchScore ?? 0)}점
                            </Text>
                            <Text style={styles.cardStatLabel}>
                              AI 매칭 점수
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* AI 추천 이유 */}
                    {card.reason && (
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonText} numberOfLines={3}>
                          {card.reason}
                        </Text>
                      </View>
                    )}

                    <View style={styles.detailBtnRow}>
                      {openingCardId === card.cardId ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.primary}
                        />
                      ) : (
                        <>
                          <Text style={styles.detailBtnText}>카드 보기</Text>
                          <Ionicons
                            name="open-outline"
                            size={14}
                            color={Colors.primary}
                          />
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* 비교 테이블 */}
              <View style={styles.tableCard}>
                <Text style={styles.tableTitle}>혜택 비교 요약</Text>
                <Text style={styles.tableSubtitle}>
                  주요 조건을 한눈에 비교해보세요.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.tableRow}>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellCenter,
                          styles.tableCellHeader,
                        ]}
                      >
                        순위
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellName,
                          styles.tableCellHeader,
                        ]}
                      >
                        카드명
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellIssuer,
                          styles.tableCellHeader,
                        ]}
                      >
                        카드사
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellNum,
                          styles.tableCellHeader,
                          { paddingRight: Spacing.sm },
                        ]}
                      >
                        연회비
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellNum,
                          styles.tableCellHeader,
                        ]}
                      >
                        AI 점수
                      </Text>
                    </View>
                    {recommendations.map((card, i) => (
                      <View key={card.cardId} style={styles.tableRow}>
                        <View
                          style={[styles.tableCell, styles.tableCellCenter]}
                        >
                          <View
                            style={[
                              styles.tableRankBadge,
                              {
                                backgroundColor:
                                  RANK_COLORS[i] ?? Colors.gray400,
                              },
                            ]}
                          >
                            <Text style={styles.tableRankText}>{i + 1}위</Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.tableCell, styles.tableCellName]}
                          numberOfLines={1}
                        >
                          {card.cardName}
                        </Text>
                        <Text
                          style={[styles.tableCell, styles.tableCellIssuer]}
                          numberOfLines={1}
                        >
                          {card.issuer ?? "-"}
                        </Text>
                        <Text style={[styles.tableCell, styles.tableCellNum]}>
                          {formatWon(card.annualFee)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.tableCellNum,
                            { color: Colors.pro, fontWeight: "700" },
                          ]}
                        >
                          {card.matchScore !== null
                            ? `${Math.round(card.matchScore ?? 0)}점`
                            : "-"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </>
          )}

          {/* ── 영수증 없는 경우: 기본 카드 안내 ── */}
          {state === "no_receipt" && (
            <>
              <View style={styles.noReceiptBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.noReceiptText}>
                  영수증이 없어 맞춤 추천을 드리기 어려워요.{"\n"}영수증을
                  등록하면 AI가 소비 패턴을 분석해 딱 맞는 카드를 추천해드려요!
                </Text>
              </View>

              <View style={styles.aiRequestCard}>
                <Ionicons
                  name="sparkles-outline"
                  size={24}
                  color={Colors.pro}
                />
                <Text style={styles.aiRequestTitle}>
                  AI 맞춤 카드 추천 받기
                </Text>
                <Text style={styles.aiRequestDesc}>
                  영수증 등록 후 AI 분석을 요청하면{"\n"}소비 패턴에 맞는 카드를
                  추천해드려요.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.aiRequestBtn,
                    aiRequesting && { opacity: 0.6 },
                  ]}
                  onPress={handleRequestAi}
                  disabled={aiRequesting}
                >
                  {aiRequesting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.aiRequestBtnText}>AI 분석 요청</Text>
                  )}
                </TouchableOpacity>
              </View>

              {defaultCards.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>
                    인기 카드 TOP {defaultCards.length}
                  </Text>
                  {defaultCards.map((card, i) => (
                    <TouchableOpacity
                      key={card.cardId}
                      style={styles.cardItem}
                      onPress={() => void handleOpenCardSite(card.cardId)}
                      disabled={openingCardId !== null}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardImgWrap}>
                        <CreditCardView card={card} color={RANK_COLORS[i]} />
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardName}>{card.cardName}</Text>
                        <Text style={styles.cardIssuer}>{card.issuer}</Text>
                        <View style={styles.cardStats}>
                          <View style={styles.cardStat}>
                            <Text style={styles.cardStatValue}>
                              {formatWon(card.annualFee)}
                            </Text>
                            <Text style={styles.cardStatLabel}>연회비</Text>
                          </View>
                        </View>
                        <View style={styles.detailBtnRow}>
                          {openingCardId === card.cardId ? (
                            <ActivityIndicator
                              size="small"
                              color={Colors.primary}
                            />
                          ) : (
                            <>
                              <Text style={styles.detailBtnText}>
                                외부 사이트 보기
                              </Text>
                              <Ionicons
                                name="open-outline"
                                size={14}
                                color={Colors.primary}
                              />
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}

          {/* 면책 고지 */}
          <View style={styles.disclaimer}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={Colors.gray400}
            />
            <Text style={styles.disclaimerText}>
              추천 결과는 등록된 영수증 소비 패턴을 기준으로 한 예시입니다. 실제
              카드 혜택, 전월 실적, 할인 한도는 카드사 정책에 따라 달라질 수
              있습니다.
            </Text>
          </View>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const shadow = Platform.select({
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray900,
  },
  proBadge: {
    backgroundColor: Colors.pro,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: { fontSize: 11, fontWeight: "800", color: Colors.white },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  centerText: { fontSize: 14, color: Colors.gray500, textAlign: "center" },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryBtnText: { fontSize: 14, fontWeight: "600", color: Colors.white },
  pendingTitle: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  pendingDesc: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 20,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg },

  statRow: { flexDirection: "row", gap: Spacing.sm },
  statChip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
    ...shadow,
  },
  statChipTitle: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  statChipValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.gray900,
    textAlign: "center",
  },
  statChipSub: { fontSize: 10, color: Colors.gray400, textAlign: "center" },

  aiBanner: {
    backgroundColor: Colors.proLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.pro,
  },
  aiBannerHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiBannerTitle: { fontSize: 13, fontWeight: "700", color: Colors.pro },
  aiBannerText: { fontSize: 13, color: Colors.gray700, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },

  cardItem: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...shadow,
  },
  cardImgWrap: { padding: Spacing.md, paddingBottom: 0 },
  cardItemTop: { borderWidth: 1.5, borderColor: Colors.primary },
  // 신용카드 비주얼
  creditCard: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: "hidden",
    margin: Spacing.md,
    marginBottom: 0,
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  creditCardImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.lg,
  },
  cardCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -60,
    right: -40,
  },
  cardCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -30,
    left: -20,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardIssuerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    flex: 1,
    marginRight: 8,
  },
  chip: {
    width: 32,
    height: 24,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  chipH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  chipV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  cardNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.white,
    flex: 1,
    marginRight: 8,
  },
  rankBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankBadgeText: { fontSize: 11, fontWeight: "800", color: Colors.white },
  cardBody: { padding: Spacing.md, gap: Spacing.sm },
  cardNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  cardIssuer: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  bestBadge: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.white },
  cardStats: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  cardStat: { alignItems: "center", gap: 2 },
  cardStatValue: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  cardStatLabel: { fontSize: 11, color: Colors.gray400 },
  cardStatDivider: { width: 1, height: 28, backgroundColor: Colors.gray100 },
  reasonBox: {
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  reasonText: { fontSize: 12, color: Colors.gray600, lineHeight: 18 },
  detailBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  detailBtnText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...shadow,
  },
  tableTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  tableSubtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: Spacing.xs,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tableCell: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    width: 80,
  },
  tableCellHeader: { fontSize: 11, fontWeight: "700", color: Colors.gray500 },
  tableCellCenter: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  tableCellName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray800,
    width: 110,
  },
  tableCellIssuer: { fontSize: 12, color: Colors.gray500, width: 80 },
  tableCellNum: { fontSize: 12, color: Colors.gray800, textAlign: "right" },
  tableRankBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tableRankText: { fontSize: 10, fontWeight: "800", color: Colors.white },

  noReceiptBanner: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  noReceiptText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray700,
    lineHeight: 18,
  },

  aiRequestCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.md,
    ...shadow,
  },
  aiRequestTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  aiRequestDesc: {
    fontSize: 13,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 18,
  },
  aiRequestBtn: {
    backgroundColor: Colors.pro,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  aiRequestBtnText: { fontSize: 14, fontWeight: "700", color: Colors.white },

  disclaimer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray400,
    lineHeight: 16,
  },
});
