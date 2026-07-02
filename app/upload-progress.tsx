// ─── DEMO_MODE: true = API 없이 UI 흐름 확인, false = 실제 API 사용 ───────
const DEMO_MODE = false;

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  AiStatusResponse,
  pollUntilDone,
  requestAiAnalysis,
  startUpload,
  uploadTempFile,
} from '@/services/upload';

type TempFileType = 'JPG' | 'PNG';

// ─── 데모용 mock 함수들 ────────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function demoUpload(i: number) {
  await delay(700 + Math.random() * 1000);
  return { tempDocumentId: `demo-${i}-${Date.now()}`, sizeBytes: Math.floor(50000 + Math.random() * 450000) };
}
async function demoPoll(id: string): Promise<AiStatusResponse> {
  await delay(2500 + Math.random() * 2000);
  return { tempDocumentId: id, aiStatus: 'DONE', resultId: null, documentType: 'DOCUMENT' };
}
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UploadStatus = 'uploading' | 'uploaded' | 'error';
type AnalysisStatus = 'waiting' | 'analyzing' | 'done' | 'error';
type Phase = 'uploading' | 'ready' | 'confirming' | 'started' | 'analyzing';

interface FileItem {
  uri: string;
  name: string;
  sizeBytes?: number;
  fileType: TempFileType;
  uploadStatus: UploadStatus;
  tempDocumentId?: string;
  uploadedFiles?: Array<{ id: string; pageNo: number }>;
  analysisStatus: AnalysisStatus;
  result?: AiStatusResponse;
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uriToName(uri: string, idx: number) {
  const parts = uri.split('/');
  const raw = parts[parts.length - 1] ?? `사진 ${idx + 1}`;
  return raw.split('?')[0];
}

export default function UploadProgressScreen() {
  const router = useRouter();
  const { uris } = useLocalSearchParams<{ uris: string }>();
  const { fetchDocuments } = useDocStore();

  const imageUris: string[] = (() => {
    try { return uris ? JSON.parse(uris) : []; } catch { return []; }
  })();

  const [items, setItems] = useState<FileItem[]>(() =>
    imageUris.map((uri, i) => ({
      uri,
      name: uriToName(uri, i),
      fileType: uri.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG',
      uploadStatus: 'uploading',
      analysisStatus: 'waiting',
    }))
  );
  const [phase, setPhase] = useState<Phase>('uploading');
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  // 화면 마운트 시점(업로드 전) 문서 ID 스냅샷 → OCR 완료 후 새 문서 특정에 사용
  // startAnalysis가 아닌 마운트 시점에 찍어야 업로드 중 생성된 문서까지 잡을 수 있음
  const existingDocIdsRef = useRef<Set<string>>(
    new Set(useDocStore.getState().documents.map((d) => d.id))
  );

  const updateItem = (index: number, patch: Partial<FileItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  // ─── 업로드 실패 재시도 ───────────────────────────────────────────────────
  const retryUpload = async (uri: string, index: number) => {
    updateItem(index, { uploadStatus: 'uploading', sizeBytes: undefined, tempDocumentId: undefined, uploadedFiles: undefined });
    try {
      const ft: TempFileType = uri.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG';
      const mime = ft === 'PNG' ? 'image/png' : 'image/jpeg';
      const info = await FileSystem.getInfoAsync(uri);
      const sizeBytes = (info.exists && 'size' in info) ? (info as any).size : undefined;
      updateItem(index, { sizeBytes });
      const { tempDocumentId } = await startUpload();
      const fileName = `img_${Date.now()}_${index}.${ft.toLowerCase()}`;
      const uploadResult = await uploadTempFile(tempDocumentId, uri, mime, fileName);
      updateItem(index, {
        uploadStatus: 'uploaded',
        tempDocumentId,
        uploadedFiles: uploadResult.files.map((f) => ({ id: f.id, pageNo: f.pageNo })),
      });
    } catch (e) {
      console.error(`[upload] 파일 ${index} 재시도 실패:`, e);
      updateItem(index, { uploadStatus: 'error' });
    }
  };

  // ─── 1. S3 업로드 (마운트 즉시, 병렬) ───────────────────────────────────
  useEffect(() => {
    if (startedRef.current || imageUris.length === 0) return;
    startedRef.current = true;

    const uploadAll = async () => {
      await Promise.allSettled(
        imageUris.map(async (uri, i) => {
          try {
            if (DEMO_MODE) {
              const { tempDocumentId, sizeBytes } = await demoUpload(i);
              updateItem(i, { uploadStatus: 'uploaded', tempDocumentId, sizeBytes });
            } else {
              const ft: TempFileType = uri.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG';
              const mime = ft === 'PNG' ? 'image/png' : 'image/jpeg';
              const info = await FileSystem.getInfoAsync(uri);
              const sizeBytes = (info.exists && 'size' in info) ? (info as any).size : undefined;
              updateItem(i, { sizeBytes });
              const { tempDocumentId } = await startUpload();
              const fileName = `img_${Date.now()}_${i}.${ft.toLowerCase()}`;
              const uploadResult = await uploadTempFile(tempDocumentId, uri, mime, fileName);
              updateItem(i, {
                uploadStatus: 'uploaded',
                tempDocumentId,
                uploadedFiles: uploadResult.files.map((f) => ({ id: f.id, pageNo: f.pageNo })),
              });
            }
          } catch (e) {
            console.error(`[upload] 파일 ${i} 업로드 실패:`, e);
            updateItem(i, { uploadStatus: 'error' });
          }
        })
      );
      setPhase('ready');
    };

    uploadAll();
  }, [imageUris.length]);

  // ─── 2. AI 분석 시작 ────────────────────────────────────────────────────
  const startAnalysis = async () => {
    setPhase('started');
    const uploaded = items.filter((it) => it.uploadStatus === 'uploaded' && it.tempDocumentId);
    if (!DEMO_MODE) {
      await Promise.allSettled(
        uploaded.map((it) =>
          requestAiAnalysis(it.tempDocumentId!, it.uploadedFiles ?? [])
        )
      );
    }
    setItems((prev) =>
      prev.map((it) =>
        it.uploadStatus === 'uploaded' ? { ...it, analysisStatus: 'analyzing' } : it
      )
    );
  };

  // ─── 3. 폴링 (phase === 'analyzing') ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'analyzing') return;
    if (finishedRef.current) return;

    const uploaded = items.filter((it) => it.uploadStatus === 'uploaded' && it.tempDocumentId);
    if (uploaded.length === 0) return;

    const run = async () => {
      const results: AiStatusResponse[] = [];

      await Promise.allSettled(
        uploaded.map(async (it) => {
          const itemIdx = items.indexOf(it);
          try {
            const result = DEMO_MODE
              ? await demoPoll(it.tempDocumentId!)
              : await pollUntilDone(it.tempDocumentId!);
            results.push(result);
            updateItem(itemIdx, {
              analysisStatus: result.aiStatus === 'DONE' ? 'done' : 'error',
              result,
            });
          } catch {
            results.push({ tempDocumentId: it.tempDocumentId!, aiStatus: 'FAILED' });
            updateItem(itemIdx, { analysisStatus: 'error' });
          }
        })
      );

      if (finishedRef.current) return;
      finishedRef.current = true;

      if (DEMO_MODE) {
        router.replace('/(tabs)/cabinet');
        return;
      }

      // 새로 생성된 문서를 찾아 확인/수정 화면으로 이동
      await fetchDocuments();
      const newDocs = useDocStore.getState().documents.filter(
        (d) => !existingDocIdsRef.current.has(d.id)
      );
      const doneCount = results.filter((r) => r.aiStatus === 'DONE').length;

      if (doneCount > 0 && newDocs.length > 0) {
        // OCR 결과(카테고리, 추출 필드)를 사용자가 확인·수정하는 화면으로
        router.replace(`/document/edit/${newDocs[0].id}` as any);
      } else {
        router.replace('/(tabs)/cabinet');
      }
    };

    run();
  }, [phase]);

