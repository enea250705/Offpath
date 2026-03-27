// Offpath — Onboarding Screen (4 questions)
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius } from '../../theme';
import { DestinationMode, TravelStyle, TravelerGroup } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Question Data ─────────────────────────────────────────
const STYLES: { key: TravelStyle; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'slow', label: 'Slow', desc: 'Cafés, side streets, no agenda', icon: 'cafe-outline' },
  { key: 'food', label: 'Food', desc: 'Markets, tastings, late lunches', icon: 'restaurant-outline' },
  { key: 'culture', label: 'Culture', desc: 'Museums, architecture, local history', icon: 'business-outline' },
  { key: 'nightlife', label: 'Nightlife', desc: 'Bars, music, the city after dark', icon: 'moon-outline' },
];

const GROUPS: { key: TravelerGroup; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'solo', label: 'Solo', desc: 'Your pace, your rules', icon: 'compass-outline' },
  { key: 'couple', label: 'Couple', desc: 'Intimate moments, shared finds', icon: 'heart-outline' },
  { key: 'group', label: 'Group', desc: 'More energy, wider tastes', icon: 'people-outline' },
];

export default function OnboardingScreen() {
  const { state, actions } = useApp();
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { sessionAnswers } = state;

  const animateTransition = useCallback((direction: 1 | -1, cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -direction * 40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cb();
      slideAnim.setValue(direction * 40);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return !!sessionAnswers.destinationMode;
      case 1:
        return sessionAnswers.destinationMode === 'know'
          ? sessionAnswers.destination.trim().length > 0
          : !!sessionAnswers.style;
      case 2: return !!sessionAnswers.group;
      case 3: return sessionAnswers.tripLength >= 2 && sessionAnswers.tripLength <= 14;
      default: return false;
    }
  };

  const handleContinue = () => {
    if (!canContinue()) return;
    if (step < 3) {
      animateTransition(1, () => setStep(step + 1));
    } else {
      // Trigger generation
      actions.setPhase('generating');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      animateTransition(-1, () => setStep(step - 1));
    }
  };

  // ─── Render Questions ──────────────────────────────────────
  const renderQ0 = () => (
    <View style={styles.questionContent}>
      <Text style={styles.questionLabel}>HOW DO YOU TRAVEL?</Text>
      <Text style={styles.questionTitle}>Do you know where{'\n'}you're going?</Text>

      <TouchableOpacity
        style={[
          styles.radioCard,
          sessionAnswers.destinationMode === 'know' && styles.radioCardSelected,
        ]}
        onPress={() => actions.updateAnswers({ destinationMode: 'know' })}
        activeOpacity={0.7}
      >
        <View style={styles.radioRow}>
          <View style={[
            styles.radioCircle,
            sessionAnswers.destinationMode === 'know' && styles.radioCircleSelected,
          ]}>
            {sessionAnswers.destinationMode === 'know' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.radioTextCol}>
            <Text style={styles.radioTitle}>I know where I want to go</Text>
            <Text style={styles.radioDesc}>Search for your destination</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.radioCard,
          sessionAnswers.destinationMode === 'suggest' && styles.radioCardSelected,
        ]}
        onPress={() => actions.updateAnswers({ destinationMode: 'suggest' })}
        activeOpacity={0.7}
      >
        <View style={styles.radioRow}>
          <View style={[
            styles.radioCircle,
            sessionAnswers.destinationMode === 'suggest' && styles.radioCircleSelected,
          ]}>
            {sessionAnswers.destinationMode === 'suggest' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.radioTextCol}>
            <Text style={styles.radioTitle}>Surprise me with ideas</Text>
            <Text style={styles.radioDesc}>We'll pick based on your vibe</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderQ1 = () => {
    if (sessionAnswers.destinationMode === 'know') {
      return (
        <View style={styles.questionContent}>
          <Text style={styles.questionLabel}>DESTINATION</Text>
          <Text style={styles.questionTitle}>Where are you headed?</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Search city..."
              placeholderTextColor={colors.textMuted}
              value={sessionAnswers.destination}
              onChangeText={(t) => actions.updateAnswers({ destination: t })}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
          <Text style={styles.inputHint}>Enter city name, e.g. "Tokyo" or "Lisbon"</Text>
        </View>
      );
    }

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionLabel}>YOUR VIBE</Text>
        <Text style={styles.questionTitle}>What's your travel style?</Text>

        {STYLES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.radioCard,
              sessionAnswers.style === s.key && styles.radioCardSelected,
            ]}
            onPress={() => actions.updateAnswers({ style: s.key })}
            activeOpacity={0.7}
          >
            <View style={styles.radioRow}>
              <Ionicons name={s.icon} size={24} color={sessionAnswers.style === s.key ? colors.accent : colors.textMuted} style={{ marginRight: 14 }} />
              <View style={styles.radioTextCol}>
                <Text style={styles.radioTitle}>{s.label}</Text>
                <Text style={styles.radioDesc}>{s.desc}</Text>
              </View>
              {sessionAnswers.style === s.key && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderQ2 = () => (
    <View style={styles.questionContent}>
      <Text style={styles.questionLabel}>TRAVELERS</Text>
      <Text style={styles.questionTitle}>Who's coming?</Text>

      <View style={styles.groupRow}>
        {GROUPS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[
              styles.groupCard,
              sessionAnswers.group === g.key && styles.groupCardSelected,
            ]}
            onPress={() => actions.updateAnswers({ group: g.key })}
            activeOpacity={0.7}
          >
            <Ionicons name={g.icon} size={28} color={sessionAnswers.group === g.key ? colors.accent : colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[
              styles.groupLabel,
              sessionAnswers.group === g.key && styles.groupLabelSelected,
            ]}>
              {g.label}
            </Text>
            <Text style={styles.groupDesc}>{g.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQ3 = () => (
    <View style={styles.questionContent}>
      <Text style={styles.questionLabel}>DURATION</Text>
      <Text style={styles.questionTitle}>How many days?</Text>

      <View style={styles.daysDisplay}>
        <Text style={styles.daysNumber}>{sessionAnswers.tripLength}</Text>
        <Text style={styles.daysLabel}>days</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderBound}>2</Text>
        <View style={styles.sliderTrack}>
          {Array.from({ length: 13 }, (_, i) => i + 2).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.sliderDot,
                d <= sessionAnswers.tripLength && styles.sliderDotActive,
                d === sessionAnswers.tripLength && styles.sliderDotCurrent,
              ]}
              onPress={() => actions.updateAnswers({ tripLength: d })}
            />
          ))}
        </View>
        <Text style={styles.sliderBound}>14</Text>
      </View>

      <View style={styles.quickDays}>
        {[3, 5, 7, 10, 14].map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.quickDayBtn,
              sessionAnswers.tripLength === d && styles.quickDayBtnActive,
            ]}
            onPress={() => actions.updateAnswers({ tripLength: d })}
          >
            <Text style={[
              styles.quickDayText,
              sessionAnswers.tripLength === d && styles.quickDayTextActive,
            ]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const questions = [renderQ0, renderQ1, renderQ2, renderQ3];
  const titles = ['Travel Mode', 'Destination', 'Travelers', 'Duration'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0D0F', '#1a1a2e', '#0D0D0F']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Header */}
        <View style={styles.header}>
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.progressContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i <= step ? styles.progressBarFilled : styles.progressBarEmpty,
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepCounter}>{step + 1}/4</Text>
        </View>

        {/* Question Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {questions[step]()}
          </Animated.View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue() && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canContinue() ? ['#F97316', '#FB923C'] : ['#3F3F46', '#3F3F46']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <Text style={[
                styles.continueBtnText,
                !canContinue() && styles.continueBtnTextDisabled,
              ]}>
                {step === 3 ? 'Generate my trip' : 'Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  kav: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 20,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressBarFilled: {
    backgroundColor: colors.accent,
  },
  progressBarEmpty: {
    backgroundColor: colors.border,
  },
  stepCounter: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginLeft: 12,
    fontWeight: typography.weights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  animatedContent: {
    flex: 1,
  },

  // Question
  questionContent: {
    paddingTop: 24,
  },
  questionLabel: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  questionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes.xxl * 1.2,
    marginBottom: 32,
  },

  // Radio Cards
  radioCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  radioCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  radioTextCol: {
    flex: 1,
  },
  radioTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  radioDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  styleEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    paddingVertical: 18,
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 10,
    marginLeft: 4,
  },

  // Group Cards
  groupRow: {
    flexDirection: 'row',
    gap: 12,
  },
  groupCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  groupCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  groupEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  groupLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  groupLabelSelected: {
    color: colors.accent,
  },
  groupDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 15,
  },

  // Days Display
  daysDisplay: {
    alignItems: 'center',
    marginBottom: 40,
  },
  daysNumber: {
    color: colors.accent,
    fontSize: 80,
    fontWeight: typography.weights.heavy,
    lineHeight: 90,
  },
  daysLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    marginTop: -8,
  },

  // Slider
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  sliderBound: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    width: 24,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
    height: 30,
  },
  sliderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  sliderDotActive: {
    backgroundColor: colors.accentMuted,
  },
  sliderDotCurrent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
  },

  // Quick Days
  quickDays: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  quickDayBtn: {
    width: 52,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDayBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quickDayText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  quickDayTextActive: {
    color: colors.white,
  },

  // Bottom
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  continueBtn: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  continueBtnText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  continueBtnTextDisabled: {
    color: colors.textMuted,
  },
});
