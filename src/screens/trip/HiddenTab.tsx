// Offpath — Hidden Tab (Hidden Gems)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  Linking,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { HiddenPlace } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FREE_HIDDEN_COUNT = 2;

function HiddenPlaceCard({ place }: { place: HiddenPlace }) {
  const [expanded, setExpanded] = useState(false);

  const openInMaps = () => {
    if (place.googleMapsUrl) {
      Linking.openURL(place.googleMapsUrl);
    } else if (place.coordinate) {
      const { latitude, longitude } = place.coordinate;
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      });
      Linking.openURL(url!);
    }
  };

  return (
    <TouchableOpacity
      style={styles.placeCard}
      activeOpacity={0.8}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
      }}
    >
      <LinearGradient
        colors={['#2d1b0e', '#1a1208', '#18181B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.placeCardBg}
      >
        <Text style={styles.placeName}>{place.name}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.locationText}>{place.neighborhood}</Text>
        </View>

        <View style={styles.vibeBadge}>
          <Text style={styles.vibeBadgeText}>{place.vibe}</Text>
        </View>

        <Text style={styles.placeNote}>{place.note}</Text>

        <View style={styles.bestTimeRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.bestTimeText}>{place.bestTime}</Text>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.expandedContent}>
            {place.address ? (
              <View style={styles.addressRow}>
                <Ionicons name="map-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.addressText}>{place.address}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
              <Ionicons name="navigate-circle" size={16} color={colors.white} />
              <Text style={styles.mapsBtnText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HiddenTab() {
  const { state, actions } = useApp();
  const plan = state.plan;
  const isPremium = state.isPremium;

  if (!plan) return null;

  const places = plan.hiddenPlaces ? plan.hiddenPlaces.slice(0, 4) : [];

  const visiblePlaces = isPremium ? places : places.slice(0, FREE_HIDDEN_COUNT);
  
  // Always exactly what's left over from 4 depending on premium status
  const lockedCount = isPremium ? 0 : Math.max(0, 4 - visiblePlaces.length);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>HIDDEN GEMS</Text>
          </View>
          <Text style={styles.headerTitle}>Off the map</Text>
          <Text style={styles.headerSubtitle}>
            Places only locals know about
          </Text>
        </View>

        {/* Fallback if entirely empty correctly stylized */}
        {places.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No secrets here</Text>
            <Text style={styles.emptyStateText}>
              We couldn't uncover any local hidden gems for this specific itinerary. Try a new city or another travel style to unlock off-the-grid spots!
            </Text>
          </View>
        ) : (
          <>
            {/* Hidden Place Cards */}
            {visiblePlaces.map((place, idx) => (
              <HiddenPlaceCard key={place.id || idx} place={place} />
            ))}

            {/* Locked Cards */}
            {lockedCount > 0 &&
              Array.from({ length: lockedCount }).map((_, idx) => (
                <View key={`locked-${idx}`} style={styles.lockedCard}>
                  <View style={styles.lockedCardInner}>
                    <Ionicons name="lock-closed" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={styles.lockedText}>Hidden gem</Text>
                    <Text style={styles.lockedSubtext}>Unlock with Trip Pass</Text>
                  </View>
                </View>
              ))}

            {/* Upgrade Banner (if free) */}
            {!isPremium && (
              <TouchableOpacity
                style={styles.upgradeBanner}
                onPress={() => actions.setPhase('preview')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#F97316', '#FB923C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeBannerGradient}
                >
                  <Text style={styles.upgradeText}>
                    Unlock all hidden spots with a Trip Pass
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  headerSection: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  headerBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.heavy,
    marginBottom: 6,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
  },

  // Empty State
  emptyState: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Place Card
  placeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  placeCardBg: {
    padding: 22,
    borderRadius: radius.xl,
  },
  placeName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  vibeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  vibeBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  placeNote: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
    marginBottom: 12,
  },
  bestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  bestTimeText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Expanded Content
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 12,
  },
  mapsBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // Locked
  lockedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  lockedCardInner: {
    padding: 28,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  lockedText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  lockedSubtext: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },

  // Upgrade
  upgradeBanner: {
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 8,
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
  },
  upgradeText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  upgradeArrow: {
    color: colors.white,
    fontSize: 20,
    marginLeft: 8,
  },
});
