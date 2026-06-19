import { Document } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ItemStatus = 'waiting' | 'uploading' | 'done';

export default function UploadProgressScreen() {
  const router = useRouter();
  // uris: 업로드할 사진 배열(JSON). manual: 수기 모드 여부. docId: 수기 모드에서 이미 만든 문서 id
  const { uris, manual, docId } = useLocalSearchParams<{
    uris: string;
    manual?: string;
    docId?: string;
  }>();
  const addDocument = useDocStore((s) => s.addDocument);

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

  // 업로드 끝난 뒤 도착지로 이동 (B안: 한 장이면 상세, 여러 장이면 캐비닛)
  const goNext = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (isManual) {
      // 수기: 이미 만들어진 문서의 상세로
      router.replace(`/document/${docId}`);
      return;
    }

    // 카메라/갤러리: 사진 수만큼 문서 생성
    // TODO: OCR 연동 시 여기서 CLOVA API 호출로 교체
    const today = new Date().toISOString().split('T')[0];
    const ids: string[] = [];
    imageUris.forEach((uri, idx) => {
      const newId = `doc-${Date.now()}-${idx}`;
      ids.push(newId);
      const newDoc: Document = {
        id: newId,
        title: '새로운 문서',
        category: '기타',
        imageUri: uri,
        uploadedAt: today,
        tags: [],
        isFavorite: false,
        status: 'active',
        extractedData: {},
        notifications: [],
      };
      addDocument(newDoc);
    });

    if (ids.length === 1) {
      router.replace(`/document/${ids[0]}`); // 한 장 → 상세
    } else {
      router.replace('/(tabs)/cabinet'); // 여러 장 → 캐비닛
    }
  };

  // 사진을 하나씩 차례로 업로드(가짜)
  useEffect(() => {
    if (startedRef.current || imageUris.length === 0) return;
    startedRef.current = true;

    let i = 0;
    const uploadNext = () => {
      if (i >= imageUris.length) {
        // 전부 완료 → 잠깐 보여주고 이동
        setTimeout(goNext, 600);
        return;
      }
      const idx = i;
      setStatuses((prev) => prev.map((s, k) => (k === idx ? 'uploading' : s)));
      setTimeout(() => {
        setStatuses((prev) => prev.map((s, k) => (k === idx ? 'done' : s)));
        i += 1;
        uploadNext();
      }, 700);
    };
    uploadNext();
  }, [imageUris.length]);

  const doneCount = statuses.filter((s) => s === 'done').length;
  const total = imageUris.length || 1;
  const percent = Math.round((doneCount / total) * 100);
  const allDone = doneCount === imageUris.length && imageUris.length > 0;

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
        <View style={[styles.circle, allDone && styles.circleDone]}>
          <Text style={[styles.circlePercent, allDone && { color: Colors.success }]}>
            {percent}%
          </Text>
        </View>
        <Text style={styles.progressLabel}>
          {allDone ? '업로드 완료!' : '스토리지에 파일을 업로드하고 있어요'}
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