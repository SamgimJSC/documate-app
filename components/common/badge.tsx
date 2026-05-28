import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'pro' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'info' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  success: { backgroundColor: Colors.successLight },
  warning: { backgroundColor: Colors.warningLight },
  error: { backgroundColor: Colors.errorLight },
  info: { backgroundColor: Colors.primaryLight },
  pro: { backgroundColor: Colors.proLight },
  gray: { backgroundColor: Colors.gray100 },

  text: { fontSize: 11, fontWeight: '600' },
  text_success: { color: Colors.success },
  text_warning: { color: Colors.warning },
  text_error: { color: Colors.error },
  text_info: { color: Colors.primary },
  text_pro: { color: Colors.pro },
  text_gray: { color: Colors.gray600 },
});
