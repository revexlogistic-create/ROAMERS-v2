import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActivities } from '../services/api';
import { COLORS, RADIUS } from '../constants/theme';

const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  adventure:  { icon: '🏄', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  culture:    { icon: '🏛️', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  corporate:  { icon: '🤝', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  wellness:   { icon: '🧘', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

function catMeta(cat: string) {
  return CAT_META[cat?.toLowerCase()] || { icon: '🏔️', color: COLORS.primary, bg: 'rgba(212,23,58,0.12)' };
}

export default function ActivitiesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    getActivities()
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activités</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏔️</Text>
              <Text style={styles.emptyTxt}>Aucune activité disponible</Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = catMeta(item.category);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Booking', { exp: item })}
              >
                {/* Category badge strip */}
                <View style={[styles.catStrip, { backgroundColor: meta.bg }]}>
                  <Text style={styles.catIcon}>{meta.icon}</Text>
                  <Text style={[styles.catLabel, { color: meta.color }]}>
                    {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Activité'}
                  </Text>
                  {item.duration ? (
                    <View style={[styles.durBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                      <Text style={[styles.durTxt, { color: meta.color }]}>⏱ {item.duration}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title || item.name || 'Activité'}
                  </Text>

                  {/* Description — uses `desc` field from DB */}
                  {item.desc ? (
                    <Text style={styles.cardDesc} numberOfLines={3}>{item.desc}</Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    {item.price != null ? (
                      <View style={styles.priceBox}>
                        <Text style={styles.priceVal}>{Number(item.price).toLocaleString('fr-MA')} MAD</Text>
                        <Text style={styles.priceSub}>/ pers.</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.bookBtn, { backgroundColor: meta.color }]}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Booking', { exp: item })}
                    >
                      <Text style={styles.bookBtnTxt}>Réserver →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt:     { color: COLORS.text, fontSize: 32, lineHeight: 36, marginTop: -4 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },

  catStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  catIcon:  { fontSize: 20 },
  catLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  durBadge: {
    borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3,
  },
  durTxt: { fontSize: 11, fontWeight: '700' },

  cardBody:  { padding: 14, paddingTop: 8 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6, lineHeight: 21 },
  cardDesc:  { color: COLORS.sub, fontSize: 13, lineHeight: 19, marginBottom: 14 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceBox:   { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  priceVal:   { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  priceSub:   { color: COLORS.muted, fontSize: 12 },

  bookBtn:    { borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 9 },
  bookBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  empty:    { paddingTop: 80, alignItems: 'center' },
  emptyTxt: { color: COLORS.muted, fontSize: 15, marginTop: 8 },
});
