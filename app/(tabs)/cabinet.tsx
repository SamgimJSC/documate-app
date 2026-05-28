import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Badge } from '@/components/common/badge';
import { useDocStore } from '@/stores/doc-store';
import { DocumentCategory } from '@/constants/mock-data';

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

  const handleCatChange = (cat: DocumentCategory | '전체') => {
    setCatFilter(cat);
    setSelectedCategory(cat === '전체' ? null : cat);
  };

  const docs = getFilteredDocuments();

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
        <Text style={styles.headerCount}>{docs.length}개</Text>
      </View>

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
        <View style={{ height: Spacing.xl }} />
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
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  headerCount: { fontSize: 14, color: Colors.gray500 },
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
  catScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 13, fontWeight: '500', color: Colors.gray600 },
  catChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.sm },
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
