import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getExperiences } from '../services/api';
import ExperienceCard from '../components/ExperienceCard';
import { COLORS, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

const SEGMENTS = [
  { key: '',        label: 'Tous',     icon: '✦' },
  { key: 'groupe',  label: 'Groupe',   icon: '🧳' },
  { key: 'weekend', label: 'Weekend',  icon: '🌅' },
];

const TYPES = [
  { key: '',          label: 'Tout type', icon: '✨' },
  { key: 'desert',    label: 'Désert',    icon: '🏜️' },
  { key: 'mountain',  label: 'Montagne',  icon: '⛰️' },
  { key: 'coastal',   label: 'Côte',      icon: '🌊' },
  { key: 'cultural',  label: 'Culture',   icon: '🏛️' },
];

export default function ExplorerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [exps, setExps]          = useState<any[]>([]);
  const [search, setSearch]      = useState('');
  const [segment, setSegment]    = useState('');
  const [type, setType]          = useState('');
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (segment) params.segment = segment;
      if (type)    params.type    = type;
      const data = await getExperiences(params);
      setExps(data);
    } catch (_) {} finally { setLoading(false); setRefresh(false); }
  }, [segment, type]);

  useEffect(() => { load(); }, [load]);

  const filtered = exps
    .filter((e) => e.segment !== 'team' && e.segment !== 'mesure')
    .filter((e) => !search
      || e.title.toLowerCase().includes(search.toLowerCase())
      || (e.loc || '').toLowerCase().includes(search.toLowerCase()));

  const hasActiveFilter = segment !== '' || type !== '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <LinearGradient colors={['#1c0409', '#0e0e0e']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>ROAMERS VOYAGES</Text>
            </View>
            <Text style={styles.headerTitle}>Explorer</Text>
            {!loading && (
              <Text style={styles.headerSub}>{filtered.length} expérience{filtered.length !== 1 ? 's' : ''} au Maroc</Text>
            )}
          </View>
          <View style={styles.pageToggle}>
            <View style={[styles.toggleOpt, styles.toggleOptActive]}>
              <Text style={[styles.toggleTxt, styles.toggleTxtActive]}>Voyages</Text>
            </View>
            <TouchableOpacity style={styles.toggleOpt} onPress={() => navigation.navigate('Activities')} activeOpacity={0.75}>
              <Text style={styles.toggleTxt}>Activités</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une expérience..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filters ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {/* Segment chips */}
          {SEGMENTS.map((item) => {
            const active = segment === item.key;
            return (
              <TouchableOpacity
                key={'seg-' + item.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSegment(item.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipIcon}>{item.icon}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.chipGroupDivider} />

          {/* Type chips */}
          {TYPES.filter(t => t.key !== '').map((item) => {
            const active = type === item.key;
            return (
              <TouchableOpacity
                key={'type-' + item.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setType(active ? '' : item.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipIcon}>{item.icon}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}

          {hasActiveFilter && (
            <TouchableOpacity
              style={styles.clearChip}
              onPress={() => { setSegment(''); setType(''); }}
              activeOpacity={0.75}
            >
              <Text style={styles.clearChipTxt}>✕ Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefresh(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔭</Text>
              <Text style={styles.emptyTitle}>Aucune expérience trouvée</Text>
              <Text style={styles.emptySub}>Essayez d'autres filtres</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <ExperienceCard
                key={item.id}
                exp={item}
                wide
                onPress={() => navigation.navigate('ExperienceDetail', { id: item.id })}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  /* Header */
  header:       { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrowRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eyebrowDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 7 },
  eyebrow:      { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  headerTitle:  { color: COLORS.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  headerSub:    { color: COLORS.sub, fontSize: 13, lineHeight: 18 },

  /* Toggle */
  pageToggle:      { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, padding: 3, borderWidth: 1, borderColor: '#333', marginTop: 4 },
  toggleOpt:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 19 },
  toggleOptActive: { backgroundColor: COLORS.primary },
  toggleTxt:       { color: '#777', fontSize: 12, fontWeight: '700', includeFontPadding: false },
  toggleTxtActive: { color: '#fff' },

  /* Search */
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, backgroundColor: '#161616', borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1, borderColor: '#272727' },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  clearBtn:    { color: COLORS.muted, fontSize: 16, paddingLeft: 8 },

  /* Combined filter chips */
  filterScroll:     { flexGrow: 0 },
  filterRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  chip:             { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19, paddingHorizontal: 14, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#161616' },
  chipActive:       { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipIcon:         { fontSize: 13, marginRight: 5 },
  chipLabel:        { color: COLORS.sub, fontSize: 12, fontWeight: '700', includeFontPadding: false },
  chipLabelActive:  { color: '#fff' },
  chipGroupDivider: { width: 1, height: 22, backgroundColor: '#2a2a2a', marginRight: 8 },
  clearChip:        { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19, paddingHorizontal: 14, marginLeft: 4, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '18' },
  clearChipTxt:     { color: COLORS.primary, fontSize: 12, fontWeight: '800', includeFontPadding: false },

  /* List */
  listContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8, gap: 14 },

  /* Empty state */
  emptyWrap:  { alignItems: 'center', marginTop: 60 },
  emptyIcon:  { fontSize: 40, marginBottom: 14 },
  emptyTitle: { color: COLORS.sub, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub:   { color: COLORS.muted, fontSize: 13 },
});
