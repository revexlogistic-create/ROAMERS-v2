import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendTeam } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');
const COL2 = (width - 32 - 10) / 2;

/* ── Data ──────────────────────────────────────────────────────────────── */

const INDUSTRIES = [
  'Finance & Banque', 'Industrie & BTP', 'Technologie & IT', 'Santé & Pharma',
  'Agroalimentaire', 'Conseil & Audit', 'Assurances', 'Énergie & Mines',
  'Distribution & Retail', 'Télécommunications', 'ONG / Secteur public', 'Autre',
];

const CORP_SIZES = [
  '< 50 employés', '50–200', '200–500', '500–1000', '1000–5000', '5000+',
];

const GROUP_SIZES = [
  { key: '<10',     label: '< 10',    sub: 'Petit groupe',   icon: '👥' },
  { key: '10-25',   label: '10–25',   sub: 'Groupe moyen',   icon: '🧑‍🤝‍🧑' },
  { key: '25-50',   label: '25–50',   sub: 'Grand groupe',   icon: '🎪' },
  { key: '50-100',  label: '50–100',  sub: 'Corporate',      icon: '🏢' },
  { key: '100-200', label: '100–200', sub: 'Large corporate', icon: '🏟️' },
  { key: '200+',    label: '200+',    sub: 'Événement',      icon: '🎊' },
];

const DURATIONS = [
  { key: 'demi',    label: 'Demi-journée' },
  { key: '1j',      label: 'Journée' },
  { key: '1n2j',    label: '1 nuit / 2j' },
  { key: '2n3j',    label: '2 nuits / 3j' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'flex',    label: 'Flexible ✦' },
];

const LOCATIONS = [
  { key: 'atlas',  label: 'Atlas & Vallées',  sub: 'Randonnée · Cohésion', icon: '⛰️', color: '#16A34A', bg: '#001a08' },
  { key: 'desert', label: 'Désert Saharien',  sub: 'Bivouac · Sahara',     icon: '🏜️', color: '#D97706', bg: '#1a1000' },
  { key: 'coast',  label: 'Côte Atlantique',  sub: 'Agadir · Essaouira',   icon: '🌊', color: '#2563EB', bg: '#00091a' },
  { key: 'medina', label: 'Médina de Ville',  sub: 'Marrakech · Fes',      icon: '🏛️', color: '#7C3AED', bg: '#0e0018' },
];

const PROGRAMS = [
  { key: 'outdoor',    label: 'Défi Outdoor',         sub: 'Challenges · Parcours', icon: '🏃', color: '#16A34A' },
  { key: 'leadership', label: 'Leadership & Com.',     sub: 'Ateliers certifiés',    icon: '🎯', color: '#2563EB' },
  { key: 'cooking',    label: 'Cooking Challenge',     sub: 'Cuisine marocaine',     icon: '👨‍🍳', color: '#D97706' },
  { key: 'culture',    label: 'Immersion Culturelle',  sub: 'Médina · Artisanat',    icon: '🏛️', color: '#7C3AED' },
  { key: 'desert_ret', label: 'Retraite Désert',       sub: 'Bivouac · Étoiles',     icon: '🏕️', color: '#B45309' },
  { key: 'csr',        label: 'CSR & Impact Social',   sub: 'Volontariat local',     icon: '🌱', color: '#059669' },
  { key: 'seminaire',  label: 'Séminaire Stratégique', sub: 'Innovation en nature',  icon: '💡', color: '#1D4ED8' },
  { key: 'mesure',     label: 'Sur Mesure',            sub: 'Combinaison libre',     icon: '✂️', color: '#B8172E' },
];

const OBJECTIVES = [
  { key: "Cohésion d'équipe",           icon: '🤝' },
  { key: 'Développement leadership',    icon: '🚀' },
  { key: 'Communication interne',       icon: '💬' },
  { key: 'Motivation & engagement',     icon: '⚡' },
  { key: 'Onboarding nouveaux membres', icon: '👋' },
  { key: 'Gestion du stress',           icon: '🧘' },
  { key: 'Innovation & créativité',     icon: '💡' },
  { key: 'Impact RSE / social',         icon: '🌱' },
  { key: 'Célébration & récompense',    icon: '🏆' },
  { key: 'Réflexion stratégique',       icon: '🎯' },
];

