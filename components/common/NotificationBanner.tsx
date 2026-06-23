import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNotificationBannerStore } from '@/stores/notification-banner-store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISMISS_DURATION = 4000;

export function NotificationBanner() {
  const { payload, hide } = useNotificationBannerStore();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (payload) {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 260,
          mass: 0.8,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 260,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      autoHideTimer.current = setTimeout(() => dismiss(), DISMISS_DURATION);
    } else {
      animateOut();
    }

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [payload]);

  function animateOut(cb?: () => void) {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  }

  function dismiss() {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    animateOut(() => hide());
  }

  function handleTap() {
    if (!payload) return;
    dismiss();
    if (payload.data?.document_id) {
      router.push(`/document/${payload.data.document_id}` as any);
    } else {
      router.push('/notification' as any);
    }
  }

  if (!payload) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={handleTap}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* 상단 행: 앱 이름 + 닫기 버튼 */}
        <View style={styles.topRow}>
          <View style={styles.appLabel}>
            <Ionicons name="notifications" size={11} color={Colors.primary} />
            <Text style={styles.appName}>Documate</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={14} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* 본문 행: 아이콘 + 텍스트 */}
        <View style={styles.bodyRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>{payload.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{payload.body}</Text>
          </View>
        </View>

      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray900,
    lineHeight: 19,
  },
  body: {
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },

});
