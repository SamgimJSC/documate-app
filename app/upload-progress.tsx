import { Colors, Radius, Spacing } from '@/constants/theme';
import { uploadDocumentFile } from '@/services/document';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ItemStatus = 'waiting' | 'uploading' | 'done' | 'error';

export default function UploadProgressScreen() {
  const router = useRouter();
  // uris: 업로드할 사진 배열(JSON). manual: 수기 모드 여부. docId: 수기 모드에서 이미 만든 문서 id
  const { uris, manual, docId } = useLocalSearchParams<{
    uris: string;
    manual?: string;
    docId?: string;
  }>();
  const { addDocument, fetchDocuments } = useDocStore();

  const isManual = manual === '1';

  const imageUris: string[] = (() => {
    try {
      return uris ? JSON.parse(uris) : [];
    } catch {
      return [];
    }
  })();

  const [statuses, setStatuses] = useState<ItemStatus[]>(imageUris.map(() => 'waiting'));
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  // 업로드 끝난 뒤 도착지로 이동
  const goNext = (uploadedIds: string[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (isManual) {
      router.replace(`/document/${docId}`);
      return;
    }

    if (uploadedIds.length === 1) {
      router.replace(`/document/${uploadedIds[0]}`);
    } else {
      router.replace('/(tabs)/cabinet');
    }
  };

  // 사진을 하나씩 차례로 서버에 업로드
  useEffect(() => {
    if (startedRef.current || imageUris.length === 0) return;
    startedRef.current = true;

    const runUploads = async () => {
      const uploadedIds: string[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        setStatuses((prev) => prev.map((s, k) => (k === i ? 'uploading' : s)));

        try {
          const fileName = `upload_${Date.now()}_${i}.jpg`;
          const item = await uploadDocumentFile(uri, fileName, 'image/jpeg');

          const today = new Date().toISOString().split('T')[0];
          addDocument({
            id: item.documentId,
            categoryId: item.categoryId ?? undefined,
            title: item.title,
            category: (item.category?.name ?? '기타') as any,
            uploadedAt: item.createdAt?.split('T')[0] ?? today,
            expiryDate: item.expiryDate ?? undefined,
            imageUri: item.fileUrl,
            tags: item.documentTags?.map((dt) => dt.tag.name) ?? [],
            isFavorite: item.isFavorite ?? false,
            status: 'active',
            extractedData: {
              notes: typeof item.ocrText === 'string' ? item.ocrText : undefined,
            },
            notifications: [],
          });

          uploadedIds.push(item.documentId);
          setStatuses((prev) => prev.map((s, k) => (k === i ? 'done' : s)));
        } catch (e) {
          console.error(`파일 ${i + 1} 업로드 실패:`, e);
          setStatuses((prev) => prev.map((s, k) => (k === i ? 'error' : s)));
        }
      }

      const hasAnySuccess = uploadedIds.length > 0;
      const hasAnyError = statuses.some((s) => s === 'error');

      if (!hasAnySuccess) {
        Alert.alert('업로드 실패', '파일 업로드에 실패했습니다. 다시 시도해주세요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
        return;
      }

      if (hasAnyError) {
        Alert.alert(
          '일부 업로드 실패',
          `${uploadedIds.length}/${imageUris.length}개 파일이 업로드되었습니다.`,
          [{ text: '확인', onPress: () => setTimeout(() => goNext(uploadedIds), 300) }]
        );
        return;
      }

      setTimeout(() => goNext(uploadedIds), 600);
    };

    runUploads();
  }, [imageUris.length]);

  const doneCount = statuses.filter((s) => s === 'done').length;
  const errorCount = statuses.filter((s) => s === 'error').length;
  const total = imageUris.length || 1;
  const percent = Math.round(((doneCount + errorCount) / total) * 100);
  const allDone = doneCount + errorCount === imageUris.length && imageUris.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 34 }} />
        <Text style={styles.headerTitle}>
          {isManual ? '사진 업로드' : '새 문서 업로드'}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {/* 원형 진행률 */}
      <View style={styles.progressTop}>
        <View style={[styles.circle, allDone && (errorCount === 0 ? styles.circleDone : styles.circleError)]}>
          <Text style={[styles.circlePercent, allDone && (errorCount === 0 ? { color: Colors.success } : { color: Colors.error })]}>
            {percent}%
          </Text>
        </View>
        <Text style={styles.progressLabel}>
          {allDone
            ? errorCount === 0 ? '업로드 완료!' : `${errorCount}개 실패`
            : '스토리지에 파일을 업로드하고 있어요'}
        </Text>
      </View>

      {/* 막대 진행률 */}
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>업로드 진행 ({doneCount}/{imageUris.length})</Text>
        <Text style={styles.barPercent}>{percent}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>

      {/* 사진 목록 */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {imageUris.map((uri, idx) => (
          <View key={idx} style={styles.item}>
            <Image source={{ uri }} style={styles.thumb} />
            <Text style={styles.itemLabel}>사진 {idx + 1}</Text>
            <View style={styles.itemStatus}>
              {statuses[idx] === 'done' ? (
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              ) : statuses[idx] === 'error' ? (
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              ) : statuses[idx] === 'uploading' ? (
                <Text style={styles.uploadingText}>업로드중...</Text>
              ) : (
                <Text style={styles.waitingText}>대기</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },

  progressTop: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 6, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  circleDone: { borderColor: Colors.success },
  circleError: { borderColor: Colors.error },
  circlePercent: { fontSize: 26, fontWeight: '700', color: Colors.primary },
  progressLabel: { fontSize: 14, color: Colors.gray500 },

  barRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  barLabel: { fontSize: 13, color: Colors.gray600, fontWeight: '500' },
  barPercent: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  barTrack: {
    height: 8, marginHorizontal: Spacing.lg, borderRadius: Radius.full,
    backgroundColor: Colors.gray200, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },

  list: { flex: 1, marginTop: Spacing.lg },
  listContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  thumb: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.gray100 },
  itemLabel: { flex: 1, fontSize: 14, color: Colors.gray800, fontWeight: '500' },
  itemStatus: { minWidth: 70, alignItems: 'flex-end' },
  uploadingText: { fontSize: 13, color: Colors.primary },
  waitingText: { fontSize: 13, color: Colors.gray400 },
});
