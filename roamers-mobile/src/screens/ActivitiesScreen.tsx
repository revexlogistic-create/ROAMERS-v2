import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Dimensions, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivities } from '../services/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import Icon from '../components/Icons';

const { width } = Dimensions.get('window');
const FEAT_W = Math.round(width * 0.52);
const FEAT_H = 188;
const CARD_IMG_H = 196;

/* ── Category meta ─────────────────────────────────────────────── */
const CAT: Record<string, { label: string; color: string }> = {
  adventure: { label: 'Aventure',  color: '#f97316' },
  culture:   { label: 'Culture',   color: '#a855f7' },
  corporate: { label: 'Corporate', color: '#3b82f6' },
  wellness:  { label: 'Bien-être', color: '#22c55e' },
  other:     { label: 'Activité',  color: COLORS.primary },
};
const DIFF_COLOR: Record<string, string> = {
  easy: '#22c55e', moderate: '#f59e0b', hard: '#ef4444',
};
const DIFF_LBL: Record<string, string> = {
  easy: 'Facile', moderate: 'Modéré', hard: 'Difficile',
};

function catOf(cat: string) {
  return CAT[cat?.toLowerCase()] ?? CAT.other;
}

/* ── Filter segments with icon components ───────────────────────── */
type SegDef = { key: string; label: string; IconComp: React.ComponentType<any> };
const SEGMENTS: SegDef[] = [
  { key: 'all',       label: 'Tous',      IconComp: Icon.Grid     },
  { key: 'adventure', label: 'Aventure',  IconComp: Icon.Mountain },
  { key: 'culture',   label: 'Culture',   IconComp: Icon.Globe    },
  { key: 'wellness',  label: 'Bien-être', IconComp: Icon.Leaf     },
  { key: 'corporate', label: 'Corporate', IconComp: Icon.Group    },
];

