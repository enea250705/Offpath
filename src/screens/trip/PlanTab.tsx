// Offpath — Plan Tab (rebuilt)
import React, { useState, useEffect } from 'react';
import * as StoreReview from 'expo-store-review';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
import { colors } from '../../theme';
import { ItineraryDay, ItineraryMoment } from '../../types';
import { getCityPhoto } from '../../services/pexels';
import { hasRequestedReview, markReviewRequested } from '../../services/storage';
import { BlurView } from 'expo-blur';
import LiquidGlassCard from '../../components/LiquidGlassCard';

const { width: SCREEN_W } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ───────────────────────────────────────────────

function StarRating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={s.ratingRow}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name={i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline'}
          size={11}
          color="#F59E0B"
        />
      ))}
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
      {count ? <Text style={s.reviewCount}> ({count})</Text> : null}
    </View>
  );
}

function PriceLevel({ level }: { level?: number }) {
  if (!level) return null;
  return (
    <Text style={s.priceLevel}>
      {'€'.repeat(level)}
      <Text style={s.priceLevelDim}>{'€'.repeat(4 - level)}</Text>
    </Text>
  );
}

// ─── Moment Card ───────────────────────────────────────────

function MomentCard({
  moment,
  accentColor,
  index,
  isLast,
  isLocked,
  onUnlock,
}: {
  moment: ItineraryMoment;
  accentColor: string;
  index: number;
  isLast: boolean;
  isLocked?: boolean;
  onUnlock?: () => void;
}) {
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
    <LiquidGlassCard style={s.momentCard}>
      {/* Left accent bar */}
      <View style={[s.momentAccentBar, { backgroundColor: accentColor }]} />

      {/* Main content */}
      <View style={s.momentContent}>

        {/* ── Header row: number · time · category / duration ── */}
        <View style={s.momentHeader}>
          <View style={[s.stopNum, { backgroundColor: accentColor }]}>
            <Text style={s.stopNumText}>{index + 1}</Text>
          </View>
          <View style={[s.timePill, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name="time-outline" size={11} color={accentColor} />
            <Text style={[s.timePillText, { color: accentColor }]}>{moment.timeLabel}</Text>
          </View>
          <View style={s.headerSpacer} />
          {moment.duration ? (
            <View style={s.durationBadge}>
              <Ionicons name="hourglass-outline" size={10} color={colors.textMuted} />
              <Text style={s.durationText}>{moment.duration}</Text>
            </View>
          ) : null}
          {moment.category ? (
            <View style={s.categoryBadge}>
              <Text style={s.categoryText}>{moment.category.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Body: text left + optional photo right ── */}
        <View style={s.momentBody}>
          <View style={[s.momentBodyLeft, moment.photoUrl ? { flex: 1, marginRight: 12 } : { flex: 1 }]}>
            <Text style={s.momentTitle}>{moment.title}</Text>
            {moment.subtitle ? (
              <Text style={s.momentSubtitle}>{moment.subtitle}</Text>
            ) : null}

            {/* Meta row */}
            <View style={s.metaRow}>
              <StarRating rating={moment.rating} count={moment.reviewCount} />
              <PriceLevel level={moment.priceLevel} />
            </View>

            {/* Location */}
            {(moment.neighborhood || moment.address) ? (
              <View style={s.infoRow}>
                <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                <Text style={s.infoRowText} numberOfLines={1}>
                  {moment.neighborhood || moment.address}
                </Text>
              </View>
            ) : null}

            {/* Open hours */}
            {moment.openHours ? (
              <View style={s.infoRow}>
                <Ionicons name="time-outline" size={11} color="#22C55E" />
                <Text style={[s.infoRowText, { color: '#22C55E' }]} numberOfLines={1}>
                  {moment.openHours}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Thumbnail */}
          {moment.photoUrl ? (
            <Image
              source={{ uri: moment.photoUrl }}
              style={s.momentThumb}
              resizeMode="cover"
            />
          ) : null}
        </View>

        {/* ── Rationale ── */}
        {moment.rationale ? (
          <Text style={s.momentRationale}>{moment.rationale}</Text>
        ) : null}

        {/* ── Transit / Avoid chips ── */}
        {(moment.transitNote || moment.avoidNote) ? (
          <View style={s.chips}>
            {moment.transitNote ? (
              <View style={[s.chip, { borderColor: `${accentColor}35`, backgroundColor: `${accentColor}0D` }]}>
                <Ionicons name="walk-outline" size={12} color={accentColor} />
                <Text style={[s.chipText, { color: `${accentColor}CC` }]}>{moment.transitNote}</Text>
              </View>
            ) : null}
            {moment.avoidNote ? (
              <View style={[s.chip, s.avoidChip]}>
                <Ionicons name="alert-circle-outline" size={12} color="#F87171" />
                <Text style={[s.chipText, { color: '#F87171BB' }]}>{moment.avoidNote}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Maps button ── */}
        <TouchableOpacity
          style={[s.mapsBtn, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}10` }]}
          onPress={openInMaps}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={14} color={accentColor} />
          <Text style={[s.mapsBtnText, { color: accentColor }]}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {/* ── Locked overlay ── */}
      {isLocked && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onUnlock}
        >
          {/* Solid dark backing — prevents ANY content bleed-through on hold */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(10,10,14,0.75)' }]} />
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={s.lockedOverlay}>
            <View style={[s.lockIconWrap, { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}18` }]}>
              <Ionicons name="lock-closed" size={20} color={accentColor} />
            </View>
            <Text style={s.lockedTitle}>Hidden stop</Text>
            <Text style={s.lockedSub}>Unlock to reveal this destination</Text>
            <View style={[s.unlockBtn, { backgroundColor: accentColor }]}>
              <Text style={s.unlockBtnText}>Unlock Full Trip</Text>
            </View>
          </View>
        </Pressable>
      )}
    </LiquidGlassCard>
  );
}

// ─── Connector between moment cards ────────────────────────

function MomentConnector({ color }: { color: string }) {
  return (
    <View style={s.connectorWrap}>
      <View style={[s.connectorLine, { backgroundColor: `${color}30` }]} />
    </View>
  );
}

// ─── Day Card ──────────────────────────────────────────────

function DayCard({
  day,
  accentColor,
  isExpanded,
  onToggle,
  isPremium,
  onUnlock,
}: {
  day: ItineraryDay;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  isPremium: boolean;
  onUnlock: () => void;
}) {
  const stopCount = day.moments?.length || 0;

  return (
    <LiquidGlassCard style={s.dayCard}>

      {/* ── Header ── */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        <View style={s.dayHeader}>
          {/* Left stripe */}
          <View style={[s.dayStripe, { backgroundColor: accentColor }]} />

          {/* Day badge */}
          <View style={s.dayBadgeWrap}>
            <Text style={[s.dayBadgeNum, { color: accentColor }]}>{day.dayNumber}</Text>
            <Text style={s.dayBadgeLabel}>DAY</Text>
          </View>

          {/* Title + mood */}
          <View style={s.dayInfo}>
            <Text style={s.dayTitle} numberOfLines={2}>{day.title}</Text>
            <View style={s.dayMetaRow}>
              {day.mood ? (
                <View style={[s.moodPill, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}35` }]}>
                  <Text style={[s.moodText, { color: accentColor }]}>{day.mood}</Text>
                </View>
              ) : null}
              <Text style={s.stopCountText}>{stopCount} stop{stopCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Chevron */}
          <View style={[s.chevron, isExpanded && { backgroundColor: `${accentColor}20` }]}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={isExpanded ? accentColor : 'rgba(255,255,255,0.25)'}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Collapsed preview ── */}
      {!isExpanded && stopCount > 0 && (
        <View style={s.collapsedList}>
          {day.moments.map((m, i) => {
            const isLocked = !isPremium && stopCount > 2 && i === stopCount - 1;
            if (isLocked) {
              return (
                <TouchableOpacity key={i} style={s.previewRow} onPress={onUnlock} activeOpacity={0.7}>
                  <Ionicons name="lock-closed" size={10} color={accentColor} style={{ opacity: 0.7 }} />
                  <Text style={[s.previewTime, { opacity: 0.3 }]}>{'??:??'}</Text>
                  <Text style={[s.previewName, { color: `${accentColor}55`, fontStyle: 'italic' }]} numberOfLines={1}>
                    Unlock to reveal
                  </Text>
                  <Ionicons name="chevron-forward" size={11} color={`${accentColor}55`} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              );
            }
            return (
              <View key={i} style={s.previewRow}>
                <View style={[s.previewDot, { backgroundColor: `${accentColor}60` }]} />
                <Text style={s.previewTime}>{m.timeLabel}</Text>
                <Text style={s.previewName} numberOfLines={1}>{m.title}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Expanded content ── */}
      {isExpanded && (
        <View style={s.expandedContent}>
          {day.summary ? (
            <View style={s.daySummaryBox}>
              <Ionicons name="sparkles" size={14} color={accentColor} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={s.daySummaryText}>{day.summary}</Text>
            </View>
          ) : null}

          <View style={s.momentsList}>
            {day.moments?.map((moment, idx) => {
              const isLocked = !isPremium && stopCount > 2 && idx === stopCount - 1;
              return (
                <React.Fragment key={moment.id || idx}>
                  <MomentCard
                    moment={moment}
                    accentColor={accentColor}
                    index={idx}
                    isLast={idx === stopCount - 1}
                    isLocked={isLocked}
                    onUnlock={onUnlock}
                  />
                  {idx < stopCount - 1 && <MomentConnector color={accentColor} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      )}
    </LiquidGlassCard>
  );
}

// ─── Main PlanTab ──────────────────────────────────────────

export default function PlanTab() {
  const { state, actions } = useApp();
  const plan = state.plan;
  const isPremium = state.isPremium;
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set([plan?.fullDays?.[0]?.id || '0']),
  );
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);

  React.useEffect(() => {
    if (!plan?.destinationCity) return;
    getCityPhoto(plan.destinationCity).then(setHeroPhoto);
  }, [plan?.destinationCity]);

  // Request App Store review once, ~3s after the user first sees their itinerary
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      const alreadyAsked = await hasRequestedReview();
      if (alreadyAsked) return;
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) return;
      timer = setTimeout(async () => {
        await StoreReview.requestReview();
        await markReviewRequested();
      }, 3000);
    })();
    return () => clearTimeout(timer);
  }, []);

  if (!plan) return null;

  const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];
  const totalPlaces = days.reduce((sum, d) => sum + (d.moments?.length || 0), 0);

  const toggleDay = (dayId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          {heroPhoto && (
            <Image source={{ uri: heroPhoto }} style={s.heroImage} resizeMode="cover" />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(13,13,15,0.45)', 'rgba(13,13,15,0.92)', '#0D0D0F']}
            locations={[0, 0.35, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroContent}>
            <Text style={s.heroCountry}>{plan.destinationCountry?.toUpperCase()}</Text>
            <Text style={s.heroCity}>{plan.destinationCity}</Text>
            {plan.shareLine ? (
              <Text style={s.heroShareLine}>{plan.shareLine}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Overview card ── */}
        <LiquidGlassCard style={s.overviewCard} intensity={28}>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="calendar" size={18} color={colors.accent} />
              </View>
              <Text style={s.statValue}>{days.length}</Text>
              <Text style={s.statLabel}>Days</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: '#A78BFA18' }]}>
                <Ionicons name="location" size={18} color="#A78BFA" />
              </View>
              <Text style={s.statValue}>{totalPlaces}</Text>
              <Text style={s.statLabel}>Places</Text>
            </View>
          </View>

          {plan.intro ? (
            <View style={s.introBox}>
              <Ionicons name="chatbubble-ellipses" size={15} color={colors.accent} style={s.introIcon} />
              <Text style={s.introText}>{plan.intro}</Text>
            </View>
          ) : null}
        </LiquidGlassCard>

        {/* ── Section divider ── */}
        <View style={s.sectionDivider}>
          <View style={s.sectionLine} />
          <Text style={s.sectionLabel}>YOUR ITINERARY</Text>
          <View style={s.sectionLine} />
        </View>

        {/* ── Day cards ── */}
        {days.map((day, idx) => (
          <DayCard
            key={day.id || idx}
            day={day}
            accentColor={colors.dayAccents[idx % colors.dayAccents.length]}
            isExpanded={expandedDays.has(day.id || idx.toString())}
            onToggle={() => toggleDay(day.id || idx.toString())}
            isPremium={isPremium}
            onUnlock={() => actions.setPhase('preview')}
          />
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Hero
  hero: {
    height: 300,
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: 300,
  },
  heroContent: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    zIndex: 2,
  },
  heroCountry: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCity: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroShareLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  // Overview card
  overviewCard: {
    marginHorizontal: 16,
    marginTop: -14,
    borderRadius: 24,
    padding: 20,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  introBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,115,22,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.15)',
    padding: 14,
    alignItems: 'flex-start',
  },
  introIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  introText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Section divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 30,
    marginBottom: 18,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    paddingHorizontal: 14,
  },

  // ─── Day Card ─────────────────────────────────────────────

  dayCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 16,
  },
  dayStripe: {
    width: 4,
    height: 56,
    borderRadius: 4,
    marginRight: 14,
  },
  dayBadgeWrap: {
    alignItems: 'center',
    marginRight: 14,
    minWidth: 36,
  },
  dayBadgeNum: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 28,
  },
  dayBadgeLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
    lineHeight: 22,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stopCountText: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  // Collapsed preview
  collapsedList: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  previewTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '700',
    width: 44,
  },
  previewName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Expanded
  expandedContent: {
    paddingBottom: 16,
  },
  daySummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  daySummaryText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  momentsList: {
    paddingHorizontal: 14,
    gap: 0,
  },

  // Connector between cards
  connectorWrap: {
    alignItems: 'flex-start',
    paddingLeft: 19,
  },
  connectorLine: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },

  // ─── Moment Card ──────────────────────────────────────────

  momentCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  momentAccentBar: {
    width: 3,
    borderRadius: 3,
    margin: 14,
    marginRight: 0,
  },
  momentContent: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
    gap: 0,
  },

  // Header row
  momentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  stopNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  durationText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Body
  momentBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  momentBodyLeft: {},
  momentTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 3,
    lineHeight: 22,
  },
  momentSubtitle: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  reviewCount: {
    color: colors.textMuted,
    fontSize: 10,
  },
  priceLevel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  priceLevelDim: {
    color: 'rgba(255,255,255,0.12)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  infoRowText: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  momentThumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Rationale
  momentRationale: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },

  // Chips
  chips: {
    gap: 7,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
  },
  avoidChip: {
    borderColor: 'rgba(248,113,113,0.25)',
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  chipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Maps button
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Locked overlay
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  },
  lockIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lockedSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  unlockBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginTop: 4,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
