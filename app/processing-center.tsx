// ─── upload-progress.tsx의 DEMO_MODE와 맞춰서 설정 ───────────────────────
const DEMO_MODE = false;

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  AiStatus,
  AiStatusResponse,
  TempDocumentListItem,
  getTempDocumentDetail,
  getTempDocumentList,
  getTempDocumentStatus,
  requestAiAnalysis,
} from '@/services/upload';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'all' | 'analyzing' | 'failed' | 'done';

interface ProcessingItem {
  tempDocumentId: string;
  status: AiStatus;
  resultId?: string | null;
  resultDocumentId?: string | null; // OCR 완료 후 생성된 실제 문서 ID
  documentType?: string | null;
  uploadedAtDate: string;
  uploadedAtTime: string;
}

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'analyzing', label: '분석 중' },
  { key: 'failed',    label: '분석 실패' },
  { key: 'done',      label: '등록 완료' },
];

function statusLabel(status: AiStatus) {
  switch (status) {
    case 'PENDING':    return '대기 중';
    case 'PROCESSING': return '분석 중';
    case 'DONE':       return '등록 완료';
    case 'FAILED':     return '분석 실패';
  }
}

function itemMatchesTab(item: ProcessingItem, tab: TabKey) {
  if (tab === 'all') return true;
  if (tab === 'analyzing') return item.status === 'PENDING' || item.status === 'PROCESSING';
  if (tab === 'failed')    return item.status === 'FAILED';
  if (tab === 'done')      return item.status === 'DONE';
  return true;
}

function toProcessingItem(item: TempDocumentListItem): ProcessingItem {
  const createdAt = new Date(item.createdAt);
  const hasValidDate = !Number.isNaN(createdAt.getTime());
  return {
    tempDocumentId: item.tempDocumentId,
    status: item.aiStatus,
    resultId: item.resultId ?? item.resultDocumentId ?? null,
    resultDocumentId: item.resultDocumentId ?? null,
    documentType: item.documentType ?? null,
    uploadedAtDate: hasValidDate
      ? createdAt.toLocaleDateString('ko-KR')
      : '-',
    uploadedAtTime: hasValidDate
      ? createdAt.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '-',
  };
}

