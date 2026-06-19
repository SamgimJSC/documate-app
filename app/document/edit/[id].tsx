import { DocumentCategory } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { cancelNotification, scheduleExpiryNotification } from '@/services/notifications';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES: DocumentCategory[] = ['계약서', '보증서', '처방전', '보험서류', '기타'];

// 알림 시점 옵션: 만료일 기준으로 며칠 전에 알릴지
const NOTI_OPTIONS: { days: number; label: string }[] = [
  { days: 30, label: '만료 1개월 전' },
  { days: 14, label: '만료 2주 전' },
  { days: 7, label: '만료 1주 전' },
  { days: 3, label: '만료 3일 전' },
  { days: 1, label: '만료 1일 전' },
];

// 'YYYY-MM-DD' 문자열에서 days만큼 뺀 날짜를 'YYYY-MM-DD'로 반환
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 알림 날짜(YYYY-MM-DD)의 오전 9시가 이미 지났는지 검사
function isNotiDatePast(dateStr: string): boolean {
  const target = new Date(dateStr);
  target.setHours(9, 0, 0, 0);
  return target.getTime() <= Date.now();
}

// 사용자가 입력한 값에서 숫자만 뽑아 YYYY-MM-DD 형태로 대시 자동 삽입
function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8); // 숫자만, 최대 8자리
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export default function DocumentEditScreen() {
  const { id, manual } = useLocalSearchParams<{ id: string; manual?: string }>();
  const router = useRouter();
  const { documents, updateDocument, removeDocument } = useDocStore();
  const doc = documents.find((d) => d.id === id);

  const isManual = manual === '1'; // 수기 등록으로 들어온 경우

  // 입력값 상태 (기존 문서 값으로 초기화)
  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(doc?.category ?? '기타');
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate ?? '');
  const [notes, setNotes] = useState(doc?.extractedData?.notes ?? '');
  const [imageUri, setImageUri] = useState<string | undefined>(doc?.imageUri);

  // 알림 시점(며칠 전). null = 알림 없음. 기존 문서의 첫 알림에서 일수 추정
  const initialNotiDays = (() => {
    const first = doc?.notifications?.[0];
    if (!first || !doc?.expiryDate) return null;
    const exp = new Date(doc.expiryDate).getTime();
    const noti = new Date(first.date).getTime();
    const diff = Math.round((exp - noti) / (1000 * 60 * 60 * 24));
    // 옵션에 있는 값이면 그걸로, 아니면 null
    return NOTI_OPTIONS.some((o) => o.days === diff) ? diff : null;
  })();
  const [notiDays, setNotiDays] = useState<number | null>(initialNotiDays);
  const [notiMenuOpen, setNotiMenuOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

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

  // 갤러리에서 사진 선택
  const pickFromGallery = async () => {
    setPhotoSheetOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // 카메라로 촬영
  const takePhoto = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // 사진 첨부 방법 선택 → 바텀시트 열기
  const handleAttachPhoto = () => setPhotoSheetOpen(true);

  // 제목 없이 화면을 떠날 때: 수기 등록으로 만든 빈 문서면 자동 삭제
  const handleClose = () => {
    if (isManual && !title.trim()) {
      removeDocument(doc.id);
    }
    router.back();
  };

  // 실제 저장 + 알림 예약 + 상세 페이지로 이동
  const commitSave = async () => {
    // 기존에 예약된 알림이 있으면 먼저 취소 (id가 예약 식별자)
    for (const n of doc.notifications) {
      if (n.id) await cancelNotification(n.id);
    }

    // 알림 배열 구성: 만료일 + 알림 시점이 모두 있을 때만 생성 + 실제 예약
    let notifications = doc.notifications;
    if (expiryDate.trim() && notiDays !== null) {
      const option = NOTI_OPTIONS.find((o) => o.days === notiDays);
      const notiDate = subtractDays(expiryDate.trim(), notiDays);
      const label = option ? option.label + ' 알림' : '만료 알림';

      // 실제 기기 알림 예약 (과거 날짜면 null 반환 → 예약은 안 되지만 정보는 저장)
      const scheduledId = await scheduleExpiryNotification(
        notiDate,
        title.trim() || '문서 만료 알림',
        `"${title.trim()}" 문서가 곧 만료됩니다.`
      );

      notifications = [
        {
          id: scheduledId ?? `n-${Date.now()}`,
          date: notiDate,
          label,
          enabled: true,
        },
      ];
    } else {
      // 알림 없음 선택 시 기존 알림 제거
      notifications = [];
    }

    updateDocument(doc.id, {
      title: title.trim(),
      category,
      expiryDate: expiryDate.trim() || undefined,
      extractedData: { ...doc.extractedData, notes: notes.trim() || undefined },
      notifications,
      imageUri,
    });

    // 수기 등록이고 사진이 있으면 업로드 진행 화면을 거쳐 상세로
    if (isManual && imageUri) {
      router.replace({
        pathname: '/upload-progress',
        params: { uris: JSON.stringify([imageUri]), manual: '1', docId: doc.id },
      });
      return;
    }

    // 그 외에는 바로 상세 페이지로
    router.replace(`/document/${doc.id}`);
  };

  const handleSave = async () => {
    // 제목은 비어 있으면 안 됨
    if (!title.trim()) {
      Alert.alert('입력 오류', '제목을 입력해주세요.');
      return;
    }

    // 만료일 형식 간단 검증 (입력했을 경우에만)
    if (expiryDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      Alert.alert('입력 오류', '만료일은 YYYY-MM-DD 형식으로 입력해주세요.\n예: 2026-12-31');
      return;
    }

    // 알림 날짜가 이미 지났는지 먼저 검사 (저장 전에)
    if (expiryDate.trim() && notiDays !== null) {
      const notiDate = subtractDays(expiryDate.trim(), notiDays);
      if (isNotiDatePast(notiDate)) {
        Alert.alert(
          '알림 날짜 확인',
          `설정한 알림 날짜(${notiDate})가 이미 지났어요. 다시 한 번 확인하시겠습니까?`,
          [
            { text: '수정', style: 'cancel' }, // 저장 안 하고 화면에 머무름 (입력값 유지)
            { text: '이대로 완료', onPress: () => commitSave() },
          ]
        );
        return;
      }
    }

    // 날짜 문제 없으면 바로 저장
    await commitSave();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isManual ? '문서 등록' : '문서 수정'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* 사진 첨부 (수기 등록일 때만) */}
          {isManual && (
            <>
              <Text style={styles.label}>사진 첨부 (선택)</Text>
              {imageUri ? (
                <View style={styles.imageWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <View style={styles.imageBtnRow}>
                    <TouchableOpacity style={styles.imageBtn} onPress={handleAttachPhoto}>
                      <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                      <Text style={styles.imageBtnText}>변경</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageBtn} onPress={() => setImageUri(undefined)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      <Text style={[styles.imageBtnText, { color: Colors.error }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePlaceholder} onPress={handleAttachPhoto}>
                  <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                  <Text style={styles.imagePlaceholderText}>사진 추가 (카메라 / 갤러리)</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* 제목 */}
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="문서 제목을 입력하세요"
            placeholderTextColor={Colors.gray400}
          />

          {/* 카테고리 */}
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 만료일 */}
          <Text style={styles.label}>만료일 (선택)</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatDateInput(text))}
            placeholder="YYYY-MM-DD (예: 2026-12-31)"
            placeholderTextColor={Colors.gray400}
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={styles.hint}>만료일을 입력하면 만료 알림을 설정할 수 있어요.</Text>

          {/* 알림 시점 */}
          <Text style={styles.label}>만료 알림</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, !expiryDate.trim() && styles.dropdownDisabled]}
            disabled={!expiryDate.trim()}
            onPress={() => setNotiMenuOpen((v) => !v)}>
            <Text
              style={[
                styles.dropdownTriggerText,
                !notiDays && styles.dropdownPlaceholder,
              ]}>
              {notiDays
                ? NOTI_OPTIONS.find((o) => o.days === notiDays)?.label
                : '알림 없음'}
            </Text>
            <Ionicons
              name={notiMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.gray500}
            />
          </TouchableOpacity>
          {!expiryDate.trim() && (
            <Text style={styles.hint}>먼저 만료일을 입력해주세요.</Text>
          )}

          {notiMenuOpen && (
            <View style={styles.dropdownMenu}>
              {/* 알림 없음 */}
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setNotiDays(null);
                  setNotiMenuOpen(false);
                }}>
                <Text style={[styles.dropdownItemText, !notiDays && styles.dropdownItemTextActive]}>
                  알림 없음
                </Text>
                {!notiDays && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
              </TouchableOpacity>

              {NOTI_OPTIONS.map((opt) => {
                const active = notiDays === opt.days;
                return (
                  <TouchableOpacity
                    key={opt.days}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNotiDays(opt.days);
                      setNotiMenuOpen(false);
                    }}>
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 메모 */}
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="문서에 대한 메모를 남겨보세요"
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 사진 첨부 바텀시트 (Modal 대신 절대위치 View — picker 충돌 방지) */}
      {photoSheetOpen && (
        <View style={styles.sheetRoot}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setPhotoSheetOpen(false)}
          />
          <View style={styles.sheetWrap}>
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>사진 첨부</Text>
              <TouchableOpacity style={styles.sheetItem} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={22} color={Colors.gray700} />
                <Text style={styles.sheetItemText}>카메라로 촬영</Text>
              </TouchableOpacity>
              <View style={styles.sheetDivider} />
              <TouchableOpacity style={styles.sheetItem} onPress={pickFromGallery}>
                <Ionicons name="image-outline" size={22} color={Colors.gray700} />
                <Text style={styles.sheetItemText}>갤러리에서 선택</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setPhotoSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: Colors.gray700, marginBottom: Spacing.md },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.gray900,
    backgroundColor: Colors.white,
  },
  textArea: { height: 100 },
  hint: { fontSize: 12, color: Colors.gray400, marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.gray700 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  dropdownDisabled: { backgroundColor: Colors.gray100, borderColor: Colors.gray200 },
  dropdownTriggerText: { fontSize: 15, color: Colors.gray900 },
  dropdownPlaceholder: { color: Colors.gray400 },
  dropdownMenu: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  dropdownItemText: { fontSize: 14, color: Colors.gray700 },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: '600' },

  imagePlaceholder: {
    height: 140,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  imagePlaceholderText: { fontSize: 13, color: Colors.gray400 },
  imageWrap: { gap: Spacing.sm },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray100,
  },
  imageBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  imageBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  sheetRoot: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: { padding: Spacing.sm, gap: Spacing.sm, zIndex: 101 },
  sheetCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden' },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray400,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
  },
  sheetItemText: { fontSize: 16, color: Colors.gray900 },
  sheetDivider: { height: 1, backgroundColor: Colors.gray100, marginLeft: Spacing.lg },
  sheetCancel: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetCancelText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});