import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, ScrollView,
  TextInput, Modal, Keyboard,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExperiences, getActivities, saveItinerary } from '../services/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');

/* ── Coordinate lookup ────────────────────────────────────────────────────── */
const COORD_MAP: Record<string, [number, number]> = {
  merzouga:        [31.0802, -4.0060],
  'erg chebbi':    [31.0802, -4.0060],
  sahara:          [31.0802, -4.0060],
  désert:          [31.0802, -4.0060],
  desert:          [31.0802, -4.0060],
  marrakech:       [31.6295, -7.9811],
  atlas:           [31.0615, -7.9086],
  toubkal:         [31.0615, -7.9086],
  agadir:          [30.4278, -9.5981],
  essaouira:       [31.5125, -9.7700],
  chefchaouen:     [35.1688, -5.2636],
  'fès':           [34.0181, -5.0078],
  fes:             [34.0181, -5.0078],
  fez:             [34.0181, -5.0078],
  ouarzazate:      [30.9335, -6.9370],
  dades:           [31.3583, -5.9833],
  dadès:           [31.3583, -5.9833],
  todra:           [31.5898, -5.5906],
  ifrane:          [33.5333, -5.1167],
  ourika:          [31.3600, -7.8500],
  'vallée ourika': [31.3600, -7.8500],
  rabat:           [34.0209, -6.8416],
  casablanca:      [33.5731, -7.5898],
  taghazout:       [30.5333, -9.7083],
  taza:            [34.2100, -3.9970],
  tanger:          [35.7595, -5.8340],
  tangier:         [35.7595, -5.8340],
  tétouan:         [35.5785, -5.3684],
  tetouan:         [35.5785, -5.3684],
  zagora:          [30.3319, -5.8378],
  tinghir:         [31.5152, -5.5337],
  nador:           [35.1681, -2.9286],
  oujda:           [34.6805, -1.9112],
  errachidia:      [31.9314, -4.4249],
  safi:            [32.2994, -9.2372],
  'el jadida':     [33.2316, -8.5007],
  'beni mellal':   [32.3373, -6.3498],
  'béni mellal':   [32.3373, -6.3498],
  khenifra:        [32.9342, -5.6700],
  'khénifra':      [32.9342, -5.6700],
  meknès:          [33.8935, -5.5473],
  meknes:          [33.8935, -5.5473],
  taroudant:       [30.4702, -8.8770],
  tiznit:          [29.6974, -9.7316],
  tafraoute:       [29.7178, -8.9775],
  guelmim:         [28.9870, -10.0574],
  erfoud:          [31.4338, -4.2360],
  'aït benhaddou': [31.0478, -7.1315],
  'ait benhaddou': [31.0478, -7.1315],
  laayoune:        [27.1536, -13.2033],
  'laâyoune':      [27.1536, -13.2033],
  dakhla:          [23.6848, -15.9571],
  tarfaya:         [27.9358, -12.9183],
};

function getCoords(loc: string): [number, number] | null {
  const lower = (loc || '').toLowerCase();
  for (const key of Object.keys(COORD_MAP)) {
    if (lower.includes(key)) return COORD_MAP[key];
  }
  return null;
}

/* ── Cities for trip planner ──────────────────────────────────────────────── */
const PLAN_CITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Marrakech',   lat: 31.6295, lng: -7.9811 },
  { name: 'Casablanca',  lat: 33.5731, lng: -7.5898 },
  { name: 'Fès',         lat: 34.0181, lng: -5.0078 },
  { name: 'Rabat',       lat: 34.0209, lng: -6.8416 },
  { name: 'Tanger',      lat: 35.7595, lng: -5.8340 },
  { name: 'Agadir',      lat: 30.4278, lng: -9.5981 },
  { name: 'Merzouga',    lat: 31.0802, lng: -4.0060 },
  { name: 'Ouarzazate',  lat: 30.9335, lng: -6.9370 },
  { name: 'Essaouira',   lat: 31.5125, lng: -9.7700 },
  { name: 'Chefchaouen', lat: 35.1688, lng: -5.2636 },
  { name: 'Ifrane',      lat: 33.5333, lng: -5.1167 },
  { name: 'Taghazout',   lat: 30.5333, lng: -9.7083 },
  { name: 'Zagora',      lat: 30.3319, lng: -5.8378 },
  { name: 'Dades',       lat: 31.3583, lng: -5.9833 },
  { name: 'Tinghir',     lat: 31.5152, lng: -5.5337 },
  { name: 'Ourika',      lat: 31.3600, lng: -7.8500 },
  { name: 'El Jadida',   lat: 33.2316, lng: -8.5007 },
  { name: 'Safi',        lat: 32.2994, lng: -9.2372 },
  { name: 'Beni Mellal', lat: 32.3373, lng: -6.3498 },
  { name: 'Nador',       lat: 35.1681, lng: -2.9286 },
  { name: 'Oujda',       lat: 34.6805, lng: -1.9112 },
  { name: 'Errachidia',  lat: 31.9314, lng: -4.4249 },
  { name: 'Tétouan',     lat: 35.5785, lng: -5.3684 },
  { name: 'Atlas',       lat: 31.0615, lng: -7.9086 },
  { name: 'Sahara',      lat: 31.0802, lng: -4.0060 },
];

/* ── Activity cat → emoji ─────────────────────────────────────────────────── */
const CAT_EMOJI: Record<string, string> = {
  adventure: '🏔️', culture: '🏛️', wellness: '🧘', corporate: '💼',
};

type FilterKey = 'all' | 'voyages' | 'activites' | 'adventure' | 'culture' | 'wellness';

const FILTERS: { key: FilterKey; icon: string; label: string }[] = [
  { key: 'all',       icon: '✦',  label: 'Tous'      },
  { key: 'voyages',   icon: '🏕️', label: 'Voyages'   },
  { key: 'activites', icon: '⚡',  label: 'Activités' },
  { key: 'adventure', icon: '🏔️', label: 'Aventure'  },
  { key: 'culture',   icon: '🏛️', label: 'Culture'   },
  { key: 'wellness',  icon: '🧘',  label: 'Bien-être' },
];

