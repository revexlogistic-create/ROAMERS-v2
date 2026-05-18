import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const PAX_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function BookingScreen({ route, navigation }: any) {
  const { exp } = route.params;
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [date,    setDate]    = useState('');
  const [pax,     setPax]     = useState(1);
  const [message, setMessage] = useState('');
  const [pay,     setPay]     = useState<'virement' | 'card'>('virement');
  const [loading, setLoading] = useState(false);

  const priceTotal = (exp?.price || 0) * pax;

  async function handleBook() {
    if (!date.trim()) { Alert.alert('Date requise', 'Veuillez entrer une date de départ.'); return; }
    setLoading(true);
    try {
      const res = await createBooking({
        expId:   exp.id,
        pax,
        date:    date.trim(),
        message: message.trim(),
        payMethod: pay,
      });
      navigation.replace('BookingSuccess', { ref: res.booking?.ref || res.ref, exp });
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Une erreur est survenue. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réserver</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Experience summary */}
        <View style={styles.expCard}>
          <Text style={styles.expTitle} numberOfLines={2}>{exp?.title}</Text>
          <Text style={styles.expSub}>{exp?.duration} · {exp?.location}</Text>
          <Text style={styles.expPrice}>{exp?.price} MAD / pers.</Text>
        </View>

        {/* Date */}
        <Text style={styles.label}>Date souhaitée</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="ex: 15 juin 2026"
          placeholderTextColor={COLORS.muted}
        />

        {/* Participants */}
        <Text style={styles.label}>Nombre de participants</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {PAX_OPTIONS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.paxBtn, pax === n && styles.paxBtnActive]}
              onPress={() => setPax(n)}
              activeOpacity={0.75}
            >
              <Text style={[styles.paxBtnTxt, pax === n && styles.paxBtnTxtActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLbl}>Total estimé</Text>
          <Text style={styles.totalVal}>{priceTotal.toLocaleString()} MAD</Text>
        </View>

        {/* Payment method */}
        <Text style={styles.label}>Mode de paiement</Text>
        <TouchableOpacity
          style={[styles.payOption, pay === 'virement' && styles.payOptionActive]}
          onPress={() => setPay('virement')}
          activeOpacity={0.8}
        >
          <Text style={styles.payIcon}>🏦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>Virement bancaire</Text>
            <Text style={styles.paySub}>Nous vous enverrons les coordonnées bancaires</Text>
          </View>
          {pay === 'virement' && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payOption, pay === 'card' && styles.payOptionActive]}
          onPress={() => setPay('card')}
          activeOpacity={0.8}
        >
          <Text style={styles.payIcon}>💳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>Carte bancaire</Text>
            <Text style={styles.paySub}>Paiement sécurisé en ligne</Text>
          </View>
          {pay === 'card' && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>

        {/* Message */}
        <Text style={styles.label}>Message (optionnel)</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Précisez vos besoins, demandes spéciales..."
          placeholderTextColor={COLORS.muted}
          multiline
        />

        {/* CTA */}
        <TouchableOpacity onPress={handleBook} disabled={loading} activeOpacity={0.88} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={['#d4173a', '#8f1122']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaBtnTxt}>◆  Confirmer la réservation</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          En réservant, vous acceptez nos conditions générales. Votre réservation sera confirmée sous 24h.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt:      { color: COLORS.sub, fontSize: 18 },
  headerTitle:  { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  body:         { padding: 20, paddingBottom: 48 },

  expCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  expTitle:   { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  expSub:     { color: COLORS.sub, fontSize: 13, marginBottom: 6 },
  expPrice:   { color: COLORS.primary, fontSize: 15, fontWeight: '700' },

  label:   { color: COLORS.sub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },

  paxBtn: {
    width: 44, height: 44, borderRadius: 22, marginRight: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  paxBtnActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  paxBtnTxt:       { color: COLORS.sub, fontWeight: '700', fontSize: 15 },
  paxBtnTxtActive: { color: '#fff' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a0508', borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: '#3a0a14', marginBottom: 24,
  },
  totalLbl: { color: COLORS.sub, fontSize: 14 },
  totalVal: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },

  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: '#1a0508' },
  payIcon:   { fontSize: 22 },
  payTitle:  { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  paySub:    { color: COLORS.muted, fontSize: 12 },
  checkMark: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },

  ctaBtn: {
    borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center',
    ...SHADOW.md,
  },
  ctaBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  disclaimer: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
