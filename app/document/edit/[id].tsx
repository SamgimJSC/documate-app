import { CATEGORY_FIELDS } from '@/constants/document-fields';
import { DocumentCategory } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  addDocumentTag,
  deleteDocumentTag,
  updateDocument as apiUpdateDocument,
} from '@/services/document';
import { cancelNotification, createDocumentAlert, scheduleExpiryNotification } from '@/services/notifications';
import { useDocStore } from '@/stores/doc-store';
import { showToast } from '@/stores/toast-store';
import { getErrorMessage } from '@/utils/error';
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

const CATEGORIES: DocumentCategory[] = ['계약서', '보증서', '처방전', '보험서류', '영수증', '기타'];

const EDIT_FIELD_LABELS: Record<string, string> = {
  contractDate: '계약일', expiryDate: '만료일', renewalDate: '갱신일', parties: '계약자',
  productName: '제품명', purchaseDate: '구매일', warrantyPeriod: '보증기간', repairDate: '수리일',
  hospitalName: '병원명', visitDate: '진료일', amount: '금액', medication: '약품명',
  insurer: '보험사', date: '날짜', notes: '메모',
};

const NOTI_OPTIONS: { days: number; label: string }[] = [
  { days: 30, label: '만료 1개월 전' },
  { days: 14, label: '만료 2주 전' },
  { days: 7, label: '만료 1주 전' },
  { days: 3, label: '만료 3일 전' },
  { days: 1, label: '만료 1일 전' },
];

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isNotiDatePast(dateStr: string): boolean {
  const target = new Date(dateStr);
  target.setHours(9, 0, 0, 0);
  return target.getTime() <= Date.now();
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  PDF: 'PDF',
  JPG: 'JPG 이미지',
  PNG: 'PNG 이미지',
};


