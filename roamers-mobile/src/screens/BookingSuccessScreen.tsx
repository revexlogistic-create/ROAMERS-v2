import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../constants/theme';

export default function BookingSuccessScreen({ route, navigation }: any) {
  const { ref, exp } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#0e0e0e', '#1a0508', '#0e0e0e']} style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>✅</Text>
      </View>
      <Text style={styles.title}>Réservation confirmée !</Text>
      <Text style={styles.sub}>Votre demande a bien été reçue. Notre équipe vous contactera dans les 24h.</Text>

      <View style={styles.refCard}>
        <Text style={styles.refLbl}>Référence</Text>
        <Text style={styles.refVal}>{ref}</Text>
        <View style={styles.divider} />
        <Text style={styles.refExp}>{exp?.title}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MyBookings')} activeOpacity={0.85}>
          <Text style={styles.primaryBtnTxt}>Voir mes réservations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.8}>
          <Text style={styles.ghostBtnTxt}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  iconWrap:     { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  icon:         { fontSize: 44 },
  title:        { color: COLORS.text, fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  sub:          { color: COLORS.sub, fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 32 },
  refCard:      { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 24, width: '100%', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 32 },
  refLbl:       { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  refVal:       { color: COLORS.primary, fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 14 },
  divider:      { width: '100%', height: 1, backgroundColor: COLORS.border, marginBottom: 14 },
  refExp:       { color: COLORS.sub, fontSize: 14, textAlign: 'center' },
  actions:      { width: '100%', gap: 12 },
  primaryBtn:   { backgroundColor: COLORS.primary, padding: 15, borderRadius: RADIUS.pill, alignItems: 'center' },
  primaryBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 15 },
  ghostBtn:     { padding: 15, alignItems: 'center' },
  ghostBtnTxt:  { color: COLORS.sub, fontSize: 15 },
});
