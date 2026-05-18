import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  getMyBookings, getExperiences,
  changePassword, updateProfile, toggleWishlist,
  cancelBooking, deleteAccount, getMyPlanRequests,
} from '../services/api';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const { width, height } = Dimensions.get('window');

/* ── Member level ───────────────────────────────────────────────────────── */
const LEVELS = [
  { min: 0,     max: 4999,  icon: '🌱', label: 'Nouveau Roamer',    color: '#6b7280', next: 5000 },
  { min: 5000,  max: 14999, icon: '🧭', label: 'Explorateur Actif', color: '#2563eb', next: 15000 },
  { min: 15000, max: 49999, icon: '⛺', label: 'Roamer Aguerri',    color: '#7c3aed', next: 50000 },
  { min: 50000, max: Infinity, icon: '🏆', label: 'Elite Explorer', color: '#d97706', next: null },
];
function getLevel(spent: number) {
  return LEVELS.find((l) => spent >= l.min && spent <= l.max) || LEVELS[0];
}

/* ── Badges ─────────────────────────────────────────────────────────────── */
const BADGE_DEFS = [
  { id: 'first',    emoji: '🔥', label: 'Première Aventure',   desc: 'Votre première réservation',       check: (b: any[], w: string[], t: number) => b.length > 0 },
  { id: 'groupe',   emoji: '🧭', label: 'Voyageur de Groupe',  desc: 'Réservé un voyage groupe',          check: (b: any[]) => b.some((x) => x.segment === 'groupe') },
  { id: 'weekend',  emoji: '🌙', label: 'Fugueur de Weekend',  desc: 'Réservé un weekend à thème',        check: (b: any[]) => b.some((x) => x.segment === 'weekend') },
  { id: 'express',  emoji: '⚡', label: 'Adepte Express',      desc: 'Réservé une activité express',      check: (b: any[]) => b.some((x) => x.segment === 'express' || x.segment === 'activite') },
  { id: 'mesure',   emoji: '✂️', label: 'Voyageur Sur Mesure', desc: 'Demandé un voyage sur mesure',      check: (b: any[]) => b.some((x) => x.segment === 'mesure') },
  { id: 'team',     emoji: '🤝', label: "Leader d'Équipe",     desc: 'Organisé un team building',         check: (b: any[]) => b.some((x) => x.segment === 'team') },
  { id: 'desert',   emoji: '🏜️', label: 'Explorateur Désert',  desc: 'Expérience dans le désert',         check: (b: any[]) => b.some((x) => (x.type || '').includes('desert') || (x.expTitle || '').toLowerCase().includes('sahr') || (x.expLoc || '').toLowerCase().includes('merzou')) },
  { id: 'mountain', emoji: '⛰️', label: 'Grimpeur de l\'Atlas',desc: 'Expérience en montagne',            check: (b: any[]) => b.some((x) => (x.type || '').includes('mountain') || (x.expLoc || '').toLowerCase().includes('atlas')) },
  { id: 'coastal',  emoji: '🌊', label: 'Voyageur Côtier',     desc: 'Expérience sur la côte',            check: (b: any[]) => b.some((x) => (x.type || '').includes('coastal') || (x.expLoc || '').toLowerCase().includes('taghazout') || (x.expLoc || '').toLowerCase().includes('essaouira')) },
  { id: 'culture',  emoji: '🏛️', label: 'Amoureux de Culture', desc: 'Expérience culturelle',             check: (b: any[]) => b.some((x) => (x.type || '').includes('cultural')) },
  { id: 'curious',  emoji: '❤️', label: 'Curieux du Maroc',    desc: '3+ expériences dans la wishlist',   check: (_b: any[], w: string[]) => w.length >= 3 },
  { id: 'elite',    emoji: '🏆', label: 'Elite Explorer',      desc: '50 000 MAD+ de voyages réservés',   check: (_b: any[], _w: string[], t: number) => t >= 50000 },
];

/* ── Dashboard tabs ─────────────────────────────────────────────────────── */
const TABS = [
  { key: 'overview',      icon: '🏠', label: 'Accueil' },
  { key: 'reservations',  icon: '🗺️', label: 'Réservations' },
  { key: 'requests',      icon: '✂️', label: 'Sur Mesure' },
  { key: 'wishlist',      icon: '❤️', label: 'Wishlist' },
  { key: 'passport',      icon: '✈️', label: 'Passeport' },
  { key: 'edit',          icon: '👤', label: 'Mon Profil' },
  { key: 'settings',      icon: '⚙️', label: 'Réglages' },
];

type TabKey = 'overview' | 'reservations' | 'requests' | 'wishlist' | 'passport' | 'edit' | 'settings';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '⏳ En attente',  color: '#f59e0b', bg: '#1a1200' },
  confirmed: { label: '✅ Confirmée',   color: '#22c55e', bg: '#071a09' },
  cancelled: { label: '❌ Annulée',     color: '#ef4444', bg: '#1a0505' },
};