export default function ActivitiesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment]       = useState('all');
  const [search, setSearch]         = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getActivities();
      setActivities(data.filter((a: any) => a.status !== 'inactive'));
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const base     = segment === 'all' ? activities : activities.filter((a) => a.category === segment);
  const filtered = base.filter((a) =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.location || '').toLowerCase().includes(search.toLowerCase())
  );

  /* "À la une" — badged items first, fallback to top activities */
  const featured = (() => {
    const badged = activities.filter((a) => a.badge);
    return (badged.length >= 2 ? badged : activities).slice(0, 4);
  })();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#1c0409', '#0e0e0e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>ROAMERS ACTIVITÉS</Text>
            </View>
            <Text style={styles.headerTitle}>Activités</Text>
            {!loading && (
              <Text style={styles.headerSub}>
                {filtered.length} activité{filtered.length !== 1 ? 's' : ''} express
              </Text>
            )}
          </View>

          {/* Voyages / Activités toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={styles.toggleOpt}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={styles.toggleTxt}>Voyages</Text>
            </TouchableOpacity>
            <View style={[styles.toggleOpt, styles.toggleOptActive]}>
              <Text style={[styles.toggleTxt, styles.toggleTxtActive]}>Activités</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Icon.Search size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une activité..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon.Close size={14} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTER CHIPS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {SEGMENTS.map(({ key, label, IconComp }) => {
            const active = segment === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSegment(key)}
                activeOpacity={0.75}
              >
                <IconComp size={13} color={active ? '#fff' : COLORS.sub} style={{ marginRight: 5 }} />
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 48 }}
        >

          {/* ── À LA UNE ── */}
          {featured.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Icon.Star size={14} color={COLORS.gold} style={{ marginRight: 7 }} />
                <Text style={styles.sectionTitle}>À la une</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featRow}
              >
                {featured.map((item) => {
                  const m = catOf(item.category);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.featCard, SHADOW.md]}
                      onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
                      activeOpacity={0.88}
                    >
                      {/* colored accent top line */}
                      <View style={[styles.featAccent, { backgroundColor: m.color }]} />

                      {/* full image */}
                      {item.img
                        ? <Image source={{ uri: item.img }} style={styles.featImg} resizeMode="cover" />
                        : <LinearGradient colors={['#1a0508', '#2a0a12', '#0e0e0e']} style={styles.featImg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      }
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />

                      {/* badge top-right */}
                      {item.badge && (
                        <View style={styles.featBadge}>
                          <Icon.Star size={9} color="#000" style={{ marginRight: 3 }} />
                          <Text style={styles.featBadgeTxt}>{item.badge}</Text>
                        </View>
                      )}

                      {/* bottom overlay */}
                      <View style={styles.featBottom}>
                        <View style={[styles.featCat, { backgroundColor: m.color + '33' }]}>
                          <Text style={[styles.featCatTxt, { color: m.color }]}>{m.label}</Text>
                        </View>
                        <Text style={styles.featTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.featPrice}>
                          {Number(item.price || 0).toLocaleString('fr-MA')}
                          <Text style={styles.featCur}> MAD</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── MAIN LIST ── */}
          <View style={styles.listWrap}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Icon.Compass size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>Aucune activité trouvée</Text>
                <Text style={styles.emptySub}>Essayez d'autres filtres</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const m        = catOf(item.category);
                const dif      = item.difficulty ? DIFF_LBL[item.difficulty] : null;
                const difColor = item.difficulty ? DIFF_COLOR[item.difficulty] : COLORS.sub;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, SHADOW.md]}
                    onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
                    activeOpacity={0.9}
                  >
                    {/* category-colored accent stripe */}
                    <View style={[styles.accentLine, { backgroundColor: m.color }]} />

                    {/* image section */}
                    <View style={styles.imgWrap}>
                      {item.img
                        ? <Image source={{ uri: item.img }} style={styles.cardImg} resizeMode="cover" />
                        : <LinearGradient colors={['#1a0508', '#2a0a12', '#0e0e0e']} style={styles.cardImg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      }
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(10,10,10,0.88)']}
                        locations={[0.3, 0.6, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />

                      {/* top-right overlays */}
                      <View style={styles.imgTopRight}>
                        {item.badge && (
                          <View style={styles.imgBadge}>
                            <Icon.Star size={9} color="#000" style={{ marginRight: 3 }} />
                            <Text style={styles.imgBadgeTxt}>{item.badge}</Text>
                          </View>
                        )}
                        {item.duration && (
                          <View style={styles.durPill}>
                            <Icon.Calendar size={10} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                            <Text style={styles.durTxt}>{item.duration}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* body — below image, like ExperienceCard */}
                    <View style={styles.cardBody}>
                      {/* tags row */}
                      <View style={styles.tagsRow}>
                        <View style={[styles.catTag, { backgroundColor: m.color + '1e', borderColor: m.color + '55' }]}>
                          <Text style={[styles.catTagTxt, { color: m.color }]}>{m.label}</Text>
                        </View>
                        {dif && (
                          <View style={[styles.difTag, { borderColor: difColor + '55' }]}>
                            <Text style={[styles.difTagTxt, { color: difColor }]}>{dif}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                      {item.sub ? <Text style={styles.cardSub} numberOfLines={1}>{item.sub}</Text> : null}

                      {item.location ? (
                        <View style={styles.locRow}>
                          <Icon.Pin size={12} color={COLORS.muted} style={{ marginRight: 5 }} />
                          <Text style={styles.locTxt} numberOfLines={1}>{item.location}</Text>
                        </View>
                      ) : null}

                      <View style={styles.divider} />

                      <View style={styles.cardFooter}>
                        <View>
                          <Text style={styles.priceLabel}>À partir de</Text>
                          <Text style={styles.priceVal}>
                            {Number(item.price || 0).toLocaleString('fr-MA')}
                            <Text style={styles.priceCur}> MAD</Text>
                          </Text>
                        </View>
                        <View style={[styles.cta, { backgroundColor: m.color }]}>
                          <Text style={styles.ctaTxt}>Voir →</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  /* Header */
  header:      { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eyebrowDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 7 },
  eyebrow:     { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  headerTitle: { color: COLORS.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  headerSub:   { color: COLORS.sub, fontSize: 13, lineHeight: 18 },

  /* Toggle */
  toggle:          { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, padding: 3, borderWidth: 1, borderColor: '#333', marginTop: 4 },
  toggleOpt:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 19 },
  toggleOptActive: { backgroundColor: COLORS.primary },
  toggleTxt:       { color: '#777', fontSize: 12, fontWeight: '700', includeFontPadding: false },
  toggleTxtActive: { color: '#fff' },

  /* Search */
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, backgroundColor: '#161616', borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1, borderColor: '#272727' },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },

  /* Filter chips */
  chipScroll: { flexGrow: 0 },
  chipRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  chip:            { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19, paddingHorizontal: 14, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#161616' },
  chipActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipLabel:       { color: COLORS.sub, fontSize: 12, fontWeight: '700', includeFontPadding: false },
  chipLabelActive: { color: '#fff' },

  /* "À la une" section */
  section:      { marginTop: 8, marginBottom: 4 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  featRow:      { paddingHorizontal: 16, gap: 12 },

  featCard:   { width: FEAT_W, height: FEAT_H, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#161616', borderWidth: 1, borderColor: '#242424' },
  featAccent: { height: 3, width: '100%' },
  featImg:    { ...StyleSheet.absoluteFillObject },
  featBadge:  { position: 'absolute', top: 12, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(240,192,64,0.93)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  featBadgeTxt: { color: '#000', fontSize: 10, fontWeight: '800' },
  featBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  featCat:    { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  featCatTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  featTitle:  { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 19, marginBottom: 6 },
  featPrice:  { color: '#fff', fontSize: 15, fontWeight: '900' },
  featCur:    { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  /* Main list */
  listWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },

  card:      { backgroundColor: '#161616', borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#242424' },
  accentLine:{ height: 3, width: '100%' },
  imgWrap:   { position: 'relative' },
  cardImg:   { width: '100%', height: CARD_IMG_H },

  imgTopRight: { position: 'absolute', top: 12, right: 12, flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  imgBadge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(240,192,64,0.93)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: RADIUS.sm },
  imgBadgeTxt: { color: '#000', fontSize: 11, fontWeight: '800' },
  durPill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: RADIUS.sm },
  durTxt:      { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700' },

  cardBody:  { padding: 16 },
  tagsRow:   { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  catTag:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1 },
  catTagTxt: { fontSize: 11, fontWeight: '800', includeFontPadding: false },
  difTag:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#333', backgroundColor: 'transparent' },
  difTagTxt: { fontSize: 11, fontWeight: '700', includeFontPadding: false },

  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 6, lineHeight: 23 },
  cardSub:   { color: COLORS.sub, fontSize: 13, marginBottom: 8 },
  locRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  locTxt:    { color: COLORS.muted, fontSize: 12, flex: 1 },

  divider: { height: 1, backgroundColor: '#242424', marginBottom: 14 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { color: COLORS.muted, fontSize: 11, marginBottom: 2 },
  priceVal:   { color: COLORS.primary, fontSize: 22, fontWeight: '900', includeFontPadding: false },
  priceCur:   { fontSize: 13, color: COLORS.sub },
  cta:        { paddingHorizontal: 20, paddingVertical: 11, borderRadius: RADIUS.pill },
  ctaTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* Empty state */
  empty:      { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { color: COLORS.sub, fontSize: 16, fontWeight: '700' },
  emptySub:   { color: COLORS.muted, fontSize: 13 },
});
