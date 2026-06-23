import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, TextInput, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import GoogleButton from '../components/GoogleButton';
import { COLORS, RADIUS } from '../constants/theme';
import { verifyOtp, resendOtp } from '../services/api';

const OTP_LENGTH   = 6;
const RESEND_DELAY = 60;

/* Country calling codes — Morocco first (default), then common diaspora/MENA/EU */
const COUNTRIES: { code: string; dial: string; flag: string; name: string }[] = [
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Espagne' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgique' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Pays-Bas' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Allemagne' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italie' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Suisse' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'États-Unis / Canada' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Égypte' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Arabie Saoudite' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'Émirats Arabes Unis' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
];

export default function RegisterScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { register, loginWithToken } = useAuth();

  /* ── Form state ─────────────────────────────────────────────── */
  const [form, setForm]     = useState({ fname: '', lname: '', email: '', phone: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Phone country code ─────────────────────────────────────── */
  const [country, setCountry]       = useState(COUNTRIES[0]);   // default Morocco +212
  const [pickerOpen, setPickerOpen] = useState(false);
  /* full phone = dial code + local digits (strip any leading 0 of the local part) */
  const fullPhone = `${country.dial} ${form.phone.replace(/^0+/, '').trim()}`.trim();

  /* ── OTP state ──────────────────────────────────────────────── */
  const [step, setStep]               = useState<'form' | 'otp'>(route?.params?.verifyEmail ? 'otp' : 'form');
  const [maskedPhone, setMaskedPhone] = useState<string>(route?.params?.verifyPhone || '');
  const [regEmail, setRegEmail]       = useState<string>(route?.params?.verifyEmail || '');
  const [devCode, setDevCode]         = useState<string>('');   // code shown when no provider set
  const [channels, setChannels]       = useState<{ wa: boolean; email: boolean }>({ wa: false, email: false });

  const [otp, setOtp]               = useState('');
  const [verifying, setVerifying]   = useState(false);
  const [resending, setResending]   = useState(false);
  const [countdown, setCountdown]   = useState(RESEND_DELAY);
  const otpRef   = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* countdown ticker — restarts each time step becomes 'otp' */
  useEffect(() => {
    if (step !== 'otp') return;
    setCountdown(RESEND_DELAY);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    /* Focus the input after render */
    const t = setTimeout(() => otpRef.current?.focus(), 300);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(t);
    };
  }, [step]);

  /* ── Verify OTP ─────────────────────────────────────────────── */
  const handleVerify = useCallback(async (code: string, email: string) => {
    if (code.length !== OTP_LENGTH) return;
    setVerifying(true);
    try {
      const data = await verifyOtp(email, code);
      await loginWithToken(data.token, data.user);
      navigation.goBack();
    } catch (e: any) {
      setOtp('');
      Alert.alert('Code incorrect', e.message || 'Le code est invalide ou expiré.');
      setTimeout(() => otpRef.current?.focus(), 300);
    } finally {
      setVerifying(false);
    }
  }, [loginWithToken, navigation]);

  function handleOtpChange(t: string) {
    if (verifying) return;
    const clean = t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(clean);
    if (clean.length === OTP_LENGTH) {
      handleVerify(clean, regEmail);
    }
  }

  /* ── Resend code ────────────────────────────────────────────── */
  async function handleResend() {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      const data = await resendOtp(regEmail);
      setMaskedPhone(data.phone || maskedPhone);
      if (data.devCode) setDevCode(data.devCode);
      setChannels({ wa: !!data.waSent, email: !!data.emailSent });
      setOtp('');
      setCountdown(RESEND_DELAY);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
      Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setResending(false);
    }
  }

  /* ── Step 1: Submit registration form ───────────────────────── */
  async function handleRegister() {
    if (!form.fname.trim()) return Alert.alert('Erreur', 'Prénom requis');
    if (!form.lname.trim()) return Alert.alert('Erreur', 'Nom requis');
    if (!form.email.trim())  return Alert.alert('Erreur', 'Email requis');
    if (!form.phone.trim())  return Alert.alert('Erreur', 'Numéro de téléphone requis');
    if (form.password.length < 8) return Alert.alert('Erreur', 'Mot de passe min. 8 caractères');
    if (form.password !== form.confirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');

    setSubmitting(true);
    try {
      const data = await register({
        fname: form.fname, lname: form.lname,
        email: form.email, phone: fullPhone,
        password: form.password,
      });
      if (data.requireVerification) {
        setMaskedPhone(data.phone || fullPhone);
        setRegEmail(data.email  || form.email.toLowerCase().trim());
        if (data.devCode) setDevCode(data.devCode);
        setChannels({ wa: !!data.waSent, email: !!data.emailSent });
        setOtp('');
        setStep('otp');
      } else if (data.token) {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     OTP STEP
  ══════════════════════════════════════════════════════════════ */
  if (step === 'otp') {
    const digits = otp.split('');

    return (
      <LinearGradient colors={['#1a0508', '#0e0e0e']} style={[styles.container, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[styles.scroll, styles.scrollCenter]} keyboardShouldPersistTaps="handled">

            <Text style={styles.logo}>ROAMERS</Text>
            <Text style={styles.title}>Vérification</Text>
            <Text style={styles.sub}>
              {channels.wa && channels.email ? (
                <>Code à 6 chiffres envoyé par WhatsApp et par email.{'\n'}WhatsApp&nbsp;: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{maskedPhone}</Text></>
              ) : channels.email && !channels.wa ? (
                <>Code à 6 chiffres envoyé par email à{'\n'}<Text style={{ color: COLORS.text, fontWeight: '700' }}>{regEmail}</Text></>
              ) : channels.wa && !channels.email ? (
                <>Code à 6 chiffres envoyé sur WhatsApp au{'\n'}<Text style={{ color: COLORS.text, fontWeight: '700' }}>{maskedPhone}</Text></>
              ) : (
                <>Saisissez le code de vérification à 6 chiffres.</>
              )}
            </Text>

            {/* DEV MODE banner — only shown when WhatsApp provider not configured */}
            {!!devCode && (
              <View style={styles.devBanner}>
                <Text style={styles.devLabel}>⚙️  Mode test — code généré :</Text>
                <Text style={styles.devCode}>{devCode}</Text>
              </View>
            )}

            <View style={styles.otpCard}>
              <Text style={styles.otpLabel}>Entrez le code reçu</Text>

              {/*
                Tap-target wrapper: touching anywhere here focuses the hidden input.
                The TextInput sits behind the boxes (absoluteFill, opacity 0.01).
              */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => otpRef.current?.focus()}
                style={styles.otpTapArea}
              >
                {/* Transparent input — full-size so Android can focus it reliably */}
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  caretHidden
                  textContentType="oneTimeCode"
                  style={styles.otpHiddenInput}
                />

                {/* Visual digit boxes — pointer events none so taps reach the input */}
                <View style={styles.otpRow} pointerEvents="none">
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                    const filled  = i < digits.length;
                    const focused = i === digits.length && !verifying;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          filled  && styles.otpBoxFilled,
                          focused && styles.otpBoxFocused,
                        ]}
                      >
                        <Text style={styles.otpDigit}>{digits[i] || ''}</Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>

              <RButton
                label={verifying ? 'Vérification…' : 'Confirmer'}
                onPress={() => handleVerify(otp, regEmail)}
                loading={verifying}
                style={{ marginTop: 20 }}
              />

              <TouchableOpacity
                style={[styles.resendBtn, (countdown > 0 || resending) && styles.resendBtnOff]}
                onPress={handleResend}
                disabled={countdown > 0 || resending}
              >
                <Text style={[styles.resendTxt, (countdown > 0 || resending) && styles.resendTxtOff]}>
                  {resending ? 'Envoi…' : countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('form')}>
              <Text style={styles.backTxt}>‹ Modifier mes informations</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     REGISTRATION FORM
  ══════════════════════════════════════════════════════════════ */
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

            {/* Phone with country calling-code picker */}
            <View style={styles.phoneWrap}>
              <Text style={styles.phoneLabel}>Téléphone *</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.dialBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                  <Text style={styles.dialFlag}>{country.flag}</Text>
                  <Text style={styles.dialCode}>{country.dial}</Text>
                  <Text style={styles.dialChevron}>▾</Text>
                </TouchableOpacity>
                <TextInput
                  value={form.phone}
                  onChangeText={set('phone')}
                  placeholder="6 XX XX XX XX"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
            </View>
            <RInput label="Mot de passe" value={form.password} onChangeText={set('password')} placeholder="Min. 8 caractères" secureTextEntry />
            <RInput label="Confirmer le mot de passe" value={form.confirm} onChangeText={set('confirm')} placeholder="Répéter le mot de passe" secureTextEntry />
            <RButton label="Créer mon compte" onPress={handleRegister} loading={submitting} style={{ marginTop: 8 }} />
            <GoogleButton onDone={() => navigation.goBack()} />
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginTxt}>Déjà un compte ? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Se connecter →</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Indicatif du pays</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item.code === country.code && styles.pickerItemActive]}
                  onPress={() => { setCountry(item); setPickerOpen(false); }}
                >
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  scroll:      { flexGrow: 1, padding: 24 },
  scrollCenter:{ justifyContent: 'center' },
  backBtn:     { marginBottom: 20 },
  backTxt:     { color: COLORS.sub, fontSize: 15 },
  logo:        { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  title:       { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 6 },
  sub:         { color: COLORS.sub, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  form:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  row:         { flexDirection: 'row', gap: 10 },
  loginLink:   { alignItems: 'center', padding: 12 },

  /* Phone field with dial-code picker */
  phoneWrap:   { marginBottom: 14 },
  phoneLabel:  { color: COLORS.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  phoneRow:    { flexDirection: 'row', gap: 8 },
  dialBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  dialFlag:    { fontSize: 18 },
  dialCode:    { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  dialChevron: { color: COLORS.sub, fontSize: 12 },
  phoneInput:  { flex: 1, color: COLORS.text, fontSize: 15, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 13 },

  /* Country picker modal */
  pickerOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerSheet:      { backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingTop: 16, paddingBottom: 32, maxHeight: '70%' },
  pickerTitle:      { color: COLORS.text, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  pickerItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemActive: { backgroundColor: COLORS.card },
  pickerFlag:       { fontSize: 22 },
  pickerName:       { flex: 1, color: COLORS.text, fontSize: 15 },
  pickerDial:       { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  loginTxt:    { color: COLORS.sub, fontSize: 14 },

  /* DEV banner */
  devBanner: {
    backgroundColor: '#1c2a1c',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#3a5a3a',
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  devLabel: { color: '#7ec87e', fontSize: 12, marginBottom: 6 },
  devCode:  { color: '#b5ffb5', fontSize: 28, fontWeight: '900', letterSpacing: 8 },

  /* OTP card */
  otpCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    alignItems: 'center',
  },
  otpLabel: { color: COLORS.sub, fontSize: 13, marginBottom: 16, textAlign: 'center' },

  /* Tap area wraps both the hidden input and visual boxes */
  otpTapArea: {
    height: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Full-size transparent input sitting behind the boxes */
  otpHiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    color: 'transparent',
    fontSize: 1,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  otpBox: {
    width: 44,
    height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled:  { borderColor: COLORS.primary, backgroundColor: '#2a0a0f' },
  otpBoxFocused: { borderColor: COLORS.primary, borderWidth: 2.5 },
  otpDigit:      { color: COLORS.text, fontSize: 22, fontWeight: '800' },

  resendBtn:    { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  resendBtnOff: { opacity: 0.45 },
  resendTxt:    { color: COLORS.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  resendTxtOff: { color: COLORS.sub },
});
