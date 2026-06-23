import { Document } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type UploadState = 'idle' | 'uploading' | 'analyzing';

export default function CameraScreen() {
  const router = useRouter();
  const addDocument = useDocStore((s) => s.addDocument);
  const [state, setState] = useState<UploadState>('idle');

  const close = () => router.back();

  // TODO: OCR 연동 시 이 함수를 CLOVA API 호출로 교체
  const simulateAnalysis = async (fileUri?: string) => {
    setState('uploading');
    await new Promise((r) => setTimeout(r, 800));
    setState('analyzing');
    await new Promise((r) => setTimeout(r, 1200));

    const today = new Date().toISOString().split('T')[0];
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: '새로운 문서',
      category: '기타',
      imageUri: fileUri,
      uploadedAt: today,
      tags: [],
      isFavorite: false,
      status: 'active',
      extractedData: {},
      notifications: [],
    };
    addDocument(newDoc);
    Alert.alert('AI 분석 완료', '문서가 분석되어 캐비닛에 저장되었습니다.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  // 선택한 사진 uri들을 업로드 진행 화면으로 전달
  const goToProgress = (uriList: string[]) => {
    router.replace({
      pathname: '/upload-progress',
      params: { uris: JSON.stringify(uriList) },
    });
  };

  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) goToProgress(result.assets.map((a) => a.uri));
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled) goToProgress(result.assets.map((a) => a.uri));
  };

  const handleManual = () => {
    const today = new Date().toISOString().split('T')[0];
    const id = `doc-${Date.now()}`;
    const newDoc: Document = {
      id,
      title: '',
      category: '기타',
      uploadedAt: today,
      tags: [],
      isFavorite: false,
      status: 'active',
      extractedData: {},
      notifications: [],
    };
    addDocument(newDoc);
    router.replace(`/document/edit/${id}?manual=1`);
  };

  const isLoading = state === 'uploading' || state === 'analyzing';

  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>
            {state === 'uploading' ? '업로드 중...' : 'AI가 문서를 분석 중...'}
          </Text>
          {state === 'analyzing' && (
            <Text style={styles.loadingDesc}>OCR로 텍스트를 인식하고 분류하고 있어요</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* 반투명 검정 배경 (누르면 닫힘) */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />

      {/* 바텀시트 */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>업로드 방식 선택</Text>

        <TouchableOpacity style={styles.option} onPress={handleCamera}>
          <View style={[styles.optionIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="camera" size={24} color={Colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>사진 찍기</Text>
            <Text style={styles.optionDesc}>카메라로 문서를 직접 촬영해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleGallery}>
          <View style={[styles.optionIcon, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="image" size={24} color={Colors.success} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>갤러리에서 선택</Text>
            <Text style={styles.optionDesc}>저장된 사진을 불러와요 (최대 10장)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleManual}>
          <View style={[styles.optionIcon, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="create-outline" size={24} color={Colors.warning} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>수기 등록</Text>
            <Text style={styles.optionDesc}>직접 정보를 입력해서 등록해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancel} onPress={close}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.gray300, marginBottom: Spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: Colors.gray900, marginBottom: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  optionIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  optionDesc: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  cancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.gray500 },
  loadingCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingTitle: { fontSize: 18, fontWeight: '600', color: Colors.gray800 },
  loadingDesc: { fontSize: 14, color: Colors.gray500 },
});