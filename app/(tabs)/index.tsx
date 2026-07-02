import { Badge } from '@/components/common/badge';
import { Colors, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useDocStore } from '@/stores/doc-store';
import { useReceiptStore } from '@/stores/receipt-store';
import { calculateStorageUsedGb, formatStorageUsed } from '@/utils/storage-usage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HomeTab = 'recent' | 'favorite';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const documents = useDocStore((s) => s.documents);
  const fetchDocuments = useDocStore((s) => s.fetchDocuments);
  const getTotalForMonth = useReceiptStore((s) => s.getTotalForMonth);
  const receipts = useReceiptStore((s) => s.receipts);
  const fetchReceipts = useReceiptStore((s) => s.fetchReceipts);
  const [activeTab, setActiveTab] = useState<HomeTab>('recent');

  useEffect(() => {
    fetchDocuments();
    fetchReceipts();
  }, [fetchDocuments, fetchReceipts]);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);
  const monthlyTotal = getTotalForMonth(currentMonth);

  const expiringDocs = documents
    .filter((d) => d.status === 'expiring_soon' || d.status === 'expired')
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));

  const displayedDocs = activeTab === 'recent'
    ? [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5)
    : documents.filter((d) => d.isFavorite).slice(0, 5);

  const storageUsed = calculateStorageUsedGb(
    documents,
    receipts,
    user?.storageUsed ?? 0,
  );
  const storagePercent = user
    ? Math.round((storageUsed / user.storageLimit) * 100)
    : 0;

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    return diff;
  };

  const categoryIcons: Record<string, string> = {
    '계약서': '📄',
    '보증서': '🛡️',
    '처방전': '💊',
    '보험서류': '🏥',
    '기타': '📁',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요, {user?.nickname ?? ''}님 👋</Text>
          <Text style={styles.subGreeting}>오늘도 스마트하게 관리하세요</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notification' as any)} style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
          {expiringDocs.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifCount}>{expiringDocs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 스토리지 카드 */}
        <View style={styles.storageCard}>
          <View style={styles.storageTop}>
            <Text style={styles.storageLabel}>스토리지 사용량</Text>
            <Text style={styles.storagePlan}>{user?.plan === 'pro' ? '🔷 Pro' : 'Free'}</Text>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageBarFill, { width: `${storagePercent}%` as any }]} />
          </View>
          <Text style={styles.storageText}>
            {formatStorageUsed(storageUsed)} / {user?.storageLimit}GB 사용 중
          </Text>
        </View>

        {/* 다가오는 일정 */}
        {expiringDocs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <Text style={styles.sectionTitle}>만료 임박 서류</Text>
            </View>
            <View style={styles.expiringList}>
              {expiringDocs.map((doc) => {
                const days = getDaysUntil(doc.expiryDate);
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.expiringItem}
                    onPress={() => router.push(`/document/${doc.id}` as any)}>
                    <Text style={styles.expiringIcon}>{categoryIcons[doc.category] ?? '📄'}</Text>
                    <View style={styles.expiringInfo}>
                      <Text style={styles.expiringTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.expiringDate}>
                        {days !== null && days <= 0 ? '이미 만료됨' : `${days}일 후 만료`}
                      </Text>
                    </View>
                    <Badge
                      label={days !== null && days <= 0 ? '만료' : '임박'}
                      variant={days !== null && days <= 0 ? 'error' : 'warning'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 이번 달 지출 요약 */}
        <TouchableOpacity
          style={styles.spendingCard}
          onPress={() => router.push('/(tabs)/receipt' as any)}>
          <View>
            <Text style={styles.spendingLabel}>이번 달 총 지출</Text>
            <Text style={styles.spendingAmount}>
              {monthlyTotal.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.spendingRight}>
            <Ionicons name="receipt-outline" size={28} color={Colors.primary} />
            <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
          </View>
        </TouchableOpacity>

        {/* 문서 목록 */}
        <View style={styles.section}>
          <View style={styles.docTabRow}>
            {(['recent', 'favorite'] as HomeTab[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTab(t)}
                style={[styles.docTab, activeTab === t && styles.docTabActive]}>
                <Text style={[styles.docTabText, activeTab === t && styles.docTabTextActive]}>
                  {t === 'recent' ? '최근 업로드' : '즐겨찾기'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {displayedDocs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>문서가 없습니다</Text>
            </View>
          ) : (
            <View style={styles.docList}>
              {displayedDocs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.docItem}
                  onPress={() => router.push(`/document/${doc.id}` as any)}>
                  <Text style={styles.docIcon}>{categoryIcons[doc.category] ?? '📄'}</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                    <Text style={styles.docMeta}>{doc.category} · {doc.uploadedAt}</Text>
                  </View>
                  {doc.isFavorite && (
                    <Ionicons name="star" size={16} color={Colors.warning} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/(tabs)/cabinet' as any)}>
            <Text style={styles.viewAllText}>전체 보기</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet;
const styles = S.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: Colors.white },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  notifBtn: { position: 'relative', padding: Spacing.xs },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCount: { fontSize: 10, fontWeight: '700', color: Colors.white },
  scroll: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: TAB_BAR_SPACE },

  storageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  storageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  storageLabel: { fontSize: 14, color: Colors.gray600 },
  storagePlan: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  storageBar: { height: 8, backgroundColor: Colors.gray200, borderRadius: Radius.full, overflow: 'hidden' },
  storageBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  storageText: { fontSize: 12, color: Colors.gray500 },

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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },

  expiringList: { gap: Spacing.sm },
  expiringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  expiringIcon: { fontSize: 24 },
  expiringInfo: { flex: 1 },
  expiringTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  expiringDate: { fontSize: 12, color: Colors.gray500 },

  spendingCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingLabel: { fontSize: 13, color: Colors.primary },
  spendingAmount: { fontSize: 24, fontWeight: '700', color: Colors.primaryDark },
  spendingRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },

  docTabRow: { flexDirection: 'row', gap: Spacing.sm },
  docTab: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  docTabActive: { backgroundColor: Colors.primary },
  docTabText: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
  docTabTextActive: { color: Colors.white },

  docList: { gap: Spacing.sm },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  docIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  docMeta: { fontSize: 12, color: Colors.gray500 },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: Spacing.xs },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  empty: { padding: Spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.gray400 },
});
