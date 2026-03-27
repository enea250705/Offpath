// Offpath — Preview + Unlock Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { PURCHASE_PRODUCTS } from '../../types';

export default function PreviewScreen() {
  const { state, actions } = useApp();
  const plan = state.plan;
  const isLoggedIn = !!state.user;

  if (!plan) return null;

  const day1 = plan.previewDays?.[0] || plan.fullDays?.[0];

  const handleFreeTier = () => {
    if (isLoggedIn) {
      actions.setPhase('trip');
    } else {
      actions.setPhase('auth');
    }
  };

  const handlePurchase = (productId: string) => {
    // In-app purchase flow (placeholder)
    Alert.alert(
      'Purchase',
      'In-app purchases require a production build. For now, use the free tier.',
      [{ text: 'OK' }],
    );
  };

  const handleClose = () => {
    if (isLoggedIn && state.plan) {
      actions.setPhase('trip');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0D0F', '#1a1a2e', '#0D0D0F']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#1a0a2e', '#0f1a3a', '#0a1a2e']}
            style={styles.heroBg}
          >
            <Text style={styles.countryTag}>
              {plan.destinationCountry?.toUpperCase()}
            </Text>
            <Text style={styles.cityName}>{plan.destinationCity}</Text>
            <Text style={styles.shareLine}>{plan.shareLine}</Text>
          </LinearGradient>
        </View>

        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>{plan.intro}</Text>
        </View>

        {/* Day 1 Preview */}
        {day1 && (
          <View style={styles.dayPreview}>
            <View style={styles.dayHeader}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>1</Text>
              </View>
              <View>
                <Text style={styles.dayTitle}>{day1.title}</Text>
                <Text style={styles.dayMood}>{day1.mood}</Text>
              </View>
            </View>

            {day1.moments?.map((moment, idx) => (
              <View key={moment.id || idx} style={styles.momentCard}>
                {/* Timeline */}
                <View style={styles.timelineCol}>
                  <View style={styles.timelineDot} />
                  {idx < (day1.moments?.length || 0) - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                <View style={styles.momentContent}>
                  <Text style={styles.momentTime}>{moment.timeLabel}</Text>
                  <Text style={styles.momentTitle}>{moment.title}</Text>
                  <Text style={styles.momentRationale}>{moment.rationale}</Text>

                  {moment.transitNote ? (
                    <View style={styles.noteRow}>
                      <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={styles.noteText}>{moment.transitNote}</Text>
                    </View>
                  ) : null}

                  {moment.avoidNote ? (
                    <View style={styles.noteRow}>
                      <Ionicons name="warning-outline" size={14} color={colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={styles.noteText}>{moment.avoidNote}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Unlock Card */}
        <View style={styles.unlockSection}>
          {isLoggedIn && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <Text style={styles.unlockTitle}>
            {isLoggedIn ? 'Unlock your full trip' : 'Choose your plan'}
          </Text>

          {/* Free tier (only if NOT logged in) */}
          {!isLoggedIn && (
            <TouchableOpacity
              style={styles.tierCard}
              onPress={handleFreeTier}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#1E1E23', '#222228']}
                style={styles.tierCardBg}
              >
                <View style={styles.tierRow}>
                  <View style={styles.tierInfo}>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierBadgeText}>FREE</Text>
                    </View>
                    <Text style={styles.tierName}>Free Plan</Text>
                    <Text style={styles.tierDesc}>
                      Full itinerary + 2 hidden places + 3 guide messages
                    </Text>
                  </View>
                  <Text style={styles.tierPrice}>$0</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Paid tiers */}
          {PURCHASE_PRODUCTS.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.tierCard}
              onPress={() => handlePurchase(product.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  product.tier === 'trippass'
                    ? ['#2d1b0e', '#1a1a2e']
                    : ['#1E1E23', '#222228']
                }
                style={styles.tierCardBg}
              >
                <View style={styles.tierRow}>
                  <View style={styles.tierInfo}>
                    {product.tier === 'trippass' && (
                      <View style={[styles.tierBadge, styles.tierBadgeAccent]}>
                        <Text style={[styles.tierBadgeText, styles.tierBadgeTextAccent]}>
                          POPULAR
                        </Text>
                      </View>
                    )}
                    <Text style={styles.tierName}>{product.label}</Text>
                    <Text style={styles.tierDesc}>{product.description}</Text>
                  </View>
                  <Text style={styles.tierPrice}>{product.price}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          {/* Restore */}
          <TouchableOpacity style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 60,
  },

  // Hero
  hero: {
    marginBottom: 4,
  },
  heroBg: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  countryTag: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 3,
    marginBottom: 8,
  },
  cityName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.heavy,
    marginBottom: 8,
  },
  shareLine: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },

  // Intro
  introSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  introText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },

  // Day Preview
  dayPreview: {
    marginHorizontal: 20,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dayBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  dayTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  dayMood: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },

  // Moment
  momentCard: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  momentContent: {
    flex: 1,
    marginLeft: 12,
  },
  momentTime: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  momentTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  momentRationale: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  noteIcon: {
    color: colors.textMuted,
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 18,
  },

  // Unlock
  unlockSection: {
    marginHorizontal: 20,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  unlockTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 20,
  },

  // Tier Cards
  tierCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tierCardBg: {
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierInfo: {
    flex: 1,
    marginRight: 12,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  tierBadgeAccent: {
    backgroundColor: colors.accentMuted,
  },
  tierBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  tierBadgeTextAccent: {
    color: colors.accent,
  },
  tierName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: 3,
  },
  tierDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  tierPrice: {
    color: colors.accent,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },

  // Restore
  restoreBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  restoreText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});
