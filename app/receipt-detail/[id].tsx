import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Badge } from '@/components/common/badge';
import { useReceiptStore } from '@/stores/receipt-store';

const CATEGORY_ICONS: Record<string, string> = {
  '식비': '🍽️', '마트/편의점': '🛒', '카페': '☕',
  '뷰티/건강': '💄', '교통': '🚌', '통신': '📱',
  '구독': '📺', '기타': '🧾',
};

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { receipts, removeReceipt, toggleFavorite } = useReceiptStore();
  const receipt = receipts.find((r) => r.id === id);

  if (!receipt) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>영수증을 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('영수증 삭제', '이 영수증을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { removeReceipt(receipt.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>영수증 상세</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => toggleFavorite(receipt.id)} style={styles.headerBtn}>
            <Ionicons name={receipt.isFavorite ? 'star' : 'star-outline'} size={22} color={receipt.isFavorite ? Colors.warning : Colors.gray400} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <Text style={styles.topIcon}>{CATEGORY_ICONS[receipt.category] ?? '🧾'}</Text>
          <Text style={styles.storeName}>{receipt.storeName}</Text>
          <Text style={styles.amount}>{receipt.amount.toLocaleString()}원</Text>
          <Text style={styles.date}>{receipt.date}</Text>
          <Badge label={receipt.category} variant="info" />
        </View>

        {receipt.items && receipt.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>품목 내역</Text>
            <View style={styles.itemList}>
              {receipt.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()}원</Text>
                </View>
              ))}
              <View style={[styles.itemRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>합계</Text>
                <Text style={styles.totalAmount}>{receipt.amount.toLocaleString()}원</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText: { fontSize: 16, color: Colors.gray500 },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.gray900, marginLeft: Spacing.xs },
  headerActions: { flexDirection: 'row' },
  headerBtn: { padding: Spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg },
  topCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  topIcon: { fontSize: 48 },
  storeName: { fontSize: 20, fontWeight: '700', color: Colors.gray900 },
  amount: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  date: { fontSize: 14, color: Colors.gray400 },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  itemList: { gap: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 14, color: Colors.gray700 },
  itemPrice: { fontSize: 14, color: Colors.gray800, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.gray200, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  totalAmount: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
