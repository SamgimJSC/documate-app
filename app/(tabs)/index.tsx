import { Badge } from '@/components/common/badge';
import { Colors, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { getServerNotifications } from '@/services/notifications';
import { getTempDocumentList } from '@/services/upload';
import { useAuthStore } from '@/stores/auth-store';
import { useDocStore } from '@/stores/doc-store';
import { useReceiptStore } from '@/stores/receipt-store';
import { showToast } from '@/stores/toast-store';
import { formatStorageUsed } from '@/utils/storage-usage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HomeTab = 'recent' | 'favorite';

function SkeletonDocItem() {
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
    <Animated.View style={[styles.docItem, { opacity }]}>
      <View style={styles.skeletonIcon} />
      <View style={styles.docInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '45%', height: 10, marginTop: 4 }]} />
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const documents = useDocStore((s) => s.documents);
  const fetchDocuments = useDocStore((s) => s.fetchDocuments);
  const isDocsLoading = useDocStore((s) => s.isLoading);
  const getTotalForMonth = useReceiptStore((s) => s.getTotalForMonth);
  const fetchReceipts = useReceiptStore((s) => s.fetchReceipts);
  const [activeTab, setActiveTab] = useState<HomeTab>('recent');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    fetchDocuments();
    fetchReceipts();
  }, [fetchDocuments, fetchReceipts]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getServerNotifications({ status: 'all', page: 1, per_page: 100 })
        .then((notifications) => {
          if (active) {
            setUnreadNotificationCount(
              notifications.filter((item) => !item.isRead).length,
            );
          }
        })
        .catch((error) => {
          console.log('읽지 않은 알림 수 조회 실패:', error);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);
  const monthlyTotal = getTotalForMonth(currentMonth);

  const expiringDocs = documents
    .filter((d) => d.status === 'expiring_soon' || d.status === 'expired')
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));

  const displayedDocs = activeTab === 'recent'
    ? [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5)
    : documents.filter((d) => d.isFavorite).slice(0, 5);

  const storageUsed = user?.storageUsed ?? null;
  const storageLimit = user?.storageLimit;
  const storagePercent = storageUsed !== null && storageLimit
    ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
    : 0;

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    return diff;
  };

  const [processingCount, setProcessingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getTempDocumentList()
      .then((list) => setProcessingCount(list.filter((d) => d.aiStatus === 'PENDING' || d.aiStatus === 'PROCESSING').length))
      .catch(() => {});
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDocuments(),
      fetchReceipts(),
      getTempDocumentList()
        .then((list) => setProcessingCount(list.filter((d) => d.aiStatus === 'PENDING' || d.aiStatus === 'PROCESSING').length))
        .catch(() => {}),
    ]);
    setRefreshing(false);
  }, [fetchDocuments, fetchReceipts]);

  const handleProcessingCenter = async () => {
    try {
      const list = await getTempDocumentList();
      const active = list.filter((d) => d.aiStatus === 'PENDING' || d.aiStatus === 'PROCESSING');
      setProcessingCount(active.length);
      if (active.length > 0) {
        router.push('/processing-center' as any);
      } else {
        showToast('처리 중인 문서가 없습니다.', 'info');
      }
    } catch {
      router.push('/processing-center' as any);
    }
  };


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요, {user?.nickname ?? ''}님</Text>
          <Text style={styles.subGreeting}>오늘도 스마트하게 관리하세요</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleProcessingCenter} style={styles.notifBtn}>
            <Ionicons name="document-text-outline" size={24} color={Colors.white} />
            {processingCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifCount}>{processingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notification' as any)} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifCount}>
                  {Math.min(unreadNotificationCount, 99)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* 스토리지 카드 */}
        <View style={styles.storageCard}>
          <View style={styles.storageTop}>
            <Text style={styles.storageLabel}>스토리지 사용량</Text>
            <Text style={styles.storagePlan}>{user?.plan === 'pro' ? 'Pro' : 'Free'}</Text>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageBarFill, { width: `${storagePercent}%` as any }]} />
          </View>
          <Text style={styles.storageText}>
            {storageUsed !== null && storageLimit !== undefined
              ? `${formatStorageUsed(storageUsed)} / ${storageLimit}GB 사용 중`
              : "서버 저장용량 정보 없음"}
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
                    <Ionicons name="document-text-outline" size={22} color={Colors.gray500} />
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

          {isDocsLoading ? (
            <View style={styles.docList}>
              {[1, 2, 3].map((i) => <SkeletonDocItem key={i} />)}
            </View>
          ) : displayedDocs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'favorite' ? '즐겨찾기한 문서가 없습니다' : '문서가 없습니다'}
              </Text>
              {activeTab === 'recent' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/camera' as any)}
                >
                  <Ionicons name="add" size={18} color={Colors.white} />
                  <Text style={styles.emptyBtnText}>문서 추가하기</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.docList}>
              {displayedDocs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.docItem}
                  onPress={() => router.push(`/document/${doc.id}` as any)}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.gray500} />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
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
  expiringIcon: {},
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
  docIcon: {},
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  docMeta: { fontSize: 12, color: Colors.gray500 },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: Spacing.xs },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  empty: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.gray400 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  skeletonIcon: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.gray200 },
  skeletonLine: { height: 14, width: '65%', backgroundColor: Colors.gray200, borderRadius: Radius.sm },
});