const COUNTRIES = ['Maroc', 'France', 'Chine', 'Japon', 'USA', 'UK', 'Allemagne', 'EAU', 'Canada', 'Autre'];

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, refresh } = useAuth();

  const [tab, setTab]           = useState<TabKey>('overview');
  const [bookings, setBookings] = useState<any[]>([]);
  const [allExps, setAllExps]   = useState<any[]>([]);
  const [loadingB, setLoadingB]         = useState(true);
  const [loadingE, setLoadingE]         = useState(false);
  const [planReqs, setPlanReqs]         = useState<any[]>([]);
  const [loadingR, setLoadingR]         = useState(false);

  /* Load bookings once on mount */
  useEffect(() => {
    if (!user) { setLoadingB(false); return; }
    getMyBookings()
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoadingB(false));
  }, [user]);

  /* Load experiences when wishlist tab opened */
  useEffect(() => {
    if (tab !== 'wishlist' || allExps.length > 0) return;
    setLoadingE(true);
    getExperiences()
      .then(setAllExps)
      .catch(() => {})
      .finally(() => setLoadingE(false));
  }, [tab]);

  /* Load plan requests when requests tab opened */
  useEffect(() => {
    if (tab !== 'requests') return;
    setLoadingR(true);
    getMyPlanRequests()
      .then(setPlanReqs)
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, [tab]);

  /* Derived stats */
  const confirmed   = bookings.filter((b) => b.status === 'confirmed');
  const totalSpent  = confirmed.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const wishlist    = user?.wishlist || [];
  const level       = getLevel(totalSpent);
  const nextProg    = level.next ? Math.min((totalSpent - level.min) / (level.next - level.min), 1) : 1;
  const upcomingB   = bookings.find((b) => b.status === 'confirmed' && new Date(b.date) >= new Date());
  const earnedBadges = BADGE_DEFS.filter((bd) => bd.check(bookings, wishlist, totalSpent));

  /* ── Not logged in — premium landing ───────────────────────────────────── */
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: '#080808' }}>
      {/* Hero background */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=900&q=75' }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.58 }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(8,8,8,0)', 'rgba(8,8,8,0.6)', '#080808']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.62 }}
      />

      <ScrollView
        contentContainerStyle={{ minHeight: height, paddingTop: insets.top + 18, paddingHorizontal: 26, paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>R</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3.5 }}>ROAMERS</Text>
        </View>

        {/* Spacer — pushes content toward bottom */}
        <View style={{ height: height * 0.28 }} />

        {/* Headline */}
        <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', lineHeight: 42, letterSpacing: -0.5, marginBottom: 12 }}>
          Votre Maroc{'\n'}commence ici.
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 23, marginBottom: 34 }}>
          Réservez des voyages authentiques, suivez vos aventures et débloquez des badges exclusifs.
        </Text>

        {/* Benefits */}
        <View style={{ gap: 12, marginBottom: 36 }}>
          {[
            { icon: '🗺️', title: 'Réservations en temps réel', sub: 'Suivez chaque étape de votre voyage' },
            { icon: '🏆', title: 'Badges & récompenses',        sub: 'Débloquez des niveaux exclusifs' },
            { icon: '❤️', title: 'Wishlist personnelle',        sub: 'Sauvegardez vos coups de cœur' },
            { icon: '✂️', title: 'Voyages sur mesure',          sub: 'Créez votre itinéraire unique' },
          ].map((b) => (
            <View key={b.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(184,23,46,0.2)', borderWidth: 1, borderColor: 'rgba(184,23,46,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 20 }}>{b.icon}</Text>
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 1 }}>{b.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 }}>500+ voyageurs nous font confiance</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, borderRadius: 15, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: COLORS.primary, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 14 }}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.87}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 }}>Se connecter</Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 15, paddingVertical: 16, alignItems: 'center' }}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.87}
        >
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' }}>Créer un compte gratuit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  /* ── Logged in ──────────────────────────────────────────────────────────── */
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient
        colors={['#120004', '#0e0e0e']}
        style={styles.header}
      >
        <Text style={styles.logo}>✦ ROAMERS</Text>
        <View style={styles.headerRow}>
          <View style={[styles.avatarSm, { borderWidth: 2, borderColor: level.color + '88' }]}>
            <Text style={styles.avatarSmTxt}>{user.fname[0]}{user.lname?.[0] || ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{user.fname} {user.lname}</Text>
            <View style={[styles.levelPill, { backgroundColor: level.color + '20', borderColor: level.color + '55', alignSelf: 'flex-start', marginTop: 2 }]}>
              <Text style={[styles.levelPillTxt, { color: level.color }]}>{level.icon} {level.label}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            onPress={() => Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnecter', style: 'destructive', onPress: logout },
            ])}
          >
            <Text style={{ fontSize: 15 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarInner}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key as TabKey)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {tab === 'overview' && (
          <OverviewTab
            user={user} bookings={bookings} loading={loadingB}
            confirmed={confirmed} totalSpent={totalSpent} wishlist={wishlist}
            level={level} nextProg={nextProg} upcomingB={upcomingB}
            earnedBadges={earnedBadges} navigation={navigation}
          />
        )}

        {tab === 'requests' && (
          <DemandesTab planReqs={planReqs} loading={loadingR} navigation={navigation} />
        )}

        {tab === 'reservations' && (
          <ReservationsTab
            bookings={bookings} loading={loadingB}
            onCancel={async (id) => {
              Alert.alert('Annuler', 'Annuler cette réservation ?', [
                { text: 'Non', style: 'cancel' },
                { text: 'Oui, annuler', style: 'destructive', onPress: async () => {
                  try {
                    await cancelBooking(id);
                    setBookings((bs) => bs.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
                  } catch (e: any) { Alert.alert('Erreur', e.message); }
                }},
              ]);
            }}
            navigation={navigation}
          />
        )}

        {tab === 'wishlist' && (
          <WishlistTab
            wishlist={wishlist} allExps={allExps} loading={loadingE}
            onRemove={async (expId) => {
              try {
                const res = await toggleWishlist(expId);
                await refresh();
              } catch {}
            }}
            navigation={navigation}
          />
        )}

        {tab === 'passport' && (
          <PassportTab bookings={bookings} wishlist={wishlist} totalSpent={totalSpent} earnedBadges={earnedBadges} />
        )}

        {tab === 'edit' && (
          <EditProfileTab user={user} onSaved={refresh} />
        )}

        {tab === 'settings' && (
          <SettingsTab onLogout={logout} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Overview tab
   ═══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({ user, bookings, loading, confirmed, totalSpent, wishlist, level, nextProg, upcomingB, earnedBadges, navigation }: any) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <View style={styles.tabContent}>

      {/* ── Hero greeting card ── */}
      <LinearGradient
        colors={['#1a0208', '#120005', '#0e0e0e']}
        style={[styles.card, { padding: 0, overflow: 'hidden', borderColor: COLORS.primary + '33' }]}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingBottom: 14 }}>
          <View style={[styles.avatarSm, { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: level.color + '99' }]}>
            <Text style={[styles.avatarSmTxt, { fontSize: 19 }]}>{user.fname[0]}{user.lname?.[0] || ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>{greeting} 👋</Text>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 22 }}>{user.fname} {user.lname}</Text>
          </View>
          {upcomingB && (
            <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>✈️ VOYAGE PRÉVU</Text>
            </View>
          )}
        </View>

        {/* Level progress */}
        <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
            <Text style={{ color: level.color, fontSize: 12, fontWeight: '800' }}>{level.icon} {level.label}</Text>
            {level.next && (
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                {totalSpent.toLocaleString('fr-MA')} / {level.next.toLocaleString('fr-MA')} MAD
              </Text>
            )}
          </View>
          <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: level.color, width: `${nextProg * 100}%` as any }} />
          </View>
        </View>

        {/* Bottom divider message */}
        {!upcomingB && bookings.length === 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Commencez votre aventure</Text>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
              onPress={() => navigation.navigate('Explorer')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Explorer →</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* ── 4 KPI stats ── */}
      <View style={styles.statsRow}>
        {[
          { icon: '🗺️', label: 'Réservations', value: bookings.length,                          color: COLORS.primary },
          { icon: '✅', label: 'Confirmées',    value: confirmed.length,                          color: '#22c55e' },
          { icon: '❤️', label: 'Wishlist',      value: wishlist.length,                          color: '#ec4899' },
          { icon: '💰', label: 'MAD investis',  value: totalSpent > 0 ? (totalSpent / 1000).toFixed(1) + 'k' : '0', color: '#f59e0b' },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.color + '28' }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── First booking CTA (no bookings) ── */}
      {bookings.length === 0 && !loading && (
        <LinearGradient
          colors={['#1a0208', '#0e0e0e']}
          style={[styles.card, { borderColor: COLORS.primary + '44', padding: 0, overflow: 'hidden' }]}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=700&q=70' }}
            style={{ width: '100%', height: 120, opacity: 0.35 }}
            resizeMode="cover"
          />
          <View style={{ padding: 18, paddingTop: 14 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 6 }}>Votre première aventure vous attend</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
              Déserts, montagnes, médinas — découvrez des expériences uniques au Maroc et réservez en quelques minutes.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 10 }}
                onPress={() => navigation.navigate('Explorer')}
                activeOpacity={0.87}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>🧭 Voir les voyages</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                onPress={() => navigation.navigate('Activities')}
                activeOpacity={0.87}
              >
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700' }}>⚡ Activités express</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* ── Upcoming booking ── */}
      {upcomingB && (
        <LinearGradient
          colors={['#0d0517', '#110508', '#0e0e0e']}
          style={[styles.card, { borderColor: COLORS.primary + '55', padding: 0, overflow: 'hidden' }]}
        >
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>🎒 PROCHAIN VOYAGE</Text>
            <View style={{ backgroundColor: '#22c55e22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#22c55e44' }}>
              <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '800' }}>✅ CONFIRMÉ</Text>
            </View>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={styles.nextTripTitle}>{upcomingB.expTitle}</Text>
            <View style={styles.nextTripDetails}>
              {[
                { icon: '📍', val: upcomingB.expLoc || '—' },
                { icon: '📅', val: new Date(upcomingB.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { icon: '👥', val: `${upcomingB.adults} adulte${upcomingB.adults > 1 ? 's' : ''}${upcomingB.children ? ` · ${upcomingB.children} enfant(s)` : ''}` },
              ].map((d) => (
                <View key={d.icon} style={styles.nextTripRow}>
                  <Text style={styles.nextTripIcon}>{d.icon}</Text>
                  <Text style={styles.nextTripVal}>{d.val}</Text>
                </View>
              ))}
            </View>
            <View style={styles.nextTripPrice}>
              <Text style={styles.priceLbl}>Total réservé</Text>
              <Text style={styles.priceVal}>{Number(upcomingB.total).toLocaleString('fr-MA')} MAD</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* ── Recent bookings timeline ── */}
      {bookings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📖 Mon histoire au Maroc</Text>
          <Text style={styles.cardSub}>Chaque réservation est un chapitre</Text>
          {bookings.slice(0, 4).map((b: any, i: number) => {
            const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const isLast = i === bookings.slice(0, 4).length - 1;
            return (
              <View key={b.id} style={[styles.timelineItem, !isLast && styles.timelineItemBorder]}>
                <View style={[styles.timelineDot, { backgroundColor: st.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTitle} numberOfLines={1}>{b.expTitle}</Text>
                  <View style={styles.timelineMeta}>
                    <Text style={[styles.timelineStatus, { color: st.color }]}>{st.label}</Text>
                    <Text style={styles.timelineDate}>{new Date(b.date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>
                <Text style={styles.timelineAmt}>{Number(b.total).toLocaleString('fr-MA')} MAD</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Badges preview ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🎖️ Badges obtenus</Text>
          <Text style={[styles.cardSub2, { color: earnedBadges.length > 0 ? level.color : COLORS.muted }]}>
            {earnedBadges.length}/{BADGE_DEFS.length}
          </Text>
        </View>
        <View style={styles.badgesPreview}>
          {BADGE_DEFS.slice(0, 8).map((bd) => {
            const earned = earnedBadges.some((e: any) => e.id === bd.id);
            return (
              <View key={bd.id} style={[styles.badgeMini, !earned && styles.badgeMiniLocked, earned && { borderColor: level.color + '55', backgroundColor: level.color + '18' }]}>
                <Text style={[styles.badgeMiniEmoji, !earned && { opacity: 0.2 }]}>{bd.emoji}</Text>
              </View>
            );
          })}
        </View>
        {earnedBadges.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>
            Réservez votre premier voyage pour débloquer vos badges
          </Text>
        )}
      </View>

      {/* ── Quick actions — premium grid ── */}
      <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: -8 }}>Accès rapide</Text>
      <View style={styles.quickGrid}>
        {[
          { icon: '🧭', label: 'Voyages Groupe', sub: 'Groupe & Week-end', screen: 'Explorer',    color: '#1d4ed8' },
          { icon: '⚡', label: 'Activités',       sub: 'Express & Culture', screen: 'Activities',  color: '#7c3aed' },
          { icon: '✂️', label: 'Sur Mesure',       sub: 'Mon itinéraire',    screen: 'Plan',        color: '#d97706' },
          { icon: '🗺️', label: 'Carte',            sub: 'Toutes destinations', screen: 'Map',       color: '#059669' },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={[styles.quickCard, { borderColor: a.color + '33' }]} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.82}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: a.color + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{a.icon}</Text>
            </View>
            <Text style={[styles.quickLabel, { color: '#fff', fontWeight: '800', marginBottom: 2 }]}>{a.label}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{a.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reservations tab
   ═══════════════════════════════════════════════════════════════════════════ */
function ReservationsTab({ bookings, loading, onCancel, navigation }: any) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? bookings : bookings.filter((b: any) => b.status === filter);

  if (loading) return <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Mes Réservations</Text>
      <Text style={styles.tabSectionSub}>{bookings.length} réservation{bookings.length !== 1 ? 's' : ''} · Historique complet</Text>

      {/* Filter */}
      <View style={styles.filterRow}>
        {[
          { key: 'all',       label: 'Toutes' },
          { key: 'confirmed', label: '✅ Confirmées' },
          { key: 'pending',   label: '⏳ En attente' },
          { key: 'cancelled', label: '❌ Annulées' },
        ].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterChipTxt, filter === f.key && styles.filterChipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>Aucune réservation ici</Text>
          <Text style={styles.emptySub}>Explorez nos voyages et commencez votre aventure</Text>
        </View>
      ) : (
        filtered.map((b: any) => {
          const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
          const isUpcoming = b.status === 'confirmed' && new Date(b.date) >= new Date();
          return (
            <View key={b.id} style={[styles.bookingCard, SHADOW.sm]}>
              {/* Status bar */}
              <View style={[styles.bookingStatusBar, { backgroundColor: st.bg }]}>
                <Text style={[styles.bookingStatusTxt, { color: st.color }]}>{st.label}</Text>
                {isUpcoming && <View style={styles.upcomingPill}><Text style={styles.upcomingTxt}>⏳ PROCHAIN</Text></View>}
                <Text style={styles.bookingRef}>{b.id}</Text>
              </View>

              <View style={styles.bookingBody}>
                <Text style={styles.bookingTitle} numberOfLines={2}>{b.expTitle}</Text>

                <View style={styles.bookingDetails}>
                  {[
                    { icon: '📍', val: b.expLoc || '—' },
                    { icon: '📅', val: new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { icon: '👥', val: `${b.adults} adulte${b.adults > 1 ? 's' : ''}${b.children ? ` · ${b.children} enfant(s)` : ''}` },
                    { icon: '💰', val: `${Number(b.total).toLocaleString('fr-MA')} MAD` },
                  ].map((d) => (
                    <View key={d.icon} style={styles.bookingDetailRow}>
                      <Text style={styles.bookingDetailIcon}>{d.icon}</Text>
                      <Text style={styles.bookingDetailVal}>{d.val}</Text>
                    </View>
                  ))}
                </View>

                {b.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTxt}>📝 {b.notes}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.bookingActions}>
                  {b.status !== 'cancelled' && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(b.id)}>
                      <Text style={styles.cancelBtnTxt}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.reBookBtn}
                    onPress={() => navigation.navigate('ExperienceDetail', { id: b.expId })}
                  >
                    <Text style={styles.reBookBtnTxt}>Voir l'expérience →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Wishlist tab
   ═══════════════════════════════════════════════════════════════════════════ */
function WishlistTab({ wishlist, allExps, loading, onRemove, navigation }: any) {
  const wlExps = allExps.filter((e: any) => wishlist.includes(e.id));

  if (loading) return <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Ma Wishlist ❤️</Text>
      <Text style={styles.tabSectionSub}>{wishlist.length} expérience{wishlist.length !== 1 ? 's' : ''} sauvegardée{wishlist.length !== 1 ? 's' : ''}</Text>

      {wlExps.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyTitle}>Votre wishlist est vide</Text>
          <Text style={styles.emptySub}>Explorez nos voyages et sauvegardez vos favoris</Text>
        </View>
      ) : (
        <View style={styles.wlGrid}>
          {wlExps.map((exp: any) => (
            <TouchableOpacity
              key={exp.id}
              style={styles.wlCard}
              onPress={() => navigation.navigate('ExperienceDetail', { id: exp.id })}
              activeOpacity={0.88}
            >
              {exp.img
                ? <Image source={{ uri: exp.img }} style={styles.wlImg} resizeMode="cover" />
                : <View style={[styles.wlImg, styles.wlImgFallback]}><Text style={{ fontSize: 32 }}>🏔️</Text></View>
              }
              <TouchableOpacity style={styles.wlHeart} onPress={() => onRemove(exp.id)}>
                <Text style={styles.wlHeartTxt}>❤️</Text>
              </TouchableOpacity>
              <View style={styles.wlInfo}>
                <Text style={styles.wlTitle} numberOfLines={2}>{exp.title}</Text>
                <Text style={styles.wlPrice}>{Number(exp.price).toLocaleString('fr-MA')} MAD</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Passport / Achievements tab
   ═══════════════════════════════════════════════════════════════════════════ */
function PassportTab({ bookings, wishlist, totalSpent, earnedBadges }: any) {
  const destinations = [...new Set(bookings.filter((b: any) => b.expLoc).map((b: any) => b.expLoc as string))];

  const SEGMENTS_PROGRESS = [
    { key: 'groupe',  icon: '🧭', label: 'Voyage Groupe' },
    { key: 'weekend', icon: '🌙', label: 'Weekend à Thème' },
    { key: 'express', icon: '⚡', label: 'Activité Express' },
    { key: 'mesure',  icon: '✂️', label: 'Sur Mesure' },
    { key: 'team',    icon: '🤝', label: 'Team Building' },
  ];

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Mon Passeport ✈️</Text>
      <Text style={styles.tabSectionSub}>Vos aventures au Maroc</Text>

      {/* 3 big stats */}
      <View style={styles.passportStats}>
        {[
          { icon: '🗺️', val: bookings.filter((b: any) => b.status === 'confirmed').length, label: 'Voyages terminés',  color: COLORS.primary },
          { icon: '📍', val: destinations.length, label: 'Destinations',      color: '#2563eb' },
          { icon: '🎖️', val: earnedBadges.length, label: 'Badges obtenus',    color: '#d97706' },
        ].map((s) => (
          <View key={s.label} style={[styles.passportStatCard, { borderColor: s.color + '44' }]}>
            <Text style={styles.passportStatIcon}>{s.icon}</Text>
            <Text style={[styles.passportStatVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.passportStatLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Segments explored */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 Univers explorés</Text>
        {SEGMENTS_PROGRESS.map((s) => {
          const count = bookings.filter((b: any) => b.segment === s.key).length;
          return (
            <View key={s.key} style={styles.segRow}>
              <Text style={styles.segIcon}>{s.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.segLabelRow}>
                  <Text style={styles.segLabel}>{s.label}</Text>
                  <Text style={[styles.segCount, count > 0 && styles.segCountActive]}>{count > 0 ? `✓ ${count}` : 'À découvrir'}</Text>
                </View>
                <View style={styles.segTrack}>
                  <View style={[styles.segFill, { width: count > 0 ? '100%' : '0%' }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Badges grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏅 Badges & Récompenses</Text>
        <Text style={styles.cardSub}>{earnedBadges.length}/{BADGE_DEFS.length} badges obtenus</Text>
        <View style={styles.badgesGrid}>
          {BADGE_DEFS.map((bd) => {
            const earned = earnedBadges.some((e: any) => e.id === bd.id);
            return (
              <View key={bd.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                <Text style={[styles.badgeEmoji, !earned && { opacity: 0.2 }]}>{bd.emoji}</Text>
                <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>{bd.label}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{bd.desc}</Text>
                <View style={[styles.badgeStatus, earned && styles.badgeStatusEarned]}>
                  <Text style={[styles.badgeStatusTxt, earned && styles.badgeStatusTxtEarned]}>
                    {earned ? '✓ Obtenu' : 'À débloquer'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Destinations */}
      {destinations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Destinations visitées</Text>
          <View style={styles.destPills}>
            {destinations.map((d: string) => (
              <View key={d} style={styles.destPill}>
                <Text style={styles.destPillTxt}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Referral */}
      <View style={[styles.card, { backgroundColor: '#0d0d0d', borderColor: COLORS.primary + '33' }]}>
        <Text style={styles.cardTitle}>🎁 Partagez l'aventure</Text>
        <Text style={styles.cardSub}>Invitez un ami et bénéficiez tous les deux de 5% sur votre prochaine réservation</Text>
        <TouchableOpacity style={styles.referralBtn} onPress={() => Alert.alert('Bientôt disponible', 'La fonctionnalité de parrainage arrive très bientôt !')}>
          <Text style={styles.referralBtnTxt}>🎁 Obtenir mon lien de parrainage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Edit Profile tab
   ═══════════════════════════════════════════════════════════════════════════ */
function EditProfileTab({ user, onSaved }: any) {
  const [form, setForm] = useState({
    fname:   user.fname   || '',
    lname:   user.lname   || '',
    phone:   user.phone   || '',
    country: user.country || 'Maroc',
    bio:     user.bio     || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.fname.trim()) return Alert.alert('Erreur', 'Prénom requis');
    if (!form.lname.trim()) return Alert.alert('Erreur', 'Nom requis');
    setLoading(true);
    try {
      await updateProfile(form);
      await onSaved();
      Alert.alert('Succès', 'Profil mis à jour !');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Mon Profil 👤</Text>
      <Text style={styles.tabSectionSub}>Gérez vos informations personnelles</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarTxt}>{user.fname[0]}{user.lname?.[0] || ''}</Text>
        </View>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <Text style={styles.profileJoined}>Membre depuis {user.joined ? new Date(user.joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}</Text>
      </View>

      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}><RInput label="Prénom" value={form.fname} onChangeText={set('fname')} placeholder="Prénom" /></View>
          <View style={{ flex: 1 }}><RInput label="Nom" value={form.lname} onChangeText={set('lname')} placeholder="Nom" /></View>
        </View>
        <RInput label="Téléphone / WhatsApp" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
        <RInput label="Biographie voyage" value={form.bio} onChangeText={set('bio')} placeholder="Partagez votre amour du voyage..." multiline numberOfLines={3} />

        {/* Country selector */}
        <Text style={styles.fieldLabel}>Pays</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', paddingBottom: 12 }}>
          {COUNTRIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.countryChip, form.country === c && styles.countryChipActive]} onPress={() => set('country')(c)}>
              <Text style={[styles.countryChipTxt, form.country === c && styles.countryChipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <RButton label="Enregistrer le profil" onPress={save} loading={loading} />
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Settings tab
   ═══════════════════════════════════════════════════════════════════════════ */
function SettingsTab({ onLogout }: any) {
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const set = (k: string) => (v: string) => setPassForm((f) => ({ ...f, [k]: v }));

  async function handleChangePassword() {
    if (!passForm.current)            return Alert.alert('Erreur', 'Mot de passe actuel requis');
    if (passForm.newPass.length < 8)  return Alert.alert('Erreur', 'Minimum 8 caractères');
    if (passForm.newPass !== passForm.confirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    setPassLoading(true);
    try {
      await changePassword(passForm.current, passForm.newPass);
      Alert.alert('Succès', 'Mot de passe mis à jour');
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setPassLoading(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      '⚠️ Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteAccount();
            await onLogout();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        }},
      ]
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Réglages ⚙️</Text>
      <Text style={styles.tabSectionSub}>Sécurité et préférences</Text>

      {/* Password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Changer le mot de passe</Text>
        <RInput label="Mot de passe actuel" value={passForm.current} onChangeText={set('current')} secureTextEntry />
        <RInput label="Nouveau mot de passe" value={passForm.newPass} onChangeText={set('newPass')} secureTextEntry />
        <RInput label="Confirmer" value={passForm.confirm} onChangeText={set('confirm')} secureTextEntry />
        <RButton label="Mettre à jour" onPress={handleChangePassword} loading={passLoading} />
      </View>

      {/* Notifications placeholder */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Notifications</Text>
        {[
          { label: 'Confirmation de réservation', sub: 'Email à chaque réservation', on: true },
          { label: 'Rappels de départ',            sub: 'Rappel 7 jours avant',       on: true },
          { label: 'Nouvelles expériences',        sub: 'Alertes nouveaux voyages',   on: false },
          { label: 'Offres spéciales',             sub: 'Promotions exclusives',      on: false },
        ].map((n) => (
          <View key={n.label} style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifLabel}>{n.label}</Text>
              <Text style={styles.notifSub}>{n.sub}</Text>
            </View>
            <View style={[styles.toggle, n.on && styles.toggleOn]}>
              <Text style={styles.toggleTxt}>{n.on ? 'ON' : 'OFF'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Danger zone */}
      <View style={[styles.card, { borderColor: COLORS.error + '44' }]}>
        <Text style={[styles.cardTitle, { color: COLORS.error }]}>⚠️ Zone de danger</Text>
        <Text style={styles.dangerText}>
          Supprimer définitivement votre compte et toutes vos données. Cette action est irréversible.
        </Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
          <Text style={styles.dangerBtnTxt}>🗑️ Supprimer mon compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Demandes Sur Mesure tab
   ═══════════════════════════════════════════════════════════════════════════ */
const REQ_STATUS: Record<string, { label: string; color: string }> = {
  new:       { label: '🆕 Nouvelle',   color: '#f59e0b' },
  reviewed:  { label: '👁 Examinée',   color: '#3b82f6' },
  contacted: { label: '📞 Contacté',   color: '#22c55e' },
  closed:    { label: '✅ Terminée',   color: '#6b7280' },
};

function DemandesTab({ planReqs, loading, navigation }: any) {
  if (loading) return <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Demandes Sur Mesure ✂️</Text>
      <Text style={styles.tabSectionSub}>{planReqs.length} demande{planReqs.length !== 1 ? 's' : ''} envoyée{planReqs.length !== 1 ? 's' : ''}</Text>

      {planReqs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✂️</Text>
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptySub}>Créez votre voyage personnalisé</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Plan')}>
            <Text style={styles.emptyBtnTxt}>✈️ Planifier mon voyage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        planReqs.map((r: any) => {
          const st = REQ_STATUS[r.status] || REQ_STATUS.new;
          return (
            <View key={r.id} style={styles.reqCard}>
              <View style={styles.reqHeader}>
                <Text style={styles.reqRef}>{r.id}</Text>
                <View style={[styles.reqStatusPill, { borderColor: st.color + '55', backgroundColor: st.color + '18' }]}>
                  <Text style={[styles.reqStatusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              {r.destination ? <Text style={styles.reqDestination}>📍 {r.destination}</Text> : null}
              <View style={styles.reqDetails}>
                {r.groupSize ? <Text style={styles.reqDetail}>👥 {r.groupSize}</Text> : null}
                {r.duration  ? <Text style={styles.reqDetail}>📅 {r.duration}</Text>  : null}
                {r.budget    ? <Text style={styles.reqDetail}>💰 {r.budget}</Text>    : null}
                {r.segment   ? <Text style={styles.reqDetail}>🏷 {r.segment}</Text>   : null}
              </View>
              {r.message ? (
                <Text style={styles.reqNote} numberOfLines={2}>💬 {r.message}</Text>
              ) : null}
              <Text style={styles.reqDate}>{new Date(r.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════════ */
const CARD_HALF = (width - 16 * 2 - 10) / 2;

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },

  /* Not logged in */
  center:         { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lockIcon:       { fontSize: 52, marginBottom: 16 },
  lockTitle:      { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  lockSub:        { color: COLORS.sub, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  registerLink:   { color: COLORS.sub, fontSize: 14 },

  /* Header */
  header:         { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logo:           { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSm:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSmTxt:    { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerName:     { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  levelBadgeTxt:  { fontSize: 12, fontWeight: '700', marginTop: 1 },
  logoutIcon:     { fontSize: 20, padding: 4 },

  /* Tab bar */
  tabBar:         { borderBottomWidth: 1, borderBottomColor: COLORS.border, flexGrow: 0 },
  tabBarInner:    { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  tabItem:        { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, minWidth: 70 },
  tabItemActive:  { backgroundColor: COLORS.primary + '18', borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabIcon:        { fontSize: 16, marginBottom: 2 },
  tabLabel:       { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },

  scroll:         { paddingBottom: 36 },
  tabContent:     { padding: 16, gap: 20 },

  /* Shared card */
  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  cardHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle:      { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  cardSub:        { color: COLORS.muted, fontSize: 12, marginBottom: 14 },
  cardSub2:       { color: COLORS.muted, fontSize: 12 },

  /* Overview */
  greetingBanner: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  greetingHi:     { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  greetingSub:    { color: COLORS.sub, fontSize: 13, lineHeight: 19 },

  statsRow:       { flexDirection: 'row', gap: 8 },
  statCard:       { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIcon:       { fontSize: 18, marginBottom: 4 },
  statValue:      { color: COLORS.text, fontSize: 14, fontWeight: '900', marginBottom: 2 },
  statLabel:      { color: COLORS.muted, fontSize: 9, textAlign: 'center' },

  levelPill:      { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  levelPillTxt:   { fontSize: 11, fontWeight: '800' },
  progressTrack:  { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: 6, borderRadius: 3 },
  progressLbl:    { color: COLORS.muted, fontSize: 11, marginBottom: 10 },
  benefitsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitPill:    { backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.primary + '33' },
  benefitTxt:     { color: COLORS.primary, fontSize: 10, fontWeight: '600' },

  nextTripTitle:  { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 12 },
  nextTripDetails:{ gap: 6, marginBottom: 12 },
  nextTripRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextTripIcon:   { fontSize: 14, width: 20 },
  nextTripVal:    { color: COLORS.sub, fontSize: 13, flex: 1 },
  nextTripPrice:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLbl:       { color: COLORS.muted, fontSize: 10 },
  priceVal:       { color: COLORS.primary, fontSize: 18, fontWeight: '900' },

  timelineItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  timelineItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border + '60' },
  timelineDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  timelineTitle:  { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  timelineMeta:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  timelineStatus: { fontSize: 11, fontWeight: '600' },
  timelineDate:   { color: COLORS.muted, fontSize: 11 },
  timelineAmt:    { color: COLORS.primary, fontSize: 12, fontWeight: '700', flexShrink: 0 },

  badgesPreview:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeMini:      { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '33' },
  badgeMiniLocked:{ backgroundColor: COLORS.border, borderColor: 'transparent' },
  badgeMiniEmoji: { fontSize: 22 },

  quickGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard:      { width: CARD_HALF, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  quickIcon:      { fontSize: 26 },
  quickLabel:     { color: COLORS.sub, fontSize: 12, fontWeight: '600' },

  /* Reservations */
  tabSectionTitle:{ color: COLORS.text, fontSize: 20, fontWeight: '900' },
  tabSectionSub:  { color: COLORS.muted, fontSize: 12, marginBottom: 12 },
  filterRow:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  filterChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 6, marginBottom: 6 },
  filterChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipTxt:  { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  filterChipTxtActive: { color: '#fff' },

  bookingCard:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  bookingStatusBar:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  bookingStatusTxt:{ fontSize: 12, fontWeight: '700' },
  upcomingPill:   { backgroundColor: '#d97706', borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 2 },
  upcomingTxt:    { color: '#fff', fontSize: 9, fontWeight: '900' },
  bookingRef:     { color: COLORS.muted, fontSize: 11, marginLeft: 'auto' as any },
  bookingBody:    { padding: 14 },
  bookingTitle:   { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  bookingDetails: { gap: 6, marginBottom: 10 },
  bookingDetailRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingDetailIcon:{ fontSize: 13, width: 18 },
  bookingDetailVal: { color: COLORS.sub, fontSize: 13, flex: 1 },
  notesBox:       { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  notesTxt:       { color: COLORS.muted, fontSize: 12, fontStyle: 'italic' },
  bookingActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancelBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.error + '66' },
  cancelBtnTxt:   { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  reBookBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary },
  reBookBtnTxt:   { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Empty state */
  emptyState:     { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  emptySub:       { color: COLORS.sub, fontSize: 13, textAlign: 'center' },

  /* Wishlist */
  wlGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wlCard:         { width: CARD_HALF, backgroundColor: COLORS.card, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  wlImg:          { width: '100%', height: 110 },
  wlImgFallback:  { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  wlHeart:        { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  wlHeartTxt:     { fontSize: 14 },
  wlInfo:         { padding: 10 },
  wlTitle:        { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 4, lineHeight: 16 },
  wlPrice:        { color: COLORS.primary, fontSize: 13, fontWeight: '900' },

  /* Passport */
  passportStats:  { flexDirection: 'row', gap: 8 },
  passportStatCard:{ flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', borderWidth: 1 },
  passportStatIcon:{ fontSize: 22, marginBottom: 4 },
  passportStatVal: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  passportStatLbl: { color: COLORS.muted, fontSize: 10, textAlign: 'center' },

  segRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' },
  segIcon:        { fontSize: 18, width: 24 },
  segLabelRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  segLabel:       { color: COLORS.sub, fontSize: 13 },
  segCount:       { color: COLORS.muted, fontSize: 12 },
  segCountActive: { color: '#22c55e', fontWeight: '700' },
  segTrack:       { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  segFill:        { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },

  badgesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badgeCard:      { width: (width - 32 - 16 - 24) / 4, alignItems: 'center', backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md, padding: 8, borderWidth: 1, borderColor: COLORS.primary + '22' },
  badgeCardLocked:{ backgroundColor: '#111', borderColor: COLORS.border },
  badgeEmoji:     { fontSize: 24, marginBottom: 4 },
  badgeName:      { color: COLORS.text, fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 12, marginBottom: 2 },
  badgeNameLocked:{ color: COLORS.muted },
  badgeDesc:      { color: COLORS.muted, fontSize: 8, textAlign: 'center', lineHeight: 11, marginBottom: 6 },
  badgeStatus:    { backgroundColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 5, paddingVertical: 2 },
  badgeStatusEarned:{ backgroundColor: '#16a34a22' },
  badgeStatusTxt: { color: COLORS.muted, fontSize: 8, fontWeight: '700' },
  badgeStatusTxtEarned:{ color: '#22c55e' },

  destPills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  destPill:       { backgroundColor: COLORS.primary + '18', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '33' },
  destPillTxt:    { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  referralBtn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  referralBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  /* Edit profile */
  profileCard:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  profileAvatar:  { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profileAvatarTxt:{ color: '#fff', fontSize: 24, fontWeight: '900' },
  profileEmail:   { color: COLORS.sub, fontSize: 14, marginBottom: 4 },
  profileJoined:  { color: COLORS.muted, fontSize: 12 },
  formSection:    { gap: 2 },
  formRow:        { flexDirection: 'row', gap: 10 },
  fieldLabel:     { color: COLORS.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  countryChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 8 },
  countryChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  countryChipTxt: { color: COLORS.sub, fontSize: 13, fontWeight: '600' },
  countryChipTxtActive:{ color: '#fff' },

  /* Empty action button */
  emptyBtn:       { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt:    { color: '#fff', fontSize: 14, fontWeight: '800' },

  /* Demandes Sur Mesure */
  reqCard:        { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  reqHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reqRef:         { color: COLORS.muted, fontSize: 11, fontFamily: 'monospace' },
  reqStatusPill:  { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  reqStatusTxt:   { fontSize: 11, fontWeight: '700' },
  reqDestination: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  reqDetails:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  reqDetail:      { color: COLORS.sub, fontSize: 12, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  reqNote:        { color: COLORS.muted, fontSize: 12, fontStyle: 'italic', marginBottom: 8, lineHeight: 17 },
  reqDate:        { color: COLORS.muted, fontSize: 11 },

  /* Itinéraires */
  itinCard:       { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#3b82f622' },
  itinHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itinRef:        { color: '#3b82f6', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  itinDate:       { color: COLORS.muted, fontSize: 11 },
  itinStops:      { marginBottom: 10 },
  itinStopRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itinDot:        { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  itinDotTxt:     { color: '#fff', fontSize: 10, fontWeight: '900' },
  itinLine:       { display: 'none' },
  itinStopName:   { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  itinStats:      { flexDirection: 'row', gap: 14, marginBottom: 12 },
  itinStat:       { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  itinReplayBtn:  { borderWidth: 1, borderColor: '#3b82f644', borderRadius: RADIUS.pill, paddingVertical: 8, alignItems: 'center' },
  itinReplayTxt:  { color: '#3b82f6', fontSize: 13, fontWeight: '700' },

  /* Settings */
  notifRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border + '50', gap: 10 },
  notifLabel:     { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  notifSub:       { color: COLORS.muted, fontSize: 11 },
  toggle:         { backgroundColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  toggleOn:       { backgroundColor: COLORS.primary + '30' },
  toggleTxt:      { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  dangerText:     { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  dangerBtn:      { backgroundColor: COLORS.error + '18', borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error + '44' },
  dangerBtnTxt:   { color: COLORS.error, fontSize: 14, fontWeight: '700' },
});
