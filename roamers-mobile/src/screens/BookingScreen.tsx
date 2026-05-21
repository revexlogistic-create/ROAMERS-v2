import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Image, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createBooking, validatePromo } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const { width } = require('react-native').Dimensions.get('window');
const COUNTRIES = ['Maroc', 'France', 'Algérie', 'Tunisie', 'USA', 'UK', 'EAU', 'Espagne', 'Italie', 'Allemagne', 'Autre'];

const STEP_LABELS = ['Participants', 'Contact', 'Récap', 'Paiement'];

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
function Field({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false }: any) {
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
  const { exp }  = route.params;
  const insets   = useSafeAreaInsets();
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

  /* Step 4 – Payment */
  const [payMethod, setPayMethod] = useState<'virement' | 'carte'>('virement');
  const [loading,   setLoading]   = useState(false);

  /* Promo code */
  const [promoInput,    setPromoInput]    = useState('');
  const [promoApplied,  setPromoApplied]  = useState<{ code: string; discountPct: number; label: string } | null>(null);
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoError,    setPromoError]    = useState<string | null>(null);

  const adultPrice = Number(exp?.price) || 0;
  const childPrice = exp?.pChild != null ? Number(exp.pChild) : adultPrice;
  const baseTotal  = adults * adultPrice + children * childPrice;
  const discount   = promoApplied ? Math.round(baseTotal * promoApplied.discountPct / 100) : 0;
  const total      = baseTotal - discount;
  const acompte    = Math.round(total * 0.3); // 30% deposit

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const promo = await validatePromo(code);
      setPromoApplied(promo);
      setPromoError(null);
    } catch (e: any) {
      setPromoApplied(null);
      setPromoError(e?.message || 'Code invalide');
    } finally {
      setPromoLoading(false);
    }
  }

  /* ── Navigation guards ── */
  function nextStep() {
    if (step === 1) {
      if (!date) { Alert.alert('Date requise', 'Veuillez choisir une date de départ.'); return; }
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
        notes:    `[${payMethod === 'virement' ? 'Virement bancaire' : 'Carte bancaire'}] ${notes.trim()}`.trim(),
        ...(promoApplied ? { promoCode: promoApplied.code } : {}),
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
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          return (
            <React.Fragment key={n}>
              <View style={{ alignItems: 'center', gap: 5 }}>
                <StepDot n={n} active={step === n} done={step > n} />
                <Text style={[styles.stepLabel, step === n && { color: COLORS.primary }]}>{label}</Text>
              </View>
              {i < STEP_LABELS.length - 1 && (
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
              {exp?.dur    && <Text style={styles.expMeta}>⏱ {exp.dur}</Text>}
              {exp?.loc    && <Text style={styles.expMeta}>📍 {exp.loc}</Text>}
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

            {/* Available dates */}
            <Text style={styles.fieldLabel}>Date de départ</Text>
            {(() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const futureDates = (exp?.dates || []).filter((d: any) => {
                const raw = typeof d === 'object' ? d.raw : d;
                return raw && new Date(raw) >= today;
              });
              if (futureDates.length === 0) return (
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 13 }}>Aucune date disponible — contactez-nous pour plus d'informations.</Text>
                </View>
              );
              return (
                <View style={styles.datesGrid}>
                  {futureDates.map((d: any) => {
                    const raw = typeof d === 'object' ? d.raw : d;
                    const label = typeof d === 'object' ? d.label : raw;
                    const selected = date === raw;
                    return (
                      <TouchableOpacity
                        key={raw}
                        style={[styles.dateChip, selected && styles.dateChipActive]}
                        onPress={() => setDate(raw)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.dateChipTxt, selected && styles.dateChipTxtActive]}>{label}</Text>
                        {selected && <Text style={{ color: COLORS.primary, fontSize: 14, marginTop: 2 }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}

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
              placeholder="Demandes spéciales, allergies, régimes…"
              multiline
            />
          </View>
        )}

        {/* ═══════════════════════════════
            STEP 3 — Récapitulatif
            ═══════════════════════════════ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Récapitulatif</Text>

            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>🏕️ Expérience</Text>
              <Text style={styles.recapVal}>{exp?.title}</Text>
              {exp?.loc && <Text style={styles.recapSub}>📍 {exp.loc}</Text>}
            </View>

            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>👥 Participants</Text>
              <Text style={styles.recapVal}>{adults} adulte{adults > 1 ? 's' : ''}{children > 0 ? ` + ${children} enfant${children > 1 ? 's' : ''}` : ''}</Text>
              <Text style={styles.recapSub}>📅 {(() => {
                const found = (exp?.dates || []).find((d: any) => (typeof d === 'object' ? d.raw : d) === date);
                return found ? (typeof found === 'object' ? found.label : found) : date;
              })()}</Text>
            </View>

            <View style={styles.recapSection}>
              <Text style={styles.recapHeader}>📋 Contact</Text>
              <Text style={styles.recapVal}>{name}</Text>
              <Text style={styles.recapSub}>{email}</Text>
              <Text style={styles.recapSub}>{phone} · {country}</Text>
            </View>

            {notes ? (
              <View style={styles.recapSection}>
                <Text style={styles.recapHeader}>💬 Message</Text>
                <Text style={styles.recapSub}>{notes}</Text>
              </View>
            ) : null}

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
              {promoApplied && (
                <View style={styles.priceRow}>
                  <Text style={{ color: '#22c55e', fontSize: 13 }}>🎁 Remise {promoApplied.label}</Text>
                  <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '700' }}>−{discount.toLocaleString('fr-MA')} MAD</Text>
                </View>
              )}
              <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 8 }]}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800' }}>Total estimé</Text>
                <Text style={{ color: COLORS.primary, fontSize: 24, fontWeight: '900' }}>{total.toLocaleString('fr-MA')} MAD</Text>
              </View>
            </LinearGradient>

            {/* Promo code */}
            <View style={styles.promoWrap}>
              <Text style={styles.fieldLabel}>Code promo / partenaire</Text>
              {promoApplied ? (
                <View style={styles.promoApplied}>
                  <Text style={styles.promoAppliedTxt}>🎁 {promoApplied.code} — {promoApplied.label} appliqué !</Text>
                  <TouchableOpacity onPress={() => { setPromoApplied(null); setPromoInput(''); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={{ color: COLORS.sub, fontSize: 14, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.promoRow}>
                    <TextInput
                      style={styles.promoInput}
                      value={promoInput}
                      onChangeText={(t) => { setPromoInput(t.toUpperCase()); setPromoError(null); }}
                      placeholder="Ex : PARTNER10"
                      placeholderTextColor={COLORS.muted}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[styles.promoBtn, promoLoading && { opacity: 0.6 }]}
                      onPress={applyPromo}
                      disabled={promoLoading}
                      activeOpacity={0.8}
                    >
                      {promoLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.promoBtnTxt}>Appliquer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {promoError && <Text style={styles.promoError}>{promoError}</Text>}
                </>
              )}
            </View>
          </View>
        )}

        {/* ═══════════════════════════════
            STEP 4 — Paiement
            ═══════════════════════════════ */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Mode de paiement</Text>

            {/* Total reminder */}
            <LinearGradient colors={['#1a000a', '#111']} style={[styles.totalCard, { marginBottom: 22 }]}>
              {promoApplied && (
                <View style={styles.priceRow}>
                  <Text style={{ color: '#22c55e', fontSize: 12 }}>🎁 Remise {promoApplied.label}</Text>
                  <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>−{discount.toLocaleString('fr-MA')} MAD</Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={{ color: COLORS.sub, fontSize: 13 }}>Montant total</Text>
                <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '900' }}>{total.toLocaleString('fr-MA')} MAD</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>Acompte requis (30%)</Text>
                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '700' }}>{acompte.toLocaleString('fr-MA')} MAD</Text>
              </View>
            </LinearGradient>

            <Text style={styles.fieldLabel}>Choisissez votre méthode</Text>

            {/* Virement bancaire */}
            <TouchableOpacity
              style={[styles.payOption, payMethod === 'virement' && styles.payOptionActive]}
              onPress={() => setPayMethod('virement')}
              activeOpacity={0.85}
            >
              <View style={styles.payOptionLeft}>
                <View style={[styles.payIconBox, { backgroundColor: '#1a2d1a' }]}>
                  <Text style={{ fontSize: 24 }}>🏦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>Virement bancaire</Text>
                  <Text style={styles.paySub}>Transférez l'acompte sur notre RIB — confirmation sous 24h</Text>
                </View>
              </View>
              <View style={[styles.payRadio, payMethod === 'virement' && styles.payRadioActive]}>
                {payMethod === 'virement' && <View style={styles.payRadioDot} />}
              </View>
            </TouchableOpacity>

            {/* Virement details */}
            {payMethod === 'virement' && (
              <View style={styles.bankDetails}>
                <Text style={styles.bankTitle}>Coordonnées bancaires Roamers</Text>
                {[
                  ['Banque', 'Attijariwafa Bank'],
                  ['Titulaire', 'ROAMERS SARL'],
                  ['RIB', '007 780 0021456300001 23'],
                  ['Montant', `${acompte.toLocaleString('fr-MA')} MAD (acompte 30%)`],
                  ['Référence', `REF-${name.replace(/\s/g,'').toUpperCase().slice(0,6)}`],
                ].map(([k, v]) => (
                  <View key={k} style={styles.bankRow}>
                    <Text style={styles.bankKey}>{k}</Text>
                    <Text style={styles.bankVal}>{v}</Text>
                  </View>
                ))}
                <Text style={styles.bankNote}>
                  ⚠️ Indiquez votre nom complet en référence et envoyez le justificatif par WhatsApp au +212 6 XX XX XX XX
                </Text>
              </View>
            )}

            {/* Carte bancaire */}
            <TouchableOpacity
              style={[styles.payOption, payMethod === 'carte' && styles.payOptionActive, { marginTop: 12 }]}
              onPress={() => setPayMethod('carte')}
              activeOpacity={0.85}
            >
              <View style={styles.payOptionLeft}>
                <View style={[styles.payIconBox, { backgroundColor: '#1a1a2e' }]}>
                  <Text style={{ fontSize: 24 }}>💳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>Carte bancaire</Text>
                  <Text style={styles.paySub}>Paiement sécurisé en ligne · Visa / Mastercard / CMI</Text>
                </View>
              </View>
              <View style={[styles.payRadio, payMethod === 'carte' && styles.payRadioActive]}>
                {payMethod === 'carte' && <View style={styles.payRadioDot} />}
              </View>
            </TouchableOpacity>

            {/* Stripe note */}
            {payMethod === 'carte' && (
              <View style={styles.stripeNote}>
                <Text style={{ fontSize: 20, marginBottom: 6 }}>🔒</Text>
                <Text style={styles.stripeNoteTitle}>Paiement sécurisé</Text>
                <Text style={styles.stripeNoteSub}>
                  Après confirmation, vous recevrez un lien de paiement sécurisé par email pour régler l'acompte de{' '}
                  <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{acompte.toLocaleString('fr-MA')} MAD</Text>
                </Text>
              </View>
            )}

            <Text style={styles.disclaimer}>
              En confirmant, vous acceptez nos conditions générales. Notre équipe vous contactera dans les 24h pour valider votre réservation.
            </Text>
          </View>
        )}

        {/* ── CTA ── */}
        <View style={{ paddingHorizontal: 0, marginTop: 4 }}>
          {step < 4 ? (
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
                  : <Text style={styles.ctaBtnTxt}>
                      {payMethod === 'virement' ? '◆  Confirmer & payer par virement' : '◆  Confirmer & recevoir le lien de paiement'}
                    </Text>
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
  stepRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 12, gap: 0 },
  stepLine:  { flex: 1, height: 2, backgroundColor: COLORS.border, marginTop: -14, marginHorizontal: 2 },
  stepLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  /* experience card */
  expCard: { marginHorizontal: 16, marginTop: 16, borderRadius: RADIUS.lg, overflow: 'hidden', height: 140, borderWidth: 1, borderColor: COLORS.border },
  expImg:  { width: '100%', height: '100%', position: 'absolute' },
  expGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingTop: 40 },
  expTitle:{ color: '#fff', fontSize: 15, fontWeight: '900', lineHeight: 19 },
  expMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

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

  /* payment options */
  payOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 16, gap: 14,
  },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: '#1a0208' },
  payOptionLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  payIconBox:      { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  payTitle:        { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 3 },
  paySub:          { color: COLORS.sub, fontSize: 12, lineHeight: 16 },
  payRadio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  payRadioActive:  { borderColor: COLORS.primary },
  payRadioDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  /* bank details */
  bankDetails: { backgroundColor: '#0d1a0d', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#22c55e33', marginTop: 12 },
  bankTitle:   { color: '#22c55e', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  bankRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bankKey:     { color: COLORS.muted, fontSize: 12 },
  bankVal:     { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 12 },
  bankNote:    { color: COLORS.sub, fontSize: 11, lineHeight: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: '#22c55e22', paddingTop: 10 },

  /* stripe note */
  stripeNote:     { backgroundColor: '#0a0a1e', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#3b82f633', marginTop: 12, alignItems: 'center' },
  stripeNoteTitle:{ color: '#60a5fa', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  stripeNoteSub:  { color: COLORS.sub, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  /* CTA */
  ctaBtn:    { borderRadius: RADIUS.pill, paddingVertical: 17, alignItems: 'center', marginHorizontal: 16, marginBottom: 24, ...SHADOW.md },
  ctaBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },

  disclaimer: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginHorizontal: 16, marginBottom: 12 },

  body: { paddingBottom: 24 },

  /* promo code */
  promoWrap:       { marginTop: 4, marginBottom: 16 },
  promoRow:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
  promoInput:      { flex: 1, backgroundColor: '#1a1a1a', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11, letterSpacing: 1 },
  promoBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  promoBtnTxt:     { color: '#fff', fontSize: 13, fontWeight: '800' },
  promoError:      { color: '#ef4444', fontSize: 12, marginTop: 7 },
  promoApplied:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#071a09', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: '#22c55e44' },
  promoAppliedTxt: { color: '#22c55e', fontSize: 13, fontWeight: '700', flex: 1 },

  /* date picker */
  datesGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  dateChip:          { paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#1a1a1a', alignItems: 'center', minWidth: (width - 32 - 32 - 10) / 2 },
  dateChipActive:    { borderColor: COLORS.primary, backgroundColor: '#1a0208' },
  dateChipTxt:       { color: COLORS.sub, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dateChipTxtActive: { color: '#fff', fontWeight: '800' },
});
