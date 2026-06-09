import { Colors, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, value, toggle, toggleValue, onToggle, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: Colors.gray200, true: Colors.primary }}
          />
        ) : (
          !danger && <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MyPageScreen() {
  const router = useRouter();
  const { user, logout, isBiometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const storagePercent = user ? Math.round((user.storageUsed / user.storageLimit) * 100) : 0;

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert(
      '회원탈퇴',
      '탈퇴하면 모든 데이터가 삭제됩니다.\n정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '탈퇴', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={36} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user?.nickname}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={[styles.planBadge, user?.plan === 'pro' ? styles.planBadgePro : styles.planBadgeFree]}>
              <Text style={[styles.planText, user?.plan === 'pro' ? styles.planTextPro : styles.planTextFree]}>
                {user?.plan === 'pro' ? '🔷 Pro 플랜' : 'Free 플랜'}
              </Text>
            </View>
          </View>
        </View>

        {/* 스토리지 */}
        <View style={styles.storageCard}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>스토리지 사용량</Text>
            <Text style={styles.storageValue}>{user?.storageUsed.toFixed(1)}GB / {user?.storageLimit}GB</Text>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageBarFill, { width: `${storagePercent}%` as any }]} />
          </View>
        </View>

        {/* 계정 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 설정</Text>
          <MenuItem icon="pencil-outline" label="닉네임 수정" onPress={() => {}} value={user?.nickname} />
          <View style={styles.divider} />
          <MenuItem icon="lock-closed-outline" label="비밀번호 변경" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="keypad-outline" label="PIN 번호 재설정" onPress={() => router.push('/(auth)/pin-setup' as any)} />
          <View style={styles.divider} />
          <MenuItem
            icon="finger-print-outline"
            label="생체인증"
            onPress={() => {}}
            toggle
            toggleValue={isBiometricEnabled}
            onToggle={(v) => (v ? enableBiometric() : disableBiometric())}
          />
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <MenuItem
            icon="notifications-outline"
            label="앱 푸시 알림"
            onPress={() => {}}
            toggle
            toggleValue={pushEnabled}
            onToggle={setPushEnabled}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="mail-outline"
            label="이메일 알림"
            onPress={() => {}}
            toggle
            toggleValue={emailEnabled}
            onToggle={setEmailEnabled}
          />
        </View>

        {/* 요금제 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>요금제 관리</Text>
          {user?.plan === 'free' ? (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/pro-promotion' as any)}>
              <View>
                <Text style={styles.upgradeTitle}>Pro로 업그레이드</Text>
                <Text style={styles.upgradeDesc}>AI 소비분석 · 월별 리포트 · 마스킹 기능</Text>
              </View>
              <View style={styles.upgradeArrow}>
                <Ionicons name="chevron-forward" size={20} color={Colors.white} />
              </View>
            </TouchableOpacity>
          ) : (
            <MenuItem icon="star-outline" label="Pro 플랜 관리" onPress={() => router.push('/pro-promotion' as any)} />
          )}
        </View>

        {/* 약관 및 기타 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기타</Text>
          <MenuItem icon="document-text-outline" label="이용약관" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="shield-outline" label="개인정보처리방침" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="information-circle-outline" label="앱 버전" onPress={() => {}} value="1.0.0" />
        </View>

        {/* 로그아웃 / 탈퇴 */}
        <View style={styles.section}>
          <MenuItem icon="log-out-outline" label="로그아웃" onPress={handleLogout} danger />
          <View style={styles.divider} />
          <MenuItem icon="trash-outline" label="회원탈퇴" onPress={handleWithdraw} danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.gray900 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: TAB_BAR_SPACE },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { gap: Spacing.xs },
  nickname: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  email: { fontSize: 13, color: Colors.gray500 },
  planBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  planBadgeFree: { backgroundColor: Colors.gray100 },
  planBadgePro: { backgroundColor: Colors.proLight },
  planText: { fontSize: 12, fontWeight: '700' },
  planTextFree: { color: Colors.gray500 },
  planTextPro: { color: Colors.pro },

  storageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  storageLabel: { fontSize: 14, color: Colors.gray600, fontWeight: '500' },
  storageValue: { fontSize: 13, color: Colors.gray500 },
  storageBar: { height: 8, backgroundColor: Colors.gray200, borderRadius: Radius.full, overflow: 'hidden' },
  storageBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },

  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.gray400, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  menuIconWrap: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: Colors.errorLight },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.gray800, fontWeight: '500' },
  menuLabelDanger: { color: Colors.error },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  menuValue: { fontSize: 14, color: Colors.gray400 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginLeft: Spacing.lg + 36 + Spacing.md },

  upgradeBtn: {
    margin: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: Colors.white },
  upgradeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  upgradeArrow: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});