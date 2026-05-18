import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  error?: string;
  autoCapitalize?: any;
}

export default function RInput({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, numberOfLines, style, error, autoCapitalize }: Props) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, focused && styles.focused, error && styles.errBorder]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          secureTextEntry={secureTextEntry && !showPass}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && { height: (numberOfLines || 3) * 22, textAlignVertical: 'top' }]}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <Text style={styles.eye}>{showPass ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.err}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 14 },
  label:      { color: COLORS.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14 },
  focused:    { borderColor: COLORS.primary },
  errBorder:  { borderColor: COLORS.error },
  input:      { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 13 },
  eyeBtn:     { padding: 8 },
  eye:        { fontSize: 16 },
  err:        { color: COLORS.error, fontSize: 12, marginTop: 4 },
});
