import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import Icon from './Icons';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.78;

const SEGMENT_LABELS: Record<string, string> = {
  groupe: 'Groupe', weekend: 'Weekend', mesure: 'Sur Mesure', team: 'Team Building',
};
const SEGMENT_COLORS: Record<string, string> = {
  groupe: '#1d4ed8', weekend: '#7c3aed', mesure: COLORS.primary, team: '#d97706',
};

interface Props {
  exp: any;
  onPress: () => void;
  wide?: boolean;
  wishlist?: string[];
  onWishlist?: (id: string) => void;
}

function difColor(dif: string): string {
  const map: Record<string, string> = {
    Facile: '#22c55e', Modéré: '#f59e0b', Sportif: '#f97316', Extrême: '#ef4444',
  };
  return map[dif] || COLORS.sub;
}

function ExperienceCard({ exp, onPress, wide, wishlist, onWishlist }: Props) {
  const segColor  = SEGMENT_COLORS[exp.segment] || COLORS.primary;
  const segLabel  = SEGMENT_LABELS[exp.segment] || exp.segment;
  const cardW     = wide ? width - 32 : CARD_W;
  const isSaved   = wishlist ? wishlist.includes(exp.id) : false;
  const showHeart = !!onWishlist;
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardW }, !wide && { marginRight: 16 }, SHADOW.md]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Segment-colored accent stripe */}
      <View style={[styles.accentLine, { backgroundColor: segColor }]} />

      {/* Image */}
      <View style={styles.imgWrap}>
        {exp.img
          ? <>
              <Image
                source={{ uri: exp.img }}
                style={styles.img}
                resizeMode="cover"
                onLoadEnd={() => setImgLoaded(true)}
              />
              {!imgLoaded && (
                <View style={[StyleSheet.absoluteFill, styles.imgFallback]}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              )}
            </>
          : <View style={[styles.img, styles.imgFallback]}><Text style={styles.imgEmoji}>🏔️</Text></View>
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(10,10,10,0.9)']}
          locations={[0.25, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Promo badge top-left */}
        {exp.badge && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeTxt}>★ {exp.badge}</Text>
          </View>
        )}

        {/* Heart / wishlist button top-right */}
        {showHeart && (
          <TouchableOpacity
            style={[styles.heartBtn, isSaved && styles.heartBtnActive]}
            onPress={(e) => { e.stopPropagation?.(); onWishlist!(exp.id); }}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Icon.Heart size={15} color={isSaved ? '#fff' : COLORS.muted} filled={isSaved} />
          </TouchableOpacity>
        )}

        {/* Bottom row: rating + days */}
        <View style={styles.imgFooter}>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingTxt}>★ {exp.rating?.toFixed(1)}</Text>
            <Text style={styles.ratingRev}> · {exp.rev} avis</Text>
          </View>
          <View style={[styles.daysPill, { backgroundColor: segColor }]}>
            <Text style={styles.daysTxt}>{exp.days}j</Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Segment + difficulty row */}
        <View style={styles.tagsRow}>
          <View style={[styles.segTag, { backgroundColor: segColor + '1e', borderColor: segColor + '50' }]}>
            <Text style={[styles.segTagTxt, { color: segColor }]}>{segLabel}</Text>
          </View>
          {exp.dif && (
            <View style={[styles.difTag, { borderColor: difColor(exp.dif) + '55' }]}>
              <Text style={[styles.difTagTxt, { color: difColor(exp.dif) }]}>{exp.dif}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{exp.title}</Text>

        {exp.loc && (
          <Text style={styles.loc} numberOfLines={1}>📍  {exp.loc}</Text>
        )}

        <View style={styles.divider} />

        {/* Price + CTA */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>À partir de</Text>
            <Text style={styles.price}>
              {Number(exp.price).toLocaleString('fr-MA')}
              <Text style={styles.priceCur}> MAD</Text>
            </Text>
          </View>
          <View style={[styles.cta, { backgroundColor: segColor }]}>
            <Text style={styles.ctaTxt}>Voir →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* Memoised: in lists/carousels, avoids re-rendering every card when only
   one wishlist entry or an unrelated parent state changes. */
export default React.memo(ExperienceCard, (prev, next) =>
  prev.exp === next.exp &&
  prev.wide === next.wide &&
  prev.onWishlist === next.onWishlist &&
  (prev.wishlist?.includes(prev.exp.id) ?? false) === (next.wishlist?.includes(next.exp.id) ?? false)
);

const styles = StyleSheet.create({
  card:       { backgroundColor: '#161616', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#242424' },

  accentLine: { height: 3, width: '100%' },

  imgWrap:    { position: 'relative' },
  img:        { width: '100%', height: 220 },
  imgFallback:{ backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  imgEmoji:   { fontSize: 48 },

  promoBadge:    { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(240,192,64,0.93)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  promoBadgeTxt: { color: '#000', fontSize: 11, fontWeight: '800' },

  heartBtn:       { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  heartBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  imgFooter:  { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  ratingTxt:  { color: '#FFD700', fontSize: 12, fontWeight: '800' },
  ratingRev:  { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  daysPill:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.sm },
  daysTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },

  body:       { padding: 16 },

  tagsRow:    { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  segTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1 },
  segTagTxt:  { fontSize: 11, fontWeight: '800', includeFontPadding: false },
  difTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#333', backgroundColor: 'transparent' },
  difTagTxt:  { fontSize: 11, fontWeight: '700', includeFontPadding: false },

  title:      { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 8, lineHeight: 23 },
  loc:        { color: COLORS.muted, fontSize: 12, marginBottom: 16 },

  divider:    { height: 1, backgroundColor: '#242424', marginBottom: 14 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { color: COLORS.muted, fontSize: 11, marginBottom: 2 },
  price:      { color: COLORS.primary, fontSize: 22, fontWeight: '900', includeFontPadding: false },
  priceCur:   { fontSize: 13, color: COLORS.sub },
  cta:        { paddingHorizontal: 20, paddingVertical: 11, borderRadius: RADIUS.pill },
  ctaTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },
});
