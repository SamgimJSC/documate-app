import { Colors, Radius, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: '홈', icon: 'home-outline', activeIcon: 'home' },
  cabinet: { label: '캐비닛', icon: 'folder-outline', activeIcon: 'folder' },
  receipt: { label: '영수증', icon: 'receipt-outline', activeIcon: 'receipt' },
  mypage: { label: '마이', icon: 'person-outline', activeIcon: 'person' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabs = state.routes;
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  const renderTab = (route: (typeof tabs)[number]) => {
    const isFocused = state.index === tabs.indexOf(route);
    const cfg = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'ellipse-outline', activeIcon: 'ellipse' };

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
        <Ionicons
          name={isFocused ? cfg.activeIcon : cfg.icon}
          size={24}
          color={isFocused ? Colors.primary : Colors.gray400}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{cfg.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || Spacing.sm }]}>
      <View style={styles.inner}>
        <View style={styles.side}>{leftTabs.map(renderTab)}</View>

        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => router.push('/camera' as any)}
          activeOpacity={0.85}>
          <Ionicons name="share-outline" size={34} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.side}>{rightTabs.map(renderTab)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  side: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', gap: 2, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs },
  tabLabel: { fontSize: 10, color: Colors.gray400 },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
  cameraBtn: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
});
