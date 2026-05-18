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
const HALF = (width - 48) / 2;

/* ── Member levels ──────────────────────────────────────────────────────── */
const LEVELS = [
  { min: 0,     max: 4999,     icon: '🌱', label: 'Nouveau Roamer',    color: '#6b7280', next: 5000 },
  { min: 5000,  max: 14999,    icon: '🧭', label: 'Explorateur Actif', color: '#3b82f6', next: 15000 },
  { min: 15000, max: 49999,    icon: '⛺', label: 'Roamer Aguerri',    color: '#8b5cf6', next: 50000 },
  { min: 50000, max: Infinity, icon: '🏆', label: 'Elite Explorer',    color: '#d97706', next: null },
];
function getLevel(spent: number) {
  return LEVELS.find((l) => spent >= l.min && spent <= l.max) || LEVELS[0];
}

/* ── Badges ─────────────────────────────────────────────────────────────── */
const BADGE_DEFS = [
  { id: 'first',    emoji: '🔥', label: 'Première Aventure',   desc: 'Votre première réservation',       check: (b: any[], _w: string[], _t: number) => b.length > 0 },
  { id: 'groupe',   emoji: '🧭', label: 'Voyageur de Groupe',  desc: 'Réservé un voyage groupe',          check: (b: any[]) => b.some((x) => x.segment === 'groupe') },
  { id: 'weekend',  emoji: '🌙', label: 'Fugueur de Weekend',  desc: 'Réservé un weekend à thème',        check: (b: any[]) => b.some((x) => x.segment === 'weekend') },
  { id: 'express',  emoji: '⚡', label: 'Adepte Express',      desc: 'Réservé une activité express',      check: (b: any[]) => b.some((x) => x.segment === 'express' || x.segment === 'activite') },
  { id: 'mesure',   emoji: '✂️', label: 'Voyageur Sur Mesure', desc: 'Demandé un voyage sur mesure',      check: (b: any[]) => b.some((x) => x.segment === 'mesure') },
  { id: 'team',     emoji: '🤝', label: "Leader d'Équipe",     desc: 'Organisé un team building',         check: (b: any[]) => b.some((x) => x.segment === 'team') },
  { id: 'desert',   emoji: '🏜️', label: 'Explorateur Désert',  desc: 'Expérience dans le désert',         check: (b: any[]) => b.some((x) => (x.type || '').includes('desert') || (x.expTitle || '').toLowerCase().includes('sahr') || (x.expLoc || '').toLowerCase().includes('merzou')) },
  { id: 'mountain', emoji: '⛰️', label: "Grimpeur de l'Atlas", desc: 'Expérience en montagne',            check: (b: any[]) => b.some((x) => (x.type || '').includes('mountain') || (x.expLoc || '').toLowerCase().includes('atlas')) },
  { id: 'coastal',  emoji: '🌊', label: 'Voyageur Côtier',     desc: 'Expérience sur la côte',            check: (b: any[]) => b.some((x) => (x.type || '').includes('coastal') || (x.expLoc || '').toLowerCase().includes('taghazout') || (x.expLoc || '').toLowerCase().includes('essaouira')) },
  { id: 'culture',  emoji: '🏛️', label: 'Amoureux de Culture', desc: 'Expérience culturelle',             check: (b: any[]) => b.some((x) => (x.type || '').includes('cultural')) },
  { id: 'curious',  emoji: '❤️', label: 'Curieux du Maroc',    desc: '3+ expériences dans la wishlist',   check: (_b: any[], w: string[]) => w.length >= 3 },
  { id: 'elite',    emoji: '🏆', label: 'Elite Explorer',      desc: '50 000 MAD+ de voyages réservés',   check: (_b: any[], _w: string[], t: number) => t >= 50000 },
];