/* ── Component ────────────────────────────────────────────────────────────── */
export default function MapScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [exps, setExps]         = useState<any[]>([]);
  const [acts, setActs]         = useState<any[]>([]);
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading]   = useState(true);
  const [cardImgIdx, setCardImgIdx] = useState(0);

  /* Planning mode */
  const [planMode, setPlanMode]     = useState(false);
  const [waypoints, setWaypoints]   = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [planStats, setPlanStats]   = useState<{ distKm: number | null; durH: number | null }>({ distKm: null, durH: null });
  const [cityModal, setCityModal]   = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [planSaving, setPlanSaving]   = useState(false);
  const [planSaved, setPlanSaved]     = useState<string | null>(null);
  const [planError, setPlanError]     = useState<string | null>(null);
  const [selectForPlan, setSelectForPlan] = useState(false);
  const [locSearch, setLocSearch]     = useState('');
  const [locResults, setLocResults]   = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [locLoading, setLocLoading]   = useState(false);
  const searchTimer = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    Promise.all([
      getExperiences().then(setExps).catch(() => {}),
      getActivities().then((list) => setActs(Array.isArray(list) ? list : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const expMarkers: any[] = exps
    .filter((e) => e.segment !== 'team' && e.segment !== 'mesure')
    .map((e, i) => {
      const coords = getCoords(e.loc || '');
      if (!coords) return null;
      return {
        id: e.id, title: e.title, price: e.price, rating: e.rating,
        lat: coords[0] + Math.sin(i * 2.4) * 0.014,
        lng: coords[1] + Math.cos(i * 2.4) * 0.014,
        type: 'exp', cat: e.segment, emoji: '🏕️',
        loc: e.loc, days: e.days, img: e.img || '',
        circuit: Array.isArray(e.circuit) ? e.circuit : [],
      };
    })
    .filter(Boolean);

  const actMarkers: any[] = acts
    .map((a) => {
      const coords = getCoords(a.location || a.loc || '');
      if (!coords) return null;
      const cat = a.category || a.cat || 'adventure';
      return {
        id: a.id, title: a.title, price: a.price || 0,
        lat: coords[0], lng: coords[1],
        cat, emoji: CAT_EMOJI[cat] || '⚡',
        loc: a.location || a.loc || '',
        img: a.img || '',
        type: 'activity',
      };
    })
    .filter(Boolean);

  const allMarkers: any[] =
    filter === 'voyages'   ? expMarkers :
    filter === 'activites' ? actMarkers :
    filter === 'adventure' ? actMarkers.filter((a) => a.cat === 'adventure') :
    filter === 'culture'   ? actMarkers.filter((a) => a.cat === 'culture') :
    filter === 'wellness'  ? actMarkers.filter((a) => a.cat === 'wellness') :
    [...expMarkers, ...actMarkers];

  const mapHtml = buildMapHtml(allMarkers);

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PLAN_ROUTE') {
        setPlanStats({ distKm: data.distanceKm ?? null, durH: data.durationH ?? null });
      } else if (data.type === 'ADD_WAYPOINT') {
        setWaypoints((prev) => {
          if (prev.find((w) => w.name === data.name && w.lat === data.lat)) return prev;
          return [...prev, { name: data.name, lat: data.lat, lng: data.lng }];
        });
      } else if (!selectForPlan) {
        setSelected(data);
        setCardImgIdx(0);
      }
    } catch {}
  }, [selectForPlan]);

  function changeFilter(f: FilterKey) {
    setFilter(f);
    setSelected(null);
    webViewRef.current?.injectJavaScript('clearRoute();true;');
  }

  function deselectMarker() {
    setSelected(null);
    webViewRef.current?.injectJavaScript('clearRoute();leafletMks.forEach(function(lmk){var d=lmk.getElement()&&lmk.getElement().querySelector(".mk-dot");if(d)d.classList.remove("mk-selected");});true;');
  }

  function zoomIn()    { webViewRef.current?.injectJavaScript('map.zoomIn();true;'); }
  function zoomOut()   { webViewRef.current?.injectJavaScript('map.zoomOut();true;'); }
  function resetView() {
    webViewRef.current?.injectJavaScript(
      'if(allMarkers.length>0){map.fitBounds(L.latLngBounds(allMarkers.map(function(m){return[m.lat,m.lng];})).pad(0.2));}else{map.setView([31.0,-6.5],5);}true;'
    );
  }

  /* Plan mode */
  function enterPlanMode() {
    setSelected(null);
    webViewRef.current?.injectJavaScript('clearRoute();true;');
    setPlanMode(true);
    setWaypoints([]);
    setPlanStats({ distKm: null, durH: null });
    setPlanSaved(null);
  }

  function exitPlanMode() {
    setPlanMode(false);
    setWaypoints([]);
    setPlanStats({ distKm: null, durH: null });
    setPlanSaved(null);
    setSelectForPlan(false);
    webViewRef.current?.injectJavaScript('clearPlanRoute();hideCityPins();disableCitySelectMode();true;');
  }

  function addWaypoint(city: { name: string; lat: number; lng: number }) {
    setWaypoints((prev) => [...prev, city]);
    setCityModal(false);
    setCitySearch('');
  }

  function removeWaypoint(idx: number) {
    setWaypoints((prev) => prev.filter((_, i) => i !== idx));
  }

  function onLocSearch(text: string) {
    setLocSearch(text);
    setLocResults([]);
    if (!text.trim()) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLocLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=ma&limit=6&accept-language=fr`,
          { headers: { 'Accept-Language': 'fr', 'User-Agent': 'RoamersApp/1.0' } }
        );
        const data = await res.json();
        setLocResults(data.map((r: any) => ({
          name: r.display_name.split(',')[0].trim(),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } catch { setLocResults([]); }
      finally { setLocLoading(false); }
    }, 450);
  }

  function selectLocResult(r: { name: string; lat: number; lng: number }) {
    Keyboard.dismiss();
    setWaypoints((prev) => prev.find((w) => w.lat === r.lat) ? prev : [...prev, r]);
    webViewRef.current?.injectJavaScript(`map.flyTo([${r.lat},${r.lng}],11,{animate:true,duration:1.2});true;`);
    setLocSearch('');
    setLocResults([]);
  }

  async function savePlan() {
    if (waypoints.length < 2 || planSaving) return;
    setPlanSaving(true);
    try {
      setPlanError(null);
      const res = await saveItinerary({
        stops: waypoints.map((w) => w.name),
        distanceKm: planStats.distKm,
        durationH: planStats.durH,
      });
      const ref = res.ref || 'OK';
      setPlanSaved(ref);
      /* Persist locally for "Mes Cartes" tab in ProfileScreen */
      try {
        const raw = await AsyncStorage.getItem('roamers_itineraries');
        const existing = raw ? JSON.parse(raw) : [];
        existing.unshift({ ref, stops: waypoints.map((w) => w.name), distKm: planStats.distKm, durH: planStats.durH, date: new Date().toISOString() });
        await AsyncStorage.setItem('roamers_itineraries', JSON.stringify(existing.slice(0, 50)));
      } catch {}
    } catch (e: any) {
      setPlanError(e?.message || 'Erreur d\'enregistrement');
    } finally {
      setPlanSaving(false);
    }
  }

  /* Sync waypoints to WebView — waits until WebView is loaded */
  useEffect(() => {
    if (!planMode || !webViewReady) return;
    if (waypoints.length >= 2) {
      const stopsJson = JSON.stringify(waypoints);
      webViewRef.current?.injectJavaScript(`setPlanRoute(${stopsJson});true;`);
    } else {
      webViewRef.current?.injectJavaScript('clearPlanRoute();true;');
    }
  }, [waypoints, planMode, webViewReady]);

  /* Show city pins and enable tap-anywhere when entering selectForPlan mode */
  useEffect(() => {
    if (!selectForPlan || !webViewReady) return;
    webViewRef.current?.injectJavaScript('showCityPins();enableCitySelectMode();true;');
  }, [selectForPlan, webViewReady]);

  /* Highlight selected cities on the map */
  useEffect(() => {
    if (!selectForPlan || !webViewReady) return;
    const names = JSON.stringify(waypoints.map((w) => w.name));
    webViewRef.current?.injectJavaScript(`syncCityPins(${names});true;`);
  }, [waypoints, selectForPlan, webViewReady]);

  /* Load itinerary from navigation params (from "Mes Cartes" tab) */
  useEffect(() => {
    const itin = route?.params?.itinerary;
    if (!itin?.stops || itin.stops.length < 2) return;
    const resolved = itin.stops
      .map((name: string) => PLAN_CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as Array<{ name: string; lat: number; lng: number }>;
    if (resolved.length < 2) return;
    setSelected(null);
    setPlanMode(true);
    setWaypoints(resolved);
    setPlanStats({ distKm: itin.distKm ?? null, durH: itin.durH ?? null });
    setPlanSaved(itin.ref ?? null);
    setPlanError(null);
  }, [route?.params?.itinerary]);

  /* Enter plan-selection mode when navigated from PlanScreen */
  useEffect(() => {
    if (!route?.params?.selectForPlan) return;
    setSelected(null);
    webViewRef.current?.injectJavaScript('clearRoute();true;');
    setPlanMode(true);
    setPlanSaved(null);
    setPlanError(null);
    setSelectForPlan(true);
    const existing = route?.params?.existingWaypoints;
    if (Array.isArray(existing) && existing.length > 0) {
      setWaypoints(existing);
    } else {
      setWaypoints([]);
      setPlanStats({ distKm: null, durH: null });
    }
  }, [route?.params?.selectForPlan, route?.params?.existingWaypoints]);

  const expCount = allMarkers.filter((m) => m.type === 'exp').length;
  const actCount = allMarkers.filter((m) => m.type === 'activity').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>ROAMERS</Text>
          <Text style={styles.headerTitle}>Carte</Text>
        </View>
        <View style={styles.statsRow}>
          {expCount > 0 && (
            <View style={[styles.statChip, { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '18' }]}>
              <Text style={[styles.statChipTxt, { color: COLORS.primary }]}>🏕️ {expCount}</Text>
            </View>
          )}
          {actCount > 0 && (
            <View style={[styles.statChip, { borderColor: '#a855f755', backgroundColor: '#a855f718' }]}>
              <Text style={[styles.statChipTxt, { color: '#a855f7' }]}>⚡ {actCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Map + all overlays ── */}
      <View style={styles.mapContainer}>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loaderTxt}>Chargement des destinations…</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            onMessage={onMessage}
            onLoad={() => setWebViewReady(true)}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            overScrollMode="never"
          />
        )}

        {/* ── Filter chips floating over map ── */}
        {selectForPlan && (
          <View style={styles.selectBanner}>
            <Text style={styles.selectBannerTxt}>📍 Appuyez sur la carte pour ajouter une étape</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterOverlay, selectForPlan && { opacity: 0 }]}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => changeFilter(f.key)}
                activeOpacity={0.82}
              >
                <Text style={styles.filterIcon}>{f.icon}</Text>
                <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Zoom + reset controls ── */}
        {!loading && (
          <View style={styles.zoomPanel}>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
              <Text style={styles.zoomBtnTxt}>+</Text>
            </TouchableOpacity>
            <View style={styles.zoomSep} />
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.8}>
              <Text style={styles.zoomBtnTxt}>−</Text>
            </TouchableOpacity>
            <View style={[styles.zoomSep, { marginTop: 8 }]} />
            <TouchableOpacity style={[styles.zoomBtn, { marginTop: 8 }]} onPress={resetView} activeOpacity={0.8}>
              <Text style={[styles.zoomBtnTxt, { fontSize: 15 }]}>⌂</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FAB ── */}
        {!selected && !loading && !planMode && (
          <TouchableOpacity
            style={[styles.fab, { bottom: 20 + insets.bottom }]}
            onPress={() => navigation.navigate('Plan')}
            activeOpacity={0.88}
          >
            <Text style={styles.fabTxt}>✈️  Planifier mon voyage</Text>
          </TouchableOpacity>
        )}

        {/* ── Planning panel ── */}
        {planMode && !selected && (
          <View style={[styles.planPanel, { paddingBottom: 16 + insets.bottom, bottom: keyboardHeight }]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>✏️ Mon itinéraire</Text>
              <TouchableOpacity onPress={exitPlanMode} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.planClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.planWpList} showsVerticalScrollIndicator={false}>
              {waypoints.length === 0 ? (
                <Text style={styles.planEmpty}>Ajoutez au moins 2 villes pour tracer votre itinéraire</Text>
              ) : (
                waypoints.map((wp, idx) => (
                  <View key={idx} style={styles.planWpRow}>
                    <View style={[styles.planWpNum, idx === 0 ? { backgroundColor: '#22c55e' } : idx === waypoints.length - 1 ? { backgroundColor: '#3b82f6' } : {}]}>
                      <Text style={styles.planWpNumTxt}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.planWpName}>{wp.name}</Text>
                    <TouchableOpacity onPress={() => removeWaypoint(idx)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Text style={styles.planWpRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {selectForPlan && (
              <View style={styles.locSearchWrap}>
                <View style={styles.locSearchRow}>
                  <TextInput
                    style={styles.locSearchInput}
                    placeholder="Rechercher une ville, lieu…"
                    placeholderTextColor={COLORS.muted}
                    value={locSearch}
                    onChangeText={onLocSearch}
                    returnKeyType="search"
                  />
                  {locLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
                </View>
                {locResults.length > 0 && (
                  <View style={styles.locResultsList}>
                    {locResults.map((r) => (
                      <TouchableOpacity key={r.name + r.lat} style={styles.locResultItem} onPress={() => selectLocResult(r)} activeOpacity={0.75}>
                        <Text style={styles.locResultTxt}>📍 {r.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            {selectForPlan ? (
              <View style={styles.planHint}>
                <Text style={styles.planHintTxt}>ou appuyez directement sur la carte</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.planAddBtn} onPress={() => setCityModal(true)} activeOpacity={0.82}>
                <Text style={styles.planAddBtnTxt}>+ Ajouter une étape</Text>
              </TouchableOpacity>
            )}

            {planStats.distKm != null && (
              <View style={styles.planStats}>
                <Text style={styles.planStatTxt}>🛣 {planStats.distKm} km  ·  ⏱ {planStats.durH}h de route</Text>
              </View>
            )}

            {waypoints.length >= 2 && selectForPlan && (
              <TouchableOpacity
                style={styles.planConfirmBtn}
                onPress={() => {
                  navigation.navigate('Plan', { waypoints });
                  setSelectForPlan(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.planConfirmBtnTxt}>Confirmer l'itinéraire →</Text>
              </TouchableOpacity>
            )}
            {waypoints.length >= 2 && !planSaved && !selectForPlan && (
              <TouchableOpacity
                style={[styles.planSaveBtn, planSaving && { opacity: 0.6 }]}
                onPress={savePlan}
                activeOpacity={0.85}
                disabled={planSaving}
              >
                <Text style={styles.planSaveBtnTxt}>{planSaving ? 'Enregistrement…' : '💾 Enregistrer mon itinéraire'}</Text>
              </TouchableOpacity>
            )}
            {planSaved != null && (
              <View style={styles.planSavedBanner}>
                <Text style={styles.planSavedTxt}>✓ Enregistré — Réf : {planSaved}</Text>
              </View>
            )}
            {planError != null && (
              <View style={styles.planErrorBanner}>
                <Text style={styles.planErrorTxt}>⚠ {planError}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── City picker modal ── */}
        <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => { setCityModal(false); setCitySearch(''); }}>
          <View style={styles.cityModalBackdrop}>
            <View style={styles.cityModalSheet}>
              <View style={styles.cityModalHeader}>
                <Text style={styles.cityModalTitle}>Choisir une ville</Text>
                <TouchableOpacity onPress={() => { setCityModal(false); setCitySearch(''); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Text style={styles.cityModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.citySearchInput}
                placeholder="Rechercher une ville…"
                placeholderTextColor={COLORS.sub}
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
              />
              <ScrollView showsVerticalScrollIndicator={false}>
                {PLAN_CITIES
                  .filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                  .map((c) => (
                    <TouchableOpacity key={c.name} style={styles.cityItem} onPress={() => addWaypoint(c)} activeOpacity={0.75}>
                      <Text style={styles.cityItemTxt}>📍 {c.name}</Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Detail card ── */}
        {selected && (
          <View style={[styles.card, { paddingBottom: 16 + insets.bottom }]}>

            {/* Image slider */}
            {(() => {
              const imgs: string[] = selected.imgs?.length
                ? selected.imgs
                : (selected.img ? [selected.img] : []);
              return (
                <View style={styles.cardBanner}>
                  {imgs.length > 0 ? (
                    <>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(e) =>
                          setCardImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))
                        }
                      >
                        {imgs.map((uri, i) => (
                          <Image
                            key={i}
                            source={{ uri }}
                            style={{ width, height: BANNER_H }}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                      {imgs.length > 1 && (
                        <View style={styles.bannerDots}>
                          {imgs.map((_, i) => (
                            <View
                              key={i}
                              style={[styles.bannerDot, i === cardImgIdx && styles.bannerDotActive]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={[{ width, height: BANNER_H }, styles.cardBannerFallback]}>
                      <Text style={{ fontSize: 44 }}>{selected.emoji}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Close button sits on banner */}
            <TouchableOpacity
              style={styles.cardClose}
              onPress={deselectMarker}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={styles.cardCloseTxt}>✕</Text>
            </TouchableOpacity>

            <View style={styles.cardBody}>
              {/* Type badge */}
              <View style={[styles.typeBadge, {
                backgroundColor: selected.type === 'exp' ? COLORS.primary + '22' : '#a855f722',
              }]}>
                <Text style={[styles.typeBadgeTxt, {
                  color: selected.type === 'exp' ? COLORS.primary : '#a855f7',
                }]}>
                  {selected.type === 'exp' ? '🏕️ Voyage' : '⚡ Activité'}
                </Text>
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>{selected.title}</Text>
              <Text style={styles.cardLoc}>📍 {selected.loc}</Text>

              {/* Stats */}
              <View style={styles.cardStats}>
                {selected.rating ? (
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatTxt}>⭐ {Number(selected.rating).toFixed(1)}</Text>
                  </View>
                ) : null}
                {selected.days ? (
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatTxt}>🗓 {selected.days} j</Text>
                  </View>
                ) : null}
                <View style={[styles.cardStat, { borderColor: COLORS.primary + '44', backgroundColor: COLORS.primary + '12' }]}>
                  <Text style={[styles.cardStatTxt, { color: COLORS.primary }]}>
                    {Number(selected.price).toLocaleString('fr-MA')} MAD
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => { setSelected(null); navigation.navigate('Plan'); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSecondaryTxt}>✈️ Planifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => {
                    setSelected(null);
                    if (selected.type === 'exp') navigation.navigate('ExperienceDetail', { id: selected.id });
                    else navigation.navigate('Activities');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryTxt}>Voir les détails →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/* ── Leaflet map HTML ────────────────────────────────────────────────────── */
const ORS_KEY = 'YOUR_ORS_KEY'; // → remplacer par votre clé gratuite sur openrouteservice.org

function buildMapHtml(markers: any[]): string {
  const json = JSON.stringify(markers);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
.leaflet-control-zoom,.leaflet-control-attribution{display:none}
@keyframes pulse{
  0%{box-shadow:0 0 0 0 rgba(255,255,255,0.5),0 4px 18px rgba(0,0,0,0.7)}
  65%{box-shadow:0 0 0 14px rgba(255,255,255,0),0 4px 18px rgba(0,0,0,0.7)}
  100%{box-shadow:0 0 0 0 rgba(255,255,255,0),0 4px 18px rgba(0,0,0,0.7)}
}
.mk-selected{animation:pulse 1.5s ease-out infinite!important;transform:scale(1.22)!important}
.stop-lbl{background:rgba(0,0,0,0.75)!important;border:1px solid rgba(255,255,255,0.25)!important;border-radius:5px!important;color:#fff!important;font-size:11px!important;font-weight:700!important;padding:3px 7px!important;white-space:nowrap!important;box-shadow:none!important}
.stop-lbl::before{display:none!important}
.route-spinner{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.82);color:#fff;font-size:12px;font-weight:700;padding:8px 18px;border-radius:20px;border:1px solid rgba(255,255,255,0.18);letter-spacing:0.3px;pointer-events:none;z-index:9999;}
</style>
</head>
<body>
<div id="map"></div>
<script>
var ORS_KEY='${ORS_KEY}';
var map=L.map('map',{center:[31.0,-6.5],zoom:5,zoomControl:false});

/* Satellite base layer */
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
/* Labels overlay */
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:0.9}).addTo(map);

/* ── Coordinate cache (fast local lookup) ── */
var COORDS={
  'merzouga':[31.0802,-4.0060],'erg chebbi':[31.0802,-4.0060],
  'sahara':[31.0802,-4.0060],'désert':[31.0802,-4.0060],'desert':[31.0802,-4.0060],
  'marrakech':[31.6295,-7.9811],'atlas':[31.0615,-7.9086],'toubkal':[31.0615,-7.9086],
  'agadir':[30.4278,-9.5981],'essaouira':[31.5125,-9.7700],'chefchaouen':[35.1688,-5.2636],
  'fès':[34.0181,-5.0078],'fes':[34.0181,-5.0078],'fez':[34.0181,-5.0078],
  'ouarzazate':[30.9335,-6.9370],'dades':[31.3583,-5.9833],'dadès':[31.3583,-5.9833],'todra':[31.5898,-5.5906],
  'ifrane':[33.5333,-5.1167],'ourika':[31.3600,-7.8500],'vallée ourika':[31.3600,-7.8500],
  'rabat':[34.0209,-6.8416],'casablanca':[33.5731,-7.5898],'taghazout':[30.5333,-9.7083],
  'taza':[34.2100,-3.9970],'tanger':[35.7595,-5.8340],'tangier':[35.7595,-5.8340],
  'tétouan':[35.5785,-5.3684],'tetouan':[35.5785,-5.3684],
  'nador':[35.1681,-2.9286],'oujda':[34.6805,-1.9112],'errachidia':[31.9314,-4.4249],
  'zagora':[30.3319,-5.8378],'tinghir':[31.5152,-5.5337],'safi':[32.2994,-9.2372],
  'el jadida':[33.2316,-8.5007],'beni mellal':[32.3373,-6.3498],'béni mellal':[32.3373,-6.3498],
  'khenifra':[32.9342,-5.6700],'khénifra':[32.9342,-5.6700],
  'meknès':[33.8935,-5.5473],'meknes':[33.8935,-5.5473],
  'taroudant':[30.4702,-8.8770],'tiznit':[29.6974,-9.7316],'tafraoute':[29.7178,-8.9775],
  'guelmim':[28.9870,-10.0574],'erfoud':[31.4338,-4.2360],
  'aït benhaddou':[31.0478,-7.1315],'ait benhaddou':[31.0478,-7.1315],
  'laayoune':[27.1536,-13.2033],'laâyoune':[27.1536,-13.2033],'dakhla':[23.6848,-15.9571]
};

function lookupCoords(name){
  if(!name)return null;
  var lower=name.toLowerCase().trim();
  for(var key in COORDS){if(lower.includes(key))return COORDS[key];}
  return null;
}

/* ── Route layer management ── */
var routeLayers=[];
function clearRoute(){
  routeLayers.forEach(function(l){try{map.removeLayer(l);}catch(e){}});
  routeLayers=[];
  var sp=document.getElementById('route-spinner');
  if(sp)sp.remove();
}

/* ── Plan route layers (blue, separate from exp routes) ── */
var planLayers=[];
function clearPlanRoute(){
  planLayers.forEach(function(l){try{map.removeLayer(l);}catch(e){}});
  planLayers=[];
}
function setPlanRoute(stops){
  clearPlanRoute();
  if(!stops||stops.length<2)return;
  stops.forEach(function(s,i){
    var isFirst=i===0,isLast=i===stops.length-1;
    var bg=isFirst?'#22c55e':isLast?'#3b82f6':'rgba(59,130,246,0.85)';
    var dot=L.divIcon({
      html:'<div style="width:28px;height:28px;border-radius:50%;background:'+bg+';border:2.5px solid rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 10px rgba(0,0,0,0.65);">'+(i+1)+'</div>',
      className:'',iconSize:[28,28],iconAnchor:[14,14]
    });
    var mk=L.marker([s.lat,s.lng],{icon:dot,zIndexOffset:2000}).addTo(map);
    mk.bindTooltip(s.name,{permanent:true,className:'stop-lbl',direction:'top',offset:[0,-16]}).openTooltip();
    planLayers.push(mk);
  });
  var latlngs=stops.map(function(s){return[s.lat,s.lng];});
  map.fitBounds(L.latLngBounds(latlngs).pad(0.28),{animate:true,duration:0.6});
  var coords=stops.map(function(s){return[s.lng,s.lat];});
  fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson',{
    method:'POST',
    headers:{'Authorization':ORS_KEY,'Content-Type':'application/json','Accept':'application/json, application/geo+json'},
    body:JSON.stringify({coordinates:coords})
  })
  .then(function(r){if(!r.ok)throw new Error('ORS');return r.json();})
  .then(function(data){
    if(data.features&&data.features.length>0){
      var rl=L.geoJSON(data,{style:{color:'#3b82f6',weight:4,opacity:0.9,lineJoin:'round',lineCap:'round'}}).addTo(map);
      planLayers.push(rl);
      map.fitBounds(rl.getBounds().pad(0.18),{animate:true,duration:0.9});
      var seg=data.features[0].properties&&data.features[0].properties.segments;
      if(seg&&seg.length>0){
        var dist=Math.round(seg.reduce(function(a,s){return a+s.distance;},0)/1000);
        var dur=Math.round(seg.reduce(function(a,s){return a+s.duration;},0)/3600);
        try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'PLAN_ROUTE',distanceKm:dist,durationH:dur}));}catch(e){}
      }
    }
  })
  .catch(function(){
    var poly=L.polyline(latlngs,{color:'#3b82f6',weight:3,opacity:0.82,dashArray:'10,7'}).addTo(map);
    planLayers.push(poly);
  });
}

function showSpinner(txt){
  var sp=document.getElementById('route-spinner');
  if(!sp){sp=document.createElement('div');sp.id='route-spinner';sp.className='route-spinner';document.body.appendChild(sp);}
  sp.textContent=txt||'Calcul de l\\'itinéraire…';
}
function hideSpinner(){var sp=document.getElementById('route-spinner');if(sp)sp.remove();}

/* ── Draw numbered stop markers ── */
function drawStopMarkers(stops){
  stops.forEach(function(s,i){
    var isFirst=i===0,isLast=i===stops.length-1;
    var bg=isFirst?'#22c55e':isLast?'#B8172E':'rgba(255,255,255,0.95)';
    var tc=(isFirst||isLast)?'#fff':'#111';
    var dot=L.divIcon({
      html:'<div style="width:28px;height:28px;border-radius:50%;background:'+bg+';border:2.5px solid rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;color:'+tc+';font-size:11px;font-weight:900;box-shadow:0 2px 10px rgba(0,0,0,0.65);">'+(i+1)+'</div>',
      className:'',iconSize:[28,28],iconAnchor:[14,14]
    });
    var mk=L.marker([s.lat,s.lng],{icon:dot,zIndexOffset:1000}).addTo(map);
    mk.bindTooltip(s.name,{permanent:true,className:'stop-lbl',direction:'top',offset:[0,-16]}).openTooltip();
    routeLayers.push(mk);
  });
}

/* ── ORS directions API → real road route ── */
function fetchOrsRoute(stops){
  var coordinates=stops.map(function(s){return[s.lng,s.lat];});
  showSpinner('Calcul de l\\'itinéraire ORS…');
  fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson',{
    method:'POST',
    headers:{'Authorization':ORS_KEY,'Content-Type':'application/json','Accept':'application/json, application/geo+json'},
    body:JSON.stringify({coordinates:coordinates})
  })
  .then(function(r){
    if(!r.ok)throw new Error('ORS '+r.status);
    return r.json();
  })
  .then(function(data){
    hideSpinner();
    if(data.features&&data.features.length>0){
      var rl=L.geoJSON(data,{
        style:{color:'#ffffff',weight:4,opacity:0.92,lineJoin:'round',lineCap:'round'}
      }).addTo(map);
      routeLayers.push(rl);
      /* fit to actual route bounds */
      map.fitBounds(rl.getBounds().pad(0.18),{animate:true,duration:0.9});

      /* distance + duration from ORS summary */
      var seg=data.features[0].properties&&data.features[0].properties.segments;
      if(seg&&seg.length>0){
        var dist=(seg.reduce(function(a,s){return a+s.distance;},0)/1000).toFixed(0);
        var dur=Math.round(seg.reduce(function(a,s){return a+s.duration;},0)/3600);
        showSpinner('🛣 '+dist+' km · '+dur+'h de route');
        setTimeout(hideSpinner,4000);
      }
    }
  })
  .catch(function(){
    hideSpinner();
    /* Fallback: dashed straight line */
    var latlngs=stops.map(function(s){return[s.lat,s.lng];});
    var poly=L.polyline(latlngs,{color:'#ffffff',weight:3,opacity:0.82,dashArray:'10,7'}).addTo(map);
    routeLayers.push(poly);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.28),{animate:true,duration:0.9});
  });
}

/* ── ORS Geocoding → resolve unknown city names ── */
function geocodeCity(name){
  return fetch(
    'https://api.openrouteservice.org/geocode/search?api_key='+ORS_KEY+
    '&text='+encodeURIComponent(name+', Maroc')+'&boundary.country=MA&size=1'
  )
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.features&&d.features.length>0){
      var c=d.features[0].geometry.coordinates;
      return{name:name,lng:c[0],lat:c[1]};
    }
    return null;
  })
  .catch(function(){return null;});
}

/* ── Main circuit entry point ── */
function drawCircuit(circuit){
  clearRoute();
  if(!circuit||circuit.length<2)return;

  /* Split into locally-resolved and unknowns */
  var resolved=[],unknowns=[];
  circuit.forEach(function(name){
    var c=lookupCoords(name);
    if(c)resolved.push({name:name,lat:c[0],lng:c[1]});
    else unknowns.push(name);
  });

  function proceed(stops){
    if(stops.length<2)return;
    /* preserve circuit order */
    var ordered=circuit.map(function(name){
      return stops.find(function(s){return s.name.toLowerCase()===name.toLowerCase();});
    }).filter(Boolean);
    if(ordered.length<2)return;
    /* Show markers immediately, then fetch route */
    drawStopMarkers(ordered);
    var latlngs=ordered.map(function(s){return[s.lat,s.lng];});
    map.fitBounds(L.latLngBounds(latlngs).pad(0.28),{animate:true,duration:0.6});
    fetchOrsRoute(ordered);
  }

  if(unknowns.length===0){
    proceed(resolved);
  } else {
    /* Geocode unknowns via ORS then merge */
    Promise.all(unknowns.map(geocodeCity)).then(function(geo){
      proceed(resolved.concat(geo.filter(Boolean)));
    });
  }
}

var allMarkers=${json};
var leafletMks=[];

var mainCluster=L.markerClusterGroup({
  maxClusterRadius:65,
  disableClusteringAtZoom:9,
  showCoverageOnHover:false,
  spiderfyOnMaxZoom:true,
  iconCreateFunction:function(cluster){
    var n=cluster.getChildCount();
    return L.divIcon({
      html:'<div style="position:relative;width:46px;height:56px;cursor:pointer;filter:drop-shadow(0 3px 10px rgba(184,23,46,0.55));"><div style="width:46px;height:46px;border-radius:14px;background:#B8172E;border:2.5px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:900;">'+n+'</div><div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:11px solid #B8172E;margin:0 auto;"></div></div>',
      className:'',iconSize:[46,56],iconAnchor:[23,56]
    });
  }
});

allMarkers.forEach(function(m){
  var isExp=m.type==='exp';
  var color=isExp?'#B8172E':
            m.cat==='adventure'?'#ea6c00':
            m.cat==='culture'?'#6d28d9':
            m.cat==='wellness'?'#059669':'#b45309';
  var sz=isExp?46:40;
  var tri=isExp?'border-left:9px solid transparent;border-right:9px solid transparent;border-top:11px solid '+color:'border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid '+color;
  var icon=L.divIcon({
    html:'<div style="position:relative;width:'+sz+'px;height:'+(sz+11)+'px;cursor:pointer;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.5));"><div class="mk-dot" style="width:'+sz+'px;height:'+sz+'px;border-radius:14px;background:'+color+';border:2.5px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:'+(isExp?21:18)+'px;transition:transform 0.18s;">'+(m.emoji||'📍')+'</div><div style="width:0;height:0;'+tri+';margin:0 auto;"></div></div>',
    className:'',iconSize:[sz,sz+11],iconAnchor:[sz/2,sz+11]
  });
  var mk=L.marker([m.lat,m.lng],{icon:icon});
  mk.on('click',function(){
    leafletMks.forEach(function(lmk){
      var d=lmk.getElement()&&lmk.getElement().querySelector('.mk-dot');
      if(d){d.style.transform='scale(1)';d.style.boxShadow='';}
    });
    var dot=this.getElement()&&this.getElement().querySelector('.mk-dot');
    if(dot){dot.style.transform='scale(1.15)';dot.style.boxShadow='0 0 0 4px rgba(255,255,255,0.35)';}
    map.panTo([m.lat,m.lng],{animate:true,duration:0.5});
    if(m.type==='exp'&&m.circuit&&m.circuit.length>=2){drawCircuit(m.circuit);}else{clearRoute();}
    try{window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}
  });
  leafletMks.push(mk);
  mainCluster.addLayer(mk);
});

map.addLayer(mainCluster);
if(allMarkers.length>0){
  map.fitBounds(L.latLngBounds(allMarkers.map(function(m){return[m.lat,m.lng];})).pad(0.2));
}

/* ── City selection pins + tap-anywhere (Plan My Trip mode) ── */
var CITY_DATA=[
  /* Tanger-Tétouan-Al Hoceima */
  {name:'Tanger',lat:35.7595,lng:-5.8340},{name:'Tétouan',lat:35.5785,lng:-5.3684},
  {name:'Al Hoceima',lat:35.2517,lng:-3.9372},{name:'Chefchaouen',lat:35.1688,lng:-5.2636},
  {name:'Larache',lat:35.1932,lng:-6.1561},{name:'Asilah',lat:35.4651,lng:-6.0372},
  {name:'Fnideq',lat:35.8484,lng:-5.3580},{name:'Mdiq',lat:35.6850,lng:-5.3266},
  {name:'Martil',lat:35.6178,lng:-5.2736},{name:'Ksar el-Kébir',lat:34.9974,lng:-5.9007},
  /* Oriental */
  {name:'Oujda',lat:34.6805,lng:-1.9112},{name:'Nador',lat:35.1681,lng:-2.9286},
  {name:'Berkane',lat:34.9217,lng:-2.3204},{name:'Taourirt',lat:34.4097,lng:-2.8978},
  {name:'Guercif',lat:34.2272,lng:-3.3601},{name:'Saïdia',lat:34.9333,lng:-2.2328},
  {name:'Jerada',lat:34.3131,lng:-2.1619},{name:'Figuig',lat:32.1084,lng:-1.2296},
  /* Fès-Meknès */
  {name:'Fès',lat:34.0181,lng:-5.0078},{name:'Meknès',lat:33.8935,lng:-5.5473},
  {name:'Ifrane',lat:33.5333,lng:-5.1167},{name:'Taza',lat:34.2100,lng:-3.9970},
  {name:'Séfrou',lat:33.8280,lng:-4.8350},{name:'Azrou',lat:33.4362,lng:-5.2236},
  {name:'Midelt',lat:32.6815,lng:-4.7327},{name:'Khénifra',lat:32.9342,lng:-5.6700},
  {name:'Volubilis',lat:34.0744,lng:-5.5550},{name:'Imouzzer Kandar',lat:33.7333,lng:-5.0167},
  /* Rabat-Salé-Kénitra */
  {name:'Rabat',lat:34.0209,lng:-6.8416},{name:'Salé',lat:34.0380,lng:-6.8210},
  {name:'Kénitra',lat:34.2610,lng:-6.5802},{name:'Témara',lat:33.9259,lng:-6.9140},
  {name:'Skhirat',lat:33.8500,lng:-7.0370},{name:'Tiflet',lat:33.8940,lng:-6.3073},
  /* Casablanca-Settat */
  {name:'Casablanca',lat:33.5731,lng:-7.5898},{name:'Mohammedia',lat:33.6900,lng:-7.3850},
  {name:'El Jadida',lat:33.2316,lng:-8.5007},{name:'Settat',lat:33.0010,lng:-7.6200},
  {name:'Khouribga',lat:32.8850,lng:-6.9068},{name:'Berrechid',lat:33.2653,lng:-7.5858},
  {name:'Azemmour',lat:33.2862,lng:-8.3429},{name:'Benslimane',lat:33.6158,lng:-7.1283},
  /* Béni Mellal-Khénifra */
  {name:'Béni Mellal',lat:32.3373,lng:-6.3498},{name:'Fquih Ben Salah',lat:32.5014,lng:-6.6920},
  {name:'Azilal',lat:31.9672,lng:-6.5753},{name:'Kasba Tadla',lat:32.6019,lng:-6.2678},
  {name:'Cascades Ouzoud',lat:32.0179,lng:-6.7199},
  /* Marrakech-Safi */
  {name:'Marrakech',lat:31.6295,lng:-7.9811},{name:'Safi',lat:32.2994,lng:-9.2372},
  {name:'Essaouira',lat:31.5125,lng:-9.7700},{name:'El Kelaa des Sraghna',lat:32.0533,lng:-7.4036},
  {name:'Chichaoua',lat:31.5380,lng:-8.7642},{name:'Youssoufia',lat:32.2455,lng:-8.5340},
  {name:'Vallée Ourika',lat:31.3600,lng:-7.8500},{name:'Tahannaout',lat:31.3575,lng:-7.9544},
  /* Drâa-Tafilalet */
  {name:'Ouarzazate',lat:30.9335,lng:-6.9370},{name:'Zagora',lat:30.3319,lng:-5.8378},
  {name:'Errachidia',lat:31.9314,lng:-4.4249},{name:'Tinghir',lat:31.5152,lng:-5.5337},
  {name:'Merzouga',lat:31.0802,lng:-4.0060},{name:'Erfoud',lat:31.4338,lng:-4.2360},
  {name:'Rissani',lat:31.2800,lng:-4.2667},{name:'Boumalne Dadès',lat:31.3700,lng:-5.9900},
  {name:'Aït Benhaddou',lat:31.0478,lng:-7.1315},{name:'Gorges Todra',lat:31.5898,lng:-5.5906},
  {name:'Gorges Dadès',lat:31.3583,lng:-5.9833},{name:'Alnif',lat:30.9997,lng:-5.1667},
  /* Souss-Massa */
  {name:'Agadir',lat:30.4278,lng:-9.5981},{name:'Taroudant',lat:30.4702,lng:-8.8770},
  {name:'Tiznit',lat:29.6974,lng:-9.7316},{name:'Tafraoute',lat:29.7178,lng:-8.9775},
  {name:'Taghazout',lat:30.5333,lng:-9.7083},{name:'Inezgane',lat:30.3569,lng:-9.5376},
  {name:'Sidi Ifni',lat:29.3803,lng:-10.1728},{name:'Aït Melloul',lat:30.3350,lng:-9.5000},
  {name:'Immouzer Ida Outanane',lat:30.6833,lng:-9.5167},
  /* Guelmim-Oued Noun */
  {name:'Guelmim',lat:28.9870,lng:-10.0574},{name:'Tan-Tan',lat:28.4366,lng:-11.1020},
  {name:'Assa',lat:28.6041,lng:-9.4258},{name:'Bouizakarne',lat:29.3658,lng:-9.7703},
  /* Laâyoune-Sakia El Hamra */
  {name:'Laâyoune',lat:27.1536,lng:-13.2033},{name:'Tarfaya',lat:27.9358,lng:-12.9183},
  {name:'Smara',lat:26.7352,lng:-11.6745},{name:'Boujdour',lat:26.1243,lng:-14.4850},
  /* Dakhla-Oued Ed Dahab */
  {name:'Dakhla',lat:23.6848,lng:-15.9571},{name:'Aousserd',lat:22.5569,lng:-14.3292}
];
var cityPinMks=[];
var selectedCityNames=[];
var citySelectMode=false;

function makeCityIcon(sel){
  return L.divIcon({
    html: sel
      ? '<div style="width:26px;height:26px;border-radius:50%;background:#22c55e;border:2.5px solid #16a34a;box-shadow:0 0 0 4px rgba(34,197,94,0.3);cursor:pointer;"></div>'
      : '<div style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.88);border:2px solid rgba(184,23,46,0.75);box-shadow:0 1px 5px rgba(0,0,0,0.5);cursor:pointer;"></div>',
    className:'',
    iconSize: sel?[26,26]:[20,20],
    iconAnchor: sel?[13,13]:[10,10]
  });
}

var cityCluster=L.markerClusterGroup({
  maxClusterRadius:55,
  disableClusteringAtZoom:9,
  showCoverageOnHover:false,
  spiderfyOnMaxZoom:true,
  iconCreateFunction:function(cluster){
    var n=cluster.getChildCount();
    return L.divIcon({
      html:'<div style="width:36px;height:36px;border-radius:50%;background:rgba(184,23,46,0.88);border:2px solid rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;box-shadow:0 2px 10px rgba(0,0,0,0.55);">'+n+'</div>',
      className:'',iconSize:[36,36],iconAnchor:[18,18]
    });
  }
});

CITY_DATA.forEach(function(c){
  var mk=L.marker([c.lat,c.lng],{icon:makeCityIcon(false),zIndexOffset:500});
  mk._cityName=c.name;
  mk.bindTooltip(c.name,{permanent:false,className:'stop-lbl',direction:'top',offset:[0,-13],opacity:0.95});
  mk.on('click',function(e){
    L.DomEvent.stopPropagation(e);
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ADD_WAYPOINT',name:c.name,lat:c.lat,lng:c.lng}));}catch(ex){}
  });
  cityPinMks.push(mk);
  cityCluster.addLayer(mk);
});

/* Tap anywhere on map → reverse geocode → add waypoint */
map.on('click',function(e){
  if(!citySelectMode)return;
  var lat=e.latlng.lat,lng=e.latlng.lng;
  var latF=lat.toFixed(5),lngF=lng.toFixed(5);
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+latF+'&lon='+lngF+'&zoom=12&accept-language=fr',
    {headers:{'Accept-Language':'fr','User-Agent':'RoamersApp/1.0'}})
  .then(function(r){return r.json();})
  .then(function(d){
    var a=d.address||{};
    var name=a.village||a.hamlet||a.town||a.city||a.suburb||a.county||a.state_district||a.state||(latF+'°N '+Math.abs(lngF)+'°W');
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ADD_WAYPOINT',name:name,lat:lat,lng:lng}));}catch(ex){}
  })
  .catch(function(){
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ADD_WAYPOINT',name:latF+'°N '+Math.abs(lngF).toFixed(5)+'°W',lat:lat,lng:lng}));}catch(ex){}
  });
});

function showCityPins(){
  map.addLayer(cityCluster);
  map.fitBounds(L.latLngBounds(CITY_DATA.map(function(c){return[c.lat,c.lng];})).pad(0.08),{animate:true,duration:0.6});
}
function hideCityPins(){
  try{map.removeLayer(cityCluster);}catch(e){}
  selectedCityNames=[];
}
function syncCityPins(names){
  selectedCityNames=names||[];
  cityPinMks.forEach(function(mk){
    var sel=selectedCityNames.indexOf(mk._cityName)!==-1;
    mk.setIcon(makeCityIcon(sel));
  });
}
function hideActivityMarkers(){
  try{map.removeLayer(mainCluster);}catch(e){}
}
function showActivityMarkers(){
  try{map.addLayer(mainCluster);}catch(e){}
}
function enableCitySelectMode(){citySelectMode=true;hideActivityMarkers();}
function disableCitySelectMode(){citySelectMode=false;showActivityMarkers();}
</script>
</body>
</html>`;
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const BANNER_H = 140;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logo:         { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  headerTitle:  { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  statsRow:     { flexDirection: 'row' },
  statChip:     { paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, marginLeft: 8 },
  statChipTxt:  { fontSize: 12, fontWeight: '800', includeFontPadding: false },

  /* Map area */
  mapContainer: { flex: 1, position: 'relative' },
  map:          { flex: 1, backgroundColor: '#0e0e0e' },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderTxt:    { color: COLORS.sub, fontSize: 14, marginTop: 12 },

  /* Select-for-plan banner */
  selectBanner:    { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 10, backgroundColor: 'rgba(184,23,46,0.88)', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center' },
  selectBannerTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Floating filter bar */
  filterOverlay: { position: 'absolute', top: 12, left: 0, right: 0, flexGrow: 0, height: 52 },
  filterContent: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  filterChip:    { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 13, borderRadius: 18, backgroundColor: 'rgba(10,10,10,0.88)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterIcon:    { fontSize: 13, marginRight: 5, includeFontPadding: false },
  filterTxt:     { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', includeFontPadding: false },
  filterTxtActive: { color: '#fff' },

  /* Zoom controls */
  zoomPanel:    { position: 'absolute', right: 12, top: 68, backgroundColor: 'rgba(14,14,14,0.92)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  zoomBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  zoomBtnTxt:   { color: '#fff', fontSize: 20, fontWeight: '300', includeFontPadding: false },
  zoomSep:      { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 6 },

  /* FAB */
  fab:          { position: 'absolute', alignSelf: 'center', left: 28, right: 28, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 15, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 12 },
  fabTxt:       { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

  /* Detail card */
  card:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardBanner:         { width: '100%', height: BANNER_H, overflow: 'hidden' },
  cardBannerFallback: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  bannerDots:         { position: 'absolute', bottom: 10, alignSelf: 'center', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  bannerDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 3 },
  bannerDotActive:    { backgroundColor: '#fff', width: 18 },
  cardClose:    { position: 'absolute', top: BANNER_H - 20, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  cardCloseTxt: { color: '#fff', fontSize: 13, fontWeight: '700', includeFontPadding: false },
  cardBody:     { paddingHorizontal: 16, paddingTop: 14 },
  typeBadge:    { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill, marginBottom: 8 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, includeFontPadding: false },
  cardTitle:    { color: COLORS.text, fontSize: 17, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  cardLoc:      { color: COLORS.sub, fontSize: 12, marginBottom: 12 },
  cardStats:    { flexDirection: 'row', marginBottom: 14 },
  cardStat:     { marginRight: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  cardStatTxt:  { color: COLORS.sub, fontSize: 12, fontWeight: '700', includeFontPadding: false },
  cardActions:  { flexDirection: 'row' },
  btnSecondary: { flex: 1, paddingVertical: 13, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', marginRight: 10 },
  btnSecondaryTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 13, includeFontPadding: false },
  btnPrimary:   { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 13, borderRadius: RADIUS.pill, alignItems: 'center' },
  btnPrimaryTxt:{ color: '#fff', fontWeight: '900', fontSize: 14, includeFontPadding: false },

  /* Planning panel */
  planPanel:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3b82f644', maxHeight: 380, paddingHorizontal: 16, paddingTop: 16 },
  planHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planTitle:        { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  planClose:        { color: COLORS.sub, fontSize: 16, fontWeight: '700', padding: 4 },
  planWpList:       { maxHeight: 130, marginBottom: 10 },
  planWpRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  planWpNum:        { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  planWpNumTxt:     { color: '#fff', fontSize: 11, fontWeight: '900', includeFontPadding: false },
  planWpName:       { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  planWpRemove:     { color: COLORS.sub, fontSize: 14, fontWeight: '700', paddingLeft: 8 },
  planEmpty:        { color: COLORS.sub, fontSize: 12, fontStyle: 'italic', paddingVertical: 14, textAlign: 'center' },
  planAddBtn:       { borderWidth: 1.5, borderColor: '#3b82f6', borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  planAddBtnTxt:    { color: '#3b82f6', fontSize: 13, fontWeight: '800' },
  planHint:         { paddingVertical: 6, alignItems: 'center', marginBottom: 4 },
  planHintTxt:      { color: COLORS.muted, fontSize: 12 },

  locSearchWrap:    { marginBottom: 8 },
  locSearchRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 2 },
  locSearchInput:   { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 9 },
  locResultsList:   { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, maxHeight: 180 },
  locResultItem:    { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  locResultTxt:     { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  planStats:        { alignItems: 'center', marginBottom: 8 },
  planStatTxt:      { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  planSaveBtn:      { backgroundColor: '#3b82f6', borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', marginBottom: 6 },
  planSaveBtnTxt:   { color: '#fff', fontWeight: '900', fontSize: 14, includeFontPadding: false },
  planConfirmBtn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center', marginBottom: 6 },
  planConfirmBtnTxt:{ color: '#fff', fontWeight: '900', fontSize: 14, includeFontPadding: false },
  planSavedBanner:  { backgroundColor: '#22c55e22', borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e44', marginBottom: 6 },
  planSavedTxt:     { color: '#22c55e', fontSize: 13, fontWeight: '700' },
  planErrorBanner:  { backgroundColor: '#ef444422', borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ef444444', marginBottom: 6 },
  planErrorTxt:     { color: '#ef4444', fontSize: 13, fontWeight: '700' },

  /* City picker modal */
  cityModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  cityModalSheet:   { backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '72%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },
  cityModalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cityModalTitle:   { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  cityModalClose:   { color: COLORS.sub, fontSize: 18, fontWeight: '700', padding: 4 },
  citySearchInput:  { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  cityItem:         { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cityItemTxt:      { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
