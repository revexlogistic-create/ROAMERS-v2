import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendPlan } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');
const COL2 = (width - 32 - 10) / 2;   // two-column chip width
const COL3 = (width - 32 - 16) / 3;   // three-column chip width

/* ── Data ──────────────────────────────────────────────────────────────── */
const MOODS = [
  { key: 'desert',   label: 'Désert & Sahara',   sub: 'Merzouga · Erg Chebbi',  icon: '🏜️', color: '#D97706', bg: '#1a1000' },
  { key: 'atlas',    label: 'Atlas & Randonnée', sub: 'Toubkal · Ourika',        icon: '⛰️', color: '#16A34A', bg: '#001a08' },
  { key: 'coast',    label: 'Côte Atlantique',   sub: 'Essaouira · Taghazout',   icon: '🌊', color: '#2563EB', bg: '#00091a' },
  { key: 'medina',   label: 'Villes Impériales', sub: 'Marrakech · Fes',         icon: '🏛️', color: '#7C3AED', bg: '#0e0018' },
  { key: 'oasis',    label: 'Oasis & Vallées',   sub: 'Drâa · Dadès · Ziz',     icon: '🌴', color: '#059669', bg: '#001510' },
  { key: 'surprise', label: 'Surprenez-moi',     sub: 'On compose pour vous',    icon: '✨', color: '#B8172E', bg: '#1a0508' },
];

const WHO = [
  { key: 'couple',    label: 'En couple',    icon: '💑' },
  { key: 'famille',   label: 'En famille',   icon: '👨‍👩‍👧' },
  { key: 'amis',      label: 'Entre amis',   icon: '🎉' },
  { key: 'solo',      label: 'En solo',      icon: '🧳' },
  { key: 'corporate', label: 'Corporate',    icon: '💼' },
  { key: 'scolaire',  label: 'Groupe / Asso',icon: '🎓' },
];

const SEGMENTS = [
  { key: 'groupe',  label: 'Voyage Groupe',    sub: 'Départ fixe', icon: '👥', color: '#1D4ED8' },
  { key: 'weekend', label: 'Weekend à Thème',  sub: '2–3 jours',   icon: '🌄', color: '#7C3AED' },
  { key: 'express', label: 'Activité Express', sub: 'Demi à 1 jour',icon: '⚡', color: '#D97706' },
  { key: 'mesure',  label: '100% Sur Mesure',  sub: 'Personnalisé', icon: '✂️', color: '#B8172E' },
];

const DEST_QUICK = ['Marrakech', 'Atlas & Toubkal', 'Sahara / Merzouga', 'Côte Atlantique', 'Chefchaouen', 'Fes'];

const GROUP_SIZES = [
  { key: '1',     label: 'Solo',         sub: '1 pers.',   icon: '🧍' },
  { key: '2',     label: 'En couple',    sub: '2 pers.',    icon: '👫' },
  { key: '3-6',   label: 'Petit groupe', sub: '3–6 pers.', icon: '👥' },
  { key: '7-15',  label: 'Groupe moyen', sub: '7–15 pers.',icon: '🧑‍🤝‍🧑' },
  { key: '16-50', label: 'Grand groupe', sub: '16–50',      icon: '🎪' },
  { key: '50+',   label: 'Corporate',    sub: '50+ pers.',  icon: '🏢' },
];

const DURATIONS = [
  { key: 'demi',  label: 'Demi-journée' },
  { key: '1j',    label: '1 journée' },
  { key: '2-3j',  label: '2–3 jours' },
  { key: '4-7j',  label: '4–7 jours' },
  { key: '8j+',   label: '8+ jours' },
  { key: 'flex',  label: 'Flexible ✦' },
];

const BUDGETS = [
  { key: '<500',      label: '< 500 MAD' },
  { key: '500-1500',  label: '500–1 500' },
  { key: '1500-3000', label: '1 500–3 000' },
  { key: '3000-5000', label: '3 000–5 000' },
  { key: '5000+',     label: '5 000+ MAD' },
  { key: 'discuss',   label: 'À discuter' },
];

const LANGUAGES = [
  { key: 'fr', label: '🇫🇷 Français' },
  { key: 'ar', label: '🇲🇦 العربية' },
  { key: 'en', label: '🇬🇧 English' },
  { key: 'zh', label: '🇨🇳 中文' },
  { key: 'es', label: '🇪🇸 Español' },
  { key: 'de', label: '🇩🇪 Deutsch' },
];

