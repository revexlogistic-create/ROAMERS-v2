import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const { width } = require('react-native').Dimensions.get('window');
const COUNTRIES = ['Maroc', 'France', 'Algérie', 'Tunisie', 'USA', 'UK', 'EAU', 'Espagne', 'Italie', 'Allemagne', 'Autre'];

/* ── Step indicator ─────────────────────────────────────────────────────── */
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[dot.circle, done && dot.done, active && dot.active]}>
        {done
          ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
          : <Text style={[dot.num, active && { color: '#fff' }]}>{n}</Text>
        }
      </View>
    </View>
  );
}
const dot = StyleSheet.create({
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  active: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  done:   { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  num:    { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
});

/* ── Reusable field ─────────────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder, keyboardType = 'default', secureTextEntry = false, multiline = false }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
    </View>
  );
}
const f = StyleSheet.create({
  label: { color: COLORS.sub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
  input: { backgroundColor: '#1a1a1a', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
});

/* ══════════════════════════════════════════════════════════════════════════
   Main
   ══════════════════════════════════════════════════════════════════════════ */
export default function BookingScreen({ route, navigation }: any) {
  const { exp } = route.params;
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  /* Step 1 – Participants */
  const [adults,   setAdults]   = useState(1);
  const [children, setChildren] = useState(0);
  const [date,     setDate]     = useState('');

  /* Step 2 – Contact */
  const [name,    setName]    = useState(user ? `${user.fname} ${user.lname}`.trim() : '');
  const [email,   setEmail]   = useState(user?.email || '');
  const [phone,   setPhone]   = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || 'Maroc');
  const [notes,   setNotes]   = useState('');

  /* Step 3 – Confirm */
  const [loading, setLoading] = useState(false);

  const adultPrice = Number(exp?.price) || 0;
  const childPrice = exp?.pChild != null ? Number(exp.pChild) : adultPrice;
  const total      = adults * adultPrice + children * childPrice;

  /* ── Navigation guards ── */
  function nextStep() {
    if (step === 1) {
      if (!date.trim()) { Alert.alert('Date requise', 'Veuillez indiquer une date de départ.'); return; }
    }
    if (step === 2) {
      if (!name.trim())  { Alert.alert('Nom requis', 'Veuillez entrer votre nom complet.'); return; }
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Email invalide', 'Entrez un email valide.'); return; }
      if (!phone.trim()) { Alert.alert('Téléphone requis', 'Votre numéro WhatsApp / téléphone.'); return; }
    }
    setStep((s) => s + 1);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await createBooking({
        expId:    exp.id,
        date:     date.trim(),
        adults,
        children,
        name:     name.trim(),
        email:    email.trim(),
        phone:    phone.trim(),
        country,
        notes:    notes.trim(),
      });
      navigation.replace('BookingSuccess', { ref: res.booking?.id || res.ref, exp });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
          style={styles.backBtn} activeOpacity={0.7}
        >
          <Text style={styles.backTxt}>{step > 1 ? '‹' : '✕'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réserver</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Step indicators ── */}
      <View style={styles.stepRow}>
        {['Participants', 'Contact', 'Confirmation'].map((label, i) => {
          const n = i + 1;
          return (
            <React.Fragment key={n}>
              <View style={{ alignItems: 'center', gap: 5 }}>
                <StepDot n={n} active={step === n} done={step > n} />
                <Text style={[styles.stepLabel, step === n && { color: COLORS.primary }]}>{label}</Text>
              </View>
              {i < 2 && (
                <View style={[styles.stepLine, step > n && { backgroundColor: '#22c55e' }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Experience summary card ── */}
        <View style={styles.expCard}>
          {exp?.img ? (
            <Image source={{ uri: exp.img }} style={styles.expImg} resizeMode="cover" />
          ) : (
            <View style={[styles.expImg, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 32 }}>🏔️</Text>
            </View>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.expGrad}>
            <Text style={styles.expTitle} numberOfLines={2}>{exp?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
              {exp?.dur  && <Text style={styles.expMeta}>⏱ {exp.dur}</Text>}
              {exp?.loc  && <Text style={styles.expMeta}>📍 {exp.loc}</Text>}
              {exp?.rating && <Text style={styles.expMeta}>⭐ {exp.rating}</Text>}
            </View>
          </LinearGradient>
        </View>

        {/* ═══════════════════════════════
            STEP 1 — Participants & date
            ═══════════════════════════════ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Qui vient avec vous ?</Text>

            {/* Adults */}
            <Text style={styles.fieldLabel}>Adultes</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults(Math.max(1, adults - 1))} activeOpacity={0.7}>
                <Text style={styles.counterBtnTxt}>−</Text>
              </TouchableOpacity>
              <View style={styles.counterVal}>
                <Text style={styles.counterValTxt}>{adults}</Text>
                <Text style={styles.counterValSub}>{adultPrice.toLocaleString('fr-MA')} MAD / pers.</Text>
              </View>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults(Math.min(20, adults + 1))} activeOpacity={0.7}>
                <Text style={styles.counterBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Children */}
            <Text style={styles.fieldLabel}>Enfants <Text style={{ color: COLORS.muted, fontWeight: '400' }}>(–12 ans)</Text></Text>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setChildren(Math.max(0, children - 1))} activeOpacity={0.7}>
                <Text style={styles.counterBtnTxt}>−</Text>
              </TouchableOpacity>
              <View style={styles.counterVal}>
                <Text style={styles.counterValTxt}>{children}</Text>
                <Text style={styles.counterValSub}>
                  {exp?.pChild != null ? `${childPrice.toLocaleString('fr-MA')} MAD / enfant` : 'Tarif adulte appliqué'}
                </Text>
              </View>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setChildren(Math.min(20, children + 1))} activeOpacity={0.7}>
                <Text style={styles.counterBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Date */}
            <Field
              label="Date souhaitée"
              value={date}
              onChange={setDate}
              placeholder="ex: 20 juin 2026"
            />

            {/* Price summary */}
            <View style={styles.priceSummary}>
              {adults > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLbl}>{adults} adulte{adults > 1 ? 's' : ''} × {adultPrice.toLocaleString('fr-MA')} MAD</Text>
                  <Text style={styles.priceAmt}>{(adults * adultPrice).toLocaleString('fr-MA')} MAD</Text>
                </View>
              )}
              {children > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLbl}>{children} enfant{children > 1 ? 's' : ''} × {childPrice.toLocaleString('fr-MA')} MAD</Text>
                  <Text style={styles.priceAmt}>{(children * childPrice).toLocaleString('fr-MA')} MAD</Text>
                </View>
              )}
              <View style={[styles.priceRow, styles.priceTotalRow]}>
                <Text style={styles.priceTotalLbl}>Total estimé</Text>
                <Text style={styles.priceTotalVal}>{total.toLocaleString('fr-MA')} MAD</Text>
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════
            STEP 2 — Contact info
            ═══════════════════════════════ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vos coordonnées</Text>
            {user && (
              <View style={styles.autoFillBanner}>
                <Text style={styles.autoFillTxt}>✅ Pré-rempli depuis votre profil — vérifiez et modifiez si nécessaire</Text>
              </View>
            )}

            <Field label="Nom complet" value={name} onChange={setName} placeholder="Prénom et nom" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="votre@email.com" keyboardType="email-address" />
            <Field label="Téléphone / WhatsApp" value={phone} onChange={setPhone} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Pays de résidence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 16 }}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.countryChip, country === c && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                  onPress={() => setCountry(c)} activeOpacity={0.75}
                >
                  <Text style={[styles.countryChipTxt, country === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field
              label="Message (optionnel)"
              value={notes}
              onChange={setNotes}
              placeholder="Précisez vos demandes spéciales, allergies, régimes…"
              multiline
            />
          </View>
        )}

        {/* ═══════════════════════════════
            STEP 3 — Confirmation
            ═══════════════════════════════ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Récapitulatif</Text>

            {/* Experience */}
            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>🏕️ Expérience</Text>
              <Text style={styles.recapVal}>{exp?.title}</Text>
              {exp?.loc && <Text style={styles.recapSub}>📍 {exp.loc}</Text>}
            </View>

            {/* Participants */}
            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>👥 Participants</Text>
              <Text style={styles.recapVal}>{adults} adulte{adults > 1 ? 's' : ''}{children > 0 ? ` + ${children} enfant${children > 1 ? 's' : ''}` : ''}</Text>
              <Text style={styles.recapSub}>📅 {date}</Text>
            </View>

            {/* Contact */}
            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>📋 Contact</Text>
              <Text style={styles.recapVal}>{name}</Text>
              <Text style={styles.recapSub}>{email}</Text>
              <Text style={styles.recapSub}>{phone}</Text>
            </View>

            {notes ? (
              <View style={styles.recapSection}>
                <Text style={styles.recapHeader}>💬 Message</Text>
                <Text style={styles.recapSub}>{notes}</Text>
              </View>
            ) : null}

            {/* Total */}
            <LinearGradient colors={['#1a000a', '#111']} style={styles.totalCard}>
              <View style={styles.priceRow}>
                <Text style={{ color: COLORS.sub, fontSize: 13 }}>{adults} adulte{adults > 1 ? 's' : ''} × {adultPrice.toLocaleString('fr-MA')} MAD</Text>
                <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{(adults * adultPrice).toLocaleString('fr-MA')} MAD</Text>
              </View>
              {children > 0 && (
                <View style={styles.priceRow}>
                  <Text style={{ color: COLORS.sub, fontSize: 13 }}>{children} enfant{children > 1 ? 's' : ''} × {childPrice.toLocaleString('fr-MA')} MAD</Text>
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{(children * childPrice).toLocaleString('fr-MA')} MAD</Text>
                </View>
              )}
              <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 8 }]}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800' }}>Total estimé</Text>
                <Text style={{ color: COLORS.primary, fontSize: 24, fontWeight: '900' }}>{total.toLocaleString('fr-MA')} MAD</Text>
              </View>
            </LinearGradient>

            <Text style={styles.disclaimer}>
              En confirmant, vous acceptez nos conditions générales. Notre équipe vous contactera dans les 24h pour finaliser votre réservation.
            </Text>
          </View>
        )}

        {/* ── CTA ── */}
        <View style={{ paddingHorizontal: 0, marginTop: 4 }}>
          {step < 3 ? (
            <TouchableOpacity onPress={nextStep} activeOpacity={0.87}>
              <LinearGradient colors={['#d4173a', '#8f1122']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnTxt}>Continuer →</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleConfirm} disabled={loading} activeOpacity={0.87}>
              <LinearGradient colors={['#d4173a', '#8f1122']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.ctaBtnTxt}>◆  Confirmer la réservation</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: COLORS.bg },

  /* header */
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt:     { color: COLORS.text, fontSize: 26, lineHeight: 30 },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },

  /* step indicator */
  stepRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 0 },
  stepLine:  { flex: 1, height: 2, backgroundColor: COLORS.border, marginTop: -14, marginHorizontal: 4 },
  stepLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  /* experience card */
  expCard: { marginHorizontal: 16, marginTop: 16, borderRadius: RADIUS.lg, overflow: 'hidden', height: 160, borderWidth: 1, borderColor: COLORS.border },
  expImg:  { width: '100%', height: '100%', position: 'absolute' },
  expGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingTop: 40 },
  expTitle:{ color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 20 },
  expMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  /* step content */
  stepContent: { paddingHorizontal: 16, paddingTop: 22, gap: 0 },
  stepTitle:   { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 20 },

  /* counter */
  fieldLabel:    { color: COLORS.sub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  counterRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18, overflow: 'hidden' },
  counterBtn:    { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' },
  counterBtnTxt: { color: COLORS.text, fontSize: 24, fontWeight: '300', lineHeight: 28 },
  counterVal:    { flex: 1, alignItems: 'center' },
  counterValTxt: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  counterValSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  /* price summary */
  priceSummary:  { backgroundColor: '#141414', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, marginBottom: 20 },
  priceRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLbl:      { color: COLORS.sub, fontSize: 13 },
  priceAmt:      { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  priceTotalLbl: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  priceTotalVal: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },

  /* auto-fill banner */
  autoFillBanner: { backgroundColor: '#071a09', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: '#22c55e33', marginBottom: 18 },
  autoFillTxt:    { color: '#22c55e', fontSize: 12, lineHeight: 17 },

  /* country chips */
  countryChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#1a1a1a' },
  countryChipTxt: { color: COLORS.sub, fontSize: 13, fontWeight: '600' },

  /* recap */
  recapSection: { backgroundColor: '#1a1a1a', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  recapHeader:  { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  recapVal:     { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  recapSub:     { color: COLORS.sub, fontSize: 13, lineHeight: 18 },
  totalCard:    { borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.primary + '33', marginBottom: 16 },

  /* CTA */
  ctaBtn:    { borderRadius: RADIUS.pill, paddingVertical: 17, alignItems: 'center', marginHorizontal: 16, marginBottom: 24, ...SHADOW.md },
  ctaBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  disclaimer: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginHorizontal: 16, marginBottom: 12 },

  body: { paddingBottom: 24 },
});