/* ── Tabs ───────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'overview',     icon: '◆',  label: 'Accueil' },
  { key: 'reservations', icon: '🗺️', label: 'Voyages' },
  { key: 'requests',     icon: '✂️', label: 'Sur Mesure' },
  { key: 'wishlist',     icon: '❤️', label: 'Wishlist' },
  { key: 'passport',     icon: '✈️', label: 'Passeport' },
  { key: 'edit',         icon: '👤', label: 'Profil' },
  { key: 'settings',     icon: '⚙️', label: 'Réglages' },
];
type TabKey = 'overview' | 'reservations' | 'requests' | 'wishlist' | 'passport' | 'edit' | 'settings';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',  color: '#f59e0b', bg: '#1a1200' },
  confirmed: { label: 'Confirmée',   color: '#22c55e', bg: '#071a09' },
  cancelled: { label: 'Annulée',     color: '#ef4444', bg: '#1a0505' },
};
const COUNTRIES = ['Maroc', 'France', 'Chine', 'Japon', 'USA', 'UK', 'Allemagne', 'EAU', 'Canada', 'Autre'];

/* ══════════════════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════════════════ */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, refresh } = useAuth();

  const [tab, setTab]           = useState<TabKey>('overview');
  const [bookings, setBookings] = useState<any[]>([]);
  const [allExps, setAllExps]   = useState<any[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [loadingE, setLoadingE] = useState(false);
  const [planReqs, setPlanReqs] = useState<any[]>([]);
  const [loadingR, setLoadingR] = useState(false);

  useEffect(() => {
    if (!user) { setLoadingB(false); return; }
    getMyBookings().then(setBookings).catch(() => {}).finally(() => setLoadingB(false));
  }, [user]);

  useEffect(() => {
    if (tab !== 'wishlist' || allExps.length > 0) return;
    setLoadingE(true);
    getExperiences().then(setAllExps).catch(() => {}).finally(() => setLoadingE(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'requests') return;
    setLoadingR(true);
    getMyPlanRequests().then(setPlanReqs).catch(() => {}).finally(() => setLoadingR(false));
  }, [tab]);

  const confirmed    = bookings.filter((b) => b.status === 'confirmed');
  const totalSpent   = confirmed.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const wishlist     = user?.wishlist || [];
  const level        = getLevel(totalSpent);
  const nextProg     = level.next ? Math.min((totalSpent - level.min) / (level.next - level.min), 1) : 1;
  const upcomingB    = bookings.find((b) => b.status === 'confirmed' && new Date(b.date) >= new Date());
  const earnedBadges = BADGE_DEFS.filter((bd) => bd.check(bookings, wishlist, totalSpent));

  /* ── Not logged in ───────────────────────────────────────────────────── */
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: '#080808' }}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=900&q=75' }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.58 }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(8,8,8,0)', 'rgba(8,8,8,0.5)', '#080808']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.65 }}
      />
      <ScrollView
        contentContainerStyle={{ minHeight: height, paddingTop: insets.top + 18, paddingHorizontal: 26, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>R</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3.5 }}>ROAMERS</Text>
        </View>

        <View style={{ height: height * 0.27 }} />

        <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', lineHeight: 43, letterSpacing: -0.5, marginBottom: 12 }}>
          Votre Maroc{'\n'}commence ici.
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 15, lineHeight: 23, marginBottom: 36 }}>
          Réservez des voyages authentiques, suivez vos aventures et débloquez des badges exclusifs.
        </Text>

        <View style={{ gap: 13, marginBottom: 38 }}>
          {[
            { icon: '🗺️', color: '#1d4ed8', title: 'Réservations en temps réel', sub: 'Suivez chaque étape de votre voyage' },
            { icon: '🏆', color: '#d97706', title: 'Badges & récompenses',        sub: 'Débloquez des niveaux exclusifs' },
            { icon: '❤️', color: '#ec4899', title: 'Wishlist personnelle',        sub: 'Sauvegardez vos coups de cœur' },
            { icon: '✂️', color: '#8b5cf6', title: 'Voyages sur mesure',          sub: 'Créez votre itinéraire unique' },
          ].map((b) => (
            <View key={b.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: b.color + '25', borderWidth: 1, borderColor: b.color + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 21 }}>{b.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>{b.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600' }}>500+ voyageurs nous font confiance</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>

        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 13, shadowColor: COLORS.primary, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 14 }}
          onPress={() => navigation.navigate('Login')} activeOpacity={0.87}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 }}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          onPress={() => navigation.navigate('Register')} activeOpacity={0.87}
        >
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '700' }}>Créer un compte gratuit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  /* ── Logged in ───────────────────────────────────────────────────────── */
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <LinearGradient colors={['#16000a', '#0e0e0e']} style={styles.header}>
        {/* top strip */}
        <View style={styles.headerTop}>
          <Text style={styles.logo}>✦ ROAMERS</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnecter', style: 'destructive', onPress: logout },
            ])}
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* avatar row */}
        <View style={styles.headerAvatarRow}>
          <View style={[styles.avatarRing, { borderColor: level.color + 'aa' }]}>
            <LinearGradient colors={[level.color + '60', COLORS.primary]} style={styles.avatarGrad}>
              <Text style={styles.avatarInitials}>{user.fname[0]}{user.lname?.[0] || ''}</Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.headerName}>{user.fname} {user.lname}</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>{user.email}</Text>
            <View style={[styles.levelBadge, { backgroundColor: level.color + '22', borderColor: level.color + '55' }]}>
              <Text style={[styles.levelBadgeTxt, { color: level.color }]}>{level.icon} {level.label}</Text>
            </View>
          </View>
          <View style={styles.headerStatsMini}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: COLORS.primary }]}>{bookings.length}</Text>
              <Text style={styles.miniStatLbl}>voyages</Text>
            </View>
            <View style={[styles.miniStatDivider]} />
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: '#ec4899' }]}>{wishlist.length}</Text>
              <Text style={styles.miniStatLbl}>wishlist</Text>
            </View>
          </View>
        </View>

        {/* level progress */}
        {level.next && (
          <View style={styles.headerProgress}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${nextProg * 100}%` as any, backgroundColor: level.color }]} />
            </View>
            <Text style={styles.progressLbl}>
              {totalSpent.toLocaleString('fr-MA')} / {level.next.toLocaleString('fr-MA')} MAD pour {LEVELS[LEVELS.indexOf(level) + 1]?.label}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setTab(t.key as TabKey)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {tab === 'overview'     && <OverviewTab user={user} bookings={bookings} loading={loadingB} confirmed={confirmed} totalSpent={totalSpent} wishlist={wishlist} level={level} nextProg={nextProg} upcomingB={upcomingB} earnedBadges={earnedBadges} navigation={navigation} />}
        {tab === 'reservations' && <ReservationsTab bookings={bookings} loading={loadingB} onCancel={async (id: string) => {
          Alert.alert('Annuler', 'Annuler cette réservation ?', [
            { text: 'Non', style: 'cancel' },
            { text: 'Oui, annuler', style: 'destructive', onPress: async () => {
              try { await cancelBooking(id); setBookings((bs) => bs.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b)); }
              catch (e: any) { Alert.alert('Erreur', e.message); }
            }},
          ]);
        }} navigation={navigation} />}
        {tab === 'requests' && <DemandesTab planReqs={planReqs} loading={loadingR} navigation={navigation} />}
        {tab === 'wishlist'  && <WishlistTab wishlist={wishlist} allExps={allExps} loading={loadingE} onRemove={async (expId: string) => { try { await toggleWishlist(expId); await refresh(); } catch {} }} navigation={navigation} />}
        {tab === 'passport'  && <PassportTab bookings={bookings} wishlist={wishlist} totalSpent={totalSpent} earnedBadges={earnedBadges} level={level} />}
        {tab === 'edit'      && <EditProfileTab user={user} onSaved={refresh} />}
        {tab === 'settings'  && <SettingsTab onLogout={logout} />}
      </ScrollView>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Overview tab
   ══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({ user, bookings, loading, confirmed, totalSpent, wishlist, level, nextProg, upcomingB, earnedBadges, navigation }: any) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <View style={s.section}>

      {/* Hero banner */}
      <LinearGradient colors={['#1c000a', '#120006', '#0e0e0e']} style={[s.card, { borderColor: COLORS.primary + '44', padding: 0, overflow: 'hidden' }]}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>{greeting}, {user.fname} 👋</Text>
          {upcomingB ? (
            <>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26, marginBottom: 12 }}>
                Votre prochain voyage{'\n'}vous attend ! ✈️
              </Text>
              <View style={{ backgroundColor: '#22c55e18', borderRadius: 12, borderWidth: 1, borderColor: '#22c55e44', padding: 12 }}>
                <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 }}>🎒 PROCHAIN VOYAGE CONFIRMÉ</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{upcomingB.expTitle}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                  📍 {upcomingB.expLoc || '—'}  ·  📅 {new Date(upcomingB.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </Text>
              </View>
            </>
          ) : bookings.length === 0 ? (
            <>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26, marginBottom: 10 }}>
                Commencez votre{'\n'}aventure marocaine 🌄
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
                Déserts, montagnes, médinas — découvrez des expériences uniques.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={s.heroPrimary} onPress={() => navigation.navigate('Explorer')} activeOpacity={0.85}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>🧭 Voir les voyages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.heroSecondary} onPress={() => navigation.navigate('Plan')} activeOpacity={0.85}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' }}>✂️ Sur mesure</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26, marginBottom: 8 }}>
                {confirmed.length} voyage{confirmed.length !== 1 ? 's' : ''} confirmé{confirmed.length !== 1 ? 's' : ''} 🎉
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                {totalSpent > 0 ? `${totalSpent.toLocaleString('fr-MA')} MAD investis en aventures` : 'Votre histoire marocaine continue…'}
              </Text>
            </>
          )}
        </View>
        {/* decorative bottom bar */}
        <View style={{ height: 3, backgroundColor: COLORS.primary + '55' }} />
      </LinearGradient>

      {/* 4 KPI stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { icon: '🗺️', label: 'Réservations', value: bookings.length,   color: COLORS.primary,  bg: '#1a0208' },
          { icon: '✅', label: 'Confirmées',    value: confirmed.length,   color: '#22c55e',       bg: '#071a09' },
          { icon: '❤️', label: 'Wishlist',      value: wishlist.length,    color: '#ec4899',       bg: '#1a0714' },
          { icon: '💰', label: 'MAD (k)',        value: totalSpent > 0 ? (totalSpent / 1000).toFixed(1) : '0', color: '#f59e0b', bg: '#1a1000' },
        ].map((st) => (
          <LinearGradient key={st.label} colors={[st.bg, '#0e0e0e']} style={[s.statCard, { borderColor: st.color + '30' }]}>
            <Text style={s.statIcon}>{st.icon}</Text>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* Recent history */}
      {bookings.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>📖 Mon histoire</Text>
            <TouchableOpacity onPress={() => {/* setTab('reservations') */}}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Tout voir →</Text>
            </TouchableOpacity>
          </View>
          {bookings.slice(0, 3).map((b: any, i: number) => {
            const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            return (
              <View key={b.id} style={[s.timelineRow, i < Math.min(bookings.length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border + '55' }]}>
                <View style={[s.timelineDot, { backgroundColor: st.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.timelineTitle} numberOfLines={1}>{b.expTitle}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={[s.statusPill, { backgroundColor: st.color + '18', borderColor: st.color + '44' }]}>
                      <Text style={[s.statusPillTxt, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>{new Date(b.date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '800', flexShrink: 0 }}>
                  {Number(b.total).toLocaleString('fr-MA')} MAD
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Badges preview */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>🎖️ Badges</Text>
          <Text style={{ color: earnedBadges.length > 0 ? level.color : COLORS.muted, fontSize: 12, fontWeight: '800' }}>
            {earnedBadges.length}/{BADGE_DEFS.length}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BADGE_DEFS.slice(0, 8).map((bd) => {
            const earned = earnedBadges.some((e: any) => e.id === bd.id);
            return (
              <View key={bd.id} style={[s.badgeMini, earned && { borderColor: level.color + '66', backgroundColor: level.color + '18' }]}>
                <Text style={{ fontSize: 22, opacity: earned ? 1 : 0.15 }}>{bd.emoji}</Text>
              </View>
            );
          })}
        </View>
        {earnedBadges.length === 0 && (
          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 12, fontStyle: 'italic' }}>Réservez un voyage pour débloquer vos badges</Text>
        )}
      </View>

      {/* Quick nav grid */}
      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.3, marginBottom: 0 }}>Accès rapide</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { icon: '🧭', label: 'Voyages',    sub: 'Groupes & week-ends',   screen: 'Explorer',   color: '#2563eb' },
          { icon: '⚡', label: 'Activités',  sub: 'Express & culture',     screen: 'Activities', color: '#7c3aed' },
          { icon: '✂️', label: 'Sur Mesure', sub: 'Mon itinéraire',        screen: 'Plan',       color: '#d97706' },
          { icon: '🗺️', label: 'Carte',      sub: 'Toutes destinations',   screen: 'Map',        color: '#059669' },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={[s.quickCard, { borderColor: a.color + '35' }]} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 19 }}>{a.icon}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 }}>{a.label}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, lineHeight: 14 }}>{a.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Reservations tab
   ══════════════════════════════════════════════════════════════════════════ */
function ReservationsTab({ bookings, loading, onCancel, navigation }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? bookings : bookings.filter((b: any) => b.status === filter);

  if (loading) return <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Mes Réservations</Text>
        <Text style={s.sectionSub}>{bookings.length} au total</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
        {[
          { key: 'all',       label: 'Toutes',       color: COLORS.primary },
          { key: 'confirmed', label: '✅ Confirmées', color: '#22c55e' },
          { key: 'pending',   label: '⏳ En attente', color: '#f59e0b' },
          { key: 'cancelled', label: '❌ Annulées',   color: '#ef4444' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && { backgroundColor: f.color, borderColor: f.color }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterChipTxt, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState icon="🗺️" title="Aucune réservation ici" sub="Explorez nos voyages et commencez votre aventure" />
      ) : (
        filtered.map((b: any) => {
          const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
          const upcoming = b.status === 'confirmed' && new Date(b.date) >= new Date();
          return (
            <View key={b.id} style={[s.bookingCard, { borderLeftColor: st.color, borderLeftWidth: 3 }]}>
              {/* header */}
              <View style={[s.bookingCardHead, { backgroundColor: st.bg }]}>
                <View style={[s.statusDot, { backgroundColor: st.color }]} />
                <Text style={[s.bookingStatusTxt, { color: st.color }]}>{st.label}</Text>
                {upcoming && (
                  <View style={[s.upcomingPill]}>
                    <Text style={s.upcomingTxt}>PROCHAIN</Text>
                  </View>
                )}
                <Text style={s.bookingRef} numberOfLines={1}>{b.id}</Text>
              </View>

              <View style={{ padding: 14 }}>
                <Text style={s.bookingTitle} numberOfLines={2}>{b.expTitle}</Text>
                <View style={{ gap: 5, marginBottom: 12 }}>
                  {[
                    { icon: '📍', val: b.expLoc || '—' },
                    { icon: '📅', val: new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { icon: '👥', val: `${b.adults} adulte${b.adults > 1 ? 's' : ''}${b.children ? ` · ${b.children} enfant(s)` : ''}` },
                    { icon: '💰', val: `${Number(b.total).toLocaleString('fr-MA')} MAD` },
                  ].map((d) => (
                    <View key={d.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 13, width: 18 }}>{d.icon}</Text>
                      <Text style={{ color: COLORS.sub, fontSize: 13, flex: 1 }}>{d.val}</Text>
                    </View>
                  ))}
                </View>
                {b.notes ? <View style={s.notesBox}><Text style={{ color: COLORS.muted, fontSize: 12, fontStyle: 'italic' }}>📝 {b.notes}</Text></View> : null}
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  {b.status !== 'cancelled' && (
                    <TouchableOpacity style={s.btnGhost} onPress={() => onCancel(b.id)}>
                      <Text style={[s.btnGhostTxt, { color: COLORS.error }]}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('ExperienceDetail', { id: b.expId })}>
                    <Text style={s.btnPrimaryTxt}>Voir →</Text>
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

/* ══════════════════════════════════════════════════════════════════════════
   Wishlist tab
   ══════════════════════════════════════════════════════════════════════════ */
function WishlistTab({ wishlist, allExps, loading, onRemove, navigation }: any) {
  const wlExps = allExps.filter((e: any) => wishlist.includes(e.id));
  if (loading) return <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Ma Wishlist ❤️</Text>
        <Text style={s.sectionSub}>{wishlist.length} sauvegardée{wishlist.length !== 1 ? 's' : ''}</Text>
      </View>

      {wlExps.length === 0 ? (
        <EmptyState icon="❤️" title="Votre wishlist est vide" sub="Explorez nos voyages et cœurez vos favoris" />
      ) : (
        <View style={{ gap: 12 }}>
          {wlExps.map((exp: any) => (
            <TouchableOpacity
              key={exp.id}
              style={s.wlCard}
              onPress={() => navigation.navigate('ExperienceDetail', { id: exp.id })}
              activeOpacity={0.88}
            >
              {exp.img
                ? <Image source={{ uri: exp.img }} style={s.wlImg} resizeMode="cover" />
                : <View style={[s.wlImg, { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 40 }}>🏔️</Text></View>
              }
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={s.wlGrad}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.wlTitle} numberOfLines={2}>{exp.title}</Text>
                    {exp.location ? <Text style={s.wlLoc}>📍 {exp.location}</Text> : null}
                    <Text style={s.wlPrice}>{Number(exp.price).toLocaleString('fr-MA')} MAD</Text>
                  </View>
                  <TouchableOpacity style={s.wlRemove} onPress={() => onRemove(exp.id)}>
                    <Text style={{ fontSize: 18 }}>❤️</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Passport tab
   ══════════════════════════════════════════════════════════════════════════ */
function PassportTab({ bookings, wishlist, totalSpent, earnedBadges, level }: any) {
  const destinations = [...new Set(bookings.filter((b: any) => b.expLoc).map((b: any) => b.expLoc as string))];
  const SEGS = [
    { key: 'groupe', icon: '🧭', label: 'Voyage Groupe', color: '#3b82f6' },
    { key: 'weekend', icon: '🌙', label: 'Weekend', color: '#8b5cf6' },
    { key: 'express', icon: '⚡', label: 'Activité Express', color: '#f59e0b' },
    { key: 'mesure',  icon: '✂️', label: 'Sur Mesure', color: '#d97706' },
    { key: 'team',    icon: '🤝', label: 'Team Building', color: '#22c55e' },
  ];

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Mon Passeport ✈️</Text>
        <Text style={s.sectionSub}>Vos aventures au Maroc</Text>
      </View>

      {/* Big 3 stats */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { icon: '🗺️', val: bookings.filter((b: any) => b.status === 'confirmed').length, label: 'Voyages',     color: COLORS.primary },
          { icon: '📍', val: destinations.length,                                           label: 'Destinations', color: '#3b82f6' },
          { icon: '🎖️', val: earnedBadges.length,                                           label: 'Badges',       color: '#d97706' },
        ].map((st) => (
          <LinearGradient key={st.label} colors={[st.color + '20', '#0e0e0e']} style={[s.passportStat, { borderColor: st.color + '40' }]}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>{st.icon}</Text>
            <Text style={[s.passportStatVal, { color: st.color }]}>{st.val}</Text>
            <Text style={s.passportStatLbl}>{st.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* Segments explored */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🌍 Univers explorés</Text>
        {SEGS.map((sg) => {
          const count = bookings.filter((b: any) => b.segment === sg.key).length;
          const done = count > 0;
          return (
            <View key={sg.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: sg.color + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 17 }}>{sg.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: done ? COLORS.text : COLORS.sub, fontSize: 13, fontWeight: done ? '700' : '400' }}>{sg.label}</Text>
                  <Text style={{ color: done ? '#22c55e' : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{done ? `✓ ${count}` : 'À explorer'}</Text>
                </View>
                <View style={{ height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: sg.color, width: done ? '100%' : '0%' }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* All badges */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>🏅 Badges</Text>
          <Text style={{ color: level.color, fontSize: 12, fontWeight: '800' }}>{earnedBadges.length}/{BADGE_DEFS.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {BADGE_DEFS.map((bd) => {
            const earned = earnedBadges.some((e: any) => e.id === bd.id);
            return (
              <View key={bd.id} style={[s.badgeCard, earned && { borderColor: level.color + '55', backgroundColor: level.color + '12' }]}>
                <Text style={{ fontSize: 26, marginBottom: 5, opacity: earned ? 1 : 0.15 }}>{bd.emoji}</Text>
                <Text style={[s.badgeName, !earned && { color: COLORS.muted }]} numberOfLines={2}>{bd.label}</Text>
                <Text style={s.badgeDesc} numberOfLines={2}>{bd.desc}</Text>
                <View style={[s.badgeStatus, earned && { backgroundColor: '#16a34a22', borderColor: '#22c55e44' }]}>
                  <Text style={[s.badgeStatusTxt, earned && { color: '#22c55e' }]}>{earned ? '✓ Obtenu' : 'Verrouillé'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Destinations */}
      {destinations.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>📍 Destinations visitées</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
            {destinations.map((d: string) => (
              <View key={d} style={{ backgroundColor: COLORS.primary + '18', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.primary + '33' }}>
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Referral */}
      <LinearGradient colors={['#1a000a', '#0e0e0e']} style={[s.card, { borderColor: COLORS.primary + '44' }]}>
        <Text style={s.cardTitle}>🎁 Partagez l'aventure</Text>
        <Text style={{ color: COLORS.sub, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
          Invitez un ami et bénéficiez tous les deux de 5% sur votre prochaine réservation.
        </Text>
        <TouchableOpacity style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center' }}
          onPress={() => Alert.alert('Bientôt disponible', 'La fonctionnalité de parrainage arrive très bientôt !')}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>🎁 Mon lien de parrainage</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Edit Profile tab
   ══════════════════════════════════════════════════════════════════════════ */
function EditProfileTab({ user, onSaved }: any) {
  const [form, setForm] = useState({ fname: user.fname || '', lname: user.lname || '', phone: user.phone || '', country: user.country || 'Maroc', bio: user.bio || '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.fname.trim()) return Alert.alert('Erreur', 'Prénom requis');
    if (!form.lname.trim()) return Alert.alert('Erreur', 'Nom requis');
    setLoading(true);
    try { await updateProfile(form); await onSaved(); Alert.alert('Succès', 'Profil mis à jour !'); }
    catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Mon Profil 👤</Text>
        <Text style={s.sectionSub}>Vos informations personnelles</Text>
      </View>

      {/* Avatar card */}
      <LinearGradient colors={['#1a000a', '#111']} style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
        <View style={s.editAvatar}>
          <LinearGradient colors={[COLORS.primary, '#6b0015']} style={s.editAvatarGrad}>
            <Text style={s.editAvatarTxt}>{user.fname[0]}{user.lname?.[0] || ''}</Text>
          </LinearGradient>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 12, marginBottom: 4 }}>{user.fname} {user.lname}</Text>
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>{user.email}</Text>
        {user.joined && (
          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>
            Membre depuis {new Date(user.joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
        )}
      </LinearGradient>

      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><RInput label="Prénom" value={form.fname} onChangeText={set('fname')} placeholder="Prénom" /></View>
          <View style={{ flex: 1 }}><RInput label="Nom" value={form.lname} onChangeText={set('lname')} placeholder="Nom" /></View>
        </View>
        <RInput label="Téléphone / WhatsApp" value={form.phone} onChangeText={set('phone')} placeholder="+212 6 XX XX XX XX" keyboardType="phone-pad" />
        <RInput label="Biographie voyage" value={form.bio} onChangeText={set('bio')} placeholder="Partagez votre amour du voyage..." multiline numberOfLines={3} />

        <Text style={s.fieldLabel}>Pays</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', paddingBottom: 10 }}>
          {COUNTRIES.map((c) => (
            <TouchableOpacity key={c} style={[s.countryChip, form.country === c && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={() => set('country')(c)}>
              <Text style={[{ color: COLORS.sub, fontSize: 13, fontWeight: '600' }, form.country === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <RButton label="Enregistrer le profil" onPress={save} loading={loading} />
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Settings tab
   ══════════════════════════════════════════════════════════════════════════ */
function SettingsTab({ onLogout }: any) {
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const set = (k: string) => (v: string) => setPassForm((f) => ({ ...f, [k]: v }));

  async function handleChangePassword() {
    if (!passForm.current)           return Alert.alert('Erreur', 'Mot de passe actuel requis');
    if (passForm.newPass.length < 8) return Alert.alert('Erreur', 'Minimum 8 caractères');
    if (passForm.newPass !== passForm.confirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    setPassLoading(true);
    try { await changePassword(passForm.current, passForm.newPass); Alert.alert('Succès', 'Mot de passe mis à jour'); setPassForm({ current: '', newPass: '', confirm: '' }); }
    catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setPassLoading(false); }
  }

  function handleDelete() {
    Alert.alert('⚠️ Supprimer le compte', 'Cette action est irréversible. Toutes vos données seront supprimées.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await deleteAccount(); await onLogout(); }
        catch (e: any) { Alert.alert('Erreur', e.message); }
      }},
    ]);
  }

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Réglages ⚙️</Text>
        <Text style={s.sectionSub}>Sécurité et préférences</Text>
      </View>

      {/* Password */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🔒 Changer le mot de passe</Text>
        <RInput label="Mot de passe actuel" value={passForm.current} onChangeText={set('current')} secureTextEntry />
        <RInput label="Nouveau mot de passe" value={passForm.newPass} onChangeText={set('newPass')} secureTextEntry />
        <RInput label="Confirmer" value={passForm.confirm} onChangeText={set('confirm')} secureTextEntry />
        <RButton label="Mettre à jour" onPress={handleChangePassword} loading={passLoading} />
      </View>

      {/* Notifications */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🔔 Notifications</Text>
        {[
          { icon: '✉️', label: 'Confirmation de réservation', sub: 'Email à chaque réservation', on: true },
          { icon: '⏰', label: 'Rappels de départ',            sub: 'Rappel 7 jours avant',       on: true },
          { icon: '🆕', label: 'Nouvelles expériences',        sub: 'Alertes nouveaux voyages',   on: false },
          { icon: '🎁', label: 'Offres spéciales',             sub: 'Promotions exclusives',      on: false },
        ].map((n, i, arr) => (
          <View key={n.label} style={[s.notifRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border + '50' }]}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: 17 }}>{n.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 2 }}>{n.label}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 11 }}>{n.sub}</Text>
            </View>
            <View style={[s.toggle, n.on && s.toggleOn]}>
              <Text style={[s.toggleTxt, n.on && { color: COLORS.primary }]}>{n.on ? 'ON' : 'OFF'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Danger */}
      <View style={[s.card, { borderColor: COLORS.error + '44' }]}>
        <Text style={[s.cardTitle, { color: COLORS.error }]}>⚠️ Zone de danger</Text>
        <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
          Supprimer définitivement votre compte et toutes vos données. Cette action est irréversible.
        </Text>
        <TouchableOpacity style={{ backgroundColor: COLORS.error + '15', borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error + '44' }} onPress={handleDelete}>
          <Text style={{ color: COLORS.error, fontSize: 14, fontWeight: '700' }}>🗑️ Supprimer mon compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Sur Mesure tab
   ══════════════════════════════════════════════════════════════════════════ */
const REQ_STATUS: Record<string, { label: string; color: string }> = {
  new:       { label: '🆕 Nouvelle',   color: '#f59e0b' },
  reviewed:  { label: '👁 Examinée',   color: '#3b82f6' },
  contacted: { label: '📞 Contacté',   color: '#22c55e' },
  closed:    { label: '✅ Terminée',   color: '#6b7280' },
};

function DemandesTab({ planReqs, loading, navigation }: any) {
  if (loading) return <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Demandes Sur Mesure ✂️</Text>
        <Text style={s.sectionSub}>{planReqs.length} envoyée{planReqs.length !== 1 ? 's' : ''}</Text>
      </View>

      {planReqs.length === 0 ? (
        <View>
          <EmptyState icon="✂️" title="Aucune demande" sub="Créez votre voyage personnalisé" />
          <TouchableOpacity style={{ marginTop: -12, marginHorizontal: 32, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center' }}
            onPress={() => navigation.navigate('Plan')}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>✈️ Planifier mon voyage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        planReqs.map((r: any) => {
          const st = REQ_STATUS[r.status] || REQ_STATUS.new;
          return (
            <View key={r.id} style={[s.card, { borderLeftColor: st.color, borderLeftWidth: 3 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'monospace' }}>{r.id}</Text>
                <View style={{ borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: st.color + '55', backgroundColor: st.color + '18' }}>
                  <Text style={{ color: st.color, fontSize: 11, fontWeight: '700' }}>{st.label}</Text>
                </View>
              </View>
              {r.destination && <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>📍 {r.destination}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                {r.groupSize && <View style={s.reqTag}><Text style={s.reqTagTxt}>👥 {r.groupSize}</Text></View>}
                {r.duration  && <View style={s.reqTag}><Text style={s.reqTagTxt}>📅 {r.duration}</Text></View>}
                {r.budget    && <View style={s.reqTag}><Text style={s.reqTagTxt}>💰 {r.budget}</Text></View>}
                {r.segment   && <View style={s.reqTag}><Text style={s.reqTagTxt}>🏷 {r.segment}</Text></View>}
              </View>
              {r.message && <Text style={{ color: COLORS.muted, fontSize: 12, fontStyle: 'italic', marginBottom: 8, lineHeight: 17 }} numberOfLines={2}>💬 {r.message}</Text>}
              <Text style={{ color: COLORS.muted, fontSize: 11 }}>{new Date(r.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ── Shared empty state ────────────────────────────────────────────────── */
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 52, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: COLORS.sub, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>{sub}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  /* ── Header ── */
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logo: { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  logoutBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  headerAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarGrad: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerName: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  headerEmail: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  levelBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  levelBadgeTxt: { fontSize: 11, fontWeight: '800' },

  headerStatsMini: { alignItems: 'center', gap: 4 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 17, fontWeight: '900' },
  miniStatLbl: { color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  miniStatDivider: { width: 20, height: 1, backgroundColor: COLORS.border },

  headerProgress: { paddingTop: 2 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: 4, borderRadius: 2 },
  progressLbl: { color: COLORS.muted, fontSize: 11 },

  /* ── Tab bar ── */
  tabBarWrap: { borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#0b0b0b' },
  tabBarInner: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 2, gap: 2 },
  tabItem: { alignItems: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: RADIUS.md, minWidth: 68, position: 'relative' },
  tabItemActive: { backgroundColor: COLORS.primary + '14' },
  tabIcon: { fontSize: 15, marginBottom: 2, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary, fontWeight: '800' },
  tabIndicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },

  /* ── Sections ── */
  section: { padding: 16, gap: 16 },
  sectionHead: { marginBottom: -4 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  sectionSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },

  /* ── Cards ── */
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },

  /* ── Stats ── */
  statCard: { flex: 1, minWidth: HALF - 4, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', borderWidth: 1 },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: COLORS.muted, fontSize: 10, textAlign: 'center', fontWeight: '600' },

  /* ── Timeline ── */
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  timelineTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 5 },
  statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },

  /* ── Badges ── */
  badgeMini: { width: 46, height: 46, borderRadius: RADIUS.md, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  badgeCard: { width: (width - 32 - 24 - 24) / 4, alignItems: 'center', backgroundColor: '#111', borderRadius: RADIUS.md, padding: 8, borderWidth: 1, borderColor: COLORS.border },
  badgeName: { color: COLORS.text, fontSize: 8, fontWeight: '700', textAlign: 'center', lineHeight: 11, marginBottom: 2 },
  badgeDesc: { color: COLORS.muted, fontSize: 7, textAlign: 'center', lineHeight: 10, marginBottom: 5 },
  badgeStatus: { borderRadius: RADIUS.pill, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: COLORS.border, borderWidth: 1, borderColor: 'transparent' },
  badgeStatusTxt: { color: COLORS.muted, fontSize: 7, fontWeight: '700' },

  /* ── Quick nav ── */
  quickCard: { width: HALF, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, alignItems: 'flex-start', borderWidth: 1 },

  /* ── Reservations ── */
  filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  filterChipTxt: { color: COLORS.sub, fontSize: 12, fontWeight: '600' },

  bookingCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  bookingCardHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  bookingStatusTxt: { fontSize: 12, fontWeight: '700', flex: 1 },
  upcomingPill: { backgroundColor: '#d97706', borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 2 },
  upcomingTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  bookingRef: { color: COLORS.muted, fontSize: 10, maxWidth: 80 },
  bookingTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  notesBox: { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  btnGhost: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.error + '55' },
  btnGhostTxt: { fontSize: 12, fontWeight: '600' },
  btnPrimary: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary },
  btnPrimaryTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* ── Wishlist ── */
  wlCard: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, height: 200 },
  wlImg: { width: '100%', height: '100%', position: 'absolute' },
  wlGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingTop: 50 },
  wlTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3, lineHeight: 19 },
  wlLoc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  wlPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '900' },
  wlRemove: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0 },

  /* ── Passport ── */
  passportStat: { flex: 1, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', borderWidth: 1 },
  passportStatVal: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  passportStatLbl: { color: COLORS.muted, fontSize: 10, textAlign: 'center', fontWeight: '600' },

  /* ── Edit profile ── */
  editAvatar: { width: 80, height: 80, borderRadius: 40, ...SHADOW.md },
  editAvatarGrad: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  editAvatarTxt: { color: '#fff', fontSize: 28, fontWeight: '900' },
  fieldLabel: { color: COLORS.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  countryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 8 },

  /* ── Settings ── */
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  toggle: { backgroundColor: COLORS.border + '80', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  toggleOn: { backgroundColor: COLORS.primary + '25', borderWidth: 1, borderColor: COLORS.primary + '44' },
  toggleTxt: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },

  /* ── Sur Mesure ── */
  reqTag: { backgroundColor: COLORS.bg, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  reqTagTxt: { color: COLORS.sub, fontSize: 12 },

  /* ── Misc ── */
  loadingBox: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },

  /* ── Hero CTA buttons (OverviewTab) ── */
  heroPrimary:  { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' as const, shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 10 },
  heroSecondary:{ flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 13, alignItems: 'center' as const },
});

/* Alias so main ProfileScreen component (which uses `styles.xxx`) works alongside
   sub-components that use `s.xxx` */
const styles = s;