const NEEDS = [
  { key: 'need_vegeta',    label: '🥗 Végétarien/végane' },
  { key: 'need_allergy',   label: '⚠️ Allergies alimentaires' },
  { key: 'need_child',     label: '🧒 Enfants dans le groupe' },
  { key: 'need_senior',    label: '🧓 Personnes seniors' },
  { key: 'need_reduced',   label: '♿ Mobilité réduite' },
  { key: 'need_photo',     label: '📸 Pack photo pro' },
  { key: 'need_honeymoon', label: '💍 Lune de miel / occasion' },
  { key: 'need_invoice',   label: '🧾 Facture entreprise' },
];

const SOURCES = ['Instagram', 'Google', 'Recommandation', 'Facebook', 'Agence', 'Autre'];


const STEPS = ['Itinéraire', 'Votre voyage', 'Votre profil', 'Coordonnées'];

/* ── helpers ──────────────────────────────────────────────────────────── */
function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

/* ── Step bar ─────────────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  return (
    <View style={sb.wrap}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <View style={sb.item}>
            <View style={[sb.dot, i < step && sb.dotDone, i === step && sb.dotActive]}>
              <Text style={[sb.dotTxt, (i <= step) && sb.dotTxtActive]}>
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

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function PlanScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [waypoints, setWaypoints] = useState<Array<{ name: string; lat: number; lng: number }>>([]);

  const [form, setForm] = useState({
    moods: [] as string[], who: '', segment: '', destination: '',
    groupSize: '', duration: '', budget: '',
    dateFrom: '', dateTo: '', flexDate: false,
    lang: [] as string[], needs: [] as string[],
    fname: user?.fname || '', lname: user?.lname || '',
    email: user?.email || '', phone: user?.phone || '',
    departCity: '', source: '', message: '',
  });

  /* Pre-fill waypoints when returning from MapScreen after city selection */
  useEffect(() => {
    const wps = route?.params?.waypoints;
    if (Array.isArray(wps) && wps.length >= 2) setWaypoints(wps);
  }, [route?.params?.waypoints]);

  const set  = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));
  const togM = (v: string) => setForm((f) => ({ ...f, moods: toggle(f.moods, v) }));
  const togL = (v: string) => setForm((f) => ({ ...f, lang:  toggle(f.lang,  v) }));
  const togN = (v: string) => setForm((f) => ({ ...f, needs: toggle(f.needs, v) }));

  if (sent) return (
    <View style={[styles.successWrap, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1a0508', '#0e0e0e']} style={StyleSheet.absoluteFill} />
      <Text style={styles.successIcon}>🗺️</Text>
      <Text style={styles.successTitle}>Demande envoyée !</Text>
      <Text style={styles.successSub}>Notre équipe va concevoir votre voyage personnalisé et vous recontactera sous 24h.</Text>
      <RButton label="Retour à l'accueil" onPress={() => navigation.navigate('Home')} style={{ marginTop: 28, minWidth: 220 }} />
    </View>
  );

  function nextStep() {
    if (step === 2 && !user) { navigation.navigate('Login'); return; }
    if (step < 3) { setStep((s) => s + 1); return; }
    submit();
  }

  async function submit() {
    if (!form.fname.trim()) return Alert.alert('Erreur', 'Prénom requis');
    if (!form.email.trim()) return Alert.alert('Erreur', 'Email requis');
    if (!form.phone.trim()) return Alert.alert('Erreur', 'Téléphone requis');
    setLoading(true);
    try {
      await sendPlan({
        ...form,
        itineraryStops: waypoints.map((w) => w.name),
        consentGiven: true,
      });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally { setLoading(false); }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient colors={['#1a0508', '#0e0e0e']} style={styles.header}>
        <Text style={styles.logo}>ROAMERS</Text>
        <Text style={styles.headerTitle}>Plan My Trip</Text>
        <Text style={styles.headerSub}>Votre voyage sur mesure au Maroc</Text>
      </LinearGradient>

      <StepBar step={step} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ══ STEP 0 — ITINÉRAIRE ═══════════════════════════════════ */}
          {step === 0 && (<>

            <Text style={styles.qTitle}>🗺️ Tracez votre itinéraire</Text>
            <Text style={styles.qSub}>Sélectionnez vos étapes directement sur la carte</Text>

            {waypoints.length === 0 ? (
              <TouchableOpacity
                style={styles.mapOpenBtn}
                onPress={() => navigation.navigate('Map', { selectForPlan: true })}
                activeOpacity={0.85}
              >
                <Text style={styles.mapOpenIcon}>🗺️</Text>
                <Text style={styles.mapOpenTxt}>Ouvrir la carte</Text>
                <Text style={styles.mapOpenSub}>Appuyez pour sélectionner vos villes</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.itinList}>
                {waypoints.map((wp, i) => (
                  <View key={wp.name} style={styles.itinRow}>
                    <View style={styles.itinDotWrap}>
                      <View style={[styles.itinDotBall, i === 0 ? { backgroundColor: '#22c55e' } : i === waypoints.length - 1 ? { backgroundColor: '#3b82f6' } : { backgroundColor: '#64748b' }]}>
                        <Text style={styles.itinDotNum}>{i + 1}</Text>
                      </View>
                      {i < waypoints.length - 1 && <View style={styles.itinDotLine} />}
                    </View>
                    <Text style={styles.itinCityName}>{wp.name}</Text>
                    <TouchableOpacity onPress={() => setWaypoints((ws) => ws.filter((_, j) => j !== i))}>
                      <Text style={styles.itinRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.mapEditBtn}
                  onPress={() => navigation.navigate('Map', { selectForPlan: true, existingWaypoints: waypoints })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.mapEditBtnTxt}>✏️ Modifier sur la carte</Text>
                </TouchableOpacity>
              </View>
            )}
          </>)}

          {/* ══ STEP 1 (ex-0) ════════════════════════════════════════════ */}
          {step === 1 && (<>

            {/* Mood — colored cards */}
            <Text style={styles.qTitle}>🌍 Quelle ambiance vous fait rêver ?</Text>
            <Text style={styles.qSub}>Sélectionnez une ou plusieurs ambiances</Text>
            <View style={styles.grid2}>
              {MOODS.map((m) => {
                const active = form.moods.includes(m.key);
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.moodCard, { backgroundColor: m.bg, borderColor: active ? m.color : '#2a2a2a' }, active && { borderWidth: 2 }]}
                    onPress={() => togM(m.key)}
                    activeOpacity={0.82}
                  >
                    {/* colored top accent bar */}
                    <View style={[styles.moodAccent, { backgroundColor: m.color }]} />
                    <Text style={styles.moodIcon}>{m.icon}</Text>
                    <Text style={[styles.moodLabel, active && { color: m.color }]}>{m.label}</Text>
                    <Text style={styles.moodSub}>{m.sub}</Text>
                    {active && (
                      <View style={[styles.moodCheck, { backgroundColor: m.color }]}>
                        <Text style={styles.moodCheckTxt}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Who */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>👥 Vous voyagez</Text>
            <View style={styles.grid3}>
              {WHO.map((w) => {
                const active = form.who === w.key;
                return (
                  <TouchableOpacity
                    key={w.key}
                    style={[styles.whoCard, active && styles.whoCardActive]}
                    onPress={() => set('who')(form.who === w.key ? '' : w.key)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.whoIcon}>{w.icon}</Text>
                    <Text style={[styles.whoLabel, active && styles.whoLabelActive]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Segment */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>🗺️ Type de programme</Text>
            <View style={styles.grid2}>
              {SEGMENTS.map((s) => {
                const active = form.segment === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.segCard, active && { borderColor: s.color, backgroundColor: s.color + '18' }]}
                    onPress={() => set('segment')(form.segment === s.key ? '' : s.key)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.segIconWrap, { backgroundColor: s.color + '22' }]}>
                      <Text style={styles.segIcon}>{s.icon}</Text>
                    </View>
                    <Text style={[styles.segLabel, active && { color: s.color }]}>{s.label}</Text>
                    <Text style={styles.segSub}>{s.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Destination */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>📍 Destination</Text>
            <RInput value={form.destination} onChangeText={set('destination')} placeholder="Marrakech, Sahara, tout le Maroc…" />
            <View style={styles.quickRow}>
              {DEST_QUICK.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.quickPill, form.destination === d && styles.quickPillActive]}
                  onPress={() => set('destination')(form.destination === d ? '' : d)}
                >
                  <Text style={[styles.quickPillTxt, form.destination === d && styles.quickPillTxtActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>)}

          {/* ══ STEP 2 ═══════════════════════════════════════════════════ */}
          {step === 2 && (<>

            {/* Group size */}
            <Text style={styles.qTitle}>👤 Taille du groupe</Text>
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

            {/* Duration */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>⏱ Durée du voyage</Text>
            <View style={styles.pillWrap}>
              {DURATIONS.map((d) => {
                const active = form.duration === d.key;
                return (
                  <TouchableOpacity key={d.key} style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('duration')(form.duration === d.key ? '' : d.key)} activeOpacity={0.8}>
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Budget */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>💰 Budget par personne</Text>
            <Text style={styles.qSub}>Hors vols internationaux</Text>
            <View style={styles.pillWrap}>
              {BUDGETS.map((b) => {
                const active = form.budget === b.key;
                return (
                  <TouchableOpacity key={b.key} style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('budget')(form.budget === b.key ? '' : b.key)} activeOpacity={0.8}>
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{b.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dates */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>📅 Dates souhaitées</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}><RInput label="Départ estimé" value={form.dateFrom} onChangeText={set('dateFrom')} placeholder="ex : 15 juin 2025" /></View>
              <View style={{ flex: 1 }}><RInput label="Retour estimé" value={form.dateTo} onChangeText={set('dateTo')} placeholder="ex : 22 juin 2025" /></View>
            </View>
            <TouchableOpacity style={styles.checkRow} onPress={() => set('flexDate')(!form.flexDate)}>
              <View style={[styles.checkbox, form.flexDate && styles.checkboxOn]}>
                {form.flexDate && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>Dates flexibles — je peux adapter selon les disponibilités</Text>
            </TouchableOpacity>

            {/* Language */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>🌐 Langue du guide</Text>
            <View style={styles.pillWrap}>
              {LANGUAGES.map((l) => {
                const active = form.lang.includes(l.key);
                return (
                  <TouchableOpacity key={l.key} style={[styles.pill, active && styles.pillActive]}
                    onPress={() => togL(l.key)} activeOpacity={0.8}>
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{l.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Needs */}
            <Text style={[styles.qTitle, { marginTop: 28 }]}>⚙️ Besoins particuliers</Text>
            <View style={styles.grid2}>
              {NEEDS.map((n) => {
                const active = form.needs.includes(n.key);
                return (
                  <TouchableOpacity
                    key={n.key}
                    style={[styles.needCard, active && styles.needCardActive]}
                    onPress={() => togN(n.key)}
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
          </>)}

          {/* ══ STEP 3 ═══════════════════════════════════════════════════ */}
          {step === 3 && (<>
            <View style={styles.contactHero}>
              <LinearGradient colors={['#1a0508', '#120210']} style={StyleSheet.absoluteFill} />
              <Text style={styles.contactHeroEmoji}>✦</Text>
              <Text style={styles.contactHeroTitle}>Dernière étape</Text>
              <Text style={styles.contactHeroSub}>Où envoyer votre proposition sur mesure ?</Text>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}><RInput label="Prénom *" value={form.fname} onChangeText={set('fname')} placeholder="Prénom" /></View>
              <View style={{ flex: 1 }}><RInput label="Nom *" value={form.lname} onChangeText={set('lname')} placeholder="Nom" /></View>
            </View>
            <RInput label="Email *" value={form.email} onChangeText={set('email')} placeholder="email@exemple.com" keyboardType="email-address" autoCapitalize="none" />
            <RInput label="Téléphone / WhatsApp *" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
            <RInput label="Ville de départ" value={form.departCity} onChangeText={set('departCity')} placeholder="Casablanca, Paris, Dubai…" />

            <Text style={[styles.qTitle, { marginTop: 24 }]}>📣 Comment nous avez-vous connu ?</Text>
            <View style={styles.pillWrap}>
              {SOURCES.map((s) => {
                const active = form.source === s;
                return (
                  <TouchableOpacity key={s} style={[styles.pill, active && styles.pillActive]}
                    onPress={() => set('source')(form.source === s ? '' : s)} activeOpacity={0.8}>
                    <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.qTitle, { marginTop: 24 }]}>💬 Vos envies & inspirations</Text>
            <RInput
              value={form.message}
              onChangeText={set('message')}
              placeholder="Nuit en bivouac au Sahara, sommet Toubkal, surf à Taghazout, médina de Fes…"
              multiline numberOfLines={4}
            />

            {/* Recap */}
            {(waypoints.length > 0 || form.moods.length > 0 || form.segment || form.groupSize) && (
              <View style={styles.recap}>
                <Text style={styles.recapTitle}>✦ Récapitulatif</Text>
                {waypoints.length > 0 && <Text style={styles.recapRow}>🛤 {waypoints.map((w) => w.name).join(' → ')}</Text>}
                {form.moods.length > 0 && <Text style={styles.recapRow}>🌍 {form.moods.map((k) => MOODS.find((m) => m.key === k)?.label).join(' · ')}</Text>}
                {form.who        && <Text style={styles.recapRow}>👥 {WHO.find((w) => w.key === form.who)?.label}</Text>}
                {form.segment    && <Text style={styles.recapRow}>🗺️ {SEGMENTS.find((s) => s.key === form.segment)?.label}</Text>}
                {form.destination&& <Text style={styles.recapRow}>📍 {form.destination}</Text>}
                {form.groupSize  && <Text style={styles.recapRow}>👤 {GROUP_SIZES.find((g) => g.key === form.groupSize)?.label}</Text>}
                {form.duration   && <Text style={styles.recapRow}>⏱ {DURATIONS.find((d) => d.key === form.duration)?.label}</Text>}
                {form.budget     && <Text style={styles.recapRow}>💰 {BUDGETS.find((b) => b.key === form.budget)?.label} / pers.</Text>}
              </View>
            )}
          </>)}

          {/* Nav */}
          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
                <Text style={styles.backBtnTxt}>‹ Retour</Text>
              </TouchableOpacity>
            )}
            <RButton
              label={step < 3 ? 'Continuer →' : 'Envoyer ma demande'}
              onPress={nextStep}
              loading={loading && step === 3}
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
  header:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  logo:         { color: COLORS.primary, fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  headerTitle:  { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  headerSub:    { color: COLORS.sub, fontSize: 13 },

  scroll:       { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon:  { fontSize: 72, marginBottom: 20 },
  successTitle: { color: COLORS.text, fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  successSub:   { color: COLORS.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  qTitle:       { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  qSub:         { color: COLORS.muted, fontSize: 12, marginBottom: 14 },

  /* ── Mood cards ── */
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodCard:     { width: COL2, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 10, borderWidth: 1.5, borderColor: '#2a2a2a', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  moodAccent:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  moodIcon:     { fontSize: 28, marginBottom: 8, marginTop: 4 },
  moodLabel:    { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 3, includeFontPadding: false },
  moodSub:      { color: COLORS.muted, fontSize: 11, includeFontPadding: false },
  moodCheck:    { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moodCheckTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },

  /* ── Who cards ── */
  grid3:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  whoCard:      { width: COL3, backgroundColor: COLORS.card, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#2e2e2e' },
  whoCardActive:{ backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  whoIcon:      { fontSize: 22, marginBottom: 6 },
  whoLabel:     { color: COLORS.sub, fontSize: 11, fontWeight: '700', textAlign: 'center', includeFontPadding: false },
  whoLabelActive:{ color: COLORS.primary },

  /* ── Segment cards ── */
  segCard:      { width: COL2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#2e2e2e' },
  segIconWrap:  { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  segIcon:      { fontSize: 20 },
  segLabel:     { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 4, includeFontPadding: false },
  segSub:       { color: COLORS.muted, fontSize: 11, includeFontPadding: false },

  /* ── Destination quick picks ── */
  quickRow:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  quickPill:    { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 7, marginBottom: 7 },
  quickPillActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  quickPillTxt:    { color: COLORS.sub, fontSize: 12, fontWeight: '600', includeFontPadding: false },
  quickPillTxtActive:{ color: COLORS.primary, fontWeight: '700' },

  /* ── Group size info cards ── */
  infoCard:     { width: COL2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#2e2e2e', alignItems: 'flex-start' },
  infoCardActive:{ backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  infoIcon:     { fontSize: 22, marginBottom: 8 },
  infoLabel:    { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 3, includeFontPadding: false },
  infoLabelActive:{ color: COLORS.primary },
  infoSub:      { color: COLORS.muted, fontSize: 11, includeFontPadding: false },

  /* ── Pills ── */
  pillWrap:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  pill:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderWidth: 1.5, borderColor: '#2e2e2e', backgroundColor: COLORS.card, marginRight: 8, marginBottom: 8 },
  pillActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillTxt:      { color: COLORS.sub, fontSize: 13, fontWeight: '700', includeFontPadding: false },
  pillTxtActive:{ color: '#fff' },

  /* ── Dates + check ── */
  row2:         { flexDirection: 'row', gap: 10 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 4 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxOn:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark:    { color: '#fff', fontSize: 12, fontWeight: '900' },
  checkLabel:   { color: COLORS.sub, fontSize: 13, flex: 1, lineHeight: 19 },

  /* ── Needs ── */
  needCard:     { width: COL2, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 11, marginBottom: 8, borderWidth: 1.5, borderColor: '#2e2e2e' },
  needCardActive:{ borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  needChk:      { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 },
  needChkOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  needChkTxt:   { color: '#fff', fontSize: 10, fontWeight: '900' },
  needLbl:      { color: COLORS.sub, fontSize: 11, fontWeight: '600', flex: 1, includeFontPadding: false },
  needLblActive:{ color: COLORS.text },

  /* ── Contact hero ── */
  contactHero:  { borderRadius: RADIUS.lg, padding: 22, marginBottom: 24, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary + '33' },
  contactHeroEmoji: { color: COLORS.primary, fontSize: 28, fontWeight: '900', marginBottom: 8 },
  contactHeroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  contactHeroSub:   { color: COLORS.sub, fontSize: 13, textAlign: 'center' },

  /* ── Recap ── */
  recap:        { backgroundColor: '#1a0508', borderRadius: RADIUS.lg, padding: 18, marginTop: 20, borderWidth: 1, borderColor: COLORS.primary + '33' },
  recapTitle:   { color: COLORS.primary, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  recapRow:     { color: COLORS.sub, fontSize: 13, marginBottom: 6, lineHeight: 19 },

  /* ── Nav ── */
  navRow:       { flexDirection: 'row', gap: 10, marginTop: 32 },
  backBtn:      { backgroundColor: COLORS.card, borderRadius: RADIUS.pill, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  backBtnTxt:   { color: COLORS.sub, fontWeight: '700', fontSize: 14 },

  /* ── Itinerary step 0 ── */
  mapOpenBtn:    { alignItems: 'center', padding: 36, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary + '55', marginBottom: 16 },
  mapOpenIcon:   { fontSize: 44, marginBottom: 12 },
  mapOpenTxt:    { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  mapOpenSub:    { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  itinList:      { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: '#2a2a2a', padding: 14, marginBottom: 14 },
  itinRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  itinDotWrap:   { alignItems: 'center', marginRight: 12, width: 24 },
  itinDotBall:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itinDotNum:    { color: '#fff', fontSize: 11, fontWeight: '900', includeFontPadding: false },
  itinDotLine:   { width: 2, height: 18, backgroundColor: '#334155', marginTop: 2 },
  itinCityName:  { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1, paddingTop: 2 },
  itinRemove:    { color: '#ef4444', fontSize: 16, paddingLeft: 8, paddingTop: 2 },
  mapEditBtn:    { marginTop: 12, borderWidth: 1.5, borderColor: '#3b82f6', borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center' },
  mapEditBtnTxt: { color: '#93c5fd', fontWeight: '700', fontSize: 13 },
});

const sb = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  item:        { alignItems: 'center', gap: 5 },
  dot:         { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  dotActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dotDone:     { borderColor: '#22c55e', backgroundColor: '#22c55e' },
  dotTxt:      { color: COLORS.muted, fontSize: 12, fontWeight: '800', includeFontPadding: false },
  dotTxtActive:{ color: '#fff' },
  label:       { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  labelActive: { color: COLORS.primary, fontWeight: '700' },
  line:        { flex: 1, height: 2, backgroundColor: '#222', marginBottom: 16, marginHorizontal: 6 },
  lineActive:  { backgroundColor: '#22c55e' },
});
