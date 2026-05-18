import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right && <View style={styles.rightSlot}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  row:     { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  backIcon:{ color: COLORS.text, fontSize: 24, lineHeight: 28, marginTop: -2 },
  title:   { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sub:     { color: COLORS.sub, fontSize: 13, marginTop: 2 },
  rightSlot:{ marginLeft: 8 },
});