  // ─── 파생 상태 ─────────────────────────────────────────────────────────
  const uploadedItems = items.filter((it) => it.uploadStatus === 'uploaded');
  const uploadingCount = items.filter((it) => it.uploadStatus === 'uploading').length;
  const errorCount = items.filter((it) => it.uploadStatus === 'error').length;
  const allUploaded = items.every((it) => it.uploadStatus !== 'uploading');

  const statusBannerStyle =
    phase === 'uploading' ? 'uploading'
    : (phase === 'ready' || phase === 'confirming') && errorCount > 0 && uploadedItems.length === 0 ? 'allError'
    : (phase === 'ready' || phase === 'confirming') && errorCount > 0 ? 'partialError'
    : phase === 'ready' || phase === 'confirming' ? 'ready'
    : 'analyzing';

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>업로드 스튜디오</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* 상태 배너 */}
      <View style={[
        styles.banner,
        statusBannerStyle === 'ready' && styles.bannerReady,
        statusBannerStyle === 'partialError' && styles.bannerPartialError,
        statusBannerStyle === 'allError' && styles.bannerAllError,
        statusBannerStyle === 'analyzing' && styles.bannerAnalyzing,
      ]}>
        <View style={[
          styles.bannerIcon,
          statusBannerStyle === 'ready' && styles.bannerIconReady,
          statusBannerStyle === 'partialError' && styles.bannerIconWarning,
          statusBannerStyle === 'allError' && styles.bannerIconError,
        ]}>
          {statusBannerStyle === 'uploading' || statusBannerStyle === 'analyzing' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : statusBannerStyle === 'ready' ? (
            <Ionicons name="checkmark" size={16} color={Colors.success} />
          ) : statusBannerStyle === 'partialError' ? (
            <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          ) : (
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.bannerTitle,
            statusBannerStyle === 'ready' && styles.bannerTitleReady,
            statusBannerStyle === 'partialError' && styles.bannerTitleWarning,
            statusBannerStyle === 'allError' && styles.bannerTitleError,
          ]}>
            {statusBannerStyle === 'uploading'
              ? `업로드 중... (${uploadingCount}개 남음)`
              : statusBannerStyle === 'ready'
              ? '업로드가 완료되었습니다.'
              : statusBannerStyle === 'partialError'
              ? `일부 업로드 실패 (${errorCount}개)`
              : statusBannerStyle === 'allError'
              ? '업로드에 실패했습니다.'
              : 'AI가 문서를 분석하고 있어요'}
          </Text>
          <Text style={styles.bannerSub}>
            {statusBannerStyle === 'uploading'
              ? '잠시만 기다려 주세요.'
              : statusBannerStyle === 'ready'
              ? '업로드된 파일을 확인한 뒤 AI 분석을 시작해 주세요.'
              : statusBannerStyle === 'partialError'
              ? `${uploadedItems.length}개 성공 · 실패한 파일은 재시도 버튼을 눌러주세요.`
              : statusBannerStyle === 'allError'
              ? '각 파일의 재시도 버튼을 눌러 다시 시도해 주세요.'
              : '페이지를 벗어나도 처리 센터에서 확인할 수 있어요.'}
          </Text>
        </View>
      </View>

      {/* 파일 목록 헤더 */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colLabel, { flex: 1 }]}>파일명</Text>
        <Text style={[styles.colLabel, { width: 64, textAlign: 'right' }]}>크기</Text>
        <Text style={[styles.colLabel, { width: 88, textAlign: 'center' }]}>상태</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.fileRow}>
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.fileType}>{item.fileType}</Text>
            </View>
            <Text style={styles.fileSize}>{formatSize(item.sizeBytes)}</Text>
            <View style={styles.statusCell}>
              {item.uploadStatus === 'uploading' ? (
                <View style={[styles.statusChip, styles.statusChipUploading]}>
                  <ActivityIndicator size={10} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: Colors.primary }]}>업로드 중</Text>
                </View>
              ) : item.uploadStatus === 'error' ? (
                <TouchableOpacity
                  style={[styles.statusChip, styles.statusChipError]}
                  onPress={() => retryUpload(item.uri, idx)}
                >
                  <Ionicons name="refresh" size={11} color={Colors.error} />
                  <Text style={[styles.statusText, { color: Colors.error }]}>재시도</Text>
                </TouchableOpacity>
              ) : item.analysisStatus === 'analyzing' ? (
                <View style={[styles.statusChip, styles.statusChipAnalyzing]}>
                  <ActivityIndicator size={10} color={Colors.warning} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: Colors.warning }]}>분석 중</Text>
                </View>
              ) : item.analysisStatus === 'done' ? (
                <View style={[styles.statusChip, styles.statusChipDone]}>
                  <Ionicons name="checkmark" size={11} color={Colors.success} />
                  <Text style={[styles.statusText, { color: Colors.success }]}>완료</Text>
                </View>
              ) : item.analysisStatus === 'error' ? (
                <View style={[styles.statusChip, styles.statusChipError]}>
                  <Text style={[styles.statusText, { color: Colors.error }]}>분석 실패</Text>
                </View>
              ) : (
                <View style={[styles.statusChip, styles.statusChipReady]}>
                  <Ionicons name="checkmark" size={11} color={Colors.success} />
                  <Text style={[styles.statusText, { color: Colors.success }]}>업로드 완료</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* 분석 대기 요약 */}
        {(phase === 'ready' || phase === 'confirming') && uploadedItems.length > 0 && (
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={15} color={Colors.gray500} />
            <Text style={styles.summaryText}>
              {uploadedItems.length}개 파일이 분석 대기 중입니다.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 CTA */}
      {(phase === 'uploading' || phase === 'ready' || phase === 'confirming') && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.analyzeBtn, (!allUploaded || uploadedItems.length === 0) && styles.analyzeBtnDisabled]}
            disabled={!allUploaded || uploadedItems.length === 0}
            onPress={() => setPhase('confirming')}
          >
            {!allUploaded ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
            <Text style={styles.analyzeBtnText}>AI 분석하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 확인 모달 ── */}
      <Modal
        visible={phase === 'confirming'}
        transparent
        animationType="fade"
        onRequestClose={() => setPhase('ready')}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>AI 분석을 시작할까요?</Text>
            <Text style={styles.modalDesc}>
              {uploadedItems.length}개의 파일을 분석 대기열에 등록하고 AI 분석을 시작합니다.
            </Text>
            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoText}>
                업로드 페이지를 벗어나도 괜찮아요.{'\n'}분석 상태는 처리 센터에서 다시 확인할 수 있습니다.
              </Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setPhase('ready')}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={startAnalysis}
              >
                <Text style={styles.modalBtnPrimaryText}>분석 시작하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 시작됨 모달 ── */}
      <Modal
        visible={phase === 'started'}
        transparent
        animationType="fade"
        onRequestClose={() => setPhase('analyzing')}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconWrapSuccess]}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>AI 분석이 시작되었습니다.</Text>
            <Text style={styles.modalDesc}>진행 상태는 처리 센터에서 언제든지 확인할 수 있어요.</Text>
            <View style={[styles.modalInfoBox, styles.modalInfoBoxSuccess]}>
              <Text style={styles.modalInfoBold}>이 페이지를 나가도 괜찮아요!</Text>
              <Text style={styles.modalInfoText}>
                {uploadedItems.length}개의 파일이 처리 센터의 분석 대기열에 등록되었습니다.
              </Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnOutline}
                onPress={() => setPhase('analyzing')}
              >
                <Text style={styles.modalBtnOutlineText}>이 페이지에 머무르기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => {
                  const ids = items
                    .filter((it) => it.tempDocumentId)
                    .map((it) => it.tempDocumentId!);
                  router.replace({
                    pathname: '/processing-center',
                    params: { ids: JSON.stringify(ids) },
                  } as any);
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>처리 센터로 이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerBackBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray900 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  bannerReady: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success + '44',
  },
  bannerPartialError: {
    backgroundColor: '#FFF8E1',
    borderColor: Colors.warning + '55',
  },
  bannerAllError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error + '44',
  },
  bannerAnalyzing: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '33',
  },
  bannerIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIconReady:   { backgroundColor: Colors.success + '22' },
  bannerIconWarning: { backgroundColor: Colors.warning + '22' },
  bannerIconError:   { backgroundColor: Colors.error + '22' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  bannerTitleReady:   { color: Colors.success },
  bannerTitleWarning: { color: Colors.warning },
  bannerTitleError:   { color: Colors.error },
  bannerSub: { fontSize: 12, color: Colors.gray600, marginTop: 2 },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  colLabel: { fontSize: 12, color: Colors.gray400, fontWeight: '600' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.xl, gap: 1 },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  thumb: {
    width: 40, height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: '600', color: Colors.gray900 },
  fileType: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  fileSize: { fontSize: 12, color: Colors.gray500, width: 60, textAlign: 'right' },
  statusCell: { width: 92, alignItems: 'flex-end' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusChipUploading: { backgroundColor: Colors.primaryLight },
  statusChipReady:    { backgroundColor: Colors.successLight },
  statusChipAnalyzing:{ backgroundColor: '#FFF8E1' },
  statusChipDone:     { backgroundColor: Colors.successLight },
  statusChipError:    { backgroundColor: Colors.errorLight },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginTop: 1,
  },
  summaryText: { fontSize: 13, color: Colors.gray600 },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
  },
  analyzeBtnDisabled: { backgroundColor: Colors.gray300 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // 모달 공통
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  modalIconWrapSuccess: { backgroundColor: Colors.successLight },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900, textAlign: 'center' },
  modalDesc: { fontSize: 13, color: Colors.gray600, textAlign: 'center', lineHeight: 20 },
  modalInfoBox: {
    width: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  modalInfoBoxSuccess: { backgroundColor: Colors.successLight },
  modalInfoBold: { fontSize: 13, fontWeight: '700', color: Colors.gray800 },
  modalInfoText: { fontSize: 12, color: Colors.gray700, lineHeight: 18 },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.xs },
  modalBtnCancel: {
    flex: 1, paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gray200,
    alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: Colors.gray700 },
  modalBtnOutline: {
    flex: 1, paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gray200,
    alignItems: 'center',
  },
  modalBtnOutlineText: { fontSize: 13, fontWeight: '600', color: Colors.gray700 },
  modalBtnPrimary: {
    flex: 1, paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray900,
    alignItems: 'center',
  },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
