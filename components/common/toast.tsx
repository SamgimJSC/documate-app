import { Colors, Radius, Spacing } from '@/constants/theme';
import { ToastType, useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISMISS_DURATION = 3000;

// 타입별 아이콘 + 색 (theme의 success/error/primary 토큰 사용)
const TYPE_CONFIG: Record<
  ToastType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  success: { icon: 'checkmark-circle', color: Colors.success },
  error: { icon: 'alert-circle', color: Colors.error },
  info: { icon: 'information-circle', color: Colors.primary },
};

export function Toast() {
  const { payload, hide } = useToastStore();
  const insets = useSafeAreaInsets();

  // 아래쪽에서 올라오므로 시작값은 +120 (화면 밖 아래)
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
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
        toValue: 120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  }

  function dismiss() {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    animateOut(() => hide());
  }

  if (!payload) return null;

  const config = TYPE_CONFIG[payload.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 24,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.card}>
        <Ionicons name={config.icon} size={22} color={config.color} />
        <Text style={styles.message} numberOfLines={3}>
          {payload.message}
        </Text>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={16} color={Colors.gray400} />
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray900,
    lineHeight: 19,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});