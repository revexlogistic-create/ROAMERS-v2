import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, ActivityIndicator, Dimensions, Linking, Platform, Share, Modal, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  getMyBookings, getExperiences, getSiteConfig, getCommunityReviews,
  changePassword, updateProfile, toggleWishlist,
  cancelBooking, deleteAccount, getMyPlanRequests, getAppVersion,
} from '../services/api';
import RInput from '../components/RInput';
import RButton from '../components/RButton';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import Icon from '../components/Icons';

const { width, height } = Dimensions.get('window');
const HALF = (width - 48) / 2;

/* Read the REAL installed binary version so the update check and the
   displayed version can never drift from the actual APK (avoids a
   perpetual "update available" banner after installing). */
const APP_VERSION_CODE = parseInt(Application.nativeBuildVersion || '0', 10) || 0;
const APP_VERSION_NAME = Application.nativeApplicationVersion || '0.0.0';

/* ── Member levels ──────────────────────────────────────────────────────── */
const LEVELS = [
  { min: 0,     max: 4999,     icon: '🌱', label: 'Nouveau Roamer',    color: '#6b7280', next: 5000,  rank: null      },
  { min: 5000,  max: 14999,    icon: '🧭', label: 'Explorateur Actif', color: '#3b82f6', next: 15000, rank: 'Top 25%' },
  { min: 15000, max: 49999,    icon: '⛺', label: 'Roamer Aguerri',    color: '#8b5cf6', next: 50000, rank: 'Top 10%' },
  { min: 50000, max: Infinity, icon: '🏆', label: 'Elite Explorer',    color: '#d97706', next: null,  rank: 'Top 1%'  },
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
type TabKey = 'overview' | 'reservations' | 'requests' | 'wishlist' | 'passport' | 'edit' | 'settings';
const TABS: { key: TabKey; icon: (c: string) => React.ReactNode; label: string }[] = [
  { key: 'overview',     icon: (c) => <Icon.Grid     size={17} color={c} />, label: 'Accueil' },
  { key: 'reservations', icon: (c) => <Icon.Tent     size={17} color={c} />, label: 'Voyages' },
  { key: 'requests',     icon: (c) => <Icon.Route    size={17} color={c} />, label: 'Sur Mesure' },
  { key: 'wishlist',     icon: (c) => <Icon.Bookmark size={17} color={c} />, label: 'Wishlist' },
  { key: 'passport',     icon: (c) => <Icon.Globe    size={17} color={c} />, label: 'Passeport' },
  { key: 'edit',         icon: (c) => <Icon.Person   size={17} color={c} />, label: 'Profil' },
  { key: 'settings',     icon: (c) => <Icon.Sliders  size={17} color={c} />, label: 'Réglages' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',  color: '#f59e0b', bg: '#1a1200' },
  confirmed: { label: 'Confirmée',   color: '#22c55e', bg: '#071a09' },
  cancelled: { label: 'Annulée',     color: '#ef4444', bg: '#1a0505' },
};
const COUNTRIES = ['Maroc', 'France', 'Chine', 'Japon', 'USA', 'UK', 'Allemagne', 'EAU', 'Canada', 'Autre'];

const REFERRAL_BASE = 'https://roamerscommunity.com';

/** Derive a short, deterministic referral code from user ID */
function makeRefCode(userId: string): string {
  return userId.replace(/-/g, '').toUpperCase().slice(0, 8);
}

/* ══════════════════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════════════════ */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, refresh } = useAuth();

  const [tab, setTab]           = useState<TabKey>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [allExps, setAllExps]   = useState<any[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [loadingE, setLoadingE] = useState(false);
  const [planReqs, setPlanReqs] = useState<any[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  const [config, setConfig]     = useState<any>({});
  const [commReviews, setCommReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoadingB(false); return; }
    getMyBookings().then(setBookings).catch(() => {}).finally(() => setLoadingB(false));
  }, [user]);

  /* Community / brand data (social proof, WhatsApp, recent reviews) — non-blocking */
  useEffect(() => {
    getSiteConfig().then(setConfig).catch(() => {});
    getCommunityReviews(10).then((d) => setCommReviews(d.reviews || [])).catch(() => {});
  }, []);

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
            { iconEl: <Icon.Tent     size={20} color='#1d4ed8' />, color: '#1d4ed8', title: 'Réservations en temps réel', sub: 'Suivez chaque étape de votre voyage' },
            { iconEl: <Icon.Trophy   size={20} color='#d97706' />, color: '#d97706', title: 'Badges & récompenses',        sub: 'Débloquez des niveaux exclusifs' },
            { iconEl: <Icon.Bookmark size={20} color='#ec4899' />, color: '#ec4899', title: 'Wishlist personnelle',        sub: 'Sauvegardez vos coups de cœur' },
            { iconEl: <Icon.Route    size={20} color='#8b5cf6' />, color: '#8b5cf6', title: 'Voyages sur mesure',          sub: 'Créez votre itinéraire unique' },
          ].map((b) => (
            <View key={b.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: b.color + '25', borderWidth: 1, borderColor: b.color + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {b.iconEl}
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
          <View style={styles.headerTopLeft}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setMenuOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <View style={styles.burgerLine} />
              <View style={styles.burgerLine} />
              <View style={styles.burgerLine} />
            </TouchableOpacity>
            <Text style={styles.logo}>✦ ROAMERS</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnecter', style: 'destructive', onPress: logout },
            ])}
          >
            <Icon.Logout size={17} color={COLORS.muted} />
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
            <View style={styles.badgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '22', borderColor: level.color + '55' }]}>
                <Text style={[styles.levelBadgeTxt, { color: level.color }]}>{level.icon} {level.label}</Text>
              </View>
              {level.rank && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeTxt}>🔝 {level.rank} des Roamers</Text>
                </View>
              )}
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

      {/* ── Current section bar (opens hamburger menu) ── */}
      <TouchableOpacity style={styles.sectionBar} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
        {TABS.find((t) => t.key === tab)?.icon(COLORS.primary)}
        <Text style={styles.sectionBarTxt}>{TABS.find((t) => t.key === tab)?.label}</Text>
        <Text style={styles.sectionBarChevron}>▾</Text>
      </TouchableOpacity>

      {/* ── Hamburger drawer ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.drawerOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.drawer, { paddingTop: insets.top + 16 }]} onPress={() => {}}>
            <Text style={styles.drawerTitle}>Mon espace</Text>
            <Text style={styles.drawerSub} numberOfLines={1}>{user.fname} {user.lname}</Text>
            <View style={styles.drawerDivider} />
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.drawerItem, active && styles.drawerItemActive]}
                  onPress={() => { setTab(t.key); setMenuOpen(false); }}
                  activeOpacity={0.7}
                >
                  {t.icon(active ? COLORS.primary : COLORS.muted)}
                  <Text style={[styles.drawerItemTxt, active && styles.drawerItemTxtActive]}>{t.label}</Text>
                  {active && <View style={styles.drawerDot} />}
                </TouchableOpacity>
              );
            })}
            <View style={styles.drawerDivider} />
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Déconnecter', style: 'destructive', onPress: logout },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Icon.Logout size={17} color="#ef4444" />
              <Text style={[styles.drawerItemTxt, { color: '#ef4444' }]}>Déconnexion</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {tab === 'overview'     && <OverviewTab user={user} bookings={bookings} loading={loadingB} confirmed={confirmed} totalSpent={totalSpent} wishlist={wishlist} level={level} nextProg={nextProg} upcomingB={upcomingB} earnedBadges={earnedBadges} navigation={navigation} setTab={setTab} config={config} commReviews={commReviews} />}
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
        {tab === 'passport'  && <PassportTab user={user} bookings={bookings} wishlist={wishlist} totalSpent={totalSpent} earnedBadges={earnedBadges} level={level} />}
        {tab === 'edit'      && <EditProfileTab user={user} onSaved={refresh} />}
        {tab === 'settings'  && <SettingsTab onLogout={logout} />}
      </ScrollView>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Overview tab
   ══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({ user, bookings, loading, confirmed, totalSpent, wishlist, level, nextProg, upcomingB, earnedBadges, navigation, setTab, config, commReviews }: any) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

  /* Community social proof — from CMS config with safe fallbacks */
  const commMembers = config?.cmsHeroSt1Val || '500+';
  const commSatisf  = config?.cmsHeroSt3Val || '98%';
  const commWa      = (config?.whatsapp || '212600000000').replace(/[^0-9]/g, '');
  const joinWhatsApp = () => {
    /* Prefer a real community link (WhatsApp Community / Instagram) if configured */
    if (config?.communityUrl) { Linking.openURL(config.communityUrl).catch(() => {}); return; }
    const msg = encodeURIComponent(`Bonjour ! Je suis ${user.fname}, membre de la communauté Roamers 🌍. J'aimerais en savoir plus.`);
    Linking.openURL(`https://wa.me/${commWa}?text=${msg}`).catch(() => {});
  };

  /* ── Community challenges — real progress from bookings & badges ── */
  const activeB    = bookings.filter((b: any) => b.status !== 'cancelled');
  const universes  = new Set(activeB.map((b: any) => b.segment).filter(Boolean));
  const destSet    = new Set(activeB.map((b: any) => b.expLoc).filter(Boolean));
  const CHALLENGES = [
    { icon: '🌍', label: 'Explorez 3 univers',     cur: universes.size,       goal: 3,                color: '#10b981' },
    { icon: '🎖️', label: 'Débloquez 6 badges',     cur: earnedBadges.length,  goal: 6,                color: '#d97706' },
    { icon: '📍', label: 'Visitez 5 destinations', cur: destSet.size,         goal: 5,                color: '#3b82f6' },
  ];

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
          { icon: (c: string) => <Icon.Tent     size={20} color={c} />, label: 'Réservations', value: bookings.length,   color: COLORS.primary,  bg: '#1a0208' },
          { icon: (c: string) => <Icon.Shield   size={20} color={c} />, label: 'Confirmées',    value: confirmed.length,   color: '#22c55e',       bg: '#071a09' },
          { icon: (c: string) => <Icon.Bookmark size={20} color={c} />, label: 'Wishlist',      value: wishlist.length,    color: '#ec4899',       bg: '#1a0714' },
          { icon: (c: string) => <Icon.Trophy   size={20} color={c} />, label: 'MAD (k)',        value: totalSpent > 0 ? (totalSpent / 1000).toFixed(1) : '0', color: '#f59e0b', bg: '#1a1000' },
        ].map((st) => (
          <LinearGradient key={st.label} colors={[st.bg, '#0e0e0e']} style={[s.statCard, { borderColor: st.color + '30' }]}>
            <View style={{ marginBottom: 6 }}>{st.icon(st.color)}</View>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* ── COMMUNITY HUB ── */}
      <LinearGradient colors={['#06140f', '#0e0e0e']} style={[s.card, { borderColor: '#10b98144', padding: 16, gap: 0 }]}>
        <View style={s.commHead}>
          <View style={s.commLogo}><Icon.Globe size={18} color="#10b981" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.commTitle}>Communauté Roamers</Text>
            <Text style={s.commSub}>Pas une agence. Une communauté. 🌍</Text>
          </View>
        </View>

        {/* Social proof */}
        <View style={s.commProof}>
          {[
            { v: commMembers, l: 'voyageurs' },
            { v: commSatisf,  l: 'satisfaits' },
            { v: `${earnedBadges.length}/${BADGE_DEFS.length}`, l: 'vos badges' },
          ].map((p, i) => (
            <React.Fragment key={p.l}>
              {i > 0 && <View style={s.commProofDiv} />}
              <View style={s.commProofItem}>
                <Text style={s.commProofVal}>{p.v}</Text>
                <Text style={s.commProofLbl}>{p.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Impact line — ties to the brand's social mission */}
        <View style={s.commImpact}>
          <Text style={{ fontSize: 15 }}>🌱</Text>
          <Text style={s.commImpactTxt}>
            Vos voyages soutiennent l'emploi local et les coopératives marocaines.
          </Text>
        </View>

        {/* Actions */}
        <View style={s.commActions}>
          <TouchableOpacity style={[s.commBtn, { backgroundColor: '#10b981' }]} onPress={joinWhatsApp} activeOpacity={0.86}>
            <Text style={s.commBtnTxt}>💬  Rejoindre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.commBtnAlt} onPress={() => setTab && setTab('passport')} activeOpacity={0.86}>
            <Text style={s.commBtnAltTxt}>🎁  Parrainer un ami</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── COMMUNITY CHALLENGES ── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>🎯 Défis Roamers</Text>
          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600' }}>Progression communauté</Text>
        </View>
        <View style={{ gap: 12 }}>
          {CHALLENGES.map((c) => {
            const pct  = Math.min(c.cur / c.goal, 1);
            const done = c.cur >= c.goal;
            return (
              <View key={c.label} style={s.chalRow}>
                <View style={[s.chalIcon, { backgroundColor: c.color + '20' }]}>
                  <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.chalTop}>
                    <Text style={[s.chalLabel, done && { color: c.color }]}>{c.label}</Text>
                    <Text style={[s.chalCount, { color: done ? c.color : COLORS.muted }]}>
                      {done ? '✓ Réussi' : `${Math.min(c.cur, c.goal)}/${c.goal}`}
                    </Text>
                  </View>
                  <View style={s.chalTrack}>
                    <View style={[s.chalFill, { width: `${pct * 100}%` as any, backgroundColor: c.color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── COMMUNITY REVIEWS WALL ── */}
      {commReviews && commReviews.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>💬 La communauté a adoré</Text>
            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600' }}>Avis récents</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            {commReviews.map((rv: any) => (
              <TouchableOpacity
                key={rv.id}
                style={s.revWallCard}
                activeOpacity={0.85}
                onPress={() => rv.expId && navigation.navigate('ExperienceDetail', { id: rv.expId, initialTab: 'overview' })}
              >
                <View style={s.revWallHead}>
                  <View style={s.revWallAvatar}><Text style={s.revWallAvatarTxt}>{rv.initial || '?'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.revWallName} numberOfLines={1}>{rv.displayName || 'Roamer'}</Text>
                    <Text style={s.revWallStars}>{'★'.repeat(Math.max(0, Math.min(5, rv.rating)))}</Text>
                  </View>
                </View>
                <Text style={s.revWallTxt} numberOfLines={4}>"{rv.text}"</Text>
                {!!rv.expTitle && <Text style={s.revWallExp} numberOfLines={1}>📍 {rv.expTitle}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rewards Points card */}
      {(() => {
        const pts = Math.floor(totalSpent / 10);
        const nextLvlPts = level.next ? Math.floor(level.next / 10) : null;
        const currPts    = Math.floor(level.min / 10);
        const progress   = nextLvlPts ? Math.min((pts - currPts) / (nextLvlPts - currPts), 1) : 1;
        return (
          <LinearGradient colors={['#110a00', '#0e0e0e']} style={[s.card, { borderColor: '#f59e0b44', padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f59e0b22', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Trophy size={18} color="#f59e0b" />
                </View>
                <View>
                  <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Points Roamers</Text>
                  <Text style={{ color: '#f59e0b', fontSize: 22, fontWeight: '900', lineHeight: 26 }}>
                    {pts.toLocaleString('fr-MA')} <Text style={{ fontSize: 13, fontWeight: '600', color: '#f59e0b99' }}>pts</Text>
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: COLORS.muted, fontSize: 10 }}>Niveau actuel</Text>
                <Text style={{ color: level.color, fontSize: 12, fontWeight: '800' }}>{level.icon} {level.label}</Text>
              </View>
            </View>
            {nextLvlPts && (
              <>
                <View style={{ height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                  <View style={{ width: `${progress * 100}%` as any, height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 }} />
                </View>
                <Text style={{ color: COLORS.muted, fontSize: 11 }}>
                  {pts.toLocaleString('fr-MA')} / {nextLvlPts.toLocaleString('fr-MA')} pts pour {LEVELS[LEVELS.indexOf(level) + 1]?.label}
                </Text>
              </>
            )}
            {!nextLvlPts && (
              <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700' }}>🏆 Niveau maximum atteint !</Text>
            )}
            <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 8 }}>1 point = 10 MAD dépensé sur voyages confirmés</Text>
          </LinearGradient>
        );
      })()}

      {/* Recent history */}
      {bookings.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>📖 Mon histoire</Text>
            <TouchableOpacity onPress={() => setTab && setTab('reservations')}>
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
          { icon: (c: string) => <Icon.Mountain size={19} color={c} />, label: 'Voyages',    sub: 'Groupes & week-ends',   screen: 'Explorer',   color: '#2563eb' },
          { icon: (c: string) => <Icon.Star     size={19} color={c} />, label: 'Activités',  sub: 'Express & culture',     screen: 'Activities', color: '#7c3aed' },
          { icon: (c: string) => <Icon.Calendar size={19} color={c} />, label: 'Events',     sub: 'Rencontres & ateliers',  screen: 'Events',     color: '#b8172e' },
          { icon: (c: string) => <Icon.Route    size={19} color={c} />, label: 'Sur Mesure', sub: 'Mon itinéraire',        screen: 'Plan',       color: '#d97706' },
          { icon: (c: string) => <Icon.Pin      size={19} color={c} />, label: 'Carte',      sub: 'Toutes destinations',   screen: 'Map',        color: '#059669' },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={[s.quickCard, { borderColor: a.color + '35' }]} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {a.icon(a.color)}
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
        <EmptyState icon={<Icon.Tent size={52} color={COLORS.muted} />} title="Aucune réservation ici" sub="Explorez nos voyages et commencez votre aventure" />
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
        <EmptyState icon={<Icon.Bookmark size={52} color={COLORS.muted} />} title="Votre wishlist est vide" sub="Explorez nos voyages et cœurez vos favoris" />
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
                : <View style={[s.wlImg, { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' }]}><Icon.Mountain size={40} color={COLORS.muted} /></View>
              }
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={s.wlGrad}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.wlTitle} numberOfLines={2}>{exp.title}</Text>
                    {exp.location ? <Text style={s.wlLoc}>📍 {exp.location}</Text> : null}
                    <Text style={s.wlPrice}>{Number(exp.price).toLocaleString('fr-MA')} MAD</Text>
                  </View>
                  <TouchableOpacity style={s.wlRemove} onPress={() => onRemove(exp.id)}>
                    <Icon.Bookmark size={18} color='#ec4899' />
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
function PassportTab({ user, bookings, wishlist, totalSpent, earnedBadges, level }: any) {
  const destinations: string[] = [...new Set<string>(bookings.filter((b: any) => b.expLoc).map((b: any) => String(b.expLoc)))];
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

      {/* ── Referral ── */}
      {(() => {
        const refCode = makeRefCode(user?.id || '');
        const refLink = `${REFERRAL_BASE}/?ref=${refCode}`;
        const shareMsg =
          `Découvrez le Maroc authentiquement avec Roamers ! 🏔️\n\n` +
          `Utilisez mon code **${refCode}** pour bénéficier de 5% de réduction sur votre première réservation.\n\n` +
          `👉 ${refLink}`;

        async function handleShare() {
          try {
            await Share.share(
              { message: shareMsg, url: refLink, title: 'Rejoignez Roamers 🏔️' },
              { dialogTitle: 'Partager mon code Roamers' }
            );
          } catch (_) {}
        }

        return (
          <LinearGradient colors={['#1a000a', '#0e0e0e']} style={[s.card, { borderColor: COLORS.primary + '44', gap: 0 }]}>
            {/* Title */}
            <Text style={[s.cardTitle, { marginBottom: 6 }]}>🎁 Partagez l'aventure</Text>
            <Text style={{ color: COLORS.sub, fontSize: 13, lineHeight: 20, marginBottom: 18 }}>
              Invitez un ami — vous bénéficiez tous les deux de{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '800' }}>5% de réduction</Text>{' '}
              sur votre prochaine réservation.
            </Text>

            {/* Code card */}
            <View style={s.refCodeCard}>
              <Text style={s.refCodeLabel}>VOTRE CODE DE PARRAINAGE</Text>
              <Text style={s.refCode} selectable>{refCode}</Text>
              <View style={s.refDivider} />
              <Text style={s.refLink} selectable numberOfLines={1}>{refLink}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 6 }}>
                Maintenez appuyé pour copier le lien
              </Text>
            </View>

            {/* How it works */}
            <View style={{ gap: 10, marginBottom: 18 }}>
              {[
                { n: '1', t: 'Partagez votre code à un ami' },
                { n: '2', t: "L'ami réserve avec votre code" },
                { n: '3', t: 'Tous les deux : −5% sur votre prochaine resa' },
              ].map((step) => (
                <View key={step.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={s.refStepNum}>
                    <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '900' }}>{step.n}</Text>
                  </View>
                  <Text style={{ color: COLORS.sub, fontSize: 12, flex: 1, lineHeight: 17 }}>{step.t}</Text>
                </View>
              ))}
            </View>

            {/* Share button */}
            <TouchableOpacity
              style={s.refShareBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text style={s.refShareBtnTxt}>🚀 Partager mon code</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      })()}
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

const NOTIF_PREFS_KEY = 'roamers_notif_prefs';

type NotifPrefs = {
  reservationConfirm: boolean;
  departureReminder:  boolean;
  newExperiences:     boolean;
  specialOffers:      boolean;
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  reservationConfirm: true,
  departureReminder:  true,
  newExperiences:     false,
  specialOffers:      false,
};

const NOTIF_ITEMS: {
  key: keyof NotifPrefs;
  icon: string;
  label: string;
  sub: string;
  push: boolean;
}[] = [
  { key: 'reservationConfirm', icon: '✉️', label: 'Confirmation de réservation', sub: 'Email à chaque réservation confirmée',      push: false },
  { key: 'departureReminder',  icon: '⏰', label: 'Rappels de départ',            sub: 'Notification 7j avant votre départ',        push: true  },
  { key: 'newExperiences',     icon: '🆕', label: 'Nouvelles expériences',        sub: 'Alertes quand de nouveaux voyages arrivent', push: true  },
  { key: 'specialOffers',      icon: '🎁', label: 'Offres spéciales',             sub: 'Promotions et réductions exclusives',       push: true  },
];

function SettingsTab({ onLogout }: any) {
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'upToDate' | 'available'>('idle');
  const [remoteVersion, setRemoteVersion] = useState<{ versionCode: number; versionName: string; downloadUrl: string; releaseNotes: string } | null>(null);

  /* ── Notification state ──────────────────────────────────────────────── */
  const [permStatus, setPermStatus] = useState<string>('undetermined');
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    (async () => {
      /* Check OS permission status */
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPermStatus(status);
      } catch {}
      /* Load persisted prefs */
      try {
        const saved = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (saved) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(saved) });
      } catch {}
    })();
  }, []);

  async function requestPushPermission(): Promise<boolean> {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') { setPermStatus('granted'); return true; }
      const { status } = await Notifications.requestPermissionsAsync();
      setPermStatus(status);
      if (status === 'granted') {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Roamers', importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250], lightColor: '#B8172E', sound: 'default', showBadge: true,
          });
        }
        return true;
      }
      Alert.alert(
        'Notifications désactivées',
        'Pour recevoir des rappels et confirmations, activez les notifications Roamers dans vos Réglages système.',
        [{ text: 'Plus tard', style: 'cancel' }, { text: 'Réglages', onPress: () => Linking.openSettings() }]
      );
      return false;
    } catch { return false; }
  }

  async function toggleNotif(key: keyof NotifPrefs) {
    const newVal = !notifPrefs[key];
    /* Push-based toggle: request OS permission when turning on */
    const item = NOTIF_ITEMS.find((n) => n.key === key);
    if (newVal && item?.push && permStatus !== 'granted') {
      const granted = await requestPushPermission();
      if (!granted) return;
    }
    const next = { ...notifPrefs, [key]: newVal };
    setNotifPrefs(next);
    try { await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next)); } catch {}
  }

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

  async function checkForUpdate(silent = false) {
    setUpdateState('checking');
    try {
      const info = await getAppVersion();
      setRemoteVersion(info);
      setUpdateState(info.versionCode > APP_VERSION_CODE ? 'available' : 'upToDate');
    } catch {
      setUpdateState('idle');
      if (!silent) Alert.alert('Erreur', 'Impossible de vérifier les mises à jour. Vérifiez votre connexion.');
    }
  }

  /* Auto-check on mount so the "update available" banner appears on its own,
     without the user having to tap "Vérifier les mises à jour". Silent on
     failure (e.g. offline) — the manual button still surfaces errors. */
  useEffect(() => { checkForUpdate(true); }, []);

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

      {/* ── Password ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🔒 Changer le mot de passe</Text>
        <RInput label="Mot de passe actuel" value={passForm.current} onChangeText={set('current')} secureTextEntry />
        <RInput label="Nouveau mot de passe" value={passForm.newPass} onChangeText={set('newPass')} secureTextEntry />
        <RInput label="Confirmer" value={passForm.confirm} onChangeText={set('confirm')} secureTextEntry />
        <RButton label="Mettre à jour" onPress={handleChangePassword} loading={passLoading} />
      </View>

      {/* ── Notifications ── */}
      <View style={s.card}>
        {/* Header row */}
        <View style={[s.cardHead, { marginBottom: 2 }]}>
          <Text style={[s.cardTitle, { marginBottom: 0 }]}>🔔 Notifications</Text>
          {permStatus === 'granted'
            ? <View style={s.permBadgeOn}><Text style={s.permBadgeOnTxt}>✓ Activées</Text></View>
            : <TouchableOpacity style={s.permBadgeOff} onPress={() => Linking.openSettings()} activeOpacity={0.75}>
                <Text style={s.permBadgeOffTxt}>⚠️ Désactivées</Text>
              </TouchableOpacity>
          }
        </View>

        {/* Banner — only when push permission is not granted */}
        {permStatus !== 'granted' && (
          <TouchableOpacity style={s.permBanner} onPress={requestPushPermission} activeOpacity={0.8}>
            <View style={s.permBannerIconWrap}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                Activer les notifications push
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 15 }}>
                Confirmations, rappels de départ et offres exclusives.
              </Text>
            </View>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '800', flexShrink: 0 }}>Activer →</Text>
          </TouchableOpacity>
        )}

        {/* Toggle rows */}
        <View style={{ marginTop: 14 }}>
          {NOTIF_ITEMS.map((n, i) => {
            const on = notifPrefs[n.key];
            /* Push-type notif is visually muted when OS permission not granted */
            const pushBlocked = n.push && permStatus !== 'granted';
            const effectiveOn = on && !pushBlocked;
            return (
              <TouchableOpacity
                key={n.key}
                style={[
                  s.notifRow,
                  i < NOTIF_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border + '50' },
                ]}
                onPress={() => toggleNotif(n.key)}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={[s.notifIcon, effectiveOn && s.notifIconOn]}>
                  <Text style={{ fontSize: 17 }}>{n.icon}</Text>
                </View>

                {/* Label + sub */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={[s.notifLabel, pushBlocked && { color: COLORS.muted }]}>{n.label}</Text>
                    {n.push && (
                      <View style={[s.notifPushTag, effectiveOn && s.notifPushTagOn]}>
                        <Text style={[s.notifPushTagTxt, effectiveOn && { color: COLORS.primary }]}>PUSH</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.notifSub}>{n.sub}</Text>
                </View>

                {/* Toggle switch */}
                <View style={[s.switchTrack, effectiveOn ? s.switchTrackOn : s.switchTrackOff]}>
                  <View style={[s.switchThumb, effectiveOn ? s.switchThumbOn : s.switchThumbOff]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer note */}
        <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 14, lineHeight: 15 }}>
          Les notifications email (confirmation) sont toujours actives indépendamment des réglages push.
        </Text>
      </View>

      {/* ── App version & update ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📱 Version de l'application</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>Roamers v{APP_VERSION_NAME}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Build {APP_VERSION_CODE}</Text>
          </View>
          {updateState === 'upToDate' && (
            <View style={{ backgroundColor: '#22c55e18', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#22c55e44' }}>
              <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>✓ À jour</Text>
            </View>
          )}
          {updateState === 'available' && (
            <View style={{ backgroundColor: COLORS.primary + '18', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '55' }}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Mise à jour disponible</Text>
            </View>
          )}
        </View>

        {updateState === 'available' && remoteVersion && (
          <View style={{ backgroundColor: '#1a0508', borderRadius: RADIUS.md, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + '33' }}>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '800', marginBottom: 4 }}>
              Nouvelle version {remoteVersion.versionName} (build {remoteVersion.versionCode})
            </Text>
            {remoteVersion.releaseNotes ? (
              <Text style={{ color: COLORS.sub, fontSize: 12, lineHeight: 18 }}>{remoteVersion.releaseNotes}</Text>
            ) : null}
          </View>
        )}

        {updateState === 'available' && remoteVersion ? (
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8 }}
            onPress={() => {
              const base = require('../constants/theme').API_BASE as string;
              Linking.openURL(base + remoteVersion.downloadUrl);
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>⬇ Télécharger la mise à jour</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[{ borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
              updateState === 'checking'
                ? { borderColor: COLORS.border, backgroundColor: COLORS.card }
                : { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '12' }
            ]}
            onPress={() => checkForUpdate()}
            disabled={updateState === 'checking'}
            activeOpacity={0.8}
          >
            {updateState === 'checking'
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>🔄 Vérifier les mises à jour</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── Danger zone ── */}
      <View style={[s.card, { borderColor: COLORS.error + '44' }]}>
        <Text style={[s.cardTitle, { color: COLORS.error }]}>⚠️ Zone de danger</Text>
        <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
          Supprimer définitivement votre compte et toutes vos données. Cette action est irréversible.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.error + '15', borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error + '44' }}
          onPress={handleDelete}
        >
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
  new:         { label: '🆕 Nouvelle',   color: '#f59e0b' },
  in_progress: { label: '⏳ En cours',   color: '#3b82f6' },
  done:        { label: '✅ Traitée',    color: '#22c55e' },
  cancelled:   { label: '❌ Annulée',    color: '#6b7280' },
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
          <EmptyState icon={<Icon.Route size={52} color={COLORS.muted} />} title="Aucune demande" sub="Créez votre voyage personnalisé" />
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
              {r.destination && <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>📍 {r.destination}</Text>}
              {Array.isArray(r.itineraryStops) && r.itineraryStops.length > 0 && (
                <Text style={{ color: COLORS.sub, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
                  🛤 {r.itineraryStops.join(' → ')}
                </Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                {r.segment   && <View style={s.reqTag}><Text style={s.reqTagTxt}>🏷 {r.segment}</Text></View>}
                {r.groupSize && <View style={s.reqTag}><Text style={s.reqTagTxt}>👥 {r.groupSize}</Text></View>}
                {r.duration  && <View style={s.reqTag}><Text style={s.reqTagTxt}>📅 {r.duration}</Text></View>}
                {r.budget    && <View style={s.reqTag}><Text style={s.reqTagTxt}>💰 {r.budget}</Text></View>}
                {r.dateFrom  && <View style={s.reqTag}><Text style={s.reqTagTxt}>🗓 {r.dateFrom}{r.dateTo ? ' → ' + r.dateTo : ''}{r.flexDate ? ' (flex)' : ''}</Text></View>}
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
function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <View style={s.empty}>
      <View style={{ marginBottom: 16, opacity: 0.35 }}>{icon}</View>
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
  headerTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', gap: 3.5 },
  burgerLine: { width: 16, height: 2, borderRadius: 1, backgroundColor: COLORS.text },
  logo: { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  logoutBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  headerAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarGrad: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerName: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  headerEmail: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  levelBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  levelBadgeTxt: { fontSize: 11, fontWeight: '800' },
  rankBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: '#f0c04066', backgroundColor: '#f0c04018', alignSelf: 'flex-start' },
  rankBadgeTxt: { color: '#f0c040', fontSize: 11, fontWeight: '800' },

  headerStatsMini: { alignItems: 'center', gap: 4 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 17, fontWeight: '900' },
  miniStatLbl: { color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  miniStatDivider: { width: 20, height: 1, backgroundColor: COLORS.border },

  headerProgress: { paddingTop: 2 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: 4, borderRadius: 2 },
  progressLbl: { color: COLORS.muted, fontSize: 11 },

  /* ── Section bar + hamburger drawer ── */
  sectionBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#0b0b0b' },
  sectionBarTxt: { color: COLORS.text, fontSize: 14, fontWeight: '800', flex: 1 },
  sectionBarChevron: { color: COLORS.muted, fontSize: 13, fontWeight: '900' },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', flexDirection: 'row' },
  drawer: { width: '76%', maxWidth: 320, height: '100%', backgroundColor: '#121212', paddingHorizontal: 14, paddingBottom: 24, borderRightWidth: 1, borderRightColor: COLORS.border },
  drawerTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  drawerSub: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 4 },
  drawerDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 12 },
  drawerItemActive: { backgroundColor: COLORS.primary + '14' },
  drawerItemTxt: { color: COLORS.sub, fontSize: 15, fontWeight: '700', flex: 1 },
  drawerItemTxtActive: { color: COLORS.primary, fontWeight: '800' },
  drawerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },

  /* ── Sections ── */
  section: { padding: 16, gap: 16 },
  sectionHead: { marginBottom: -4 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  sectionSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },

  /* ── Cards ── */
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },

  /* ── Community challenges ── */
  chalRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chalIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chalTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chalLabel: { color: COLORS.sub, fontSize: 13, fontWeight: '700' },
  chalCount: { fontSize: 11, fontWeight: '800' },
  chalTrack: { height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  chalFill:  { height: '100%', borderRadius: 3 },

  /* ── Community reviews wall ── */
  revWallCard:      { width: 230, backgroundColor: '#111', borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: '#242424' },
  revWallHead:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  revWallAvatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  revWallAvatarTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
  revWallName:      { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  revWallStars:     { color: '#FFD700', fontSize: 11, marginTop: 1 },
  revWallTxt:       { color: COLORS.sub, fontSize: 12.5, lineHeight: 18, fontStyle: 'italic', minHeight: 72 },
  revWallExp:       { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginTop: 8 },

  /* ── Community hub ── */
  commHead:      { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  commLogo:      { width: 38, height: 38, borderRadius: 11, backgroundColor: '#10b98122', borderWidth: 1, borderColor: '#10b98140', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commTitle:     { color: '#fff', fontSize: 15, fontWeight: '900' },
  commSub:       { color: '#10b981', fontSize: 12, fontWeight: '600', marginTop: 1 },
  commProof:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#10b98122', paddingVertical: 12, marginBottom: 12 },
  commProofItem: { flex: 1, alignItems: 'center' },
  commProofDiv:  { width: 1, height: 26, backgroundColor: '#10b98126' },
  commProofVal:  { color: '#fff', fontSize: 17, fontWeight: '900' },
  commProofLbl:  { color: COLORS.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  commImpact:    { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  commImpactTxt: { color: COLORS.sub, fontSize: 12, lineHeight: 17, flex: 1 },
  commActions:   { flexDirection: 'row', gap: 10 },
  commBtn:       { flex: 1, paddingVertical: 13, borderRadius: RADIUS.md, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 5 }, shadowRadius: 12, elevation: 8 },
  commBtnTxt:    { color: '#fff', fontSize: 13, fontWeight: '900' },
  commBtnAlt:    { flex: 1, paddingVertical: 13, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  commBtnAltTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

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

  /* ── Settings — notifications ── */
  notifRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  notifIcon:      { width: 38, height: 38, borderRadius: 11, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: 'transparent' },
  notifIconOn:    { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary + '40' },
  notifLabel:     { color: COLORS.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  notifSub:       { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
  notifPushTag:   { backgroundColor: '#1e1e1e', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#333' },
  notifPushTagOn: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' },
  notifPushTagTxt:{ color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  /* Toggle switch */
  switchTrack:    { width: 46, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center', flexShrink: 0 },
  switchTrackOn:  { backgroundColor: COLORS.primary },
  switchTrackOff: { backgroundColor: '#2a2a2a' },
  switchThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2 },
  switchThumbOn:  { alignSelf: 'flex-end' as const },
  switchThumbOff: { alignSelf: 'flex-start' as const },

  /* Permission banner */
  permBadgeOn:      { backgroundColor: '#22c55e18', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#22c55e44' },
  permBadgeOnTxt:   { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  permBadgeOff:     { backgroundColor: '#f59e0b15', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#f59e0b44' },
  permBadgeOffTxt:  { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  permBanner:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.primary + '30' },
  permBannerIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  /* ── Referral card ── */
  refCodeCard:  { backgroundColor: '#110005', borderRadius: RADIUS.md, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: COLORS.primary + '44', alignItems: 'center' },
  refCodeLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  refCode:      { color: COLORS.primary, fontSize: 34, fontWeight: '900', letterSpacing: 6, includeFontPadding: false },
  refDivider:   { width: '80%', height: 1, backgroundColor: COLORS.primary + '28', marginVertical: 12 },
  refLink:      { color: COLORS.sub, fontSize: 11, textAlign: 'center' },
  refStepNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '44', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  refShareBtn:  { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 15, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 12 },
  refShareBtnTxt:{ color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

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
