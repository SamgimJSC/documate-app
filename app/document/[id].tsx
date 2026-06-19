import { Badge } from '@/components/common/badge';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { downloadPdf } from '@/services/download';
import { cancelNotification } from '@/services/notifications';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const { documents, toggleFavorite, removeDocument, updateDocument } = useDocStore();
  const doc = documents.find((d) => d.id === id);

  const [expandedInfo, setExpandedInfo] = useState(true);
  const [expandedNotif, setExpandedNotif] = useState(true);

  if (!doc) {
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

  const handleDelete = () => {
    Alert.alert('문서 삭제', '이 문서를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          // 이 문서에 예약된 알림 모두 취소
          for (const n of doc.notifications) {
            if (n.id) await cancelNotification(n.id);
          }
          removeDocument(doc.id);
          router.back();
        },
      },
    ]);
  };

  const toggleNotification = (notifId: string) => {
    const updated = doc.notifications.map((n) =>
      n.id === notifId ? { ...n, enabled: !n.enabled } : n
    );
    updateDocument(doc.id, { notifications: updated });
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
              setDownloading(true);
              try {
                const testUrl = 'https://pdfobject.com/pdf/sample.pdf';
                const ok = await downloadPdf(testUrl, `${doc.title}.pdf`);
                Alert.alert(ok ? '저장 완료' : '저장 취소', ok ? 'PDF가 저장되었습니다.' : '');
              } catch (e) {
                Alert.alert('다운로드 실패', '파일을 받지 못했습니다.');
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
        {/* 문서 프리뷰 */}
        <View style={styles.previewCard}>
          <Text style={styles.previewIcon}>{categoryIcons[doc.category] ?? '📄'}</Text>
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{doc.title}</Text>
            <View style={styles.previewMeta}>
              <Badge label={doc.category} variant="info" />
              {doc.status === 'expiring_soon' && <Badge label="만료 임박" variant="warning" />}
              {doc.status === 'expired' && <Badge label="만료됨" variant="error" />}
            </View>
            <Text style={styles.previewDate}>업로드: {doc.uploadedAt}</Text>
          </View>
        </View>

        {/* 첨부 이미지 (있을 때만) */}
        {doc.imageUri && (
          <View style={styles.imageCard}>
            <Image source={{ uri: doc.imageUri }} style={styles.docImage} resizeMode="cover" />
          </View>
        )}

        {/* 만료일 정보 */}
        {doc.expiryDate && (
          <View style={[styles.expiryCard, daysUntil !== null && daysUntil <= 30 ? styles.expiryCardUrgent : styles.expiryCardNormal]}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={daysUntil !== null && daysUntil <= 30 ? Colors.warning : Colors.primary}
            />
            <View>
              <Text style={styles.expiryLabel}>만료일</Text>
              <Text style={styles.expiryDate}>{doc.expiryDate}</Text>
              {daysUntil !== null && (
                <Text style={[styles.expiryDays, daysUntil <= 0 && { color: Colors.error }]}>
                  {daysUntil <= 0 ? '이미 만료됨' : `${daysUntil}일 후 만료`}
                </Text>
              )}
            </View>
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
              {doc.extractedData.date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>날짜</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.date}</Text>
                </View>
              )}
              {doc.extractedData.amount && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>금액</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.amount}</Text>
                </View>
              )}
              {doc.extractedData.parties && doc.extractedData.parties.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>당사자</Text>
                  <Text style={styles.infoValue}>{doc.extractedData.parties.join(', ')}</Text>
                </View>
              )}
              {doc.extractedData.notes && (
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
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandedNotif(!expandedNotif)}>
            <Text style={styles.sectionTitle}>🔔 알림 설정</Text>
            <Ionicons name={expandedNotif ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray400} />
          </TouchableOpacity>
          {expandedNotif && (
            <View style={styles.notifList}>
              {doc.notifications.length === 0 ? (
                <Text style={styles.notifEmpty}>설정된 알림이 없습니다</Text>
              ) : (
                doc.notifications.map((notif) => (
                  <View key={notif.id} style={styles.notifItem}>
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifLabel}>{notif.label}</Text>
                      <Text style={styles.notifDate}>{notif.date}</Text>
                    </View>
                    <Switch
                      value={notif.enabled}
                      onValueChange={() => toggleNotification(notif.id)}
                      trackColor={{ false: Colors.gray200, true: Colors.primary }}
                    />
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* 태그 */}
        {doc.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ 태그</Text>
            <View style={styles.tagRow}>
              {doc.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
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
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  previewIcon: { fontSize: 48 },
  previewInfo: { flex: 1, gap: Spacing.xs },
  previewTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },
  previewMeta: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  previewDate: { fontSize: 12, color: Colors.gray400 },
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
  expiryCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  expiryCardNormal: { backgroundColor: Colors.primaryLight },
  expiryCardUrgent: { backgroundColor: Colors.warningLight },
  expiryLabel: { fontSize: 12, color: Colors.gray500 },
  expiryDate: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },
  expiryDays: { fontSize: 13, color: Colors.warning, fontWeight: '500' },
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
  notifEmpty: { fontSize: 14, color: Colors.gray400 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  tagText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
});