import { Badge } from '@/components/common/badge';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { downloadPdf } from '@/services/download';
import {
  DocumentAlert,
  cancelNotification,
  deleteAlert,
  getDocumentAlerts,
  updateAlert,
} from '@/services/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { useDocStore } from '@/stores/doc-store';
import { showToast } from '@/stores/toast-store';
import { getErrorMessage } from '@/utils/error';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AI_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  PROCESSING: 'PROCESSING',
  DONE: '완료',
  FAILED: '실패',
};
const AI_STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'gray'> = {
  PENDING: 'gray',
  PROCESSING: 'warning',
  DONE: 'success',
  FAILED: 'error',
};
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const hasFetchedRef = useRef(false);
  const { documents, toggleFavorite, removeDocument, fetchDocuments } = useDocStore();
  const { pin: storedPin } = useAuthStore();
  const doc = documents.find((d) => d.id === id);

  const [expandedInfo, setExpandedInfo] = useState(true);
  const [serverAlerts, setServerAlerts] = useState<DocumentAlert[]>([]);

  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === storedPin) {
        setIsPinUnlocked(true);
      } else {
        setPinError(true);
        setTimeout(() => { setPinInput(''); setPinError(false); }, 600);
      }
    }
  };

  // 알림 탭 등으로 스토어가 비어있는 채 진입할 경우 문서 목록을 새로 가져옴
  useEffect(() => {
    if (!doc && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setFetching(true);
      fetchDocuments().finally(() => setFetching(false));
    }
  }, []);

  useEffect(() => {
    if (!doc) return;
    getDocumentAlerts(doc.id)
      .then(setServerAlerts)
      .catch((e) => console.log('문서 알림 조회 실패:', e));
  }, [doc?.id]);

  if (!doc) {
    if (fetching) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>문서를 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (doc.isSecured && !isPinUnlocked) {
    const PIN_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pinHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
          </TouchableOpacity>
        </View>
        <View style={styles.pinBody}>
          <View style={styles.pinIconWrap}>
            <Ionicons name="lock-closed" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.pinTitle}>잠긴 문서입니다</Text>
          <Text style={styles.pinDocName} numberOfLines={1}>{doc.title}</Text>
          <View style={styles.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  pinInput.length > i && styles.pinDotFilled,
                  pinError && styles.pinDotError,
                ]}
              />
            ))}
          </View>
          {pinError && <Text style={styles.pinErrorText}>PIN이 올바르지 않습니다</Text>}
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
                      onPress={() => setPinInput((p) => p.slice(0, -1))}
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
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('문서 삭제', '이 문서를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          // 이 문서에 예약된 알림 모두 취소
          for (const n of doc.notifications ?? []) {
            if (n.id) await cancelNotification(n.id);
          }
          removeDocument(doc.id);
          router.back();
        },
      },
    ]);
  };

  const handleDeleteAlert = async (alertId: string) => {
    setServerAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
    try {
      await deleteAlert(alertId);
    } catch (e) {
      console.log('알림 삭제 실패:', e);
    }
  };

  const handleToggleAlertPush = async (alertId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    setServerAlerts((prev) =>
      prev.map((a) => a.alert_id === alertId ? { ...a, channel_app_push: newValue } : a)
    );
    try {
      await updateAlert(alertId, { channel_app_push: newValue });
    } catch (e) {
      setServerAlerts((prev) =>
        prev.map((a) => a.alert_id === alertId ? { ...a, channel_app_push: currentValue } : a)
      );
      console.log('알림 토글 실패:', e);
    }
  };

  const categoryIcons: Record<string, string> = {
    '계약서': '📄',
    '보증서': '🛡️',
    '처방전': '💊',
    '보험서류': '🏥',
    '기타': '📁',
  };

  const today = new Date().toISOString().split('T')[0];
  const daysUntil = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{doc.title}</Text>
        <View style={styles.headerActions}>
        {/* 수정 버튼 */}
        <TouchableOpacity
            onPress={() => router.push(`/document/edit/${doc.id}`)}
            style={styles.headerBtn}>
            <Ionicons name="pencil-outline" size={22} color={Colors.gray700} />
          </TouchableOpacity>
          {/* 즐겨찾기 버튼 */}
          <TouchableOpacity onPress={() => toggleFavorite(doc.id)} style={styles.headerBtn}>
            <Ionicons
              name={doc.isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={doc.isFavorite ? Colors.warning : Colors.gray400}
            />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={downloading}
            onPress={async () => {
              if (!doc.imageUri) {
                showToast('저장된 파일 URL이 없습니다.', 'error');
                return;
              }
              const ft = doc.fileType ?? 'PDF';
              const ext = ft.toLowerCase();
              const mimeType =
                ft === 'JPG' ? 'image/jpeg' :
                ft === 'PNG' ? 'image/png' :
                'application/pdf';
              setDownloading(true);
              try {
                const ok = await downloadPdf(doc.imageUri, `${doc.title}.${ext}`, mimeType);
                if (ok) showToast('파일이 저장되었습니다.', 'success');
              } catch (e) {
                showToast(getErrorMessage(e), 'error');
              } finally {
                setDownloading(false);
              }
            }}
            style={styles.headerBtn}>
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 문서 메타 정보 */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>카테고리</Text>
            <View style={styles.metaValueRow}>
              <Text style={styles.metaVal}>{doc.category}</Text>
              <TouchableOpacity onPress={() => router.push(`/document/edit/${doc.id}` as any)}>
                <Text style={styles.metaEditBtn}>수정</Text>
              </TouchableOpacity>
            </View>
          </View>
          {doc.fileType && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>파일 정보</Text>
              <Text style={styles.metaVal}>
                {doc.fileType}{doc.fileSizeBytes ? ` · ${formatFileSize(doc.fileSizeBytes)}` : ''}
              </Text>
            </View>
          )}
          {doc.issueDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>발급일</Text>
              <Text style={styles.metaVal}>{doc.issueDate}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>만료일</Text>
            <Text style={[
              styles.metaVal,
              daysUntil !== null && daysUntil <= 0 ? styles.metaValError :
              daysUntil !== null && daysUntil <= 30 ? styles.metaValWarning : undefined,
            ]}>
              {doc.expiryDate
                ? `${doc.expiryDate}${daysUntil !== null ? (daysUntil <= 0 ? ' (만료됨)' : ` (${daysUntil}일 후)`) : ''}`
                : '-'}
            </Text>
          </View>
          {doc.aiStatus && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>AI 상태</Text>
              <View style={styles.metaValueRow}>
                <Badge
                  label={AI_STATUS_LABELS[doc.aiStatus] ?? doc.aiStatus}
                  variant={AI_STATUS_VARIANTS[doc.aiStatus] ?? 'gray'}
                />
                {doc.aiConfidence != null && (
                  <Text style={styles.aiConfidenceText}>신뢰도 {Math.round(doc.aiConfidence * 100)}%</Text>
                )}
              </View>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>업로드일</Text>
            <Text style={styles.metaVal}>{doc.uploadedAt}</Text>
          </View>
        </View>

        {/* 첨부 이미지 (있을 때만) */}
        {doc.imageUri && (
          <View style={styles.imageCard}>
            <Image source={{ uri: doc.imageUri }} style={styles.docImage} resizeMode="cover" />
          </View>
        )}

        {/* AI 추출 정보 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandedInfo(!expandedInfo)}>
            <Text style={styles.sectionTitle}>📊 AI 추출 정보</Text>
            <Ionicons name={expandedInfo ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray400} />
          </TouchableOpacity>
          {expandedInfo && (
            <View style={styles.infoGrid}>
              {doc.extractedData?.date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>날짜</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.date}</Text>
                </View>
              )}
              {doc.extractedData?.amount && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>금액</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.amount}</Text>
                </View>
              )}
              {(doc.extractedData?.parties ?? []).length > 0 && (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>당사자</Text>
    <Text style={styles.infoValue}>{(doc.extractedData?.parties ?? []).join(', ')}</Text>
  </View>
)}
              {doc.extractedData?.notes && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>비고</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.notes}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <TouchableOpacity onPress={() => router.push(`/document/edit/${doc.id}` as any)}>
              <Text style={styles.notifAddText}>+ 알림 추가</Text>
            </TouchableOpacity>
          </View>
          {serverAlerts.length === 0 ? (
            <Text style={styles.notifEmpty}>설정된 알림이 없습니다</Text>
          ) : (
            <View style={styles.notifList}>
              {serverAlerts.map((alert, index) => (
                <View key={alert.alert_id ?? String(index)} style={styles.notifItem}>
                  <View style={styles.notifInfo}>
                    <Text style={styles.notifLabel}>{(alert.notify_date ?? '').split('T')[0]}</Text>
                  </View>
                  <Switch
                    value={!!alert.channel_app_push}
                    onValueChange={() => handleToggleAlertPush(alert.alert_id, !!alert.channel_app_push)}
                    trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                    thumbColor={alert.channel_app_push ? Colors.primary : Colors.gray400}
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteAlert(alert.alert_id)}
                    style={styles.notifDeleteBtn}
                    hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 태그 */}
        {(doc.tags ?? []).length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🏷️ 태그</Text>
    <View style={styles.tagRow}>
      {(doc.tags ?? []).map((tag, index) => (
        <View key={tag || String(index)} style={styles.tag}>
          <Text style={styles.tagText}>#{tag}</Text>
        </View>
      ))}
    </View>
  </View>
)}

        <View style={{ height: Spacing.xl }} />
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
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  metaKey: { fontSize: 13, color: Colors.gray500, width: 64 },
  metaVal: { flex: 1, fontSize: 13, color: Colors.gray900, fontWeight: '500', textAlign: 'right' },
  metaValError: { color: Colors.error },
  metaValWarning: { color: Colors.warning },
  metaValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm },
  metaEditBtn: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  aiConfidenceText: { fontSize: 12, color: Colors.gray500 },
  imageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  docImage: { width: '100%', height: 220, borderRadius: Radius.md, backgroundColor: Colors.gray100 },
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
  infoGrid: { gap: Spacing.sm },
  infoRow: { flexDirection: 'row', gap: Spacing.md },
  infoLabel: { fontSize: 13, color: Colors.gray500, width: 60 },
  infoValue: { flex: 1, fontSize: 13, color: Colors.gray800, fontWeight: '500' },
  notifList: { gap: Spacing.sm },
  notifItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifInfo: { flex: 1 },
  notifLabel: { fontSize: 14, color: Colors.gray800, fontWeight: '500' },
  notifDate: { fontSize: 12, color: Colors.gray400 },
  notifEmpty: { fontSize: 13, color: Colors.gray400 },
  notifDeleteBtn: { padding: 4 },
  notifAddText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  tagText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // PIN 잠금 화면
  pinHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  pinBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  pinIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pinTitle: { fontSize: 20, fontWeight: '700', color: Colors.gray900 },
  pinDocName: { fontSize: 14, color: Colors.gray500, maxWidth: 260, textAlign: 'center' },
  pinDots: { flexDirection: 'row', gap: 16, marginVertical: Spacing.md },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.gray300,
    backgroundColor: 'transparent',
  },
  pinDotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pinDotError: { borderColor: Colors.error, backgroundColor: Colors.error },
  pinErrorText: { fontSize: 13, color: Colors.error, marginTop: -Spacing.xs },
  pinPad: { width: '100%', maxWidth: 280, gap: 8, marginTop: Spacing.sm },
  pinRow: { flexDirection: 'row', gap: 8 },
  pinKey: {
    flex: 1,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  pinKeyText: { fontSize: 22, fontWeight: '600', color: Colors.gray900 },
});