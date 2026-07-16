import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  deleteServerNotification,
  getServerNotifications,
  markAllServerNotificationsRead,
  markServerNotificationRead,
  NotificationStatus,
  ServerNotification,
} from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_TABS: { label: string; value: NotificationStatus }[] = [
  { label: '전체', value: 'all' },
  { label: '안 읽음', value: 'unread' },
  { label: '읽음', value: 'read' },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function NotificationScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [status, setStatus] = useState<NotificationStatus>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getServerNotifications({ status, page: 1, per_page: 20 });
      setNotifications(list);
    } catch (e) {
      console.log('알림 목록 조회 실패:', e);
      setError('알림을 불러오지 못했습니다. 서버 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [status]);

  const handlePress = async (item: ServerNotification) => {
    try {
      if (!item.isRead) {
        await markServerNotificationRead(item.notificationId);
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.log('읽음 처리 실패:', e);
    }
    if (item.documentId) {
      router.push(`/document/${item.documentId}` as any);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllServerNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.log('전체 읽음 처리 실패:', e);
    }
  };

  const handleDelete = async (notificationId: string) => {
    const previous = notifications;
    setNotifications((prev) =>
      prev.filter((item) => item.notificationId !== notificationId),
    );
    try {
      await deleteServerNotification(notificationId);
    } catch (e) {
      console.log("알림 삭제 실패:", e);
      setNotifications(previous);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleReadAll} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, status === tab.value && styles.tabActive]}
            onPress={() => setStatus(tab.value)}
          >
            <Text style={[styles.tabText, status === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>


      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.gray300} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notificationId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={({ pressed }) => [
                styles.card,
                !item.isRead && styles.cardUnread,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.dot, item.isRead && styles.dotRead]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(item.sentAt)}</Text>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      void handleDelete(item.notificationId);
                    }}
                    style={styles.deleteBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardBody2} numberOfLines={2}>{item.body}</Text>
                {item.documentId && (
                  <View style={styles.docTag}>
                    <Ionicons name="document-outline" size={12} color={Colors.primary} />
                    <Text style={styles.docTagText}>문서 보기</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>알림이 없습니다</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: Spacing.xs, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  readAllBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  readAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, color: Colors.gray400, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  list: { padding: Spacing.md, gap: Spacing.xs },
  sep: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: Spacing.md },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardUnread: { backgroundColor: Colors.primaryLight },
  cardPressed: { opacity: 0.75 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  dotRead: { backgroundColor: Colors.gray300 },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  cardTitleUnread: { fontWeight: '700', color: Colors.gray900 },
  cardDate: { fontSize: 12, color: Colors.gray400, flexShrink: 0 },
  deleteBtn: { padding: 2 },
  cardBody2: { fontSize: 13, color: Colors.gray500, lineHeight: 18 },
  docTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  docTagText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: 80 },
  emptyText: { fontSize: 15, color: Colors.gray400 },

});
