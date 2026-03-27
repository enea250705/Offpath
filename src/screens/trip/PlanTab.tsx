// Offpath — Plan Tab (Full Itinerary with real places, ratings, neighborhoods)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius } from '../../theme';
import { ItineraryDay, ItineraryMoment } from '../../types';
import { getCityPhoto } from '../../services/pexels';

const { width: SCREEN_W } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Star rating display ───────────────────────────────────
function StarRating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name={i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline'}
          size={12}
          color="#F59E0B"
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      {count ? <Text style={styles.reviewCount}>({count})</Text> : null}
    </View>
  );
}

// ─── Price level display ───────────────────────────────────
function PriceLevel({ level }: { level?: number }) {
  if (!level) return null;
  return (
    <Text style={styles.priceLevel}>
      {'€'.repeat(level)}
      <Text style={styles.priceLevelDim}>{'€'.repeat(4 - level)}</Text>
    </Text>
  );
}

// ─── Category badge ────────────────────────────────────────
function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  return (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryText}>{category}</Text>
    </View>
  );
}

// ─── Moment Row (each stop in the day) ─────────────────────
function MomentRow({
  moment,
  accentColor,
  isLast,
}: {
  moment: ItineraryMoment;
  accentColor: string;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const openInMaps = () => {
    if (moment.googleMapsUrl) {
      Linking.openURL(moment.googleMapsUrl);
    } else if (moment.coordinate) {
      const { latitude, longitude } = moment.coordinate;
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      });
      Linking.openURL(url!);
    }
  };

  return (
    <View style={styles.momentRow}>
      {/* Timeline */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <TouchableOpacity
        style={styles.momentContent}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        {/* Time + Duration */}
        <View style={styles.timeRow}>
          <Text style={[styles.momentTime, { color: accentColor }]}>
            {moment.timeLabel}
          </Text>
          {moment.duration && (
            <Text style={styles.durationTag}>· {moment.duration}</Text>
          )}
        </View>

        {/* Place name + category */}
        <View style={styles.titleRow}>
          <Text style={styles.momentTitle}>{moment.title}</Text>
          <CategoryBadge category={moment.category} />
        </View>

        {/* Subtitle (short descriptor) */}
        {moment.subtitle ? (
          <Text style={styles.momentSubtitle}>{moment.subtitle}</Text>
        ) : null}

        {/* Rating + Price */}
        <View style={styles.metaRow}>
          <StarRating rating={moment.rating} count={moment.reviewCount} />
          <PriceLevel level={moment.priceLevel} />
        </View>

        {/* Neighborhood + Address */}
        {(moment.neighborhood || moment.address) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={expanded ? 3 : 1}>
              {moment.neighborhood
                ? `${moment.neighborhood}${moment.address ? ' · ' + moment.address : ''}`
                : moment.address}
            </Text>
          </View>
        )}

        {/* AI narrative — what to notice */}
        <Text style={styles.momentRationale} numberOfLines={expanded ? 20 : 2}>
          {moment.rationale}
        </Text>

        {/* Expanded details */}
        {expanded && (
          <View style={styles.expandedSection}>
            {/* Opening hours */}
            {moment.openHours && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{moment.openHours}</Text>
              </View>
            )}

            {/* Transit note — how to get to next stop */}
            {moment.transitNote ? (
              <View style={styles.transitRow}>
                <Ionicons name="walk-outline" size={14} color={accentColor} />
                <Text style={styles.transitText}>{moment.transitNote}</Text>
              </View>
            ) : null}

            {/* Avoid note — tourist trap warning */}
            {moment.avoidNote ? (
              <View style={styles.avoidRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                <Text style={styles.avoidText}>{moment.avoidNote}</Text>
              </View>
            ) : null}

            {/* Open in Maps button */}
            <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
              <Ionicons name="navigate-outline" size={14} color={accentColor} />
              <Text style={[styles.mapsBtnText, { color: accentColor }]}>
                Open in Maps
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tap hint */}
        <Text style={styles.tapHint}>
          {expanded ? 'Tap to collapse' : 'Tap for details'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Day Card ──────────────────────────────────────────────
function DayCard({
  day,
  accentColor,
  isExpanded,
  onToggle,
}: {
  day: ItineraryDay;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.dayCard}>
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.dayBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.dayBadgeText}>{day.dayNumber}</Text>
        </View>
        <View style={styles.dayInfo}>
          <Text style={styles.dayTitle}>{day.title}</Text>
          <View style={styles.dayMetaRow}>
            <Text style={styles.dayMood}>{day.mood}</Text>
            {day.neighborhood && (
              <View style={styles.dayNeighborhood}>
                <Ionicons name="location" size={11} color={colors.textMuted} />
                <Text style={styles.dayNeighborhoodText}>{day.neighborhood}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Day summary (always visible) */}
      {day.summary && !isExpanded && (
        <Text style={styles.daySummary} numberOfLines={2}>{day.summary}</Text>
      )}

      {/* Expanded moments */}
      {isExpanded && (
        <View style={styles.momentsContainer}>
          {day.summary && (
            <Text style={styles.daySummaryExpanded}>{day.summary}</Text>
          )}
          {day.moments?.map((moment, idx) => (
            <MomentRow
              key={moment.id || idx}
              moment={moment}
              accentColor={accentColor}
              isLast={idx === (day.moments?.length || 0) - 1}
            />
          ))}
          <View style={styles.momentCount}>
            <Text style={styles.momentCountText}>
              {day.moments?.length || 0} stops
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main PlanTab ──────────────────────────────────────────
export default function PlanTab() {
  const { state } = useApp();
  const plan = state.plan;
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set([plan?.fullDays?.[0]?.id || '0']),
  );
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);

  // Fetch hero photo
  React.useEffect(() => {
    if (!plan?.destinationCity) return;
    getCityPhoto(plan.destinationCity).then(setHeroPhoto);
  }, [plan?.destinationCity]);

  if (!plan) return null;

  const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];

  const toggleDay = (dayId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const totalPlaces = days.reduce((sum, d) => sum + (d.moments?.length || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Section ────────────────────────────── */}
        <View style={styles.heroSection}>
          {/* Background photo */}
          {heroPhoto && (
            <Image
              source={{ uri: heroPhoto }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          {/* Gradient overlay */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(13,17,23,0.4)',
              'rgba(13,17,23,0.92)',
              colors.bg,
            ]}
            locations={[0, 0.35, 0.7, 1]}
            style={styles.heroGradient}
          />

          {/* Hero content */}
          <View style={styles.heroContent}>
            <Text style={styles.countryTag}>
              {plan.destinationCountry?.toUpperCase()}
            </Text>
            <Text style={styles.cityName}>{plan.destinationCity}</Text>
            {plan.shareLine ? (
              <Text style={styles.shareLine}>{plan.shareLine}</Text>
            ) : null}
          </View>
        </View>

        {/* ─── Trip Overview Card ──────────────────────── */}
        <View style={styles.overviewCard}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name="calendar" size={18} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{days.length}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name="location" size={18} color="#A78BFA" />
              </View>
              <Text style={styles.statValue}>{totalPlaces}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name="diamond" size={18} color="#34D399" />
              </View>
              <Text style={styles.statValue}>{plan.hiddenPlaces?.length || 0}</Text>
              <Text style={styles.statLabel}>Hidden Gems</Text>
            </View>
          </View>

          {/* Intro narrative */}
          {plan.intro ? (
            <View style={styles.introSection}>
              <View style={styles.introQuoteMark}>
                <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
              </View>
              <Text style={styles.introText}>{plan.intro}</Text>
            </View>
          ) : null}
        </View>

        {/* ─── Section label ───────────────────────────── */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabelText}>YOUR ITINERARY</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Day Cards */}
        {days.map((day, idx) => (
          <DayCard
            key={day.id || idx}
            day={day}
            accentColor={
              colors.dayAccents[idx % colors.dayAccents.length]
            }
            isExpanded={expandedDays.has(day.id || idx.toString())}
            onToggle={() => toggleDay(day.id || idx.toString())}
          />
        ))}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Hero Section
  heroSection: {
    height: 320,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: 320,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 320,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 2,
  },
  countryTag: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cityName: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  shareLine: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Overview Card
  overviewCard: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Intro inside Overview
  introSection: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
  },
  introQuoteMark: {
    marginRight: 12,
    marginTop: 2,
  },
  introText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontStyle: 'italic',
  },

  // Section Label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 20,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionLabelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 16,
  },

  // Day Card
  dayCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
  },
  dayBadge: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  dayBadgeText: {
    color: colors.white, fontSize: 16, fontWeight: '800',
  },
  dayInfo: { flex: 1 },
  dayTitle: {
    color: colors.textPrimary, fontSize: 16, fontWeight: '700',
  },
  dayMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3,
  },
  dayMood: {
    color: colors.textMuted, fontSize: 13,
  },
  dayNeighborhood: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  dayNeighborhoodText: {
    color: colors.textMuted, fontSize: 12,
  },
  daySummary: {
    color: colors.textMuted, fontSize: 13, lineHeight: 19,
    paddingHorizontal: 18, paddingBottom: 14, marginTop: -4,
  },
  daySummaryExpanded: {
    color: colors.textSecondary, fontSize: 14, lineHeight: 21,
    marginBottom: 18, fontStyle: 'italic',
  },

  // Moments
  momentsContainer: { paddingHorizontal: 18, paddingBottom: 18 },
  momentRow: { flexDirection: 'row', marginBottom: 16 },
  timelineCol: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  momentContent: { flex: 1, marginLeft: 12 },

  // Time + duration
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  momentTime: { fontSize: 13, fontWeight: '600' },
  durationTag: { color: colors.textMuted, fontSize: 12, marginLeft: 6 },

  // Title + category
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  momentTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  momentSubtitle: {
    color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 4,
  },

  // Rating + price
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#F59E0B', fontSize: 12, fontWeight: '600', marginLeft: 2 },
  reviewCount: { color: colors.textMuted, fontSize: 11 },
  priceLevel: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  priceLevelDim: { color: 'rgba(255,255,255,0.15)' },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { color: colors.textMuted, fontSize: 12, flex: 1 },

  // Rationale (AI narrative)
  momentRationale: {
    color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 4,
  },

  // Expanded details
  expandedSection: { marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  transitRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 10, marginBottom: 6,
  },
  transitText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  avoidRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10,
    padding: 10, marginBottom: 6,
  },
  avoidText: { color: '#F87171', fontSize: 12, flex: 1, lineHeight: 18 },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    alignSelf: 'flex-start',
  },
  mapsBtnText: { fontSize: 13, fontWeight: '600' },
  tapHint: { color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 2 },

  // Moment count
  momentCount: {
    alignItems: 'center', paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4,
  },
  momentCountText: { color: colors.textMuted, fontSize: 12 },
});
