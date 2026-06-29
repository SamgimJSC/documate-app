import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  AiStatusResponse,
  TempFileType,
  createTempUpload,
  pollUntilDone,
  requestAiAnalysis,
  uploadToS3,
} from '@/services/upload';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ItemStatus = 'waiting' | 'uploading' | 'analyzing' | 'done' | 'error';

export default function UploadProgressScreen() {
  const router = useRouter();
  const { uris } = useLocalSearchParams<{ uris: string }>();
  const { fetchDocuments } = useDocStore();

  const imageUris: string[] = (() => {
    try { return uris ? JSON.parse(uris) : []; } catch { return []; }
  })();

  const [statuses, setStatuses] = useState<ItemStatus[]>(imageUris.map(() => 'waiting'));
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  const updateStatus = (index: number, status: ItemStatus) =>
    setStatuses((prev) => prev.map((s, k) => (k === index ? status : s)));

  const goNext = (results: AiStatusResponse[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    fetchDocuments();

    const done = results.filter((r) => r.aiStatus === 'DONE' && r.resultId);
    if (done.length === 1) {
      const { documentType, resultId } = done[0];
      if (documentType === 'RECEIPT') {
        router.replace(`/receipt-detail/${resultId}` as any);
      } else {
        router.replace(`/document/${resultId}` as any);
      }
    } else {
      router.replace('/(tabs)/cabinet');
    }
  };

  useEffect(() => {
    if (startedRef.current || imageUris.length === 0) return;
    startedRef.current = true;

    const run = async () => {
      const results: AiStatusResponse[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        // uri 확장자로 fileType 판별 (기본 JPG)
        const fileType: TempFileType = uri.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG';
        const mimeType = fileType === 'PNG' ? 'image/png' : 'image/jpeg';

        try {
          // 1단계: presigned URL + tempDocumentId 발급
          updateStatus(i, 'uploading');
          const { tempDocumentId, uploadUrl } = await createTempUpload({ fileType, pageCount: 1 });

          // 2단계: S3에 직접 업로드
          await uploadToS3(uri, uploadUrl, mimeType);

          // 3단계: NestJS에 AI 분석 요청 (서버가 Redis에 push)
          await requestAiAnalysis(tempDocumentId);
          updateStatus(i, 'analyzing');

          // 4단계: DONE / FAILED 될 때까지 폴링 (4초 간격, 최대 2분)
          const result = await pollUntilDone(tempDocumentId);
          results.push(result);
          updateStatus(i, result.aiStatus === 'DONE' ? 'done' : 'error');
        } catch (e) {
          console.error(`파일 ${i + 1} 처리 실패:`, e);
          updateStatus(i, 'error');
          results.push({ tempDocumentId: '', aiStatus: 'FAILED' });
        }
      }

      const successes = results.filter((r) => r.aiStatus === 'DONE');

      if (successes.length === 0) {
        Alert.alert(
          '분석 실패',
          'AI가 문서를 인식하지 못했습니다.\n다시 촬영하거나 직접 입력해 주세요.',
          [{ text: '확인', onPress: () => router.back() }],
        );
        return;
      }

      const failCount = results.length - successes.length;
      if (failCount > 0) {
        Alert.alert(
          '일부 실패',
          `${successes.length}/${imageUris.length}개가 분석되었습니다.`,
          [{ text: '확인', onPress: () => setTimeout(() => goNext(results), 300) }],
        );
        return;
      }

      setTimeout(() => goNext(results), 600);
    };

    run();
  }, [imageUris.length]);

  const doneCount = statuses.filter((s) => s === 'done').length;
  const errorCount = statuses.filter((s) => s === 'error').length;
  const uploadingCount = statuses.filter((s) => s === 'uploading').length;
  const analyzingCount = statuses.filter((s) => s === 'analyzing').length;
  const total = imageUris.length || 1;
  const progressCount = doneCount + errorCount;
  const percent = Math.round((progressCount / total) * 100);
  const allDone = progressCount === imageUris.length && imageUris.length > 0;

  const progressLabel = allDone
    ? errorCount === 0 ? '분석 완료!' : `${errorCount}개 실패`
    : uploadingCount > 0
      ? '파일을 업로드하고 있어요'
      : analyzingCount > 0
        ? 'AI가 문서를 분석하고 있어요'
        : '잠시만 기다려주세요';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 34 }} />
        <Text style={styles.headerTitle}>새 문서 업로드</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.progressTop}>
        <View style={[
          styles.circle,
          allDone && (errorCount === 0 ? styles.circleDone : styles.circleError),
        ]}>
          <Text style={[
            styles.circlePercent,
            allDone && { color: errorCount === 0 ? Colors.success : Colors.error },
          ]}>
            {percent}%
          </Text>
        </View>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      </View>

      <View style={styles.barRow}>
        <Text style={styles.barLabel}>처리 진행 ({progressCount}/{imageUris.length})</Text>
        <Text style={styles.barPercent}>{percent}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` as any }]} />
      </View>

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
              ) : statuses[idx] === 'analyzing' ? (
                <Text style={styles.analyzingText}>AI 분석중...</Text>
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
  itemStatus: { minWidth: 80, alignItems: 'flex-end' },
  uploadingText: { fontSize: 13, color: Colors.primary },
  analyzingText: { fontSize: 13, color: Colors.warning },
  waitingText: { fontSize: 13, color: Colors.gray400 },
});
