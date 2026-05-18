import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendContact, getSiteConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

const DEFAULTS = {
  whatsapp: '212600000000',
  phone:    '+212 6 00 00 00 00',
  email:    'hello@roamerscommunity.ma',
  address:  'Casablanca, Maroc',
  hours:    'Lun–Sam : 9h–19h',
};

export default function ContactScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [config, setConfig] = useState(DEFAULTS);
  const [form, setForm] = useState({
    fname: user?.fname || '', email: user?.email || '',
    phone: user?.phone || '', subject: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getSiteConfig().then((cfg) => {
      setConfig({
        whatsapp: cfg.whatsapp || DEFAULTS.whatsapp,
        phone:    cfg.phone    || DEFAULTS.phone,
        email:    cfg.email    || DEFAULTS.email,
        address:  cfg.address  || DEFAULTS.address,
        hours:    cfg.hours    || DEFAULTS.hours,
      });
    }).catch(() => {});
  }, []);

  async function submit() {
    if (!form.fname.trim())   return Alert.alert('Erreur', 'Nom requis');
    if (!form.email.trim())   return Alert.alert('Erreur', 'Email requis');
    if (!form.message.trim()) return Alert.alert('Erreur', 'Message requis');
    setLoading(true);
    try {
      await sendContact({ ...form, consentGiven: true });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <View style={[styles.successWrap, { paddingTop: insets.top }]}>
      <Text style={styles.successIcon}>📬</Text>
      <Text style={styles.successTitle}>Message envoyé !</Text>
      <Text style={styles.successSub}>Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.</Text>
      <RButton label="Retour à l'accueil" onPress={() => navigation.navigate('Home')} style={{ marginTop: 24, minWidth: 200 }} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#001a12', '#0e0e0e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrowTxt}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>ROAMERS</Text>
        <Text style={styles.headerTitle}>Contact</Text>
        <Text style={styles.headerSub}>Nous sommes à votre écoute</Text>
      </LinearGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Quick contact buttons */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.waBtn} onPress={() => Linking.openURL(`https://wa.me/${config.whatsapp}`)} activeOpacity={0.85}>
              <Text style={styles.waBtnIcon}>💬</Text>
              <Text style={styles.waBtnTxt}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${config.phone}`)} activeOpacity={0.85}>
              <Text style={styles.callBtnIcon}>📞</Text>
              <Text style={styles.callBtnTxt}>Appeler</Text>
            </TouchableOpacity>
          </View>

          {/* Info cards */}
          <View style={styles.infoGrid}>
            {[
              { icon: '📍', label: 'Adresse', val: config.address },
              { icon: '🕐', label: 'Horaires', val: config.hours },
              { icon: '📧', label: 'Email', val: config.email },
            ].map((item, i, arr) => (
              <View key={i} style={[styles.infoCard, i === arr.length - 1 && { marginRight: 0 }]}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <Text style={styles.infoLbl}>{item.label}</Text>
                <Text style={styles.infoVal}>{item.val}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Envoyer un message</Text>
          <RInput label="Votre nom" value={form.fname} onChangeText={set('fname')} placeholder="Prénom Nom" />
          <RInput label="Email" value={form.email} onChangeText={set('email')} placeholder="email@exemple.com" keyboardType="email-address" autoCapitalize="none" />
          <RInput label="Téléphone (optionnel)" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
          <RInput label="Sujet (optionnel)" value={form.subject} onChangeText={set('subject')} placeholder="Objet de votre message" />
          <RInput label="Message" value={form.message} onChangeText={set('message')} placeholder="Votre message..." multiline numberOfLines={5} />

          <RButton label="Envoyer" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  header:       { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  logo:         { color: '#059669', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  headerTitle:  { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  headerSub:    { color: COLORS.sub, fontSize: 13 },
  backArrow:    { marginBottom: 10 },
  backArrowTxt: { color: COLORS.sub, fontSize: 14, fontWeight: '700' },

  scroll:       { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  successWrap:  { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon:  { fontSize: 64, marginBottom: 20 },
  successTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  successSub:   { color: COLORS.sub, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  quickRow:     { flexDirection: 'row', marginBottom: 24 },
  waBtn:        { flex: 1, backgroundColor: '#25D366', borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginRight: 10 },
  waBtnIcon:    { fontSize: 20, marginRight: 8 },
  waBtnTxt:     { color: '#fff', fontWeight: '800', fontSize: 15 },
  callBtn:      { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'center' },
  callBtnIcon:  { fontSize: 20, marginRight: 8 },
  callBtnTxt:   { color: COLORS.text, fontWeight: '700', fontSize: 15 },

  infoGrid:     { flexDirection: 'row', marginBottom: 28 },
  infoCard:     { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginRight: 8 },
  infoIcon:     { fontSize: 22, marginBottom: 6 },
  infoLbl:      { color: COLORS.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoVal:      { color: COLORS.text, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 16, marginTop: 8 },
});
