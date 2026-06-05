import { Document, Receipt } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';
import { useReceiptStore } from '@/stores/receipt-store';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'done';

export default function CameraScreen() {
  const router = useRouter();
  const addDocument = useDocStore((s) => s.addDocument);
  const addReceipt = useReceiptStore((s) => s.addReceipt);
  const [state, setState] = useState<UploadState>('idle');

  // TODO: OCR 연동 시 이 함수를 CLOVA API 호출로 교체
// 현재는 시험 단계라 가짜 분석(딜레이 후 빈 문서 생성) 유지
const simulateAnalysis = async (isReceipt: boolean, fileUri?: string) => {
    setState('uploading');
    await new Promise((r) => setTimeout(r, 800));
    setState('analyzing');
    await new Promise((r) => setTimeout(r, 1200));

    const today = new Date().toISOString().split('T')[0];

    if (isReceipt) {
      const newReceipt: Receipt = {
        id: `r-${Date.now()}`,
        storeName: '업로드된 영수증',
        category: '기타',
        imageUri: fileUri,
        amount: 0,
        date: today,
        isFavorite: false,
      };
      addReceipt(newReceipt);
      setState('done');
      Alert.alert(
        'AI 분석 완료',
        '영수증이 분석되었습니다. 내역을 확인하고 수정해주세요.',
        [{ text: '확인', onPress: () => router.back() }]
      );
    } else {
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
      setState('done');
      Alert.alert(
        'AI 분석 완료',
        '문서가 분석되어 캐비닛에 저장되었습니다.',
        [{ text: '확인', onPress: () => router.back() }]
      );
    }
  };

  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled) {
      await simulateAnalysis(false, result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: false,
    });
  if (!result.canceled) {
      await simulateAnalysis(false, result.assets[0].uri);
    }
  };

  const handlePdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.assets && result.assets.length > 0) {
      await simulateAnalysis(false, result.assets[0].uri);
    }
  };

  const handleReceiptCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      await simulateAnalysis(true, result.assets[0].uri);
    }
  };

  const isLoading = state === 'uploading' || state === 'analyzing';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문서 추가</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>
            {state === 'uploading' ? '업로드 중...' : 'AI가 문서를 분석 중...'}
          </Text>
          <Text style={styles.loadingDesc}>
            {state === 'analyzing' && 'OCR로 텍스트를 인식하고 분류하고 있어요'}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>📄 일반 문서</Text>

          <View style={styles.optionGrid}>
            <TouchableOpacity style={styles.option} onPress={handleCamera}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="camera" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.optionLabel}>카메라 촬영</Text>
              <Text style={styles.optionDesc}>실시간 촬영 후 분석</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleGallery}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="image" size={28} color={Colors.success} />
              </View>
              <Text style={styles.optionLabel}>갤러리 선택</Text>
              <Text style={styles.optionDesc}>저장된 사진 불러오기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handlePdf}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.errorLight }]}>
                <Ionicons name="document" size={28} color={Colors.error} />
              </View>
              <Text style={styles.optionLabel}>PDF 파일</Text>
              <Text style={styles.optionDesc}>PDF 문서 불러오기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>영수증</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.receiptOption} onPress={handleReceiptCamera}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="receipt" size={28} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.optionLabel}>영수증 촬영</Text>
              <Text style={styles.optionDesc}>영수증 OCR → 자동 소비 분류</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray300} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.gray400} />
            <Text style={styles.hintText}>
              업로드된 파일은 AI가 자동으로 종류를 분류하고 핵심 정보를 추출합니다
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  closeBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingTitle: { fontSize: 18, fontWeight: '600', color: Colors.gray800 },
  loadingDesc: { fontSize: 14, color: Colors.gray500 },
  content: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.gray700 },
  optionGrid: { flexDirection: 'row', gap: Spacing.md },
  option: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  optionIcon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray800, textAlign: 'center' },
  optionDesc: { fontSize: 11, color: Colors.gray500, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontSize: 13, color: Colors.gray500, fontWeight: '600' },
  receiptOption: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.gray500, lineHeight: 18 },
});
