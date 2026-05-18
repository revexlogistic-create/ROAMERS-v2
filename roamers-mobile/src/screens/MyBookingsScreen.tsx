import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyBookings } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RButton from '../components/RButton';
import { COLORS, RADIUS } from '../constants/theme';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#22c55e', completed: '#6366f1',
  cancelled: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé',
};
const PAY_LABEL: Record<string, string> = {
  unpaid: 'Non payé', paid: 'Payé', refunded: 'Remboursé',
};

export default function MyBookingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh]= useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try { setBookings(await getMyBookings()); } catch (_) {}
    setLoading(false); setRefresh(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return (
    <View style={[styles.center, { paddingTop: insets.top }]}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.lockTitle}>Connectez-vous</Text>
      <Text style={styles.lockSub}>Vous devez être connecté pour voir vos réservations.</Text>
      <RButton label="Se connecter" onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, minWidth: 180 }} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>ROAMERS</Text>
        <Text style={styles.headerTitle}>Mes réservations</Text>
      </View>
      {loading
        ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 48 }} />
        : <FlatList
            data={bookings}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Aucune réservation</Text>
                <Text style={styles.emptySub}>Votre historique de voyages apparaîtra ici.</Text>
                <RButton label="Explorer les expériences" onPress={() => navigation.navigate('Explorer')} style={{ marginTop: 16 }} />
              </View>
            }
            renderItem={({ item: b }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{b.expTitle}</Text>
                    <Text style={styles.cardRef}>{b.id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[b.status] + '22', borderColor: STATUS_COLOR[b.status] }]}>
                    <Text style={[styles.statusTxt, { color: STATUS_COLOR[b.status] }]}>{STATUS_LABEL[b.status] || b.status}</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLbl}>Date</Text>
                    <Text style={styles.metaVal}>{b.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLbl}>Participants</Text>
                    <Text style={styles.metaVal}>{b.adults}A{b.children > 0 ? ` + ${b.children}E` : ''}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLbl}>Paiement</Text>
                    <Text style={[styles.metaVal, b.payment === 'paid' && { color: COLORS.success }]}>{PAY_LABEL[b.payment] || b.payment}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.totalVal}>{Number(b.total).toLocaleString('fr-MA')} MAD</Text>
                  <Text style={styles.cardDate}>{new Date(b.created).toLocaleDateString('fr-FR')}</Text>
                </View>
              </View>
            )}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header:      { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logo:        { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  center:      { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lockIcon:    { fontSize: 52, marginBottom: 16 },
  lockTitle:   { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  lockSub:     { color: COLORS.sub, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop:     { flexDirection: 'row', marginBottom: 12 },
  cardTopLeft: { flex: 1, marginRight: 10 },
  cardTitle:   { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardRef:     { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1, alignSelf: 'flex-start' },
  statusTxt:   { fontSize: 12, fontWeight: '700', includeFontPadding: false },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  cardMeta:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metaItem:    {},
  metaLbl:     { color: COLORS.muted, fontSize: 11, marginBottom: 3 },
  metaVal:     { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalVal:    { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  cardDate:    { color: COLORS.muted, fontSize: 12 },
  emptyWrap:   { alignItems: 'center', paddingTop: 60 },
  emptyIcon:   { fontSize: 52, marginBottom: 16 },
  emptyTitle:  { color: COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub:    { color: COLORS.sub, fontSize: 14, textAlign: 'center' },
});