const BUDGETS = [
  { key: '<500',      label: '< 500 MAD/pers.' },
  { key: '500-1000',  label: '500–1 000 MAD' },
  { key: '1000-2000', label: '1 000–2 000 MAD' },
  { key: '2000-4000', label: '2 000–4 000 MAD' },
  { key: '4000+',     label: '4 000+ MAD' },
  { key: 'discuss',   label: 'À discuter' },
];

const NEEDS = [
  { key: 'tbneed_diet',     label: '🥗 Régimes alimentaires' },
  { key: 'tbneed_mobility', label: '♿ Mobilité réduite' },
  { key: 'tbneed_lang',     label: '🌐 Groupe multilingue' },
  { key: 'tbneed_invoice',  label: '🧾 Facturation entreprise' },
  { key: 'tbneed_cert',     label: '📜 Attestations participation' },
  { key: 'tbneed_photo',    label: '📸 Couverture photo/vidéo' },
  { key: 'tbneed_debrief',  label: '📋 Rapport de facilitation' },
  { key: 'tbneed_transfer', label: '🚌 Transport depuis ville' },
];

const STEPS = ['Entreprise', 'Programme', 'Objectifs'];

/* ── helpers ────────────────────────────────────────────────────────────── */
function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

/* ── Step bar ───────────────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  return (
    <View style={sb.wrap}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <View style={sb.item}>
            <View style={[sb.dot, i < step && sb.dotDone, i === step && sb.dotActive]}>
              <Text style={[sb.dotTxt, i <= step && sb.dotTxtActive]}>
                {i < step ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[sb.label, i === step && sb.labelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[sb.line, i < step && sb.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function TeamScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    company: '', industry: '', corpSize: '', city: '',
    contactFn: user?.fname || '', contactLn: user?.lname || '',
    contactRole: '', email: user?.email || '', phone: user?.phone || '',
    groupSize: '', groupExact: '', duration: '', location: '',
    programs: [] as string[], dateFrom: '', dateTo: '', flexDate: false,
    objectives: [] as string[], budget: '', needs: [] as string[], notes: '',
  });

  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));
  const tog = (k: 'programs' | 'objectives' | 'needs') => (v: string) =>
    setForm((f) => ({ ...f, [k]: toggle(f[k], v) }));

  if (sent) return (
    <View style={[styles.successWrap, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#10102a', '#0e0e0e']} style={StyleSheet.absoluteFill} />
      <Text style={styles.successIcon}>🏆</Text>
      <Text style={styles.successTitle}>Demande reçue !</Text>
      <Text style={styles.successSub}>
        Notre équipe vous contactera sous 24h avec une proposition sur mesure pour votre entreprise.
      </Text>
      <RButton label="Retour à l'accueil" onPress={() => navigation.navigate('Home')} style={{ marginTop: 28, minWidth: 220 }} />
    </View>
  );

  function nextStep() {
    if (step === 0) {
      if (!form.company.trim()) return Alert.alert('Erreur', "Nom de l'entreprise requis");
      if (!form.contactFn.trim()) return Alert.alert('Erreur', 'Prénom requis');
      if (!form.email.trim()) return Alert.alert('Erreur', 'Email requis');
      if (!form.phone.trim()) return Alert.alert('Erreur', 'Téléphone requis');
    }
    if (step < 2) { setStep((s) => s + 1); return; }
    submit();
  }

  async function submit() {
    setLoading(true);
    try {
      await sendTeam({ ...form, consentGiven: true });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally { setLoading(false); }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#10102a', '#0e0e0e']} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backArrow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrowTxt}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>ROAMERS</Text>
        <Text style={styles.headerTitle}>Team Building</Text>
        <Text style={styles.headerSub}>Proposition sur mesure pour votre entreprise</Text>
      </LinearGradient>

      <StepBar step={step} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══ STEP 0 — Entreprise ══════════════════════════════════════ */}
          {step === 0 && (<>

            <Text style={styles.qTitle}>🏢 Votre entreprise</Text>
            <RInput
              label="Nom de l'entreprise *"
              value={form.company}
              onChangeText={set('company')}
              placeholder="OCP Group, Marjane, Lydec…"
            />
            <RInput
              label="Ville / Pays"
              value={form.city}
              onChangeText={set('city')}
              placeholder="Casablanca, Rabat, Paris…"
            />

            <Text style={[styles.qTitle, { marginTop: 24 }]}>💼 Secteur d'activité</Text>
            <View style={styles.pillWrap}>
              {INDUSTRIES.map((ind) => {
                const active = form.industry === ind;
                return (
                  <TouchableOpacity
                    key={ind}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('industry')(form.industry === ind ? '' : ind)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{ind}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.qTitle, { marginTop: 24 }]}>📊 Taille de l'entreprise</Text>
            <View style={styles.pillWrap}>
              {CORP_SIZES.map((cs) => {
                const active = form.corpSize === cs;
                return (
                  <TouchableOpacity
                    key={cs}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('corpSize')(form.corpSize === cs ? '' : cs)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{cs}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>CONTACT RESPONSABLE</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <RInput label="Prénom *" value={form.contactFn} onChangeText={set('contactFn')} placeholder="Prénom" />
              </View>
              <View style={{ flex: 1 }}>
                <RInput label="Nom" value={form.contactLn} onChangeText={set('contactLn')} placeholder="Nom" />
              </View>
            </View>
            <RInput label="Fonction / Poste" value={form.contactRole} onChangeText={set('contactRole')} placeholder="DRH, Responsable RH…" />
            <RInput label="Email professionnel *" value={form.email} onChangeText={set('email')} placeholder="contact@entreprise.ma" keyboardType="email-address" autoCapitalize="none" />
            <RInput label="Téléphone / WhatsApp *" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
          </>)}

          {/* ══ STEP 1 — Programme ═══════════════════════════════════════ */}
          {step === 1 && (<>

            {/* Group size */}
            <Text style={styles.qTitle}>👥 Taille du groupe</Text>
            <View style={styles.grid2}>
              {GROUP_SIZES.map((g) => {
                const active = form.groupSize === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.infoCard, active && styles.infoCardActive]}
                    onPress={() => set('groupSize')(form.groupSize === g.key ? '' : g.key)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.infoIcon}>{g.icon}</Text>
                    <Text style={[styles.infoLabel, active && styles.infoLabelActive]}>{g.label}</Text>
                    <Text style={styles.infoSub}>{g.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <RInput
              label="Nombre exact (optionnel)"
              value={form.groupExact}
              onChangeText={set('groupExact')}
              placeholder="ex : 42 participants"
              keyboardType="numeric"
            />

            {/* Duration */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>⏱ Durée souhaitée</Text>
            <View style={styles.pillWrap}>
              {DURATIONS.map((d) => {
                const active = form.duration === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('duration')(form.duration === d.key ? '' : d.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location — colored mood-style cards */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>🗺️ Cadre / Lieu</Text>
            <View style={styles.grid2}>
              {LOCATIONS.map((loc) => {
                const active = form.location === loc.key;
                return (
                  <TouchableOpacity
                    key={loc.key}
                    style={[
                      styles.locCard,
                      { backgroundColor: loc.bg, borderColor: active ? loc.color : '#2a2a2a' },
                      active && { borderWidth: 2 },
                    ]}
                    onPress={() => set('location')(form.location === loc.key ? '' : loc.key)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.locAccent, { backgroundColor: loc.color }]} />
                    <Text style={styles.locIcon}>{loc.icon}</Text>
                    <Text style={[styles.locLabel, active && { color: loc.color }]}>{loc.label}</Text>
                    <Text style={styles.locSub}>{loc.sub}</Text>
                    {active && (
                      <View style={[styles.locCheck, { backgroundColor: loc.color }]}>
                        <Text style={styles.locCheckTxt}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Programs — colored segment-style cards */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>
              🎪 Types de programmes{' '}
              <Text style={styles.multiHint}>(plusieurs choix)</Text>
            </Text>
            <View style={styles.grid2}>
              {PROGRAMS.map((p) => {
                const active = form.programs.includes(p.key);
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.progCard,
                      active && { borderColor: p.color, backgroundColor: p.color + '18' },
                    ]}
                    onPress={() => tog('programs')(p.key)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.progIconWrap, { backgroundColor: p.color + '22' }]}>
                      <Text style={styles.progIcon}>{p.icon}</Text>
                    </View>
                    <Text style={[styles.progLabel, active && { color: p.color }]}>{p.label}</Text>
                    <Text style={styles.progSub}>{p.sub}</Text>
                    {active && (
                      <View style={[styles.progCheck, { backgroundColor: p.color }]}>
                        <Text style={styles.progCheckTxt}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dates */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>📅 Dates souhaitées</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <RInput label="Date de début" value={form.dateFrom} onChangeText={set('dateFrom')} placeholder="ex : 15 oct. 2025" />
              </View>
              <View style={{ flex: 1 }}>
                <RInput label="Date de fin" value={form.dateTo} onChangeText={set('dateTo')} placeholder="ex : 17 oct. 2025" />
              </View>
            </View>
            <TouchableOpacity style={styles.checkRow} onPress={() => set('flexDate')(!form.flexDate)}>
              <View style={[styles.checkbox, form.flexDate && styles.checkboxOn]}>
                {form.flexDate && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>Dates flexibles — je peux adapter selon les disponibilités</Text>
            </TouchableOpacity>
          </>)}

          {/* ══ STEP 2 — Objectifs ══════════════════════════════════════ */}
          {step === 2 && (<>

            {/* Hero banner */}
            <View style={styles.contactHero}>
              <LinearGradient colors={['#10102a', '#0e1520']} style={StyleSheet.absoluteFill} />
              <Text style={styles.contactHeroEmoji}>🎯</Text>
              <Text style={styles.contactHeroTitle}>Objectifs & contraintes</Text>
              <Text style={styles.contactHeroSub}>Pour mesurer l'impact réel de l'expérience</Text>
            </View>

            {/* Objectives */}
            <Text style={styles.qTitle}>
              🏆 Objectifs prioritaires{' '}
              <Text style={styles.multiHint}>(plusieurs choix)</Text>
            </Text>
            <View style={styles.objGrid}>
              {OBJECTIVES.map((obj) => {
                const active = form.objectives.includes(obj.key);
                return (
                  <TouchableOpacity
                    key={obj.key}
                    style={[styles.objChip, active && styles.objChipActive]}
                    onPress={() => tog('objectives')(obj.key)}
                    activeOpacity={0.78}
                  >
                    <Text style={styles.objIcon}>{obj.icon}</Text>
                    <Text style={[styles.objTxt, active && styles.objTxtActive]}>{obj.key}</Text>
                    {active && <Text style={styles.objCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Budget */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>💰 Budget par participant</Text>
            <View style={styles.pillWrap}>
              {BUDGETS.map((b) => {
                const active = form.budget === b.key;
                return (
                  <TouchableOpacity
                    key={b.key}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('budget')(form.budget === b.key ? '' : b.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{b.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Needs */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>
              ⚙️ Contraintes & besoins spéciaux{' '}
              <Text style={styles.multiHint}>(plusieurs choix)</Text>
            </Text>
            <View style={styles.grid2}>
              {NEEDS.map((n) => {
                const active = form.needs.includes(n.key);
                return (
                  <TouchableOpacity
                    key={n.key}
                    style={[styles.needCard, active && styles.needCardActive]}
                    onPress={() => tog('needs')(n.key)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.needChk, active && styles.needChkOn]}>
                      {active && <Text style={styles.needChkTxt}>✓</Text>}
                    </View>
                    <Text style={[styles.needLbl, active && styles.needLblActive]}>{n.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={[styles.qTitle, { marginTop: 24 }]}>💬 Informations complémentaires</Text>
            <RInput
              value={form.notes}
              onChangeText={set('notes')}
              placeholder="Contexte culturel, contraintes logistiques, questions particulières…"
              multiline
              numberOfLines={4}
            />

            {/* Recap summary */}
            {(form.company || form.groupSize || form.programs.length > 0) && (
              <View style={styles.recap}>
                <Text style={styles.recapTitle}>✦ Récapitulatif de votre demande</Text>
                {form.company    && <Text style={styles.recapRow}>🏢 {form.company}{form.industry ? ` · ${form.industry}` : ''}</Text>}
                {form.groupSize  && <Text style={styles.recapRow}>👥 {GROUP_SIZES.find((g) => g.key === form.groupSize)?.label} — {GROUP_SIZES.find((g) => g.key === form.groupSize)?.sub}</Text>}
                {form.duration   && <Text style={styles.recapRow}>⏱ {DURATIONS.find((d) => d.key === form.duration)?.label}</Text>}
                {form.location   && <Text style={styles.recapRow}>📍 {LOCATIONS.find((l) => l.key === form.location)?.label}</Text>}
                {form.programs.length > 0 && <Text style={styles.recapRow}>🎪 {form.programs.map((k) => PROGRAMS.find((p) => p.key === k)?.label).join(' · ')}</Text>}
                {form.budget     && <Text style={styles.recapRow}>💰 {BUDGETS.find((b) => b.key === form.budget)?.label}</Text>}
              </View>
            )}
          </>)}

          {/* ── Nav ──────────────────────────────────────────────────────── */}
          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
                <Text style={styles.backBtnTxt}>‹ Retour</Text>
              </TouchableOpacity>
            )}
            <RButton
              label={step < 2 ? 'Continuer →' : 'Demander un devis'}
              onPress={nextStep}
              loading={loading && step === 2}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  header:       { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  logo:         { color: '#7C3AED', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  headerTitle:  { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  headerSub:    { color: COLORS.sub, fontSize: 13 },
  backArrow:    { marginBottom: 10 },
  backArrowTxt: { color: COLORS.sub, fontSize: 14, fontWeight: '700' },

  scroll:       { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon:  { fontSize: 72, marginBottom: 20 },
  successTitle: { color: COLORS.text, fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  successSub:   { color: COLORS.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  qTitle:       { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  multiHint:    { color: COLORS.muted, fontSize: 11, fontWeight: '400' },

  /* Section divider */
  divider:      { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerTxt:   { color: '#7C3AED', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginHorizontal: 12 },

  /* Pills */
  pillWrap:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  pill:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderWidth: 1.5, borderColor: '#2e2e2e', backgroundColor: COLORS.card, marginRight: 8, marginBottom: 8 },
  pillActive:   { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  pillTxt:      { color: COLORS.sub, fontSize: 13, fontWeight: '700', includeFontPadding: false },
  pillTxtActive:{ color: '#fff' },

  /* 2-col grid */
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  /* Group size cards */
  infoCard:      { width: COL2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#2e2e2e', alignItems: 'flex-start' },
  infoCardActive:{ backgroundColor: '#7C3AED18', borderColor: '#7C3AED' },
  infoIcon:      { fontSize: 22, marginBottom: 8 },
  infoLabel:     { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 3, includeFontPadding: false },
  infoLabelActive:{ color: '#7C3AED' },
  infoSub:       { color: COLORS.muted, fontSize: 11, includeFontPadding: false },

  /* Location colored cards */
  locCard:      { width: COL2, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 10, borderWidth: 1.5, borderColor: '#2a2a2a', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  locAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  locIcon:      { fontSize: 26, marginBottom: 8, marginTop: 4 },
  locLabel:     { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 3, includeFontPadding: false },
  locSub:       { color: COLORS.muted, fontSize: 11, includeFontPadding: false },
  locCheck:     { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  locCheckTxt:  { color: '#fff', fontSize: 11, fontWeight: '900' },

  /* Program cards */
  progCard:     { width: COL2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#2e2e2e' },
  progIconWrap: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  progIcon:     { fontSize: 20 },
  progLabel:    { color: COLORS.text, fontSize: 12, fontWeight: '800', marginBottom: 4, includeFontPadding: false },
  progSub:      { color: COLORS.muted, fontSize: 11, includeFontPadding: false },
  progCheck:    { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progCheckTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },

  /* Row2 + dates */
  row2:         { flexDirection: 'row', gap: 10 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 4 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxOn:   { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  checkMark:    { color: '#fff', fontSize: 12, fontWeight: '900' },
  checkLabel:   { color: COLORS.sub, fontSize: 13, flex: 1, lineHeight: 19 },

  /* Contact hero */
  contactHero:      { borderRadius: RADIUS.lg, padding: 22, marginBottom: 24, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#7C3AED33' },
  contactHeroEmoji: { fontSize: 32, marginBottom: 8 },
  contactHeroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  contactHeroSub:   { color: COLORS.sub, fontSize: 13, textAlign: 'center' },

  /* Objectives */
  objGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  objChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 8, marginBottom: 8 },
  objChipActive:{ backgroundColor: '#7C3AED15', borderColor: '#7C3AED' },
  objIcon:      { fontSize: 14, marginRight: 6 },
  objTxt:       { color: COLORS.sub, fontSize: 13, fontWeight: '600', includeFontPadding: false },
  objTxtActive: { color: '#7C3AED', fontWeight: '700' },
  objCheck:     { color: '#7C3AED', fontSize: 12, fontWeight: '900', marginLeft: 6 },

  /* Needs */
  needCard:     { width: COL2, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 11, marginBottom: 8, borderWidth: 1.5, borderColor: '#2e2e2e' },
  needCardActive:{ borderColor: '#7C3AED', backgroundColor: '#7C3AED12' },
  needChk:      { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 },
  needChkOn:    { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  needChkTxt:   { color: '#fff', fontSize: 10, fontWeight: '900' },
  needLbl:      { color: COLORS.sub, fontSize: 11, fontWeight: '600', flex: 1, includeFontPadding: false },
  needLblActive:{ color: COLORS.text },

  /* Recap */
  recap:        { backgroundColor: '#10102a', borderRadius: RADIUS.lg, padding: 18, marginTop: 20, borderWidth: 1, borderColor: '#7C3AED33' },
  recapTitle:   { color: '#7C3AED', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  recapRow:     { color: COLORS.sub, fontSize: 13, marginBottom: 6, lineHeight: 19 },

  /* Nav */
  navRow:       { flexDirection: 'row', gap: 10, marginTop: 32 },
  backBtn:      { backgroundColor: COLORS.card, borderRadius: RADIUS.pill, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  backBtnTxt:   { color: COLORS.sub, fontWeight: '700', fontSize: 14 },
});

/* ── Step bar styles ─────────────────────────────────────────────────────── */
const sb = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  item:        { alignItems: 'center', gap: 5 },
  dot:         { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  dotActive:   { borderColor: '#7C3AED', backgroundColor: '#7C3AED' },
  dotDone:     { borderColor: '#22c55e', backgroundColor: '#22c55e' },
  dotTxt:      { color: COLORS.muted, fontSize: 12, fontWeight: '800', includeFontPadding: false },
  dotTxtActive:{ color: '#fff' },
  label:       { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  labelActive: { color: '#7C3AED', fontWeight: '700' },
  line:        { flex: 1, height: 2, backgroundColor: '#222', marginBottom: 16, marginHorizontal: 6 },
  lineActive:  { backgroundColor: '#22c55e' },
});
