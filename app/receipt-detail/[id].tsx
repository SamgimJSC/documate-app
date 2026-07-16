import { Badge } from "@/components/common/badge";
import { Receipt } from "@/constants/mock-data";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  deleteReceipt,
  getReceiptDetail,
  updateReceipt as updateReceiptApi,
} from "@/services/receipts";
import {
  getSpendCategories,
  SpendCategory,
} from "@/services/spend-categories";
import { useReceiptStore } from "@/stores/receipt-store";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

type EditForm = {
  storeName: string;
  amount: string;
  date: string;
  categoryId: number | null;
  paymentItem: string;
  memo: string;
};

function formatWon(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString()}원`;
}

function formatPaymentItem(value?: string) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return trimmed;

  try {
    const normalized = trimmed
      .replace(/'/g, '"')
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false");
    const items = JSON.parse(normalized) as Array<{
      name?: string;
      quantity?: number | null;
      price?: number | null;
    }>;

    return items
      .map((item) => {
        if (!item.name) return "";
        const quantity = item.quantity ? ` x${item.quantity}` : "";
        const price = item.price ? ` · ${formatWon(item.price)}` : "";
        return `${item.name}${quantity}${price}`;
      })
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

function getSpendCategoryId(category: SpendCategory): number | undefined {
  return category.spendCategoryId ?? category.categoryId;
}

function toForm(
  receipt: Receipt,
  categories: SpendCategory[] = [],
): EditForm {
  const categoryList = Array.isArray(categories) ? categories : [];
  const matchedCategory = categoryList.find(
    (category) => category.name === receipt.category,
  );

  return {
    storeName: receipt.storeName,
    amount: String(receipt.amount || ""),
    date: receipt.date,
    categoryId:
      receipt.spendCategoryId ??
      (matchedCategory ? getSpendCategoryId(matchedCategory) ?? null : null),
    paymentItem: receipt.paymentItem ?? "",
    memo: receipt.memo ?? "",
  };
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    receipts,
    removeReceipt,
    updateReceipt,
  } = useReceiptStore();

  const receiptFromStore = receipts.find((r) => r.id === id);
  const [receipt, setReceipt] = useState<Receipt | undefined>(receiptFromStore);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [editVisible, setEditVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [spendCategories, setSpendCategories] = useState<SpendCategory[]>([]);
  const [form, setForm] = useState<EditForm>(
    receiptFromStore ? toForm(receiptFromStore) : {
      storeName: "",
      amount: "",
      date: "",
      categoryId: null,
      paymentItem: "",
      memo: "",
    },
  );

  useEffect(() => {
    let mounted = true;

    void getSpendCategories()
      .then((categories) => {
        if (mounted) {
          setSpendCategories(Array.isArray(categories) ? categories : []);
        }
      })
      .catch((error) => {
        console.log("소비 카테고리 조회 실패:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const categoryList = Array.isArray(spendCategories)
      ? spendCategories
      : [];
    if (!receipt || form.categoryId !== null || categoryList.length === 0) {
      return;
    }

    const matchedCategory = categoryList.find(
      (category) => category.name === receipt.category,
    );
    const categoryId = matchedCategory
      ? getSpendCategoryId(matchedCategory)
      : undefined;
    if (categoryId !== undefined) {
      setForm((current) => ({ ...current, categoryId }));
    }
  }, [form.categoryId, receipt, spendCategories]);

  useEffect(() => {
    let mounted = true;

    if (!id) return;

    setIsLoading(true);
    getReceiptDetail(id)
      .then((data) => {
        if (!mounted) return;
        const merged = receiptFromStore ? { ...receiptFromStore, ...data } : data;
        setReceipt(merged);
        setForm(toForm(merged));
        updateReceipt(merged);
      })
      .catch(() => {
        if (!mounted && receiptFromStore) return;
        if (receiptFromStore) {
          setReceipt(receiptFromStore);
          setForm(toForm(receiptFromStore));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const paymentItemText = useMemo(
    () => formatPaymentItem(receipt?.paymentItem),
    [receipt?.paymentItem],
  );

  const handleDelete = () => {
    if (!receipt) return;

    Alert.alert("영수증 삭제", "이 영수증을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReceipt(receipt.id);
          } catch (error) {
            console.error("영수증 삭제 실패:", error);
          } finally {
            removeReceipt(receipt.id);
            router.back();
          }
        },
      },
    ]);
  };

  const openEdit = () => {
    if (!receipt) return;
    setForm(toForm(receipt, spendCategories));
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!receipt) return;

    const amount = Number(form.amount.replace(/,/g, ""));
    if (!form.storeName.trim()) {
      Alert.alert("입력 확인", "가게명을 입력해주세요.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert("입력 확인", "결제 금액을 숫자로 입력해주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      Alert.alert("입력 확인", "결제일은 YYYY-MM-DD 형식으로 입력해주세요.");
      return;
    }
    if (form.categoryId === null) {
      Alert.alert("입력 확인", "카테고리를 선택해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await updateReceiptApi(receipt.id, {
        storeName: form.storeName.trim(),
        totalAmount: amount,
        purchaseDate: form.date.trim(),
        spendCategoryId: form.categoryId,
        paymentItem: form.paymentItem.trim() || undefined,
        memo: form.memo.trim() || undefined,
      });
      const categoryList = Array.isArray(spendCategories)
        ? spendCategories
        : [];
      const selectedCategory = categoryList.find(
        (category) => getSpendCategoryId(category) === form.categoryId,
      );
      const merged = {
        ...receipt,
        ...saved,
        spendCategoryId: form.categoryId,
        category: (selectedCategory?.name ?? saved.category) as Receipt["category"],
      };
      setReceipt(merged);
      updateReceipt(merged);
      setEditVisible(false);
    } catch (error) {
      console.error("영수증 수정 실패:", error);
      Alert.alert("수정 실패", "영수증 정보를 수정하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !receipt) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={Colors.gray300} />
          <Text style={styles.notFoundText}>영수증을 찾을 수 없습니다.</Text>
          <TouchableOpacity style={styles.primaryPill} onPress={() => router.back()}>
            <Text style={styles.primaryPillText}>목록으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={23} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>영수증 상세</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openEdit} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={22} color={Colors.gray700} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>영수증 미리보기</Text>
            {receipt.imageUri ? (
              <Text style={styles.cardMeta}>이미지 첨부됨</Text>
            ) : null}
          </View>
          <View style={styles.previewBody}>
            {receipt.imageUri ? (
              <Image
                source={{ uri: receipt.imageUri }}
                style={styles.receiptImage}
                contentFit="contain"
                transition={150}
              />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="receipt-outline" size={42} color={Colors.gray300} />
                <Text style={styles.noImageText}>영수증 이미지 없음</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHero}>
            <View style={styles.receiptBadge}>
              <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.storeName}>{receipt.storeName || "이름 없는 영수증"}</Text>
              <Text style={styles.dateText}>{receipt.date}</Text>
            </View>
            <Text style={styles.amount}>{formatWon(receipt.amount)}</Text>
          </View>

          <View style={styles.detailTable}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>가게명</Text>
              <Text style={styles.detailValue}>{receipt.storeName || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>결제 금액</Text>
              <Text style={[styles.detailValue, styles.amountValue]}>
                {formatWon(receipt.amount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>결제일</Text>
              <Text style={styles.detailValue}>{receipt.date || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>카테고리</Text>
              <View style={styles.detailValueWrap}>
                <Badge label={receipt.category || "기타"} variant="info" />
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>입력 방식</Text>
              <Text style={styles.detailValue}>
                {receipt.inputMethod === "OCR" ? "OCR 스캔" : "직접 입력"}
              </Text>
            </View>
            {receipt.storeAddress ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>주소</Text>
                <Text style={styles.detailValue}>{receipt.storeAddress}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {paymentItemText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 항목</Text>
            <Text style={styles.bodyText}>{paymentItemText}</Text>
          </View>
        ) : receipt.items && receipt.items.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 항목</Text>
            <View style={styles.itemList}>
              {receipt.items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{formatWon(item.price)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {receipt.memo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>메모</Text>
            <Text style={styles.bodyText}>{receipt.memo}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>영수증 수정</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>가게명</Text>
                <TextInput
                  value={form.storeName}
                  onChangeText={(storeName) => setForm((prev) => ({ ...prev, storeName }))}
                  style={styles.input}
                  placeholder="가게명"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>결제 금액</Text>
                <TextInput
                  value={form.amount}
                  onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>결제일</Text>
                <TextInput
                  value={form.date}
                  onChangeText={(date) => setForm((prev) => ({ ...prev, date }))}
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>카테고리</Text>
                {Array.isArray(spendCategories) && spendCategories.length > 0 ? (
                  <View style={styles.categoryChipRow}>
                    {spendCategories.map((category) => {
                      const categoryId = getSpendCategoryId(category);
                      if (categoryId === undefined) return null;
                      const selected = form.categoryId === categoryId;

                      return (
                        <TouchableOpacity
                          key={categoryId}
                          style={[
                            styles.categoryChip,
                            selected && styles.categoryChipSelected,
                          ]}
                          onPress={() =>
                            setForm((current) => ({
                              ...current,
                              categoryId,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              selected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.categoryLoadingText}>
                    카테고리를 불러오는 중이에요.
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>결제 항목</Text>
                <TextInput
                  value={form.paymentItem}
                  onChangeText={(paymentItem) =>
                    setForm((prev) => ({ ...prev, paymentItem }))
                  }
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  placeholder="결제 항목"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>메모</Text>
                <TextInput
                  value={form.memo}
                  onChangeText={(memo) => setForm((prev) => ({ ...prev, memo }))}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  placeholder="메모"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => setEditVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.secondaryBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  notFoundText: { fontSize: 16, color: Colors.gray500 },
  primaryPill: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primaryPillText: { color: Colors.white, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  iconBtn: { padding: Spacing.xs },
  headerTitle: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: 16,
    fontWeight: "800",
    color: Colors.gray900,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  previewCard: {
    overflow: "hidden",
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: Colors.gray900 },
  cardMeta: { fontSize: 12, color: Colors.gray400 },
  previewBody: {
    minHeight: 260,
    backgroundColor: Colors.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptImage: { width: "100%", height: 360 },
  noImage: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  noImageText: { fontSize: 13, color: Colors.gray400 },
  infoCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.lg,
    ...cardShadow,
  },
  infoHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  receiptBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  heroText: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 18, fontWeight: "800", color: Colors.gray900 },
  dateText: { marginTop: 2, fontSize: 12, color: Colors.gray400 },
  amount: { fontSize: 18, fontWeight: "900", color: Colors.primary },
  detailTable: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
  },
  detailRow: {
    flexDirection: "row",
    minHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  detailLabel: {
    width: 92,
    padding: Spacing.sm,
    backgroundColor: Colors.gray50,
    fontSize: 12,
    color: Colors.gray500,
  },
  detailValue: {
    flex: 1,
    padding: Spacing.sm,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.gray800,
  },
  detailValueWrap: { flex: 1, padding: Spacing.sm, alignItems: "flex-start" },
  amountValue: { color: Colors.gray900, fontWeight: "900" },
  section: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...cardShadow,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.gray900 },
  bodyText: { fontSize: 14, lineHeight: 22, color: Colors.gray700 },
  itemList: { gap: Spacing.sm },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  itemName: { flex: 1, fontSize: 14, color: Colors.gray700 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: Colors.gray800 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: Spacing.lg,
  },
  modalCard: {
    maxHeight: "88%",
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: Colors.gray900 },
  modalScroll: { maxHeight: 430 },
  modalContent: { padding: Spacing.lg, gap: Spacing.md },
  field: { gap: Spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: Colors.gray700 },
  categoryChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
  },
  categoryChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSub,
  },
  categoryChipTextSelected: { color: Colors.primaryDark },
  categoryLoadingText: { fontSize: 12, color: Colors.muted },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.gray900,
    backgroundColor: Colors.white,
  },
  multilineInput: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: { backgroundColor: Colors.gray100 },
  primaryBtn: { backgroundColor: Colors.primary },
  secondaryBtnText: { fontSize: 14, fontWeight: "800", color: Colors.gray600 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: Colors.white },
});
