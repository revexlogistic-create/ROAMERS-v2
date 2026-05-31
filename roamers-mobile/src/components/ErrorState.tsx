import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import Icon from './Icons';

interface Props {
  /** Optional custom title. Defaults to a friendly connection message. */
  title?: string;
  /** Optional custom subtitle / hint line. */
  subtitle?: string;
  /** Called when the user taps "Réessayer". */
  onRetry: () => void;
  /** Shrinks paddings for use inside smaller cards/sections. */
  compact?: boolean;
}

/**
 * Friendly network/error state with a retry button. Replaces silent
 * empty screens when an API call fails (no connection, server down…).
 */
export default function ErrorState({ title, subtitle, onRetry, compact }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.iconCircle}>
        <Icon.Compass size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{title || 'Connexion impossible'}</Text>
      <Text style={styles.sub}>
        {subtitle || 'Vérifiez votre connexion internet et réessayez.'}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={styles.btnTxt}>↻  Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 6 },
  wrapCompact: { paddingVertical: 28 },
  iconCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title:       { color: COLORS.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  sub:         { color: COLORS.sub, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 18 },
  btn:         { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.pill },
  btnTxt:      { color: '#fff', fontWeight: '800', fontSize: 14 },
});
