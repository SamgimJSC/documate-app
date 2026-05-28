import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useDocStore } from '@/stores/doc-store';

interface NotifItem {
  id: string;
  type: 'expiry' | 'upload' | 'spending';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const today = new Date().toISOString().split('T')[0];

export default function NotificationScreen() {
  const router = useRouter();
  const documents = useDocStore((s) => s.documents);

  const expiringDocs = documents.filter((d) => d.status === 'expiring_soon' || d.status === 'expired');

  const buildNotifications = (): NotifItem[] => {
    const notifs: NotifItem[] = [];
    expiringDocs.forEach((doc, i) => {
      const days = doc.expiryDate
        ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date(today).getTime()) / 86400000)
        : null;
      notifs.push({
        id: `expiry-${doc.id}`,
        type: 'expiry',
        title: '만료 임박 서류',
        body: `"${doc.title}"이(가) ${days !== null && days <= 0 ? '이미 만료되었습니다.' : `${days}일 후 만료됩니다.`}`,
        time: '방금 전',
        read: i > 0,
      });
    });
    notifs.push({
      id: 'spending-1',
      type: 'spending',
      title: '이번 달 지출 현황',
      body: '이번 달 지출이 지난 달보다 15% 증가했습니다.',
      time: '1시간 전',
      read: false,
    });
    notifs.push({
      id: 'upload-1',
      type: 'upload',
      title: 'AI 분석 완료',
      body: '업로드한 문서의 AI 분석이 완료되었습니다.',
      time: '어제',
      read: true,
    });
    return notifs;
  };

  const [notifs, setNotifs] = useState<NotifItem[]>(buildNotifications);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  const getNotifIcon = (type: NotifItem['type']) => {
    if (type === 'expiry') return { name: 'warning-outline' as const, color: Colors.warning, bg: Colors.warningLight };
    if (type === 'spending') return { name: 'stats-chart-outline' as const, color: Colors.primary, bg: Colors.primaryLight };
    return { name: 'checkmark-circle-outline' as const, color: Colors.success, bg: Colors.successLight };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>모두 읽음</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="notifications" size={16} color={Colors.primary} />
          <Text style={styles.unreadText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        ) : (
          notifs.map((notif) => {
            const icon = getNotifIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                onPress={() => setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n))}>
                <View style={[styles.notifIconWrap, { backgroundColor: icon.bg }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifBody}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.gray900, marginLeft: Spacing.xs },
  markAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600', paddingHorizontal: Spacing.sm },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  unreadText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.sm },
  notifCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  notifIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  notifBody: { fontSize: 13, color: Colors.gray600, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.gray400 },
  unreadDot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.gray400 },
});
