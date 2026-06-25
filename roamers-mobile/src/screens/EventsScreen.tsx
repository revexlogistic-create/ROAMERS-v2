import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Image, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getEvents, getSiteConfig } from '../services/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import Icon from '../components/Icons';
import AppBottomBar from '../components/AppBottomBar';

const MONTHS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

function fmtFull(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [events, setEvents]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [wa, setWa]                 = useState('212600000000');

  const load = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    getSiteConfig().then((cfg) => { if (cfg && cfg.whatsapp) setWa(cfg.whatsapp); }).catch(() => {});
  }, []);

  const filtered = events.filter((e) =>
    !search ||
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const register = (e: any) => {
    const num = String(wa).replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Bonjour, je veux participer à l'événement : ${e.title || ''}`);
    Linking.openURL(`https://wa.me/${num}?text=${msg}`).catch(() => {});
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#1c0409', '#0e0e0e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>ROAMERS EVENTS</Text>
            </View>
            <Text style={styles.headerTitle}>Events</Text>
            {!loading && (
              <Text style={styles.headerSub}>
                {filtered.length} événement{filtered.length !== 1 ? 's' : ''} à venir
              </Text>
            )}
          </View>

          {/* Voyages / Activités / Events toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity style={styles.toggleOpt} onPress={() => navigation.navigate('Tabs', { screen: 'Explorer' })} activeOpacity={0.75}>
              <Text style={styles.toggleTxt}>Voyages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleOpt} onPress={() => navigation.navigate('Activities')} activeOpacity={0.75}>
              <Text style={styles.toggleTxt}>Activités</Text>
            </TouchableOpacity>
            <View style={[styles.toggleOpt, styles.toggleOptActive]}>
              <Text style={[styles.toggleTxt, styles.toggleTxtActive]}>Events</Text>
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
          placeholder="Rechercher un événement..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon.Close size={14} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
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
          <View style={styles.listWrap}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Icon.Calendar size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>Aucun événement pour le moment</Text>
                <Text style={styles.emptySub}>Revenez bientôt — de nouveaux événements arrivent !</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const d   = item.date ? new Date(item.date) : null;
                const dd  = d && !isNaN(d.getTime()) ? d.getDate() : null;
                const mm  = d && !isNaN(d.getTime()) ? MONTHS[d.getMonth()] : '';
                const free = !item.price || Number(item.price) <= 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, SHADOW.md]}
                    onPress={() => register(item)}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.accentLine, { backgroundColor: COLORS.primary }]} />

                    {/* image */}
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

                      {/* date badge top-left */}
                      {dd != null && (
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateDay}>{dd}</Text>
                          <Text style={styles.dateMon}>{mm}</Text>
                        </View>
                      )}

                      {/* badge top-right */}
                      {item.badge ? (
                        <View style={styles.imgBadge}>
                          <Text style={styles.imgBadgeTxt}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* body */}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                      {item.sub ? <Text style={styles.cardSub} numberOfLines={1}>{item.sub}</Text> : null}

                      {item.date ? (
                        <View style={styles.metaRow}>
                          <Icon.Calendar size={12} color={COLORS.muted} style={{ marginRight: 5 }} />
                          <Text style={styles.metaTxt} numberOfLines={1}>
                            {fmtFull(item.date)}{item.time ? ` · ${item.time}` : ''}
                          </Text>
                        </View>
                      ) : null}
                      {item.location ? (
                        <View style={styles.metaRow}>
                          <Icon.Pin size={12} color={COLORS.muted} style={{ marginRight: 5 }} />
                          <Text style={styles.metaTxt} numberOfLines={1}>{item.location}</Text>
                        </View>
                      ) : null}

                      {item.desc ? <Text style={styles.cardDesc} numberOfLines={3}>{item.desc}</Text> : null}

                      <View style={styles.divider} />

                      <View style={styles.cardFooter}>
                        <View>
                          <Text style={styles.priceLabel}>Participation</Text>
                          <Text style={styles.priceVal}>
                            {free ? 'Gratuit' : (
                              <>
                                {Number(item.price).toLocaleString('fr-MA')}
                                <Text style={styles.priceCur}> MAD</Text>
                              </>
                            )}
                          </Text>
                        </View>
                        <View style={styles.cta}>
                          <Text style={styles.ctaTxt}>S'inscrire →</Text>
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

      <AppBottomBar navigation={navigation} />
    </View>
  );
}

const CARD_IMG_H = 196;

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
  toggleOpt:       { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 19 },
  toggleOptActive: { backgroundColor: COLORS.primary },
  toggleTxt:       { color: '#777', fontSize: 11, fontWeight: '700', includeFontPadding: false },
  toggleTxtActive: { color: '#fff' },

  /* Search */
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, backgroundColor: '#161616', borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1, borderColor: '#272727' },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },

  /* Main list */
  listWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },

  card:      { backgroundColor: '#161616', borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#242424' },
  accentLine:{ height: 3, width: '100%' },
  imgWrap:   { position: 'relative' },
  cardImg:   { width: '100%', height: CARD_IMG_H },

  dateBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', minWidth: 52 },
  dateDay:   { color: COLORS.primary, fontSize: 22, fontWeight: '900', lineHeight: 24, includeFontPadding: false },
  dateMon:   { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, includeFontPadding: false },

  imgBadge:    { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 5, borderRadius: RADIUS.sm },
  imgBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },

  cardBody:  { padding: 16 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginBottom: 4, lineHeight: 24 },
  cardSub:   { color: COLORS.sub, fontSize: 13, marginBottom: 10 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  metaTxt:   { color: COLORS.muted, fontSize: 12.5, flex: 1 },
  cardDesc:  { color: COLORS.sub, fontSize: 13, lineHeight: 19, marginTop: 6 },

  divider: { height: 1, backgroundColor: '#242424', marginTop: 14, marginBottom: 14 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { color: COLORS.muted, fontSize: 11, marginBottom: 2 },
  priceVal:   { color: COLORS.primary, fontSize: 20, fontWeight: '900', includeFontPadding: false },
  priceCur:   { fontSize: 13, color: COLORS.sub },
  cta:        { paddingHorizontal: 20, paddingVertical: 11, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary },
  ctaTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* Empty state */
  empty:      { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 30 },
  emptyTitle: { color: COLORS.sub, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub:   { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
});