export default function ProcessingCenterScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { fetchDocuments } = useDocStore();
  // 화면 진입 시점의 문서 ID 스냅샷 → DONE 후 새 문서 식별에 사용
  const existingDocIdsRef = useRef<Set<string>>(
    new Set(useDocStore.getState().documents.map((d) => d.id))
  );

  const tempIds: string[] = (() => {
    try { return ids ? JSON.parse(ids) : []; } catch { return []; }
  })();

  const nowDate = new Date().toLocaleDateString('ko-KR');
  const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const [items, setItems] = useState<ProcessingItem[]>(() =>
    tempIds.map((id) => ({
      tempDocumentId: id,
      status: 'PROCESSING' as AiStatus,
      uploadedAtDate: nowDate,
      uploadedAtTime: nowTime,
    }))
  );
  const [tab, setTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 완료 후 문서 조회를 딱 한 번만 실행하는 가드
  const completionFetchedRef = useRef(false);

  useEffect(() => {
    let active = true;
    getTempDocumentList()
      .then((tempList) => {
        if (!active) return;
        setItems((previous) => {
          const restored = tempList.map(toProcessingItem);
          const restoredIds = new Set(
            restored.map((item) => item.tempDocumentId),
          );
          return [
            ...restored,
            ...previous.filter(
              (item) => !restoredIds.has(item.tempDocumentId),
            ),
          ];
        });
      })
      .catch((error) => {
        console.log('처리센터 임시 문서 복원 실패:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    if (DEMO_MODE) {
      // 데모: 3초 후 모두 DONE으로 전환
      await new Promise<void>((r) => setTimeout(r, 1500));
      setItems((prev) => prev.map((it) => ({ ...it, status: 'DONE' as AiStatus })));
    } else {
      await Promise.allSettled(
        items.map(async (item) => {
          if (item.status === 'DONE' || item.status === 'FAILED') return;
          try {
            const res: AiStatusResponse = await getTempDocumentStatus(item.tempDocumentId);
            setItems((prev) =>
              prev.map((it) =>
                it.tempDocumentId === item.tempDocumentId
                  ? { ...it, status: res.aiStatus, resultId: res.resultId, documentType: res.documentType }
                  : it
              )
            );
          } catch {}
        })
      );
    }
    setRefreshing(false);
  }, [items]);

  // 자동 폴링 (5초 간격, 미완료 항목이 있을 때만)
  useEffect(() => {
    const hasPending = items.some(
      (it) => it.status === 'PENDING' || it.status === 'PROCESSING'
    );
    if (!hasPending) {
      if (pollRef.current) clearInterval(pollRef.current);
      // guard: setItems → items 변경 → 이펙트 재실행 → 무한루프 방지
      if (!DEMO_MODE && !completionFetchedRef.current) {
        completionFetchedRef.current = true;
        // temp doc의 createdAt을 가져와서 가장 가까운 새 문서와 매칭
        getTempDocumentList().then((tempList) =>
          fetchDocuments().then(() => {
            const newDocs = useDocStore.getState().documents.filter(
              (d) => !existingDocIdsRef.current.has(d.id)
            );
            if (newDocs.length === 0) return;
            setItems((prev) =>
              prev.map((it) => {
                if (it.status !== 'DONE' || it.resultDocumentId) return it;
                const tempInfo = tempList.find((t) => t.tempDocumentId === it.tempDocumentId);
                if (!tempInfo) return { ...it, resultDocumentId: newDocs[0]?.id ?? null };
                const tempTime = new Date(tempInfo.createdAt).getTime();
                const closest = newDocs.reduce((best, doc) => {
                  const dt = Math.abs(new Date(doc.uploadedAt).getTime() - tempTime);
                  const db = Math.abs(new Date(best.uploadedAt).getTime() - tempTime);
                  return dt < db ? doc : best;
                });
                return { ...it, resultDocumentId: closest?.id ?? null };
              })
            );
          })
        );
      }
      return;
    }
    // 대기 항목이 다시 생기면 가드 리셋
    completionFetchedRef.current = false;
    pollRef.current = setInterval(() => refresh(), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [items]);

  const filtered = items.filter((it) => itemMatchesTab(it, tab));

  const countAll      = items.length;
  const countAnalyzing= items.filter((it) => it.status === 'PENDING' || it.status === 'PROCESSING').length;
  const countFailed   = items.filter((it) => it.status === 'FAILED').length;
  const countDone     = items.filter((it) => it.status === 'DONE').length;

  const statCards: { label: string; count: number; sub: string; accent?: string }[] = [
    { label: '전체 문서',  count: countAll,       sub: '업로드된 전체 문서' },
    { label: '분석 중',    count: countAnalyzing,  sub: 'AI 분석 진행 중', accent: Colors.primary },
    { label: '분석 실패',  count: countFailed,     sub: '재시도 필요', accent: Colors.error },
    { label: '등록 완료',  count: countDone,       sub: '저장 완료 문서', accent: Colors.success },
  ];

  const handleItemPress = (item: ProcessingItem) => {
    if (item.status !== 'DONE') return;
    if (item.resultDocumentId) {
      router.push(`/document/${item.resultDocumentId}` as any);
    }
  };

  const handleRetry = async (tempDocumentId: string) => {
    // FAILED → PROCESSING으로 즉시 낙관적 업데이트
    setItems((prev) =>
      prev.map((it) =>
        it.tempDocumentId === tempDocumentId ? { ...it, status: 'PROCESSING' as AiStatus } : it
      )
    );
    try {
      const found = await getTempDocumentDetail(tempDocumentId).catch(async () => {
        const list = await getTempDocumentList();
        return list.find((it) => it.tempDocumentId === tempDocumentId);
      });
      if (!found || found.files.length === 0) throw new Error('파일 정보를 찾을 수 없습니다.');
      await requestAiAnalysis(
        tempDocumentId,
        found.files.map((f) => ({ id: f.id, pageNo: f.pageNo })),
      );
    } catch {
      // 실패 시 원복
      setItems((prev) =>
        prev.map((it) =>
          it.tempDocumentId === tempDocumentId ? { ...it, status: 'FAILED' as AiStatus } : it
        )
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.gray700} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>처리 센터</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        {/* 통계 카드 2×2 */}
        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <View key={card.label} style={styles.statCard}>
              <Text style={[styles.statCount, card.accent && { color: card.accent }]}>
                {card.count}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statSub}>{card.sub}</Text>
            </View>
          ))}
        </View>

        {/* 탭 필터 */}
        <View style={styles.tabBar}>
          {TAB_LABELS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, tab === key && styles.tabItemActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 문서 목록 */}
        <View style={styles.table}>
          {/* 컬럼 헤더 */}
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.colHeader, { flex: 1 }]}>문서명</Text>
            <Text style={[styles.colHeader, { width: 80, textAlign: 'center' }]}>업로드 시간</Text>
            <Text style={[styles.colHeader, { width: 72, textAlign: 'center' }]}>상태</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>해당하는 문서가 없습니다.</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const isNavigable = item.status === 'DONE' && !!item.resultDocumentId;
              return (
                <TouchableOpacity
                  key={item.tempDocumentId}
                  style={styles.tableRow}
                  onPress={() => handleItemPress(item)}
                  disabled={!isNavigable}
                  activeOpacity={isNavigable ? 0.7 : 1}
                >
                  <View style={styles.docNameCell}>
                    <View style={styles.docIcon}>
                      <Ionicons name="document-text-outline" size={18} color={Colors.gray500} />
                    </View>
                    <Text style={styles.docName} numberOfLines={1}>
                      {item.documentType === 'RECEIPT' ? '영수증' : '문서'}
                    </Text>
                  </View>
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <Text style={styles.colVal}>{item.uploadedAtDate}</Text>
                    <Text style={styles.colVal}>{item.uploadedAtTime}</Text>
                  </View>
                  <View style={{ width: 72, alignItems: 'center' }}>
                    {item.status === 'FAILED' ? (
                      <TouchableOpacity
                        onPress={() => handleRetry(item.tempDocumentId)}
                        style={styles.retryBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="refresh-outline" size={12} color={Colors.error} />
                        <Text style={styles.retryBtnText}>재시도</Text>
                      </TouchableOpacity>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Text style={styles.totalLabel}>전체 {filtered.length}건</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: AiStatus }) {
  const configs: Record<AiStatus, { label: string; bg: string; color: string }> = {
    PENDING:    { label: '대기 중',   bg: Colors.primaryLight, color: Colors.primary },
    PROCESSING: { label: '분석 중',   bg: Colors.primaryLight, color: Colors.primary },
    DONE:       { label: '등록 완료', bg: Colors.successLight,  color: Colors.success },
    FAILED:     { label: '분석 실패', bg: Colors.errorLight,    color: Colors.error },
  };
  const c = configs[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {(status === 'PENDING' || status === 'PROCESSING') && (
        <ActivityIndicator size={9} color={c.color} style={{ marginRight: 3 }} />
      )}
      <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: 6 },
  refreshBtn: { padding: 6 },
  headerSub: { fontSize: 11, color: Colors.gray400 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  statCount: { fontSize: 28, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 14, fontWeight: '600', color: Colors.gray700 },
  statSub:   { fontSize: 11, color: Colors.gray400 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 4,
    gap: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  tabItem: {
    flex: 1, paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabItemActive: { backgroundColor: Colors.gray900 },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.gray500 },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  table: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  tableRowHeader: { backgroundColor: Colors.gray50 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  colHeader: { fontSize: 12, fontWeight: '600', color: Colors.gray400 },
  colVal: { fontSize: 12, color: Colors.gray600 },

  docNameCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  docIcon: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  docName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.gray900 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  emptyRow: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.gray400 },
  totalLabel: {
    fontSize: 12, color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryBtnText: { fontSize: 11, fontWeight: '600', color: Colors.error },
});
