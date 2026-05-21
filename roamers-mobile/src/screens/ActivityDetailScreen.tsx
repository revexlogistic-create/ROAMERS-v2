import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Dimensions, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../constants/theme';
import Icon from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { getActivity } from '../services/api';

const { width, height } = Dimensions.get('window');
const HERO_H = height * 0.46;

const CAT_COLOR: Record<string, string> = {
  adventure: '#f97316',
  culture:   '#a855f7',
  corporate: '#3b82f6',
  wellness:  '#22c55e',
  other:     COLORS.primary,
};

const DIFF_LABEL: Record<string, { label: string; color: string }> = {
  easy:     { label: 'Facile',    color: '#22c55e' },
  moderate: { label: 'Modéré',   color: '#f59e0b' },
  hard:     { label: 'Difficile', color: '#ef4444' },
};

function catColor(cat: string) {
  return CAT_COLOR[cat?.toLowerCase()] || COLORS.primary;
}

export default function ActivityDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  /* Accept either a full activity object OR just an id to fetch */
  const [act, setAct]         = useState<any>(route.params?.activity || null);
  const [fetching, setFetching] = useState(!route.params?.activity && !!route.params?.id);

  useEffect(() => {
    if (act) return; // already have data
    const id = route.params?.id;
    if (!id) return;
    setFetching(true);
    getActivity(id)
      .then((data) => setAct(data || {}))
      .catch(() => setAct({}))
      .finally(() => setFetching(false));
  }, [route.params?.id]);

  /* Loading state */
  if (fetching) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity
          style={[styles.backBtn, { position: 'absolute', top: insets.top + 10, left: 14 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ color: COLORS.sub, marginTop: 12, fontSize: 14 }}>Chargement…</Text>
      </View>
    );
  }

  const activity = act || {};
  const color     = catColor(activity.category);
  const diffMeta  = activity.difficulty ? DIFF_LABEL[activity.difficulty] : null;
  const highlights: string[] = Array.isArray(activity.highlights) ? activity.highlights : [];
  const inc: string[]        = Array.isArray(activity.inc) ? activity.inc : [];
  const exc: string[]        = Array.isArray(activity.exc) ? activity.exc : [];

  function handleReserve() {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour réserver une activité.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    navigation.navigate('Booking', { exp: activity });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={{ height: HERO_H }}>
          {activity.img ? (
            <Image source={{ uri: activity.img }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#1a0508', '#2a0a12', '#0e0e0e']}
              style={styles.heroImg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>

          {/* Top-right badges */}
          <View style={[styles.topRight, { top: insets.top + 14 }]}>
            <View style={[styles.catChip, { backgroundColor: color }]}>
              <Text style={styles.catChipTxt}>
                {activity.category ? activity.category.charAt(0).toUpperCase() + activity.category.slice(1) : 'Activité'}
              </Text>
            </View>
            {activity.badge ? (
              <View style={styles.badgeChip}>
                <Icon.Star size={10} color="#f59e0b" />
                <Text style={styles.badgeChipTxt}>{activity.badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Bottom hero content */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{activity.title}</Text>
            {activity.sub ? <Text style={styles.heroSub}>{activity.sub}</Text> : null}

            {/* Meta pills */}
            <View style={styles.pills}>
              {activity.duration ? (
                <View style={styles.pill}>
                  <Icon.Calendar size={11} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.pillTxt}>{activity.duration}</Text>
                </View>
              ) : null}
              {activity.location ? (
                <View style={styles.pill}>
                  <Icon.Pin size={11} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.pillTxt}>{activity.location}</Text>
                </View>
              ) : null}
              {diffMeta ? (
                <View style={[styles.pill, { backgroundColor: diffMeta.color + '33' }]}>
                  <Text style={[styles.pillTxt, { color: diffMeta.color }]}>{diffMeta.label}</Text>
                </View>
              ) : null}
              {activity.minAge ? (
                <View style={styles.pill}>
                  <Text style={styles.pillTxt}>{activity.minAge}+ ans</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>

          {/* Tarifs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarifs</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Adulte</Text>
                <Text style={styles.priceNum}>{Number(activity.price || 0).toLocaleString('fr-MA')}</Text>
                <Text style={styles.priceCur}>MAD / pers.</Text>
              </View>
              {activity.pChild != null ? (
                <View style={[styles.priceCard, { borderColor: COLORS.border }]}>
                  <Text style={styles.priceLabel}>Enfant</Text>
                  <Text style={styles.priceNum}>{Number(activity.pChild).toLocaleString('fr-MA')}</Text>
                  <Text style={styles.priceCur}>MAD / pers.</Text>
                </View>
              ) : null}
              {(activity.minP || activity.maxP) ? (
                <View style={[styles.priceCard, { borderColor: COLORS.border }]}>
                  <Text style={styles.priceLabel}>Groupe</Text>
                  <Text style={styles.priceNum}>{activity.minP || 1}–{activity.maxP || 20}</Text>
                  <Text style={styles.priceCur}>participants</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Description */}
          {activity.desc ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.desc}>{activity.desc}</Text>
            </View>
          ) : null}

          {/* Highlights */}
          {highlights.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Points forts</Text>
              {highlights.map((h, i) => (
                <View key={i} style={styles.hlRow}>
                  <View style={[styles.hlDot, { backgroundColor: color }]} />
                  <Text style={styles.hlTxt}>{h}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Included / Excluded */}
          {(inc.length > 0 || exc.length > 0) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ce qui est inclus</Text>
              <View style={styles.incExcRow}>
                {inc.length > 0 ? (
                  <View style={styles.incCol}>
                    {inc.map((item, i) => (
                      <View key={i} style={styles.incRow}>
                        <Text style={[styles.incIcon, { color: '#22c55e' }]}>✓</Text>
                        <Text style={styles.incTxt}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {exc.length > 0 ? (
                  <View style={styles.incCol}>
                    {exc.map((item, i) => (
                      <View key={i} style={styles.incRow}>
                        <Text style={[styles.incIcon, { color: '#ef4444' }]}>✕</Text>
                        <Text style={[styles.incTxt, { color: COLORS.sub }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Meeting point */}
          {activity.meetingPoint ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Point de rendez-vous</Text>
              <View style={styles.meetRow}>
                <Icon.Pin size={16} color={color} />
                <Text style={styles.meetTxt}>{activity.meetingPoint}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BAR */}
      <LinearGradient
        colors={['transparent', COLORS.bg]}
        style={[styles.stickyGrad, { height: 32 + (insets.bottom || 0) + 76, bottom: 0 }]}
        pointerEvents="none"
      />
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.stickyFrom}>À partir de</Text>
          <Text style={styles.stickyPrice}>{Number(activity.price || 0).toLocaleString('fr-MA')} <Text style={styles.stickyCur}>MAD</Text></Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: color }]}
          activeOpacity={0.85}
          onPress={handleReserve}
        >
          <Text style={styles.bookBtnTxt}>
            {user ? 'Réserver maintenant →' : '🔒 Se connecter pour réserver'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

  heroImg: { ...StyleSheet.absoluteFillObject },

  backBtn: {
    position: 'absolute', left: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { color: '#fff', fontSize: 28, lineHeight: 32, marginTop: -2 },

  topRight: {
    position: 'absolute', right: 14,
    flexDirection: 'column', alignItems: 'flex-end', gap: 6,
  },
  catChip:     { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  catChipTxt:  { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  badgeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  badgeChipTxt:{ color: '#f59e0b', fontSize: 11, fontWeight: '700' },

  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  heroTitle:  { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 32, marginBottom: 4 },
  heroSub:    { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginBottom: 12 },

  pills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  pillTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  body:    { padding: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 14 },

  priceRow:   { flexDirection: 'row', gap: 10 },
  priceCard:  { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.primary + '40', alignItems: 'center' },
  priceLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  priceNum:   { color: COLORS.text, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  priceCur:   { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  desc: { color: COLORS.sub, fontSize: 14, lineHeight: 22 },

  hlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  hlDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  hlTxt: { color: COLORS.text, fontSize: 14, flex: 1, lineHeight: 20 },

  incExcRow: { flexDirection: 'row', gap: 14 },
  incCol:    { flex: 1 },
  incRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 9 },
  incIcon:   { fontSize: 13, fontWeight: '900', marginTop: 1 },
  incTxt:    { color: COLORS.text, fontSize: 13, flex: 1, lineHeight: 19 },

  meetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  meetTxt: { color: COLORS.text, fontSize: 14, flex: 1, lineHeight: 20 },

  stickyGrad: { position: 'absolute', left: 0, right: 0 },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  stickyFrom:  { color: COLORS.muted, fontSize: 11 },
  stickyPrice: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  stickyCur:   { fontSize: 14, fontWeight: '600' },
  bookBtn:     { borderRadius: RADIUS.pill, paddingHorizontal: 22, paddingVertical: 13 },
  bookBtnTxt:  { color: '#fff', fontSize: 14, fontWeight: '800' },
});
