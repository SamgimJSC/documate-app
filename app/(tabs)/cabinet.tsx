import { Badge } from "@/components/common/badge";
import { DocumentCategory } from "@/constants/mock-data";
import { Colors, Radius, Spacing, TAB_BAR_SPACE } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useDocStore } from "@/stores/doc-store";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_CATEGORIES: (DocumentCategory | "전체")[] = [
  "전체",
  "계약서",
  "보증서",
  "처방전",
  "보험서류",
  "영수증",
  "기타",
];


const SORT_LABELS = {
  recent: "최신순",
  name: "이름순",
  expiry: "만료순",
} as const;

type SortBy = keyof typeof SORT_LABELS;

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <Animated.View style={[styles.docCard, { opacity }]}>
      <View style={styles.docLeft}>
        <View style={styles.skeletonIcon} />
        <View style={styles.docInfo}>
          <View style={[styles.skeletonLine, { width: "68%" }]} />
          <View style={[styles.skeletonLine, { width: "38%", height: 10 }]} />
          <View style={[styles.skeletonLine, { width: "52%", height: 10 }]} />
        </View>
      </View>
      <View style={styles.docRight}>
        <View style={styles.skeletonDot} />
        <View style={styles.skeletonDot} />
      </View>
    </Animated.View>
  );
}

