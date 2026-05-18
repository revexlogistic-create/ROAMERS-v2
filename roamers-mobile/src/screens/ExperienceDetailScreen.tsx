import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, TextInput, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getExperience, getReviews, submitReview } from '../services/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
/* Instagram portrait ratio 4:5 */
const HERO_H = Math.round(width * 1.25);

const DIF_COLORS: Record<string, string> = {
  Facile: '#22c55e', Modéré: '#f59e0b', Sportif: '#f97316', Extrême: '#ef4444',
};
const SEG_COLORS: Record<string, string> = {
  groupe: '#1d4ed8', weekend: '#7c3aed', mesure: COLORS.primary, team: '#d97706',
};
const SEG_LABELS: Record<string, string> = {
  groupe: 'Voyage de Groupe', weekend: 'Weekend à Thème',
  mesure: 'Sur Mesure', team: 'Team Building',
};

/* ── Collapsible day card ────────────────────────────────────────────────── */
function DayCard({ day, index, total, accentColor, galleryImgs }: {
  day: any; index: number; total: number; accentColor: string; galleryImgs: string[];
}) {
  const [open, setOpen] = useState(index === 0);
  /* Per-day image, fallback to cycling through gallery */
  const dayImg: string = day.img || (galleryImgs.length ? galleryImgs[index % galleryImgs.length] : '');
  return (
    <View style={prog.wrap}>
      <TouchableOpacity style={prog.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.78}>
        <View style={[prog.dayBadge, { backgroundColor: accentColor }]}>
          <Text style={prog.dayNum}>{index + 1}</Text>
          <Text style={prog.dayOf}>/{total}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={prog.dayTitle} numberOfLines={open ? 0 : 1}>{day.title || day.t || `Jour ${index + 1}`}</Text>
        </View>
        <Text style={[prog.chevron, open && { color: accentColor }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={prog.body}>
          {!!dayImg && (
            <View style={prog.dayImgWrap}>
              <Image source={{ uri: dayImg }} style={prog.dayImg} resizeMode="cover" />
              <View style={[prog.dayImgBadge, { backgroundColor: accentColor }]}>
                <Text style={prog.dayImgBadgeNum}>{index + 1}</Text>
                <Text style={prog.dayImgBadgeOf}>/{total}</Text>
              </View>
            </View>
          )}
          {(day.desc || day.description) && (
            <Text style={prog.desc}>{day.desc || day.description}</Text>
          )}
          {day.activities?.map((a: string, i: number) => (
            <View key={i} style={prog.actRow}>
              <View style={[prog.actDot, { backgroundColor: accentColor }]} />
              <Text style={prog.actTxt}>{a}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Rating breakdown ────────────────────────────────────────────────────── */
function RatingBreakdown({ avg, total, dist }: { avg: number; total: number; dist: number[] }) {
  const rounded = Math.min(5, Math.max(0, Math.round(avg)));
  return (
    <View style={rb.wrap}>
      <View style={rb.left}>
        <Text style={rb.score}>{avg?.toFixed(1)}</Text>
        <Text style={rb.stars}>{'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}</Text>
        <Text style={rb.revCount}>{total} avis</Text>
      </View>
      <View style={rb.right}>
        {[5, 4, 3, 2, 1].map((n) => {
          const cnt = dist[n - 1] || 0;
          const pct = total ? Math.round((cnt / total) * 100) : 0;
          return (
            <View key={n} style={rb.row}>
              <Text style={rb.rowLbl}>{n}★</Text>
              <View style={rb.barBg}>
                <View style={[rb.barFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={rb.rowPct}>{cnt}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionLine, { backgroundColor: color }]} />
      <Text style={s.sectionLbl}>{label}</Text>
    </View>
  );
}

/* ── Main screen ─────────────────────────────────────────────────────────── */
export default function ExperienceDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [exp, setExp]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'program' | 'info'>('overview');
  const [imgIdx, setImgIdx]     = useState(0);

  /* Reviews state */
  const [reviews, setReviews]         = useState<any[]>([]);
  const [revSummary, setRevSummary]   = useState<{ avg: number; total: number; dist: number[] } | null>(null);
  const [revLoading, setRevLoading]   = useState(true);
  const [revRating, setRevRating]     = useState(0);
  const [revText, setRevText]         = useState('');
  const [revErr, setRevErr]           = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  /* ── MUST be before any conditional return (Rules of Hooks) ── */
  const heroRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    getExperience(id)
      .then((e) => { setExp(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setRevLoading(true);
    getReviews(id)
      .then((d) => { setReviews(d.reviews || []); setRevSummary(d.summary); })
      .catch(() => {})
      .finally(() => setRevLoading(false));
  }, [id]);

  const handleSubmitReview = async () => {
    if (!revRating) { setRevErr('Veuillez choisir une note (1–5 étoiles).'); return; }
    if (revText.trim().length < 10) { setRevErr('Votre avis doit faire au moins 10 caractères.'); return; }
    setRevErr('');
    setRevSubmitting(true);
    try {
      await submitReview({ expId: id, rating: revRating, text: revText.trim() });
      setRevRating(0);
      setRevText('');
      const d = await getReviews(id);
      setReviews(d.reviews || []);
      setRevSummary(d.summary);
    } catch (err: any) {
      setRevErr(err.message || 'Erreur lors de la publication.');
    } finally {
      setRevSubmitting(false);
    }
  };

  function onHeroScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setImgIdx(idx);
  }

  function goToImage(idx: number) {
    setImgIdx(idx);
    heroRef.current?.scrollToIndex({ index: idx, animated: true });
  }

  if (loading) return (
    <View style={s.loader}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  );
  if (!exp) return (
    <View style={s.loader}>
      <Text style={{ color: COLORS.sub, fontSize: 16 }}>Expérience introuvable</Text>
    </View>
  );

  const isClosed = exp.status === 'closed' || exp.status === 'full';
  const segColor = SEG_COLORS[exp.segment] || COLORS.primary;
  const imgs: string[] = exp.imgs?.length ? exp.imgs : (exp.img ? [exp.img] : []);
  const itinerary: any[] = exp.it || exp.itinerary || [];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ══════════════════════════════════════════
            INSTAGRAM-STYLE GALLERY
            ══════════════════════════════════════════ */}
        <View style={s.galleryWrap}>

          {/* ── Main swipeable portrait images ── */}
          <FlatList
            ref={heroRef}
            data={imgs.length > 0 ? imgs : ['__placeholder__']}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onHeroScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item: uri }) =>
              uri === '__placeholder__'
                ? <View style={[s.heroImg, s.heroFallback]}><Text style={{ fontSize: 72 }}>🏔️</Text></View>
                : <Image source={{ uri }} style={s.heroImg} resizeMode="cover" />
            }
          />

          {/* Dark gradient — top + bottom */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(8,8,8,1)']}
            locations={[0, 0.38, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* ── Back button ── */}
          <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>‹</Text>
          </TouchableOpacity>

          {/* ── Instagram counter "2 / 5" ── */}
          {imgs.length > 1 && (
            <View style={[s.imgCounter, { top: insets.top + 14 }]}>
              <Text style={s.imgCounterTxt}>{imgIdx + 1} / {imgs.length}</Text>
            </View>
          )}

          {/* ── Segment badge ── */}
          <View style={s.heroTopBadges}>
            <View style={[s.segBadge, { backgroundColor: segColor }]}>
              <Text style={s.segBadgeTxt}>{SEG_LABELS[exp.segment] || exp.segment}</Text>
            </View>
            {exp.badge && (
              <View style={s.goldBadge}>
                <Text style={s.goldBadgeTxt}>★ {exp.badge}</Text>
              </View>
            )}
          </View>

          {/* ── Rating pill bottom-left ── */}
          <View style={s.ratingOverlay}>
            <Text style={s.ratingOvStar}>★ {exp.rating?.toFixed(1)}</Text>
            <Text style={s.ratingOvRev}> · {exp.rev} avis</Text>
          </View>

          {/* ── Instagram-style dot indicators ── */}
          {imgs.length > 1 && imgs.length <= 10 && (
            <View style={s.dotRow}>
              {imgs.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── THUMBNAIL STRIP (Instagram grid style) ── */}
        {imgs.length > 1 && (
          <View style={s.thumbStrip}>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 3, paddingHorizontal: 3 }}
            >
              {imgs.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => goToImage(i)}
                  activeOpacity={0.85}
                  style={[
                    s.thumb,
                    i === imgIdx && { borderWidth: 2.5, borderColor: segColor },
                  ]}
                >
                  <Image source={{ uri }} style={s.thumbImg} resizeMode="cover" />
                  {/* Dim overlay for non-active */}
                  {i !== imgIdx && (
                    <View
                      pointerEvents="none"
                      style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: RADIUS.sm - 1 }}
                    />
                  )}
                  {/* "+" badge on last thumb if more images */}
                  {i === 3 && imgs.length > 4 && (
                    <View style={[s.thumbMore, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
                      <Text style={s.thumbMoreTxt}>+{imgs.length - 4}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── TITLE ── */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{exp.title}</Text>

          {/* Meta chips */}
          <View style={s.metaChips}>
            {exp.loc  && <View style={s.metaChip}><Text style={s.metaChipTxt}>📍  {exp.loc}</Text></View>}
            {exp.dur  && <View style={s.metaChip}><Text style={s.metaChipTxt}>⏱  {exp.dur}</Text></View>}
            {exp.dif  && (
              <View style={[s.metaChip, { borderColor: (DIF_COLORS[exp.dif] || '#888') + '55' }]}>
                <Text style={[s.metaChipTxt, { color: DIF_COLORS[exp.dif] || COLORS.sub }]}>⚡  {exp.dif}</Text>
              </View>
            )}
            {exp.maxP && <View style={s.metaChip}><Text style={s.metaChipTxt}>👥  {exp.minP}–{exp.maxP} pers.</Text></View>}
          </View>
        </View>

        {/* ── PRICE CARD ── */}
        <View style={[s.priceCard, { borderLeftColor: segColor }]}>
          <View>
            <Text style={s.priceEyebrow}>PRIX PAR PERSONNE</Text>
            <View style={s.priceRow}>
              <Text style={[s.priceMain, { color: segColor }]}>{Number(exp.price).toLocaleString('fr-MA')}</Text>
              <Text style={s.priceCur}> MAD</Text>
            </View>
            {exp.pChild != null && (
              <Text style={s.childPrice}>Enfant : {Number(exp.pChild).toLocaleString('fr-MA')} MAD</Text>
            )}
          </View>
          <View style={[s.daysChip, { backgroundColor: segColor + '1e', borderColor: segColor + '44' }]}>
            <Text style={[s.daysNum, { color: segColor }]}>{exp.days}</Text>
            <Text style={[s.daysLbl, { color: segColor }]}>jour{exp.days > 1 ? 's' : ''}</Text>
            {exp.nights > 0 && <Text style={s.nightsLbl}>{exp.nights} nuit{exp.nights > 1 ? 's' : ''}</Text>}
          </View>
        </View>

        {/* ── TAB BAR ── */}
        <View style={s.tabBar}>
          {(['overview', 'program', 'info'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, activeTab === t && [s.tabActive, { backgroundColor: segColor }]]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>
                {t === 'overview' ? 'Aperçu' : t === 'program' ? 'Programme' : 'Inclus'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <View style={s.tabContent}>

            {exp.desc ? <Text style={s.desc}>{exp.desc}</Text> : null}

            {/* Highlights */}
            {exp.hi?.length > 0 && (
              <View style={s.box}>
                <SectionHeader label="Points forts" color={segColor} />
                {exp.hi.map((h: string, i: number) => (
                  <View key={i} style={s.bulletRow}>
                    <View style={[s.bulletDot, { backgroundColor: segColor }]} />
                    <Text style={s.bulletTxt}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Trust signals */}
            <View style={s.trustGrid}>
              {[
                { icon: '🧭', label: 'Guide certifié' },
                { icon: '🛡️', label: 'Support 24/7' },
                { icon: '🚐', label: 'Transport inclus' },
                { icon: '🌱', label: 'Impact local' },
                { icon: '✅', label: '100% sécurisé' },
                ...(exp.segment === 'mesure' ? [{ icon: '✂️', label: 'Sur mesure' }] : []),
                ...(exp.segment === 'team'   ? [{ icon: '🏆', label: '120+ entreprises' }] : []),
              ].map((t, i) => (
                <View key={i} style={s.trustItem}>
                  <Text style={s.trustIcon}>{t.icon}</Text>
                  <Text style={s.trustLabel}>{t.label}</Text>
                </View>
              ))}
            </View>

            {/* Tags */}
            {exp.tags?.length > 0 && (
              <View style={s.tagsRow}>
                {exp.tags.map((tag: string, i: number) => (
                  <View key={i} style={[s.tag, { borderColor: segColor + '44' }]}>
                    <Text style={[s.tagTxt, { color: segColor }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Reviews */}
            <View style={s.reviewsSection}>
              <SectionHeader label="Avis voyageurs" color={segColor} />

              {revLoading ? (
                <ActivityIndicator color={segColor} size="small" style={{ marginVertical: 20 }} />
              ) : revSummary && revSummary.total > 0 ? (
                <>
                  <RatingBreakdown avg={revSummary.avg} total={revSummary.total} dist={revSummary.dist} />
                  {reviews.map((rv, i) => (
                    <View key={i} style={s.reviewCard}>
                      <View style={s.reviewHeader}>
                        <View style={[s.reviewAvatar, { backgroundColor: segColor }]}>
                          <Text style={s.reviewAvatarTxt}>{rv.initial || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.reviewName}>{rv.displayName}</Text>
                          <Text style={s.reviewStars}>{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</Text>
                        </View>
                        <Text style={s.reviewDate}>
                          {new Date(rv.created).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={s.reviewTxt}>{rv.text}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={s.noReviews}>Aucun avis pour le moment. Soyez le premier !</Text>
              )}

              {/* Write-review form */}
              {user ? (
                <View style={s.reviewForm}>
                  <Text style={s.reviewFormTitle}>✏️ Votre avis</Text>
                  <View style={s.starPicker}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRevRating(n)} hitSlop={8}>
                        <Text style={[s.starPickerStar, { color: n <= revRating ? '#FFD700' : '#444' }]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={s.reviewInput}
                    placeholder="Partagez votre expérience (min. 10 caractères)…"
                    placeholderTextColor={COLORS.muted}
                    multiline
                    numberOfLines={4}
                    value={revText}
                    onChangeText={setRevText}
                  />
                  {!!revErr && <Text style={s.reviewErrTxt}>{revErr}</Text>}
                  <TouchableOpacity
                    style={[s.reviewSubmitBtn, { backgroundColor: revSubmitting ? '#555' : segColor }]}
                    disabled={revSubmitting}
                    onPress={handleSubmitReview}
                    activeOpacity={0.85}
                  >
                    <Text style={s.reviewSubmitTxt}>{revSubmitting ? 'Publication…' : 'Publier mon avis'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.reviewLoginPrompt}>
                  <Text style={s.reviewLoginTxt}>Connectez-vous pour laisser un avis · Réservation requise</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── PROGRAMME ── */}
        {activeTab === 'program' && (
          <View style={s.tabContent}>
            {itinerary.length > 0 ? (
              <>
                <Text style={s.progIntro}>Appuyez sur chaque jour pour voir le détail.</Text>
                {itinerary.map((day: any, i: number) => (
                  <DayCard key={i} day={day} index={i} total={itinerary.length} accentColor={segColor} galleryImgs={imgs} />
                ))}
              </>
            ) : (
              <View style={s.emptyProg}>
                <Text style={s.emptyProgIcon}>📅</Text>
                <Text style={s.emptyProgTxt}>Programme à confirmer lors de la réservation.</Text>
                <Text style={s.emptyProgSub}>Notre équipe adapte chaque itinéraire à votre groupe.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── INCLUS ── */}
        {activeTab === 'info' && (
          <View style={s.tabContent}>
            {exp.inc?.length > 0 && (
              <View style={[s.inclBox, { borderColor: '#22c55e33' }]}>
                <SectionHeader label="Inclus dans le prix" color="#22c55e" />
                {exp.inc.map((h: string, i: number) => (
                  <View key={i} style={s.bulletRow}>
                    <Text style={[s.checkIcon]}>✓</Text>
                    <Text style={[s.bulletTxt, { color: '#4ade80' }]}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {exp.exc?.length > 0 && (
              <View style={[s.inclBox, { borderColor: '#ef444433', marginTop: 16 }]}>
                <SectionHeader label="Non inclus" color="#555" />
                {exp.exc.map((h: string, i: number) => (
                  <View key={i} style={s.bulletRow}>
                    <Text style={s.crossIcon}>✗</Text>
                    <Text style={[s.bulletTxt, { color: COLORS.muted }]}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Capacity + difficulty */}
            <View style={s.capRow}>
              {exp.minP != null && exp.maxP != null && (
                <View style={s.capPill}>
                  <Text style={s.capPillIcon}>👥</Text>
                  <Text style={s.capPillTxt}>{exp.minP}–{exp.maxP} <Text style={s.capPillSub}>pers.</Text></Text>
                </View>
              )}
              {exp.dif && (
                <View style={[s.capPill, { backgroundColor: (DIF_COLORS[exp.dif] || '#22c55e') + '18', borderColor: (DIF_COLORS[exp.dif] || '#22c55e') + '55' }]}>
                  <Text style={s.capPillIcon}>⚡</Text>
                  <Text style={[s.capPillTxt, { color: DIF_COLORS[exp.dif] || '#22c55e' }]}>{exp.dif}</Text>
                </View>
              )}
            </View>

            {/* Dates */}
            {exp.dates?.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <SectionHeader label="Prochaines dates" color={segColor} />
                <View style={s.datesGrid}>
                  {exp.dates.map((d: any, i: number) => (
                    <View key={i} style={[s.datePill, i === 0 && { borderColor: segColor }]}>
                      <Text style={[s.datePillTxt, i === 0 && { color: segColor, fontWeight: '700' }]}>
                        {typeof d === 'object' ? d.label || d.raw : d}
                      </Text>
                      {i === 0 && <Text style={[s.datePillNext, { color: segColor }]}>Prochaine</Text>}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── WHY BOOK ── */}
        <LinearGradient colors={['#0e0e0e', '#1a0509', '#0e0e0e']} style={s.whyBook}>
          <SectionHeader label="Pourquoi réserver maintenant ?" color={segColor} />
          {[
            { icon: '🔒', text: 'Annulation gratuite jusqu\'à 7 jours avant' },
            { icon: '💳', text: 'Paiement sécurisé — acompte seulement' },
            { icon: '📞', text: 'Conseiller dédié de la réservation à l\'arrivée' },
            { icon: '🏅', text: 'Satisfaction garantie ou remboursement' },
          ].map((r, i) => (
            <View key={i} style={s.whyRow}>
              <Text style={s.whyIcon}>{r.icon}</Text>
              <Text style={s.whyTxt}>{r.text}</Text>
            </View>
          ))}
        </LinearGradient>

      </ScrollView>

      {/* ── STICKY CTA ── */}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.97)', '#0e0e0e']}
        style={[s.ctaBar, { paddingBottom: insets.bottom + 14 }]}
      >
        <View>
          <Text style={[s.ctaPrice, { color: segColor }]}>{Number(exp.price).toLocaleString('fr-MA')} MAD</Text>
          <Text style={s.ctaNote}>par personne · acompte seulement</Text>
        </View>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: isClosed ? COLORS.muted : segColor }]}
          disabled={isClosed}
          onPress={() => user ? navigation.navigate('Booking', { exp }) : navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={s.ctaBtnTxt}>{isClosed ? '🔒 Complet' : '◆  Réserver'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  /* ── Gallery (Instagram portrait 4:5) ── */
  galleryWrap:  { position: 'relative', backgroundColor: '#000' },
  heroImg:      { width, height: HERO_H },
  heroFallback: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },

  /* Back button */
  backBtn:  { position: 'absolute', left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.60)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  backTxt:  { color: '#fff', fontSize: 26, lineHeight: 30, marginTop: -2 },

  /* Counter "2 / 5" */
  imgCounter:    { position: 'absolute', right: 14, backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100, zIndex: 10 },
  imgCounterTxt: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  /* Instagram dots */
  dotRow:    { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.38)' },
  dotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },

  /* Segment + promo badges */
  heroTopBadges: { position: 'absolute', bottom: 22, right: 14, alignItems: 'flex-end', gap: 6 },
  segBadge:      { paddingHorizontal: 11, paddingVertical: 5, borderRadius: RADIUS.sm },
  segBadgeTxt:   { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  goldBadge:     { backgroundColor: 'rgba(240,192,64,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#f0c040' },
  goldBadgeTxt:  { color: '#f0c040', fontSize: 11, fontWeight: '800' },

  /* Rating */
  ratingOverlay: { position: 'absolute', bottom: 22, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100 },
  ratingOvStar:  { color: '#FFD700', fontSize: 13, fontWeight: '800' },
  ratingOvRev:   { color: 'rgba(255,255,255,0.65)', fontSize: 12 },

  /* ── Thumbnail strip ── */
  thumbStrip: { backgroundColor: '#0e0e0e', paddingVertical: 4 },
  thumb:      { width: 72, height: 72, borderRadius: RADIUS.sm, overflow: 'hidden' },
  thumbImg:   { width: '100%', height: '100%' },
  thumbMore:  { ...StyleSheet.absoluteFillObject as any, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm - 1 },
  thumbMoreTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },

  /* Title */
  titleBlock: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8 },
  title:      { color: COLORS.text, fontSize: 24, fontWeight: '900', lineHeight: 32, marginBottom: 14 },
  metaChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip:   { backgroundColor: '#1e1e1e', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a2a' },
  metaChipTxt:{ color: COLORS.sub, fontSize: 12 },

  /* Price card */
  priceCard:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 16, marginBottom: 6, backgroundColor: '#161616', borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: '#242424', borderLeftWidth: 4 },
  priceEyebrow: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  priceRow:     { flexDirection: 'row', alignItems: 'baseline' },
  priceMain:    { fontSize: 32, fontWeight: '900', lineHeight: 34, includeFontPadding: false },
  priceCur:     { color: COLORS.sub, fontSize: 14, fontWeight: '700' },
  childPrice:   { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  daysChip:     { alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1 },
  daysNum:      { fontSize: 28, fontWeight: '900', lineHeight: 30, includeFontPadding: false },
  daysLbl:      { fontSize: 10, lineHeight: 13 },
  nightsLbl:    { color: COLORS.muted, fontSize: 9, lineHeight: 12 },

  /* Tabs */
  tabBar:       { flexDirection: 'row', marginHorizontal: 16, marginTop: 18, marginBottom: 4, backgroundColor: '#161616', borderRadius: RADIUS.md, padding: 4, borderWidth: 1, borderColor: '#242424' },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive:    {},
  tabTxt:       { color: COLORS.muted, fontSize: 13, fontWeight: '700', includeFontPadding: false },
  tabTxtActive: { color: '#fff' },
  tabContent:   { paddingHorizontal: 16, paddingTop: 22 },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionLine:   { width: 3, height: 18, borderRadius: 2, marginRight: 10 },
  sectionLbl:    { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  /* Overview */
  desc:          { color: COLORS.sub, fontSize: 15, lineHeight: 25, marginBottom: 24 },
  box:           { marginBottom: 22 },
  bulletRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bulletDot:     { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginRight: 12, flexShrink: 0 },
  bulletTxt:     { color: COLORS.sub, fontSize: 14, lineHeight: 22, flex: 1 },
  checkIcon:     { color: '#4ade80', fontSize: 13, fontWeight: '900', marginRight: 12, marginTop: 4, width: 14 },
  crossIcon:     { color: '#555', fontSize: 13, fontWeight: '900', marginRight: 12, marginTop: 4, width: 14 },

  /* Trust */
  trustGrid:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 22 },
  trustItem:     { flexDirection: 'row', alignItems: 'center', width: '50%', paddingVertical: 5, paddingRight: 8 },
  trustIcon:     { fontSize: 13, marginRight: 8 },
  trustLabel:    { color: COLORS.sub, fontSize: 12, fontWeight: '600', flex: 1 },

  /* Tags */
  tagsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  tag:      { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  tagTxt:   { fontSize: 12, fontWeight: '600' },

  /* Reviews */
  reviewsSection:    { marginBottom: 8 },
  reviewCard:        { backgroundColor: '#161616', borderRadius: RADIUS.lg, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#242424' },
  reviewHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reviewAvatar:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reviewAvatarTxt:   { color: '#fff', fontWeight: '900', fontSize: 16 },
  reviewName:        { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  reviewStars:       { color: '#FFD700', fontSize: 12, marginTop: 2 },
  reviewDate:        { color: COLORS.muted, fontSize: 11 },
  reviewTxt:         { color: COLORS.sub, fontSize: 14, lineHeight: 22 },
  noReviews:         { color: COLORS.muted, fontSize: 14, fontStyle: 'italic', marginVertical: 12 },
  /* Write-review form */
  reviewForm:        { marginTop: 20, backgroundColor: '#161616', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  reviewFormTitle:   { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  starPicker:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starPickerStar:    { fontSize: 34, lineHeight: 38 },
  reviewInput:       { backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontSize: 14, lineHeight: 21, minHeight: 90, textAlignVertical: 'top', fontFamily: undefined },
  reviewErrTxt:      { color: '#ef4444', fontSize: 12, marginTop: 6 },
  reviewSubmitBtn:   { marginTop: 12, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  reviewSubmitTxt:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  reviewLoginPrompt: { marginTop: 16, padding: 14, backgroundColor: '#161616', borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: '#242424' },
  reviewLoginTxt:    { color: COLORS.muted, fontSize: 13, textAlign: 'center' },

  /* Programme */
  progIntro:     { color: COLORS.muted, fontSize: 13, marginBottom: 16, fontStyle: 'italic' },
  emptyProg:     { alignItems: 'center', paddingVertical: 40 },
  emptyProgIcon: { fontSize: 48, marginBottom: 14 },
  emptyProgTxt:  { color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptyProgSub:  { color: COLORS.muted, fontSize: 13, textAlign: 'center' },

  /* Inclus */
  inclBox:       { backgroundColor: '#161616', borderRadius: RADIUS.lg, padding: 18, borderWidth: 1 },
  capRow:        { flexDirection: 'row', marginTop: 20, gap: 10 },
  capPill:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: RADIUS.lg, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  capPillIcon:   { fontSize: 14, marginRight: 6 },
  capPillTxt:    { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  capPillSub:    { color: COLORS.muted, fontSize: 12, fontWeight: '400' },
  datesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  datePill:      { backgroundColor: '#161616', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  datePillTxt:   { color: COLORS.text, fontSize: 13 },
  datePillNext:  { fontSize: 10, fontWeight: '700', marginTop: 2 },

  /* Why book */
  whyBook:    { marginHorizontal: 16, marginTop: 28, borderRadius: RADIUS.lg, padding: 22, borderWidth: 1, borderColor: '#242424' },
  whyRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  whyIcon:    { fontSize: 20, width: 26 },
  whyTxt:     { color: COLORS.sub, fontSize: 14, flex: 1, lineHeight: 21 },

  /* CTA */
  ctaBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 28 },
  ctaPrice:  { fontSize: 22, fontWeight: '900', includeFontPadding: false },
  ctaNote:   { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  ctaBtn:    { paddingHorizontal: 26, paddingVertical: 14, borderRadius: RADIUS.pill },
  ctaBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});

/* ── Programme accordion ─────────────────────────────────────────────────── */
const prog = StyleSheet.create({
  wrap:      { backgroundColor: '#161616', borderRadius: RADIUS.lg, marginBottom: 10, borderWidth: 1, borderColor: '#242424', overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dayBadge:  { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayNum:    { color: '#fff', fontSize: 17, fontWeight: '900', lineHeight: 20 },
  dayOf:     { color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  dayTitle:  { color: COLORS.text, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  chevron:   { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  body:          { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#242424' },
  desc:          { color: COLORS.sub, fontSize: 14, lineHeight: 22, marginBottom: 10 },
  actRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  actDot:        { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  actTxt:        { color: COLORS.sub, fontSize: 13, lineHeight: 20, flex: 1 },
  /* day image */
  dayImgWrap:    { position: 'relative', marginHorizontal: -14, marginBottom: 12, marginTop: 10, height: 180, overflow: 'hidden' },
  dayImg:        { width: '100%', height: '100%' },
  dayImgBadge:   { position: 'absolute', bottom: 12, left: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  dayImgBadgeNum:{ color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  dayImgBadgeOf: { color: 'rgba(255,255,255,0.65)', fontSize: 8 },
});

/* ── Rating breakdown ────────────────────────────────────────────────────── */
const rb = StyleSheet.create({
  wrap:     { flexDirection: 'row', gap: 16, backgroundColor: '#161616', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#242424', marginBottom: 16 },
  left:     { alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  score:    { color: COLORS.text, fontSize: 38, fontWeight: '900', includeFontPadding: false },
  stars:    { color: '#FFD700', fontSize: 14, marginTop: 4 },
  revCount: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  right:    { flex: 1, gap: 6 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLbl:   { color: COLORS.muted, fontSize: 11, width: 22 },
  barBg:    { flex: 1, height: 5, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  rowPct:   { color: COLORS.muted, fontSize: 10, width: 22, textAlign: 'right' },
});
