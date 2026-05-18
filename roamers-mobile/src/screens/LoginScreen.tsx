import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (!email.trim() || !password) return Alert.alert('Erreur', 'Email et mot de passe requis');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Connexion échouée', e.message || 'Email ou mot de passe incorrect');
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

          <View style={styles.top}>
            <Text style={styles.logo}>ROAMERS</Text>
            <Text style={styles.title}>Bienvenue</Text>
            <Text style={styles.sub}>Connectez-vous pour accéder à vos réservations et favoris.</Text>
          </View>

          <View style={styles.form}>
            <RInput label="Email" value={email} onChangeText={setEmail} placeholder="email@exemple.com" keyboardType="email-address" autoCapitalize="none" />
            <RInput label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            <RButton label="Se connecter" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <TouchableOpacity style={styles.registerLink} onPress={() => navigation.replace('Register')}>
            <Text style={styles.registerTxt}>Pas encore de compte ? <Text style={styles.registerEm}>Créer un compte →</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { flexGrow: 1, padding: 24 },
  backBtn:      { marginBottom: 24 },
  backTxt:      { color: COLORS.sub, fontSize: 15 },
  top:          { marginBottom: 36 },
  logo:         { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
  title:        { color: COLORS.text, fontSize: 30, fontWeight: '900', marginBottom: 8 },
  sub:          { color: COLORS.sub, fontSize: 15, lineHeight: 22 },
  form:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  registerLink: { alignItems: 'center', padding: 12 },
  registerTxt:  { color: COLORS.sub, fontSize: 14 },
  registerEm:   { color: COLORS.primary, fontWeight: '700' },
});
