// Offpath — You Tab (Account / Profile)
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
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius, shadows } from '../../theme';

export default function YouTab() {
  const { state, actions } = useApp();
  const user = state.user;
  const plan = state.plan;
  const isPremium = state.isPremium;

  // Initials
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
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => actions.logout(),
        },
      ],
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

          <Text style={styles.userName}>
            {user?.displayName || 'Traveler'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✦ Trip Pass active</Text>
            </View>
          )}
        </View>

        {/* Current Trip */}
        {plan && (
          <View style={styles.tripCard}>
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
          </View>
        )}

        {/* Upgrade (if not premium) */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => actions.setPhase('preview')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#2d1b0e', '#1a1208']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeCardBg}
            >
              <Text style={styles.upgradeEmoji}>✨</Text>
              <Text style={styles.upgradeTitle}>Unlock your full trip</Text>
              <Text style={styles.upgradeDesc}>
                Get all hidden gems and unlimited guide messages
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
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
        </View>

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
    marginHorizontal: 20,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
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

  // Upgrade
  upgradeCard: {
    marginHorizontal: 20,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
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
    marginHorizontal: 20,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
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
