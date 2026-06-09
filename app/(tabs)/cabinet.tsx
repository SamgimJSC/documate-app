import { Badge } from '@/components/common/badge';
import { DocumentCategory } from '@/constants/mock-data';
import { Colors, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES: (DocumentCategory | '전체')[] = ['전체', '계약서', '보증서', '처방전', '보험서류', '기타'];

const CATEGORY_ICONS: Record<string, string> = {
  '계약서': '📄',
  '보증서': '🛡️',
  '처방전': '💊',
  '보험서류': '🏥',
  '기타': '📁',
};

export default function CabinetScreen() {
  const router = useRouter();
  const { getFilteredDocuments, setSearchQuery, setSelectedCategory, searchQuery, selectedCategory, toggleFavorite } = useDocStore();
  const [catFilter, setCatFilter] = useState<DocumentCategory | '전체'>('전체');
  // 정렬 방식: 'recent'=최신순(기본), 'name'=이름순
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  // 정렬 드롭다운 열림 여부
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const handleCatChange = (cat: DocumentCategory | '전체') => {
    setCatFilter(cat);
    setSelectedCategory(cat === '전체' ? null : cat);
  };

  // 카테고리/검색 필터 결과
  let docs = getFilteredDocuments();

  // 정렬 적용
  docs = [...docs].sort((a, b) => {
    if (sortBy === 'name') {
      // 이름순: 제목 가나다순 (한글 정렬)
      return a.title.localeCompare(b.title, 'ko');
    }
    // 최신순(기본): 업로드 날짜 내림차순
    return b.uploadedAt.localeCompare(a.uploadedAt);
  });

  const SORT_LABELS: Record<string, string> = {
    recent: '최신순',
    name: '이름순',
  };
  const currentSortLabel = SORT_LABELS[sortBy];

  const handleSelectSort = (value: 'recent' | 'name') => {
    setSortBy(value);
    setSortMenuOpen(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'expiring_soon') return <Badge label="만료 임박" variant="warning" />;
    if (status === 'expired') return <Badge label="만료됨" variant="error" />;
    return null;
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    return Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>디지털 캐비닛</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{docs.length}개</Text>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortMenuOpen((v) => !v)}>
            <Ionicons name="swap-vertical" size={15} color={Colors.gray600} />
            <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
            <Ionicons
              name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.gray600}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 정렬 드롭다운 메뉴 */}
      {sortMenuOpen && (
        <>
          {/* 바깥 영역 누르면 닫힘 */}
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setSortMenuOpen(false)}
          />
          <View style={styles.dropdown}>
            {([
              { value: 'recent', label: '최신순' },
              { value: 'name', label: '이름순' },
            ] as const).map((opt) => {
              const active = sortBy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectSort(opt.value)}>
                  <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                    {opt.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="문서 검색..."
            placeholderTextColor={Colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScrollView}
        contentContainerStyle={styles.catScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => handleCatChange(cat)}
            style={[styles.catChip, catFilter === cat && styles.catChipActive]}>
            <Text style={[styles.catChipText, catFilter === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {docs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>문서가 없습니다</Text>
            <Text style={styles.emptyDesc}>
              카메라 버튼을 눌러 첫 번째 문서를 추가해보세요
            </Text>
          </View>
        ) : (
          docs.map((doc) => {
            const days = getDaysUntil(doc.expiryDate);
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => router.push(`/document/${doc.id}` as any)}>
                <View style={styles.docLeft}>
                  <Text style={styles.docIcon}>{CATEGORY_ICONS[doc.category] ?? '📄'}</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                    <Text style={styles.docCategory}>{doc.category}</Text>
                    {doc.expiryDate && (
                      <Text style={[styles.docExpiry, days !== null && days <= 30 && styles.docExpiryUrgent]}>
                        만료: {doc.expiryDate}
                        {days !== null && days >= 0 ? ` (${days}일 후)` : ' (만료됨)'}
                      </Text>
                    )}
                    {doc.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {doc.tags.slice(0, 3).map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.docRight}>
                  {getStatusBadge(doc.status)}
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(doc.id); }}
                    style={styles.favBtn}>
                    <Ionicons
                      name={doc.isFavorite ? 'star' : 'star-outline'}
                      size={20}
                      color={doc.isFavorite ? Colors.warning : Colors.gray300}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCount: { fontSize: 14, color: Colors.gray500 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sortBtnText: { fontSize: 13, fontWeight: '500', color: Colors.gray700 },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 4,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.gray200,
    zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 4 },
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
  searchRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.gray900, paddingVertical: 12 },
  catScrollView: { flexGrow: 0, maxHeight: 44 },
  catScroll: { paddingHorizontal: Spacing.lg, gap: 6, paddingBottom: Spacing.sm, alignItems: 'flex-start' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: Colors.gray600 },
  catChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: TAB_BAR_SPACE },
  docCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  docLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, flex: 1 },
  docIcon: { fontSize: 28 },
  docInfo: { flex: 1, gap: 3 },
  docTitle: { fontSize: 15, fontWeight: '600', color: Colors.gray900 },
  docCategory: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  docExpiry: { fontSize: 12, color: Colors.gray500 },
  docExpiryUrgent: { color: Colors.warning, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { backgroundColor: Colors.gray100, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, color: Colors.gray500 },
  docRight: { alignItems: 'flex-end', gap: Spacing.sm },
  favBtn: { padding: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray700 },
  emptyDesc: { fontSize: 14, color: Colors.gray400, textAlign: 'center' },
});