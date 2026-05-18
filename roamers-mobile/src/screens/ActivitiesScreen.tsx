import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActivities } from '../services/api';
import { COLORS, RADIUS } from '../constants/theme';

export default function ActivitiesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>Aucune activité disponible</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.img ? (
                <Image source={{ uri: item.img }} style={styles.cardImg} />
              ) : (
                <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                  <Text style={{ fontSize: 32 }}>🏔️</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name || item.title || 'Activité'}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
                ) : null}
                {item.price != null ? (
                  <Text style={styles.cardPrice}>{item.price} MAD / pers.</Text>
                ) : null}
              </View>
            </View>
          )}
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
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt:    { color: COLORS.text, fontSize: 32, lineHeight: 36, marginTop: -4 },
  headerTitle:{ color: COLORS.text, fontSize: 18, fontWeight: '700' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  cardImg:    { width: '100%', height: 180 },
  cardImgPlaceholder: { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  cardBody:   { padding: 14 },
  cardTitle:  { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc:   { color: COLORS.sub, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardPrice:  { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  empty:      { paddingTop: 60, alignItems: 'center' },
  emptyTxt:   { color: COLORS.muted, fontSize: 15 },
});
