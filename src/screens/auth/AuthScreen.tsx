// Offpath — Auth Screen (Social + Email)
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { api, friendlyError, ApiError } from '../../services/api';
import { colors, typography, spacing, radius } from '../../theme';

type AuthMode = 'signup' | 'login';

export default function AuthScreen() {
  const { state, actions } = useApp();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await api.emailAuth({
        email: email.trim(),
        password,
        displayName: mode === 'signup' ? name.trim() || undefined : undefined,
        mode,
      });

      await actions.login(user);

      // If we have a plan, go to trip; otherwise start over
      if (state.plan) {
        actions.setPhase('trip');
      } else {
        actions.setPhase('onboarding');
      }
    } catch (err: any) {
      const msg = friendlyError(err);
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    // Apple Sign-In requires native module - placeholder
    setError('Apple Sign-In requires a native build.');
  };

  const handleGoogleSignIn = () => {
    // Google Sign-In requires native module - placeholder
    setError('Google Sign-In requires a native build.');
  };

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.tagline}>OFFPATH</Text>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              Sign in to unlock your personalized trip plan
            </Text>
          </View>

          {/* Social Buttons */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleAppleSignIn}
            activeOpacity={0.7}
          >
            <View style={styles.socialBtnInner}>
              <Ionicons name="logo-apple" size={20} color={colors.white} style={{ marginRight: 10 }} />
              <Text style={styles.socialBtnTextLight}>Continue with Apple</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
          >
            <View style={styles.socialBtnInner}>
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.socialBtnTextDark}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Form */}
          <Animated.View
            style={[
              styles.formCard,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === 'signup' && styles.modeBtnActive,
                ]}
                onPress={() => { setMode('signup'); setError(''); }}
              >
                <Text style={[
                  styles.modeBtnText,
                  mode === 'signup' && styles.modeBtnTextActive,
                ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === 'login' && styles.modeBtnActive,
                ]}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={[
                  styles.modeBtnText,
                  mode === 'login' && styles.modeBtnTextActive,
                ]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name (signup only) */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'password-new' : 'password'}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F97316', '#FB923C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'signup' ? 'Create account' : 'Log in'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  kav: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },

  // Header
  header: {
    marginBottom: 36,
  },
  tagline: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 4,
    marginBottom: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.heavy,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },

  // Social
  socialBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  googleBtn: {
    backgroundColor: colors.white,
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  appleLogo: {
    fontSize: 20,
    marginRight: 10,
  },
  googleLogo: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#4285F4',
    marginRight: 10,
  },
  socialBtnTextLight: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  socialBtnTextDark: {
    color: colors.black,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginHorizontal: 16,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeBtnActive: {
    backgroundColor: colors.accent,
  },
  modeBtnText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  modeBtnTextActive: {
    color: colors.white,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 14,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },

  // Submit
  submitBtn: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
