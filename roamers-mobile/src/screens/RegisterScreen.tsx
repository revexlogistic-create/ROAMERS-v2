import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

export default function RegisterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({ fname: '', lname: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.fname.trim()) return Alert.alert('Erreur', 'Prénom requis');
    if (!form.lname.trim()) return Alert.alert('Erreur', 'Nom requis');
    if (!form.email.trim())  return Alert.alert('Erreur', 'Email requis');
    if (form.password.length < 8) return Alert.alert('Erreur', 'Mot de passe min. 8 caractères');
    if (!form.phone.trim()) return Alert.alert('Erreur', 'Numéro de téléphone requis');
    if (form.password !== form.confirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    setLoading(true);
    try {
      await register({ fname: form.fname, lname: form.lname, email: form.email, phone: form.phone, password: form.password });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#1a0508', '#0e0e0e']} style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backTxt}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>ROAMERS</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.sub}>Rejoignez la communauté des explorateurs du Maroc.</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <RInput label="Prénom" value={form.fname} onChangeText={set('fname')} placeholder="Prénom" />
              </View>
              <View style={{ flex: 1 }}>
                <RInput label="Nom" value={form.lname} onChangeText={set('lname')} placeholder="Nom" />
              </View>
            </View>
            <RInput label="Email" value={form.email} onChangeText={set('email')} placeholder="email@exemple.com" keyboardType="email-address" autoCapitalize="none" />
            <RInput label="Téléphone *" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
            <RInput label="Mot de passe" value={form.password} onChangeText={set('password')} placeholder="Min. 8 caractères" secureTextEntry />
            <RInput label="Confirmer le mot de passe" value={form.confirm} onChangeText={set('confirm')} placeholder="Répéter le mot de passe" secureTextEntry />
            <RButton label="Créer mon compte" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginTxt}>Déjà un compte ? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Se connecter →</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { flexGrow: 1, padding: 24 },
  backBtn:   { marginBottom: 20 },
  backTxt:   { color: COLORS.sub, fontSize: 15 },
  logo:      { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  title:     { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 6 },
  sub:       { color: COLORS.sub, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  form:      { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  row:       { flexDirection: 'row', gap: 10 },
  loginLink: { alignItems: 'center', padding: 12 },
  loginTxt:  { color: COLORS.sub, fontSize: 14 },
});
