// Offpath — You Tab (Account / Profile)
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { getCityPhoto } from '../../services/pexels';
import LiquidGlassCard from '../../components/LiquidGlassCard';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 32;

// Photo collage that grows like a puzzle: 1=full, 2=halves, 3=left+right split, 4+=grid
function CollageGrid({ photos, count }: { photos: (string | null)[]; count: number }) {
  const h = 220;
  const w = CARD_W;
  const gap = 3;
  const fallback = '#1a1208';

  if (count === 0) return null;

  const Cell = ({ uri, style }: { uri?: string | null; style: object }) => (
    <View style={[{ backgroundColor: fallback, overflow: 'hidden' }, style]}>
      {uri ? <ImageBackground source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
    </View>
  );

  if (count === 1) {
    return <Cell uri={photos[0]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />;
  }
  if (count === 2) {
    const hw = (w - gap) / 2;
    return (
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', borderRadius: 24, overflow: 'hidden' }]}>
        <Cell uri={photos[0]} style={{ width: hw, height: h }} />
        <View style={{ width: gap }} />
        <Cell uri={photos[1]} style={{ width: hw, height: h }} />
      </View>
    );
  }
  if (count === 3) {
    const lw = w * 0.55;
    const rw = w - lw - gap;
    const rh = (h - gap) / 2;
    return (
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', borderRadius: 24, overflow: 'hidden' }]}>
        <Cell uri={photos[0]} style={{ width: lw, height: h }} />
        <View style={{ width: gap }} />
        <View style={{ width: rw, flexDirection: 'column' }}>
          <Cell uri={photos[1]} style={{ width: rw, height: rh }} />
          <View style={{ height: gap }} />
          <Cell uri={photos[2]} style={{ width: rw, height: rh }} />
        </View>
      </View>
    );
  }
  // 4+ — 2x2 grid, last cell shows overflow count
  const cw = (w - gap) / 2;
  const ch = (h - gap) / 2;
  const extra = count - 4;
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
      <View style={{ flexDirection: 'row' }}>
        <Cell uri={photos[0]} style={{ width: cw, height: ch }} />
        <View style={{ width: gap }} />
        <Cell uri={photos[1]} style={{ width: cw, height: ch }} />
      </View>
      <View style={{ height: gap }} />
      <View style={{ flexDirection: 'row' }}>
        <Cell uri={photos[2]} style={{ width: cw, height: ch }} />
        <View style={{ width: gap }} />
        <View style={{ width: cw, height: ch, backgroundColor: '#1a1208', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          {photos[3] && <ImageBackground source={{ uri: photos[3] }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          {extra > 0 && (
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>+{extra}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function YouTab() {
  const navigation = useNavigation<any>();
  const { state, actions } = useApp();
  const user = state.user;
  const plan = state.plan;
  const isPremium = state.isPremium;
  const tripHistory = state.tripHistory ?? [];

  // Fetch photos for up to 4 trips (collage on entry card)
  const [collagePhotos, setCollagePhotos] = useState<(string | null)[]>([]);
  useEffect(() => {
    const slice = tripHistory.slice(0, 4);
    Promise.all(slice.map((t) => getCityPhoto(t.destinationCity))).then(setCollagePhotos);
  }, [tripHistory.length]);

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

        {/* Travel History entry card */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>TRAVEL HISTORY</Text>

          {tripHistory.length === 0 ? (
            <LiquidGlassCard style={styles.historyEmpty} intensity={20}>
              <Text style={styles.historyEmptyIcon}>🗺️</Text>
              <Text style={styles.historyEmptyText}>No past trips yet. Your adventures will show up here.</Text>
            </LiquidGlassCard>
          ) : (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => navigation.navigate('History')}
              style={styles.historyEntryCard}
            >
              {/* Photo collage — grows with each trip */}
              <CollageGrid photos={collagePhotos} count={tripHistory.length} />

              {/* Dark overlay */}
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
                locations={[0.2, 1]}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />

              {/* Top row */}
              <View style={styles.historyEntryTop}>
                <View style={styles.historyEntryBadge}>
                  <Text style={styles.historyEntryBadgeText}>
                    {tripHistory.length} {tripHistory.length === 1 ? 'trip' : 'trips'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </View>

              {/* Bottom CTA */}
              <View style={styles.historyEntryBottom}>
                <Text style={styles.historyEntryTitle}>Your journeys</Text>
                <Text style={styles.historyEntrySub}>Tap to relive every trip</Text>
              </View>
            </TouchableOpacity>
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
    gap: 12,
  },
  historySectionTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: 2,
  },

  // Single entry card
  historyEntryCard: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#1a1208',
  },
  historyEntryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyEntryBadge: {
    backgroundColor: 'rgba(249,115,22,0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.4)',
  },
  historyEntryBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  historyEntryBottom: {
    gap: 3,
  },
  historyEntryTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: typography.weights.heavy,
    letterSpacing: -0.5,
  },
  historyEntrySub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: typography.sizes.sm,
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