export default function CabinetScreen() {
  const router = useRouter();
  const {
    categories,
    fetchCategories,
    fetchDocuments,
    getFilteredDocuments,
    isLoading,
    searchQuery,
    setSearchQuery,
    setSelectedCategory,
    toggleFavorite,
    toggleSecured,
  } = useDocStore();
  const { pin: storedPin, verifyPinWithServer } = useAuthStore();

  const [catFilter, setCatFilter] =
    useState<DocumentCategory | "전체">("전체");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalInput, setPinModalInput] = useState('');
  const [pinModalError, setPinModalError] = useState(false);
  const [pinModalLoading, setPinModalLoading] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [pinModalPurpose, setPinModalPurpose] = useState<'view' | 'disable'>('view');

  // 최초 마운트: 로딩 스켈레톤 표시하며 fetch
  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, [fetchDocuments, fetchCategories]);

  // 화면 포커스될 때마다 (상세페이지에서 돌아올 때 등) silent re-fetch
  useFocusEffect(
    useCallback(() => {
      fetchDocuments(true);
    }, [fetchDocuments])
  );

  const categoryTabs: (DocumentCategory | "전체")[] =
    categories.length > 0
      ? ["전체", ...(categories.map((category) => category.name) as DocumentCategory[])]
      : FALLBACK_CATEGORIES;

  const handleCatChange = (cat: DocumentCategory | "전체") => {
    setCatFilter(cat);
    setSelectedCategory(cat === "전체" ? null : cat);
  };

  const handleSelectSort = (value: SortBy) => {
    setSortBy(value);
    setSortMenuOpen(false);
  };

  const handleDocPress = (docId: string, isSecured: boolean) => {
    if (isSecured) {
      setPendingDocId(docId);
      setPinModalPurpose('view');
      setPinModalInput('');
      setPinModalError(false);
      setPinModalVisible(true);
    } else {
      router.push(`/document/${docId}` as any);
    }
  };

  const handleLockToggle = (docId: string, isSecured: boolean) => {
    if (isSecured) {
      // 보호 해제 시 PIN 확인
      setPendingDocId(docId);
      setPinModalPurpose('disable');
      setPinModalInput('');
      setPinModalError(false);
      setPinModalVisible(true);
    } else {
      // 보호 설정은 상세페이지에서만
      router.push(`/document/${docId}` as any);
    }
  };

  const PIN_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

  const handlePinDigit = async (digit: string) => {
    if (pinModalInput.length >= 6 || pinModalLoading) return;
    const next = pinModalInput + digit;
    setPinModalInput(next);
    setPinModalError(false);
    if (next.length === 6) {
      setPinModalLoading(true);
      const ok = storedPin ? next === storedPin : await verifyPinWithServer(next);
      setPinModalLoading(false);
      if (ok) {
        if (pinModalPurpose === 'disable' && pendingDocId) {
          toggleSecured(pendingDocId);
        }
        setPinModalVisible(false);
        setPinModalInput('');
        if (pinModalPurpose === 'view' && pendingDocId) {
          router.push(`/document/${pendingDocId}` as any);
        }
      } else {
        setPinModalError(true);
        setTimeout(() => { setPinModalInput(''); setPinModalError(false); }, 600);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "expiring_soon") {
      return <Badge label="만료 임박" variant="warning" />;
    }
    if (status === "expired") {
      return <Badge label="만료됨" variant="error" />;
    }
    return null;
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split("T")[0];
    return Math.ceil(
      (new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000,
    );
  };

  const docs = [...getFilteredDocuments()].sort((a, b) => {
    if (sortBy === "name") {
      return a.title.localeCompare(b.title, "ko");
    }
    if (sortBy === "expiry") {
      const aExp = a.expiryDate ?? "9999-12-31";
      const bExp = b.expiryDate ?? "9999-12-31";
      return aExp.localeCompare(bExp);
    }
    return b.uploadedAt.localeCompare(a.uploadedAt);
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>디지털 캐비닛</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{docs.length}개</Text>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortMenuOpen((v) => !v)}
          >
            <Ionicons name="funnel-outline" size={14} color={Colors.gray600} />
            <Text style={styles.sortBtnText}>{SORT_LABELS[sortBy]}</Text>
            <Ionicons
              name={sortMenuOpen ? "chevron-up" : "chevron-down"}
              size={13}
              color={Colors.gray500}
            />
          </TouchableOpacity>
        </View>
      </View>

      {sortMenuOpen && (
        <>
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setSortMenuOpen(false)}
          />
          <View style={styles.dropdown}>
            <Text style={styles.dropdownHeader}>정렬 기준</Text>
            {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([value, label]) => {
              const active = sortBy === value;
              const icons: Record<SortBy, string> = {
                recent: "time-outline",
                name: "text-outline",
                expiry: "calendar-outline",
              };
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => handleSelectSort(value)}
                >
                  <Ionicons
                    name={icons[value] as any}
                    size={16}
                    color={active ? Colors.primary : Colors.gray500}
                  />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      active && styles.dropdownItemTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} style={{ marginLeft: "auto" as any }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="문서 검색..."
            placeholderTextColor={Colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScrollView}
        contentContainerStyle={styles.catScroll}
      >
        {categoryTabs.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => handleCatChange(cat)}
            style={[styles.catChip, catFilter === cat && styles.catChipActive]}
          >
            <Text
              style={[
                styles.catChipText,
                catFilter === cat && styles.catChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </>
        ) : docs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIllus}>
              <View style={styles.emptyIllusCircle}>
                <Ionicons name="file-tray-full-outline" size={44} color={Colors.primarySoft} />
              </View>
              <View style={styles.emptyIllusBadge1}>
                <Ionicons name="document-text-outline" size={18} color={Colors.gray300} />
              </View>
              <View style={styles.emptyIllusBadge2}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.gray300} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>등록된 문서가 없습니다</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? `"${searchQuery}"에 해당하는 문서가 없어요`
                : catFilter !== "전체"
                ? `${catFilter} 카테고리에 문서가 없어요`
                : "카메라 버튼을 눌러 첫 번째 문서를 추가해보세요"}
            </Text>
          </View>
        ) : (
          docs.map((doc) => {
            const days = getDaysUntil(doc.expiryDate);

            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => handleDocPress(doc.id, !!doc.isSecured)}
              >
                <View style={styles.docLeft}>
                  <View style={styles.docIcon}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.gray500} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docCategory}>{doc.category}</Text>
                    {doc.expiryDate && (
                      <Text
                        style={[
                          styles.docExpiry,
                          days !== null && days <= 30 && styles.docExpiryUrgent,
                        ]}
                      >
                        만료: {doc.expiryDate}
                        {days !== null && days >= 0
                          ? ` (${days}일 후)`
                          : " (만료됨)"}
                      </Text>
                    )}
                    {doc.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {doc.tags.slice(0, 3).map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.docRight}>
                  {getStatusBadge(doc.status)}
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      handleLockToggle(doc.id, !!doc.isSecured);
                    }}
                    style={styles.favBtn}
                  >
                    <Ionicons
                      name={doc.isSecured ? "lock-closed" : "lock-open-outline"}
                      size={18}
                      color={doc.isSecured ? Colors.primary : Colors.gray300}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleFavorite(doc.id);
                    }}
                    style={styles.favBtn}
                  >
                    <Ionicons
                      name={doc.isFavorite ? "star" : "star-outline"}
                      size={20}
                      color={doc.isFavorite ? Colors.warning : Colors.gray300}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={pinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinCardTitle}>
              {pinModalPurpose === 'disable' ? 'PIN 보호 해제' : '보안 문서'}
            </Text>
            <Text style={styles.pinCardSub}>PIN 번호를 입력해주세요</Text>
            <View style={styles.pinDots}>
              {[0,1,2,3,4,5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pinModalInput.length > i && styles.pinDotFilled,
                    pinModalError && styles.pinDotError,
                  ]}
                />
              ))}
            </View>
            {pinModalError && <Text style={styles.pinErrorText}>PIN이 올바르지 않습니다</Text>}
            {pinModalLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
            ) : (
              <View style={styles.pinPad}>
                {PIN_ROWS.map((row, ri) => (
                  <View key={ri} style={styles.pinRow}>
                    {row.map((key) =>
                      key === '' ? (
                        <View key="empty" style={styles.pinKey} />
                      ) : key === 'del' ? (
                        <TouchableOpacity
                          key="del"
                          style={styles.pinKey}
                          onPress={() => setPinModalInput((p) => p.slice(0, -1))}
                        >
                          <Ionicons name="backspace-outline" size={22} color={Colors.gray700} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          key={key}
                          style={styles.pinKey}
                          onPress={() => handlePinDigit(key)}
                        >
                          <Text style={styles.pinKeyText}>{key}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.pinCancel} onPress={() => setPinModalVisible(false)}>
              <Text style={styles.pinCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  android: { elevation: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  headerCount: { fontSize: 14, color: Colors.gray500 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sortBtnText: { fontSize: 13, fontWeight: "500", color: Colors.gray700 },

  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  dropdown: {
    position: "absolute",
    top: 60,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    minWidth: 180,
    borderWidth: 1,
    borderColor: Colors.gray100,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  dropdownHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.sm,
    marginHorizontal: 4,
  },
  dropdownItemActive: { backgroundColor: Colors.primaryLight },
  dropdownItemText: { fontSize: 14, color: Colors.gray700 },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: "600" },

  searchRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray900,
    paddingVertical: 12,
  },

  catScrollView: { flexGrow: 0, maxHeight: 44 },
  catScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 6,
    paddingBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: { fontSize: 12, fontWeight: "500", color: Colors.gray600 },
  catChipTextActive: { color: Colors.white },

  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: TAB_BAR_SPACE,
  },

  docCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    ...cardShadow,
  },
  docLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    flex: 1,
  },
  docIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, gap: 3 },
  docTitle: { fontSize: 15, fontWeight: "600", color: Colors.gray900 },
  docCategory: { fontSize: 12, color: Colors.primary, fontWeight: "500" },
  docExpiry: { fontSize: 12, color: Colors.gray500 },
  docExpiryUrgent: { color: Colors.warning, fontWeight: "500" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  tag: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: Colors.gray500 },
  docRight: { alignItems: "flex-end", gap: Spacing.sm },
  favBtn: { padding: 2 },

  // Skeleton
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },
  skeletonLine: {
    height: 13,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },
  skeletonDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },

  // Empty state
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIllus: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyIllusCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIllusBadge1: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gray100,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  emptyIllusBadge2: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gray100,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray700 },
  emptyDesc: { fontSize: 14, color: Colors.gray400, textAlign: "center", lineHeight: 21 },

  pinOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  pinCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
    alignItems: "center",
    gap: Spacing.md,
  },
  pinCardTitle: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  pinCardSub: { fontSize: 14, color: Colors.gray500 },
  pinDots: { flexDirection: "row", gap: 16, marginVertical: Spacing.md },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.gray300, backgroundColor: "transparent" },
  pinDotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pinDotError: { borderColor: Colors.error, backgroundColor: Colors.error },
  pinErrorText: { fontSize: 13, color: Colors.error, marginTop: -Spacing.xs },
  pinPad: { width: "100%", maxWidth: 280, gap: 8, marginTop: Spacing.sm },
  pinRow: { flexDirection: "row", gap: 8 },
  pinKey: {
    flex: 1, height: 64, borderRadius: Radius.lg,
    backgroundColor: Colors.white, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.gray100,
  },
  pinKeyText: { fontSize: 22, fontWeight: "600", color: Colors.gray900 },
  pinCancel: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  pinCancelText: { fontSize: 15, color: Colors.gray500, fontWeight: "500" },
});
