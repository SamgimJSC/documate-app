import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface PinPadProps {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PinPad({ value, onChange, maxLength = 6 }: PinPadProps) {
  const handlePress = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key && value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.pad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[styles.key, !key && styles.keyEmpty]}
                onPress={() => handlePress(key)}
                disabled={!key && key !== '0'}
                activeOpacity={key ? 0.7 : 1}>
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={24} color={Colors.gray700} />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.xl },
  dots: { flexDirection: 'row', gap: Spacing.md },
  dot: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.primary },
  pad: { gap: Spacing.sm, width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  key: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: '500', color: Colors.gray900 },
});
