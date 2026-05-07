// Offpath — You Tab (Account / Profile)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { TripPlan } from '../../types';
import { getCityPhoto } from '../../services/pexels';
import LiquidGlassCard from '../../components/LiquidGlassCard';

const PREVIEW_COUNT = 3;

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 32;

const STYLE_EMOJI: Record<string, string> = {
  slow: '🌿',
  food: '🍜',
  culture: '🏛️',
  nightlife: '🌙',
};

export default function YouTab() {
  const navigation = useNavigation<any>();
  const { state, actions } = useApp();
  const user = state.user;
  const plan = state.plan;
  const isPremium = state.isPremium;
  const tripHistory = state.tripHistory ?? [];
  const previewHistory = tripHistory.slice(0, PREVIEW_COUNT);

  const [historyPhotos, setHistoryPhotos] = useState<Record<string, string | null>>({});

  // Fetch photos only for the 3 preview cards
  useEffect(() => {
    previewHistory.forEach((trip) => {
      const key = trip.id ?? trip.destinationCity;
      if (historyPhotos[key] !== undefined) return;
      getCityPhoto(trip.destinationCity).then((url) => {
        setHistoryPhotos((prev) => ({ ...prev, [key]: url }));
      });
    });
  }, [tripHistory]);

  const getInitials = () => {
    if (!user?.displayName) return '?';
    const parts = user.displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'This will clear all your data and return to onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => actions.logout() },
      ],
    );
  };

  const handleNewTrip = () => {
    Alert.alert(
      'Plan a new trip?',
      'Your current trip will be saved to your travel history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: "Let's go", onPress: () => actions.startNewTrip() },
      ],
    );
  };

  const formatTripDate = (createdAt?: string) => {
    if (!createdAt) return '';
    return new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  const renderHistoryCard = (trip: TripPlan, index: number) => {
    const key = trip.id ?? trip.destinationCity;
    const photo = historyPhotos[key];
    const days = trip.fullDays?.length || trip.previewDays?.length || 0;
    const emoji = STYLE_EMOJI[trip.travelStyle ?? ''] ?? '✈️';
    const date = formatTripDate(trip.createdAt);

    const cardContent = (
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.45, 1]}
        style={styles.historyCardGradient}
      >
        {/* Top row */}
        <View style={styles.historyCardTop}>
          <View style={styles.historyStyleBadge}>
            <Text style={styles.historyStyleEmoji}>{emoji}</Text>
            {trip.travelStyle && (
              <Text style={styles.historyStyleText}>{trip.travelStyle}</Text>
            )}
          </View>
          {date ? <Text style={styles.historyCardDate}>{date}</Text> : null}
        </View>

        {/* Bottom content */}
        <View style={styles.historyCardBottom}>
          <Text style={styles.historyCardCity}>{trip.destinationCity}</Text>
          <Text style={styles.historyCardCountry}>{trip.destinationCountry}</Text>
          <View style={styles.historyCardMeta}>
            {days > 0 && (
              <View style={styles.historyMetaPill}>
                <Text style={styles.historyMetaPillText}>{days} days</Text>
              </View>
            )}
            {trip.travelerGroup && (
              <View style={styles.historyMetaPill}>
                <Text style={styles.historyMetaPillText}>{trip.travelerGroup}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    );

    if (photo) {
      return (
        <ImageBackground
          key={key}
          source={{ uri: photo }}
          style={styles.historyCard}
          imageStyle={styles.historyCardImage}
        >
          {cardContent}
        </ImageBackground>
      );
    }

    // Fallback gradient when no photo yet
    return (
      <LinearGradient
        key={key}
        colors={['#1a1208', '#2d1b0e', '#3d2510']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.historyCard}
      >
        {cardContent}
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>You</Text>
        </View>

        {/* Profile */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={['#F97316', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </LinearGradient>

          <Text style={styles.userName}>{user?.displayName || 'Traveler'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✦ Trip Pass active</Text>
            </View>
          )}
        </View>

        {/* Current Trip */}
        {plan && (
          <LiquidGlassCard style={styles.tripCard} intensity={25}>
            <View style={styles.tripCardHeader}>
              <Text style={styles.tripCardLabel}>CURRENT TRIP</Text>
            </View>
            <Text style={styles.tripCity}>{plan.destinationCity}</Text>
            <Text style={styles.tripCountry}>{plan.destinationCountry}</Text>
            <View style={styles.tripMeta}>
              <Text style={styles.tripDays}>
                {plan.fullDays?.length || plan.previewDays?.length || 0} days
              </Text>
            </View>
          </LiquidGlassCard>
        )}

        {/* New Trip Button */}
        <TouchableOpacity
          style={styles.newTripButton}
          onPress={handleNewTrip}
          activeOpacity={0.7}
        >
          <Text style={styles.newTripIcon}>＋</Text>
          <Text style={styles.newTripText}>Plan a new trip</Text>
        </TouchableOpacity>

        {/* Travel History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historySectionTitle}>TRAVEL HISTORY</Text>
            {tripHistory.length > PREVIEW_COUNT && (
              <TouchableOpacity onPress={() => navigation.navigate('History')} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>See all {tripHistory.length}</Text>
              </TouchableOpacity>
            )}
          </View>

          {tripHistory.length === 0 ? (
            <LiquidGlassCard style={styles.historyEmpty} intensity={20}>
              <Text style={styles.historyEmptyIcon}>🗺️</Text>
              <Text style={styles.historyEmptyText}>No past trips yet. Your adventures will show up here.</Text>
            </LiquidGlassCard>
          ) : (
            <>
              {previewHistory.map((trip, i) => renderHistoryCard(trip, i))}
              {tripHistory.length > PREVIEW_COUNT && (
                <LiquidGlassCard
                  style={styles.seeAllButton}
                  intensity={20}
                  onPress={() => navigation.navigate('History')}
                >
                  <Text style={styles.seeAllButtonText}>See all {tripHistory.length} trips</Text>
                  <Text style={styles.seeAllArrow}>→</Text>
                </LiquidGlassCard>
              )}
            </>
          )}
        </View>

        {/* Upgrade (if not premium) */}
        {!isPremium && (
          <LiquidGlassCard
            style={styles.upgradeCard}
            intensity={25}
            onPress={() => actions.setPhase('preview')}
          >
            <LinearGradient
              colors={['rgba(249,115,22,0.15)', 'rgba(45,27,14,0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.upgradeEmoji}>✨</Text>
            <Text style={styles.upgradeTitle}>Unlock your full trip</Text>
            <Text style={styles.upgradeDesc}>
              Get all hidden gems and unlimited guide messages
            </Text>
          </LiquidGlassCard>
        )}

        {/* Actions */}
        <LiquidGlassCard style={styles.actionsSection} intensity={22}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.6}>
            <Text style={styles.actionIcon}>↻</Text>
            <Text style={styles.actionText}>Restore purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.6}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionText}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            onPress={handleSignOut}
            activeOpacity={0.6}
          >
            <Text style={[styles.actionIcon, styles.dangerIcon]}>↪</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Sign out</Text>
          </TouchableOpacity>
        </LiquidGlassCard>

        {/* Version */}
        <Text style={styles.versionText}>Offpath v1.0.0</Text>
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
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.heavy,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingBottom: 28,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginBottom: 12,
  },
  premiumBadge: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  premiumBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },

  // Trip Card
  tripCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 22,
    marginBottom: 12,
  },
  tripCardHeader: {
    marginBottom: 8,
  },
  tripCardLabel: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  tripCity: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tripCountry: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    marginBottom: 8,
  },
  tripMeta: {
    flexDirection: 'row',
  },
  tripDays: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // New Trip Button
  newTripButton: {
    marginHorizontal: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(249,115,22,0.07)',
  },
  newTripIcon: {
    color: colors.accent,
    fontSize: 18,
    marginRight: 8,
    lineHeight: 22,
  },
  newTripText: {
    color: colors.accent,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  // Travel History section
  historySection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  historySectionTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  seeAllText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    gap: 8,
  },
  seeAllButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  seeAllArrow: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
  },

  // History card (image card)
  historyCard: {
    width: CARD_W,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  historyCardImage: {
    borderRadius: 20,
  },
  historyCardGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyStyleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  historyStyleEmoji: {
    fontSize: 13,
  },
  historyStyleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  historyCardDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  historyCardBottom: {
    gap: 4,
  },
  historyCardCity: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: typography.weights.heavy,
    letterSpacing: -0.5,
  },
  historyCardCountry: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: 8,
  },
  historyCardMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  historyMetaPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyMetaPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },

  // Empty state
  historyEmpty: {
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  historyEmptyIcon: {
    fontSize: 36,
  },
  historyEmptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Upgrade
  upgradeCard: {
    marginHorizontal: 16,
    borderRadius: radius.xl,
    marginBottom: 24,
    padding: 24,
    alignItems: 'center',
  },
  upgradeCardBg: {
    padding: 24,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  upgradeEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  upgradeTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  upgradeDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Actions
  actionsSection: {
    marginHorizontal: 16,
    borderRadius: radius.xl,
    marginBottom: 24,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 14,
    color: colors.textSecondary,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  dangerIcon: {
    color: colors.error,
  },
  dangerText: {
    color: colors.error,
  },

  // Version
  versionText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: 20,
  },
});
