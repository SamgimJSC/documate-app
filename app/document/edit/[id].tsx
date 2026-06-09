import { DocumentCategory } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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

export default function DocumentEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { documents, updateDocument } = useDocStore();
  const doc = documents.find((d) => d.id === id);

  // 입력값 상태 (기존 문서 값으로 초기화)
  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(doc?.category ?? '기타');
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate ?? '');
  const [notes, setNotes] = useState(doc?.extractedData?.notes ?? '');

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

  const handleSave = () => {
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

    // 알림 배열 구성: 만료일 + 알림 시점이 모두 있을 때만 생성
    let notifications = doc.notifications;
    if (expiryDate.trim() && notiDays !== null) {
      const option = NOTI_OPTIONS.find((o) => o.days === notiDays);
      notifications = [
        {
          id: `n-${Date.now()}`,
          date: subtractDays(expiryDate.trim(), notiDays),
          label: option ? option.label + ' 알림' : '만료 알림',
          enabled: true,
        },
      ];
    } else if (notiDays === null) {
      // 알림 없음 선택 시 기존 알림 제거
      notifications = [];
    }

    updateDocument(doc.id, {
      title: title.trim(),
      category,
      expiryDate: expiryDate.trim() || undefined,
      extractedData: { ...doc.extractedData, notes: notes.trim() || undefined },
      notifications,
    });

    Alert.alert('저장 완료', '문서 정보가 수정되었습니다.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문서 수정</Text>
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
            onChangeText={setExpiryDate}
            placeholder="YYYY-MM-DD (예: 2026-12-31)"
            placeholderTextColor={Colors.gray400}
            keyboardType="numbers-and-punctuation"
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
});