// Offpath — Paywall (conversion-optimised)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import LiquidGlassCard from '../../components/LiquidGlassCard';
import { useApp } from '../../store/AppContext';
import { colors } from '../../theme';
import { PURCHASE_PRODUCTS } from '../../types';

const { width: W } = Dimensions.get('window');

// ─── Feature bullets ───────────────────────────────────────
const FEATURES = [
  { icon: 'map', label: 'Every stop, every day', sub: 'No locked destinations' },
  { icon: 'chatbubble-ellipses', label: 'Unlimited guide chat', sub: 'Ask Voyara anything' },
  { icon: 'navigate', label: 'Instant Maps links', sub: 'One tap to every place' },
  { icon: 'star', label: 'Real ratings & hours', sub: 'Google data for each stop' },
];

// ─── Per-plan CTA labels ────────────────────────────────────
const CTA: Record<string, string> = {
  trippass:  'Unlock This Trip for $2.99',
  tripack3:  'Unlock 3 Trips for $6.99',
  yearly:    'Unlock Everything for $19.99 / yr',
};

export default function PreviewScreen() {
  const { state, actions } = useApp();
  const plan = state.plan;
  const isLoggedIn = !!state.user;

  // Pre-select the Trip Pass (best single-trip value)
  const [selected, setSelected] = useState<string>('trippass');

  if (!plan) return null;

  // Count how many stops are locked (last stop per day, days with >2 stops)
  const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];
  const lockedCount = days.filter(d => (d.moments?.length || 0) > 2).length;

  const handleCTA = () => {
    const product = PURCHASE_PRODUCTS.find(p => p.tier === selected);
    if (!product) return;
    Alert.alert(
      'Purchase',
      'In-app purchases require a production build. For now, use the free tier.',
      [{ text: 'OK' }],
    );
  };

  const handleFreeTier = () => {
    if (isLoggedIn) actions.setPhase('trip');
    else actions.setPhase('auth');
  };

  const handleClose = () => {
    if (isLoggedIn && state.plan) actions.setPhase('trip');
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#0D0D0F', '#12101a', '#0D0D0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Close (only when already logged in) */}
      {isLoggedIn && (
        <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          {/* Glow blob */}
          <View style={s.glowBlob} />

          <View style={s.lockBadge}>
            <Ionicons name="lock-closed" size={14} color={colors.accent} />
            <Text style={s.lockBadgeText}>
              {lockedCount} hidden stop{lockedCount !== 1 ? 's' : ''} waiting
            </Text>
          </View>

          <Text style={s.heroCity}>{plan.destinationCity}</Text>
          <Text style={s.heroHook}>
            Your trip is{'\n'}almost complete.
          </Text>
          <Text style={s.heroSub}>
            Unlock the final stop of every day. The ones locals actually go to.
          </Text>
        </View>

        {/* ── Social proof ── */}
        <View style={s.proofRow}>
          <View style={s.stars}>
            {[0,1,2,3,4].map(i => (
              <Ionicons key={i} name="star" size={12} color="#F59E0B" />
            ))}
          </View>
          <Text style={s.proofText}>Loved by 14,000+ travellers worldwide</Text>
        </View>

        {/* ── What you unlock ── */}
        <View style={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <LiquidGlassCard key={i} style={s.featureCard}>
              <View style={s.featureIconWrap}>
                <Ionicons name={f.icon as any} size={18} color={colors.accent} />
              </View>
              <Text style={s.featureLabel}>{f.label}</Text>
              <Text style={s.featureSub}>{f.sub}</Text>
            </LiquidGlassCard>
          ))}
        </View>

        {/* ── Voyara banner ── */}
        <LiquidGlassCard style={s.voyaraBanner} intensity={28}>
          <LinearGradient
            colors={['rgba(168,85,247,0.12)', 'rgba(249,115,22,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.voyaraBannerGradient}>
            <View style={s.voyaraAvatarWrap}>
              <LinearGradient
                colors={['#F97316', '#A855F7', '#3B82F6']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={s.voyaraRing}
              >
                <LinearGradient
                  colors={['#1A0D2E', '#0D1525']}
                  style={s.voyaraInner}
                >
                  <Ionicons name="compass" size={20} color="#F97316" />
                </LinearGradient>
              </LinearGradient>
            </View>
            <View style={s.voyaraText}>
              <Text style={s.voyaraName}>Meet Voyara</Text>
              <Text style={s.voyaraSub}>
                Your personal AI guide, unlocked and unlimited. Ask anything about {plan.destinationCity}, any time.
              </Text>
            </View>
          </View>
        </LiquidGlassCard>

        {/* ── Continue for free (post-generation only, top position) ── */}
        {!isLoggedIn && (
          <>
            <TouchableOpacity style={s.freeBtn} onPress={handleFreeTier} activeOpacity={0.8}>
              <Text style={s.freeBtnText}>Continue for free</Text>
              <Text style={s.freeBtnSub}>2 stops per day · 3 guide messages</Text>
            </TouchableOpacity>

            <View style={s.orDivider}>
              <View style={s.orLine} />
              <Text style={s.orText}>or choose a pass</Text>
              <View style={s.orLine} />
            </View>
          </>
        )}

        {/* ── Plans ── */}
        {isLoggedIn && <Text style={s.plansHeading}>Choose your pass</Text>}

        {PURCHASE_PRODUCTS.map((product) => {
          const isSelected = selected === product.tier;
          const isPopular = product.tier === 'trippass';
          return (
            <LiquidGlassCard
              key={product.id}
              style={[s.planCard, isSelected && s.planCardSelected]}
              onPress={() => setSelected(product.tier)}
              intensity={isSelected ? 30 : 20}
            >
              {isSelected && (
                <LinearGradient
                  colors={['rgba(249,115,22,0.12)', 'rgba(249,115,22,0.04)']}
                  style={StyleSheet.absoluteFill}
                />
              )}

              <View style={s.planLeft}>
                {isPopular && (
                  <View style={s.popularBadge}>
                    <Text style={s.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                {product.tier === 'yearly' && (
                  <View style={[s.popularBadge, s.bestValueBadge]}>
                    <Text style={[s.popularBadgeText, { color: '#A78BFA' }]}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={s.planName}>{product.label}</Text>
                <Text style={s.planDesc}>{product.description}</Text>
                {product.tier === 'yearly' && (
                  <Text style={s.planSavings}>≈ $1.67 / month</Text>
                )}
              </View>

              <View style={s.planRight}>
                <Text style={[s.planPrice, isSelected && { color: colors.accent }]}>
                  {product.price}
                </Text>
                <View style={[s.radioOuter, isSelected && { borderColor: colors.accent }]}>
                  {isSelected && <View style={s.radioInner} />}
                </View>
              </View>
            </LiquidGlassCard>
          );
        })}

        {/* ── Primary CTA ── */}
        <TouchableOpacity style={s.ctaBtn} onPress={handleCTA} activeOpacity={0.88}>
          <LinearGradient
            colors={['#FB923C', '#F97316', '#EA6D0E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.ctaBtnGradient}
          >
            <Ionicons name="lock-open" size={18} color="#fff" />
            <Text style={s.ctaBtnText}>{CTA[selected]}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Trust row ── */}
        <View style={s.trustRow}>
          {['shield-checkmark-outline', 'card-outline', 'refresh-outline'].map((icon, i) => (
            <View key={i} style={s.trustItem}>
              <Ionicons name={icon as any} size={13} color={colors.textMuted} />
              <Text style={s.trustText}>
                {['Secure payment', 'No hidden fees', 'Cancel anytime'][i]}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Free escape (in-app upgrade only) ── */}
        {isLoggedIn && (
          <TouchableOpacity style={s.freeEscape} onPress={handleFreeTier}>
            <Text style={s.freeEscapeText}>Continue with limited access</Text>
          </TouchableOpacity>
        )}

        {/* Restore */}
        <TouchableOpacity style={s.restoreBtn}>
          <Text style={s.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  hero: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    top: 0,
    width: W * 1.2,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(249,115,22,0.08)',
    transform: [{ scaleX: 1.5 }],
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  lockBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroCity: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    opacity: 0.8,
  },
  heroHook: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 14,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Social proof
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  proofText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Feature grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  featureCard: {
    width: (W - 42) / 2,
    backgroundColor: '#111318',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249,115,22,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    lineHeight: 18,
  },
  featureSub: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    lineHeight: 16,
  },

  // Voyara banner
  voyaraBanner: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: 20,
  },
  voyaraBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  voyaraAvatarWrap: {},
  voyaraRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voyaraInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voyaraText: {
    flex: 1,
  },
  voyaraName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  voyaraSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
  },

  // Or divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Plans
  plansHeading: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
  },
  planCardSelected: {
    borderColor: colors.accent,
  },
  planLeft: {
    flex: 1,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  bestValueBadge: {
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  popularBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  planDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 17,
  },
  planSavings: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  planRight: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 12,
  },
  planPrice: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '800',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },

  // CTA
  ctaBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Trust
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    fontWeight: '500',
  },

  // Free button (post-generation, not logged in)
  freeBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  freeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
  },
  freeBtnSub: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '500',
  },

  // Free escape
  freeEscape: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  freeEscapeText: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Restore
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  restoreText: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 11,
  },
});
