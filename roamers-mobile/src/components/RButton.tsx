import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
}

export default function RButton({ label, onPress, loading, variant = 'primary', style, disabled }: Props) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        !isPrimary && !isOutline && styles.ghost,
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? '#fff' : COLORS.primary} size="small" />
        : <Text style={[styles.label, isOutline && styles.labelOutline, (!isPrimary && !isOutline) && styles.labelGhost]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:         { paddingVertical: 14, paddingHorizontal: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  primary:      { backgroundColor: COLORS.primary },
  outline:      { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: 'transparent' },
  ghost:        { backgroundColor: 'transparent' },
  label:        { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  labelOutline: { color: COLORS.primary },
  labelGhost:   { color: COLORS.sub },
});
