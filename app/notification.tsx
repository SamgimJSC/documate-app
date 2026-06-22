import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  getServerNotifications,
  markAllServerNotificationsRead,
  markServerNotificationRead,
  NotificationStatus,
  sendTestNotification,
  sendTestNotificationIn10s,
  ServerNotification,
} from '@/services/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
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
  const token = useAuthStore((s) => s.token);

  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [status, setStatus] = useState<NotificationStatus>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getServerNotifications({ status, page: 1, per_page: 20, token });
      setNotifications(data.notifications);
    } catch (e) {
      console.log('알림 목록 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, token]);

  const handlePress = async (item: ServerNotification) => {
    if (!token) return;
    try {
      if (!item.is_read) {
        await markServerNotificationRead(item.alert_id, token);
        setNotifications((prev) =>
          prev.map((n) => (n.alert_id === item.alert_id ? { ...n, is_read: true } : n))
        );
      }
    } catch (e) {
      console.log('읽음 처리 실패:', e);
    }
    if (item.document_id) {
      router.push(`/document/${item.document_id}` as any);
    }
  };

  const handleReadAll = async () => {
    if (!token) return;
    try {
      await markAllServerNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.log('전체 읽음 처리 실패:', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

      {/* 개발 환경 전용 테스트 패널 */}
      {__DEV__ && (
        <View style={styles.devPanel}>
          <Text style={styles.devLabel}>DEV — 알림 테스트</Text>
          <View style={styles.devRow}>
            <TouchableOpacity style={styles.devBtn} onPress={sendTestNotification}>
              <Ionicons name="flash-outline" size={14} color={Colors.primary} />
              <Text style={styles.devBtnText}>즉시 알림</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.devBtn} onPress={sendTestNotificationIn10s}>
              <Ionicons name="timer-outline" size={14} color={Colors.warning} />
              <Text style={[styles.devBtnText, { color: Colors.warning }]}>10초 후 알림</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.devHint}>
            "10초 후 알림" 누른 뒤 홈 버튼으로 앱을 닫으면 백그라운드 알림을 테스트할 수 있어요
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.alert_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={({ pressed }) => [
                styles.card,
                !item.is_read && styles.cardUnread,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.dot, item.is_read && styles.dotRead]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(item.notify_date)}</Text>
                </View>
                <Text style={styles.cardBody2} numberOfLines={2}>{item.body}</Text>
                {item.document_id && (
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

  devPanel: {
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  devLabel: { fontSize: 11, fontWeight: '700', color: '#F57F17', letterSpacing: 0.5 },
  devRow: { flexDirection: 'row', gap: Spacing.sm },
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  devBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  devHint: { fontSize: 11, color: '#795548', lineHeight: 16 },
});