export default function DocumentEditScreen() {
  const { id, manual } = useLocalSearchParams<{ id: string; manual?: string }>();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/cabinet' as any);
    }
  };
  const { documents, categories, updateDocument, removeDocument, createDocumentOnServer, replaceDocumentId } = useDocStore();
  const doc = documents.find((d) => d.id === id);

  const isManual = manual === '1';

  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(doc?.category ?? '기타');
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? '');
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate ?? '');
  const [renewalDate, setRenewalDate] = useState(doc?.renewalDate ?? '');
  const [imageUri, setImageUri] = useState<string | undefined>(doc?.imageUri);

  // AI 추출 정보 (카테고리별 동적 필드)
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>(
    () => ({ ...(doc?.extractedData ?? {}) })
  );
  const [notesHeight, setNotesHeight] = useState(64);

  // 태그: 기존 서버 태그 (tagId 포함) + 새로 추가한 것 (tagId 없음)
  const [localTags, setLocalTags] = useState<{ name: string; tagId?: string }[]>(
    () => doc?.documentTags ?? []
  );
  const [tagInput, setTagInput] = useState('');


  const initialNotiDays = (() => {
    const first = doc?.notifications?.[0];
    if (!first || !doc?.expiryDate) return null;
    const exp = new Date(doc.expiryDate).getTime();
    const noti = new Date(first.date).getTime();
    const diff = Math.round((exp - noti) / (1000 * 60 * 60 * 24));
    return NOTI_OPTIONS.some((o) => o.days === diff) ? diff : null;
  })();
  const [notiDays, setNotiDays] = useState<number | null>(initialNotiDays);
  const [notiMenuOpen, setNotiMenuOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!doc) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>문서를 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => goBack()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pickFromGallery = async () => {
    setPhotoSheetOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

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

  const handleAddTag = () => {
    const name = tagInput.trim();
    if (!name) return;
    if (localTags.some((t) => t.name === name)) {
      setTagInput('');
      return;
    }
    setLocalTags((prev) => [...prev, { name }]);
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    setLocalTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (isManual && !title.trim()) {
      removeDocument(doc.id);
    }
    goBack();
  };

  const commitSave = async () => {
    for (const n of doc.notifications) {
      if (n.id) await cancelNotification(n.id);
    }

    let notifications = doc.notifications;
    if (expiryDate.trim() && notiDays !== null) {
      const option = NOTI_OPTIONS.find((o) => o.days === notiDays);
      const notiDate = subtractDays(expiryDate.trim(), notiDays);
      const label = option ? option.label + ' 알림' : '만료 알림';
      const scheduledId = await scheduleExpiryNotification(
        notiDate,
        title.trim() || '문서 만료 알림',
        `"${title.trim()}" 문서가 곧 만료됩니다.`
      );
      notifications = [{ id: scheduledId ?? `n-${Date.now()}`, date: notiDate, label, enabled: true }];
    } else {
      notifications = [];
    }

    const matchedCat = categories.find((c) => c.name === category);

    const newExtractedData: Record<string, string> = {};
    for (const [k, v] of Object.entries(extractedFields)) {
      if (v.trim()) newExtractedData[k] = v.trim();
    }

    updateDocument(doc.id, {
      title: title.trim(),
      category,
      issueDate: issueDate.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      renewalDate: renewalDate.trim() || undefined,
      extractedData: newExtractedData,
      notifications,
      imageUri,
      tags: localTags.map((t) => t.name),
      documentTags: localTags.filter((t) => t.tagId) as { name: string; tagId: string }[],
    });

    let serverId = doc.id;
    const isLocalDraft = doc.id.startsWith('doc-');

    try {
      if (isLocalDraft) {
        const newId = await createDocumentOnServer({
          title: title.trim(),
          fileUrl: '',
          fileName: `${title.trim() || 'document'}.manual`,
          fileType: 'PDF',
          issueDate: issueDate.trim() || undefined,
          expiryDate: expiryDate.trim() || undefined,
          renewalDate: renewalDate.trim() || undefined,
          ...(matchedCat ? { categoryId: matchedCat.categoryId } : {}),
        });
        replaceDocumentId(doc.id, newId);
        serverId = newId;
      } else {
        await apiUpdateDocument(doc.id, {
          title: title.trim(),
          issueDate: issueDate.trim() || undefined,
          expiryDate: expiryDate.trim() || undefined,
          renewalDate: renewalDate.trim() || undefined,
          extractedData: newExtractedData as any,
          ...(matchedCat ? { categoryId: matchedCat.categoryId } : {}),
        });
      }

      // 태그 동기화: 원본 tagId 가진 것 중 제거된 것 삭제, tagId 없는 새 태그 추가
      const remainingTagIds = new Set(localTags.filter((t) => t.tagId).map((t) => t.tagId!));
      const toDelete = doc.documentTags.filter((t) => !remainingTagIds.has(t.tagId));
      const toAdd = localTags.filter((t) => !t.tagId);

      await Promise.allSettled([
        ...toDelete.map((t) => deleteDocumentTag(serverId, t.tagId)),
        ...toAdd.map((t) => addDocumentTag(serverId, t.name)),
      ]);

      if (expiryDate.trim() && notiDays !== null) {
        try {
          const option = NOTI_OPTIONS.find((o) => o.days === notiDays);
          const notiDate = subtractDays(expiryDate.trim(), notiDays);
          await createDocumentAlert(serverId, {
            notify_date: notiDate,
            reason: option ? `${option.label} 알림` : '만료 알림',
            channel_app_push: true,
            channel_email: false,
            channel_web_push: false,
          });
        } catch (e) {
          console.log('서버 알림 등록 실패:', e);
        }
      }
    } catch (e) {
      console.error('문서 저장 API 실패:', e);
      if (isLocalDraft) {
        showToast(getErrorMessage(e), 'error');
        return;
      }
      showToast(getErrorMessage(e), 'error');
    }

    router.replace(`/document/${serverId}`);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!title.trim()) {
      Alert.alert('입력 오류', '제목을 입력해주세요.');
      return;
    }

    for (const dateVal of [
      { val: issueDate, label: '발급일' },
      { val: expiryDate, label: '만료일' },
      { val: renewalDate, label: '갱신일' },
    ]) {
      if (dateVal.val.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateVal.val.trim())) {
        Alert.alert('입력 오류', `${dateVal.label}은 YYYY-MM-DD 형식으로 입력해주세요.\n예: 2026-12-31`);
        return;
      }
    }

    if (expiryDate.trim() && notiDays !== null) {
      const notiDate = subtractDays(expiryDate.trim(), notiDays);
      if (isNotiDatePast(notiDate)) {
        Alert.alert(
          '알림 날짜 확인',
          `설정한 알림 날짜(${notiDate})가 이미 지났어요. 이대로 저장할까요?`,
          [
            { text: '수정', style: 'cancel' },
            {
              text: '이대로 완료',
              onPress: async () => {
                setSaving(true);
                try { await commitSave(); } finally { setSaving(false); }
              },
            },
          ]
        );
        return;
      }
    }

    setSaving(true);
    try { await commitSave(); } finally { setSaving(false); }
  };

  const fileSizeLabel = doc.fileSizeBytes
    ? doc.fileSizeBytes < 1024 * 1024
      ? `${(doc.fileSizeBytes / 1024).toFixed(0)}KB`
      : `${(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)}MB`
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isManual ? '문서 등록' : '문서 수정'}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* 기본 정보 */}
          <Text style={styles.sectionLabel}>기본 정보</Text>
          <View style={styles.card}>
            {/* 제목 */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldKey}>문서명</Text>
              <TextInput
                style={styles.fieldInput}
                value={title}
                onChangeText={setTitle}
                placeholder="문서 제목을 입력하세요"
                placeholderTextColor={Colors.gray400}
              />
            </View>

            {/* 카테고리 */}
            <View style={[styles.fieldRow, styles.fieldRowWrap]}>
              <Text style={styles.fieldKey}>카테고리</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 파일 형식 (read-only, 서버 문서만) */}
            {!isManual && doc.fileType && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldKey}>파일 형식</Text>
                <Text style={styles.fieldReadOnly}>
                  {FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                  {fileSizeLabel ? ` · ${fileSizeLabel}` : ''}
                </Text>
              </View>
            )}

            {/* 발급일 */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldKey}>발급일</Text>
              <TextInput
                style={styles.fieldInput}
                value={issueDate}
                onChangeText={(t) => setIssueDate(formatDateInput(t))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.gray400}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            {/* 만료일 */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldKey}>만료일</Text>
              <TextInput
                style={styles.fieldInput}
                value={expiryDate}
                onChangeText={(t) => setExpiryDate(formatDateInput(t))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.gray400}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            {/* 갱신일 */}
            <View style={[styles.fieldRow, styles.fieldRowLast]}>
              <Text style={styles.fieldKey}>갱신일</Text>
              <TextInput
                style={styles.fieldInput}
                value={renewalDate}
                onChangeText={(t) => setRenewalDate(formatDateInput(t))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.gray400}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* AI 추출 정보 (카테고리별 동적 필드) */}
          <Text style={styles.sectionLabel}>AI 추출 정보</Text>
          <View style={styles.card}>
            {(() => {
              const standardFields = CATEGORY_FIELDS[category] ?? [];
              const standardKeys = new Set(standardFields.map((f) => f.key));
              const extraKeys = Object.keys(extractedFields).filter(
                (k) => !standardKeys.has(k) && extractedFields[k]
              );
              const allFields = [
                ...standardFields,
                ...extraKeys.map((k) => ({
                  key: k,
                  label: EDIT_FIELD_LABELS[k] ?? k,
                  placeholder: '',
                  multiline: extractedFields[k].length > 80,
                })),
              ];
              return allFields.map((field, idx) => {
                const isLast = idx === allFields.length - 1;
                return (
                  <View
                    key={field.key}
                    style={[
                      styles.fieldRow,
                      isLast && styles.fieldRowLast,
                      field.multiline && styles.fieldRowTop,
                    ]}
                  >
                    <Text style={styles.fieldKey}>{field.label}</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        field.multiline && styles.fieldInputNotes,
                        field.multiline && { height: Math.max(notesHeight, 64) },
                      ]}
                      value={extractedFields[field.key] ?? ''}
                      onChangeText={(val) =>
                        setExtractedFields((prev) => ({ ...prev, [field.key]: val }))
                      }
                      onContentSizeChange={
                        field.multiline
                          ? (e) => setNotesHeight(Math.min(e.nativeEvent.contentSize.height, 200))
                          : undefined
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.gray400}
                      multiline={field.multiline}
                      textAlignVertical={field.multiline ? 'top' : 'center'}
                    />
                  </View>
                );
              });
            })()}
          </View>

          {/* 알림 설정 */}
          <Text style={styles.sectionLabel}>알림 설정</Text>
          <View style={styles.card}>
            <View style={[styles.fieldRow, styles.fieldRowLast]}>
              <Text style={styles.fieldKey}>만료 알림</Text>
              <TouchableOpacity
                onPress={() => setNotiMenuOpen((v) => !v)}
                disabled={!expiryDate.trim()}>
                <Text style={[styles.notiAddBtn, !expiryDate.trim() && styles.notiAddBtnDisabled]}>
                  + 추가
                </Text>
              </TouchableOpacity>
            </View>
            {!expiryDate.trim() ? (
              <Text style={[styles.hint, { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }]}>
                만료일을 먼저 입력해주세요.
              </Text>
            ) : notiDays === null ? (
              <Text style={styles.notiEmpty}>설정된 알림이 없습니다.</Text>
            ) : (
              <View style={styles.notiItem}>
                <Text style={styles.notiLabel}>
                  {NOTI_OPTIONS.find((o) => o.days === notiDays)?.label}
                </Text>
                <TouchableOpacity onPress={() => setNotiDays(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {notiMenuOpen && (
            <View style={styles.dropdownMenu}>
              {NOTI_OPTIONS.map((opt) => {
                const active = notiDays === opt.days;
                return (
                  <TouchableOpacity
                    key={opt.days}
                    style={styles.dropdownItem}
                    onPress={() => { setNotiDays(opt.days); setNotiMenuOpen(false); }}>
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 태그 */}
          <Text style={styles.sectionLabel}>태그</Text>
          <View style={styles.card}>
            <View style={styles.tagInputRow}>
              <Ionicons name="pricetag-outline" size={15} color={Colors.gray400} style={{ marginLeft: Spacing.md }} />
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="태그를 입력하세요"
                placeholderTextColor={Colors.gray400}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.tagAddBtn, !tagInput.trim() && styles.tagAddBtnDisabled]}
                onPress={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Text style={[styles.tagAddBtnText, !tagInput.trim() && styles.tagAddBtnTextDisabled]}>추가</Text>
              </TouchableOpacity>
            </View>
            {localTags.length > 0 && (
              <>
                <View style={styles.tagDivider} />
                <View style={styles.tagChipRow}>
                  {localTags.map((tag, idx) => (
                    <View key={`${tag.name}-${idx}`} style={styles.tagChip}>
                      <Text style={styles.tagChipHash}>#</Text>
                      <Text style={styles.tagChipText}>{tag.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(idx)} hitSlop={6}>
                        <Ionicons name="close" size={13} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
            {localTags.length === 0 && (
              <Text style={styles.tagEmpty}>추가된 태그가 없습니다.</Text>
            )}
          </View>

          {/* 사진 첨부 (수기 등록일 때만) */}
          {isManual && (
            <>
              <Text style={styles.sectionLabel}>사진 첨부 (선택)</Text>
              {imageUri ? (
                <View style={styles.imageWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <View style={styles.imageBtnRow}>
                    <TouchableOpacity style={styles.imageBtn} onPress={() => setPhotoSheetOpen(true)}>
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
                <TouchableOpacity style={styles.imagePlaceholder} onPress={() => setPhotoSheetOpen(true)}>
                  <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                  <Text style={styles.imagePlaceholderText}>사진 추가 (카메라 / 갤러리)</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPhotoSheetOpen(false)}>
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
    backgroundColor: Colors.white,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl * 3, gap: 0 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldRowWrap: { alignItems: 'flex-start', flexWrap: 'wrap' },

  fieldKey: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray600,
    width: 72,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray900,
    padding: 0,
  },
  fieldRowTop: { alignItems: 'flex-start', paddingVertical: 10 },
  fieldInputNotes: { paddingTop: 2 },
  fieldReadOnly: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray500,
  },

  hint: { fontSize: 12, color: Colors.gray400, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, flex: 1 },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.gray700 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  notiAddBtn: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  notiAddBtnDisabled: { color: Colors.gray300 },
  notiEmpty: {
    fontSize: 13,
    color: Colors.gray400,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  notiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  notiLabel: { fontSize: 14, color: Colors.gray800, fontWeight: '500' },

  dropdownMenu: {
    marginTop: 2,
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

  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingRight: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tagInput: { flex: 1, fontSize: 14, color: Colors.gray900, paddingVertical: 13, padding: 0 },
  tagAddBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tagAddBtnDisabled: { borderColor: Colors.gray200 },
  tagAddBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  tagAddBtnTextDisabled: { color: Colors.gray300 },
  tagDivider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: Spacing.md },
  tagChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  tagChipHash: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  tagChipText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  tagEmpty: { fontSize: 13, color: Colors.gray400, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

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
