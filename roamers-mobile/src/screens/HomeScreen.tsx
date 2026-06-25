import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, RefreshControl, Image, ActivityIndicator, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExperiences, getSiteConfig, toggleWishlist } from '../services/api';
import ExperienceCard from '../components/ExperienceCard';
import ErrorState from '../components/ErrorState';
import { COLORS, RADIUS, API_BASE } from '../constants/theme';
import Icon from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Only the catalogue segments — express/mesure/team have their own dedicated screens
const SEGMENTS: { key: string; label: string; icon: (a: boolean) => React.ReactNode }[] = [
  { key: 'all',     label: 'Tous',           icon: (a) => <Icon.Grid    size={14} color={a ? '#fff' : COLORS.sub} /> },
  { key: 'groupe',  label: 'Voyage Groupe',  icon: (a) => <Icon.Group   size={14} color={a ? '#fff' : COLORS.sub} /> },
  { key: 'weekend', label: 'Weekend',        icon: (a) => <Icon.Sun     size={14} color={a ? '#fff' : COLORS.sub} /> },
];

/* Renders admin CMS strings that may contain <br> and <em>…</em> (web markup) */
function CmsText({ html, fallback, style, emStyle }: { html?: string; fallback?: string; style?: any; emStyle?: any }) {
  const src = String(html ?? fallback ?? '');
  const parts: { t: string; em: boolean }[] = [];
  src.split(/(<br\s*\/?>|<em[^>]*>.*?<\/em>)/gi).forEach((seg) => {
    if (!seg) return;
    if (/^<br/i.test(seg)) parts.push({ t: '\n', em: false });
    else if (/^<em/i.test(seg)) parts.push({ t: seg.replace(/<[^>]+>/g, ''), em: true });
    else { const t = seg.replace(/<[^>]+>/g, ''); if (t) parts.push({ t, em: false }); }
  });
  return <Text style={style}>{parts.map((p, i) => <Text key={i} style={p.em ? emStyle : undefined}>{p.t}</Text>)}</Text>;
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const [exps, setExps]         = useState<any[]>([]);
  const [config, setConfig]     = useState<any>({});
  const [segment, setSegment]   = useState('all');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh]= useState(false);
  const [error, setError]       = useState(false);

  const handleWishlist = useCallback(async (expId: string) => {
    if (!user) { navigation.navigate('Profile'); return; }
    try { await toggleWishlist(expId); await refresh(); } catch (_) {}
  }, [user, refresh, navigation]);

  /* Share the Android app — sends the direct APK download link */
  const shareApp = useCallback(async () => {
    const apkUrl = `${API_BASE}/downloads/roamers.apk`;
    try {
      await Share.share({
        title: 'Roamers Community',
        message:
          `🌍 Découvre Roamers Community — voyages, activités et expériences sur mesure au Maroc !\n\n` +
          `📲 Télécharge l'application Android ici :\n${apkUrl}`,
      });
    } catch (_) {}
  }, []);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [e, c] = await Promise.all([getExperiences(), getSiteConfig()]);
      setExps(e); setConfig(c);
    } catch (_) { setError(true); }
    setLoading(false); setRefresh(false);
  }, []);

  useEffect(() => { load(); }, []);

  // Catalogue only — team/mesure have dedicated pages
  const catalogueExps = exps.filter((e) => e.segment !== 'team' && e.segment !== 'mesure');
  const filtered = segment === 'all' ? catalogueExps : catalogueExps.filter((e) => e.segment === segment);

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  );

  if (error && exps.length === 0) return (
    <View style={[styles.loader, { paddingTop: insets.top }]}>
      <ErrorState onRetry={() => { setLoading(true); load(); }} />
    </View>
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.primary} />}>

      {/* ── HERO ── */}
      <LinearGradient colors={['#1a0508', '#0e0e0e']} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroTop}>
          <Text style={styles.logoTxt}>ROAMERS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Contact')} style={styles.contactBtn}>
            <Text style={styles.contactBtnTxt}>Contact</Text>
          </TouchableOpacity>
        </View>
        <CmsText html={config.cmsHeroTitle} fallback={'Explorez le Maroc<br><em>autrement.</em>'} style={styles.heroTitle} emStyle={styles.heroEm} />
        <CmsText html={config.cmsHeroSub} fallback="Déserts, montagnes, côtes et médinas — 5 façons de vivre le Maroc authentiquement." style={styles.heroSub} />
        <TouchableOpacity style={styles.heroCta} onPress={() => navigation.navigate('Explorer')} activeOpacity={0.85}>
          <Text style={styles.heroCtaTxt}>{config.cmsHeroCta || '✦ Explorer tous les voyages'}</Text>
        </TouchableOpacity>
        {/* Stats — only real, admin-entered figures; never fabricated */}
        {(() => {
          const stats = [
            { val: config.cmsHeroSt1Val, lbl: config.cmsHeroSt1Lbl },
            { val: config.cmsHeroSt2Val, lbl: config.cmsHeroSt2Lbl },
            { val: config.cmsHeroSt3Val, lbl: config.cmsHeroSt3Lbl },
          ].filter((s) => s.val);
          if (stats.length === 0) return null;
          return (
            <View style={styles.statsRow}>
              {stats.map((s, i) => (
                <View key={i} style={styles.stat}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.lbl}</Text>
                </View>
              ))}
            </View>
          );
        })()}
      </LinearGradient>

      {/* ── SHARE THE APP (2nd section) ── */}
      <TouchableOpacity activeOpacity={0.9} onPress={shareApp} style={{ marginHorizontal: 16, marginTop: 20 }}>
        <LinearGradient colors={['#d4173a', '#8f1122']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareCard}>
          <View style={styles.shareIconCircle}>
            <Icon.Share size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>Partagez Roamers</Text>
            <Text style={styles.shareDesc}>Invitez vos amis à télécharger l'application et à explorer le Maroc avec vous.</Text>
          </View>
          <View style={styles.shareBtn}>
            <Text style={styles.shareBtnTxt}>Partager</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── SEGMENT FILTERS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentBar} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity key={s.key} style={[styles.segBtn, segment === s.key && styles.segBtnActive]}
            onPress={() => setSegment(s.key)} activeOpacity={0.8}>
            <View style={{ marginRight: 6 }}>{s.icon(segment === s.key)}</View>
            <Text style={[styles.segLabel, segment === s.key && styles.segLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── EXPERIENCES CAROUSEL ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nos Expériences</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Explorer')}>
          <Text style={styles.seeAll}>Tout voir →</Text>
        </TouchableOpacity>
      </View>
      {filtered.length === 0
        ? <Text style={styles.empty}>Aucune expérience dans cette catégorie</Text>
        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            {filtered.slice(0, 8).map((e) => (
              <ExperienceCard
                key={e.id}
                exp={e}
                onPress={() => navigation.navigate('ExperienceDetail', { id: e.id })}
                wishlist={user?.wishlist}
                onWishlist={handleWishlist}
              />
            ))}
          </ScrollView>
      }

      {/* ── TEAM BUILDING BANNER (3rd section) ── */}
      <View style={styles.tbBanner}>
        <View style={styles.tbLeft}>
          <Text style={styles.tbEyebrow}>{config.cmsTbEyebrow || 'Pour les entreprises'}</Text>
          <CmsText html={config.cmsTbTitle} fallback={'Le team building<br><em>qui fonctionne.</em>'} style={styles.tbTitle} emStyle={styles.tbEm} />
          <CmsText html={config.cmsTbDesc} fallback="Désert, montagne, côte ou médina — 4 univers, une seule mission." style={styles.tbDesc} />
          <TouchableOpacity style={styles.tbCta} onPress={() => navigation.navigate('Team')} activeOpacity={0.85}>
            <Text style={styles.tbCtaTxt}>Demander un devis →</Text>
          </TouchableOpacity>
        </View>
        <Icon.Group size={42} color={COLORS.primary} style={{ opacity: 0.5, marginLeft: 12 }} />
      </View>

      {/* ── WHY ROAMERS — hidden if the admin removes all cards ── */}
      {(config.cmsWhyCards && config.cmsWhyCards.length > 0) ? (
      <LinearGradient colors={['#0e0e0e', '#140306', '#0e0e0e']} style={styles.whySection}>
        <Text style={styles.whyEyebrow}>Pourquoi nous choisir</Text>
        <Text style={styles.whyTitle}>
          {config.cmsWhyTitle || 'Pas un simple voyage.'}{'\n'}
          <Text style={styles.whyEm}>{config.cmsWhyTitleEm || 'Une transformation.'}</Text>
        </Text>
        <View style={styles.whyGrid}>
          {config.cmsWhyCards.map((c: any, i: number) => (
            <View key={i} style={styles.whyCard}>
              <Text style={{ fontSize: 26, marginBottom: 12 }}>{c.icon}</Text>
              <Text style={styles.whyCardTitle}>{c.title}</Text>
              <Text style={styles.whyCardDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      ) : null}

      {/* ── QUICK ACTIONS ── */}
      <Text style={styles.sectionTitle2}>Services</Text>
      <View style={styles.quickGrid}>
        {[
          { icon: <Icon.Mountain size={26} color={COLORS.primary} />, label: 'Activités Express', screen: 'Activities' },
          { icon: <Icon.Calendar size={26} color={COLORS.primary} />, label: 'Events',            screen: 'Events' },
          { icon: <Icon.Route    size={26} color={COLORS.primary} />, label: 'Voyage Sur Mesure', screen: 'Plan' },
          { icon: <Icon.Group    size={26} color={COLORS.primary} />, label: 'Team Building',     screen: 'Team' },
          { icon: <Icon.Pin      size={26} color={COLORS.primary} />, label: 'Nous contacter',    screen: 'Contact' },
        ].map((q) => (
          <TouchableOpacity key={q.screen} style={styles.quickCard} onPress={() => navigation.navigate(q.screen)} activeOpacity={0.85}>
            <View style={{ marginBottom: 10 }}>{q.icon}</View>
            <Text style={styles.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TESTIMONIALS — only genuine, admin-published reviews ── */}
      {(() => {
        const reviews = (config.cmsTestimonials || []).filter((t: any) => t.featured);
        if (reviews.length === 0) return null;
        return (
          <>
            <Text style={styles.sectionTitle2}>Ce qu'ils disent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {reviews.map((t: any, i: number) => (
                <View key={i} style={styles.testCard}>
                  <Text style={styles.testStars}>{'⭐'.repeat(t.rating || 5)}</Text>
                  <Text style={styles.testText} numberOfLines={4}>"{t.text}"</Text>
                  <Text style={styles.testName}>{t.name}</Text>
                  <Text style={styles.testRole}>{t.role}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: COLORS.bg },
  loader:       { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  hero:         { paddingHorizontal: 20, paddingBottom: 28 },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  logoTxt:      { color: COLORS.primary, fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  contactBtn:   { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill },
  contactBtnTxt:{ color: COLORS.sub, fontSize: 13 },
  heroTitle:    { color: COLORS.text, fontSize: 36, fontWeight: '900', lineHeight: 44, marginBottom: 14 },
  heroEm:       { color: COLORS.primary },
  heroSub:      { color: COLORS.sub, fontSize: 15, lineHeight: 23, marginBottom: 22 },
  heroCta:      { backgroundColor: COLORS.primary, alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.pill, marginBottom: 28 },
  heroCtaTxt:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.border },
  stat:         { alignItems: 'center' },
  statVal:      { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  statLbl:      { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  segmentBar:   { backgroundColor: COLORS.bg },
  segBtn:       { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  segBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segIcon:      { fontSize: 14, marginRight: 6 },
  segLabel:     { color: COLORS.sub, fontSize: 13, fontWeight: '600', includeFontPadding: false },
  segLabelActive:{ color: '#fff' },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 36, marginBottom: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  seeAll:       { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  empty:        { color: COLORS.sub, textAlign: 'center', padding: 32 },
  whySection:   { marginTop: 44, paddingHorizontal: 20, paddingVertical: 40 },
  whyEyebrow:   { color: COLORS.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  whyTitle:     { color: COLORS.text, fontSize: 26, fontWeight: '900', lineHeight: 34, marginBottom: 24 },
  whyEm:        { color: COLORS.primary },
  whyGrid:      { gap: 14 },
  whyCard:      { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  whyIcon:      { fontSize: 30, marginBottom: 10 },
  whyCardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  whyCardDesc:  { color: COLORS.sub, fontSize: 14, lineHeight: 20 },
  tbBanner:     { marginHorizontal: 16, marginTop: 36, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tbLeft:       { flex: 1 },
  tbEyebrow:    { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  tbTitle:      { color: COLORS.text, fontSize: 20, fontWeight: '900', lineHeight: 26, marginBottom: 8 },
  tbEm:         { color: COLORS.primary },
  tbDesc:       { color: COLORS.sub, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  tbCta:        { backgroundColor: COLORS.primary, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill },
  tbCtaTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  tbEmoji:      { fontSize: 48, marginLeft: 12 },
  sectionTitle2:{ color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 40, marginBottom: 16, marginHorizontal: 16 },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  quickCard:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 18, width: (width - 44) / 2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  quickIcon:    { fontSize: 28, marginBottom: 8 },
  quickLabel:   { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  shareCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: 18, gap: 14 },
  shareIconCircle:{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  shareTitle:   { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  shareDesc:    { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },
  shareBtn:     { backgroundColor: '#fff', borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 },
  shareBtnTxt:  { color: '#8f1122', fontSize: 12, fontWeight: '800' },
  testCard:     { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 18, width: width * 0.78, marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
  testStars:    { fontSize: 14, marginBottom: 8 },
  testText:     { color: COLORS.sub, fontSize: 14, lineHeight: 21, fontStyle: 'italic', marginBottom: 12 },
  testName:     { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  testRole:     { color: COLORS.muted, fontSize: 12 },
});
