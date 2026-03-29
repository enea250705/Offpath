// Offpath — Auth Screen
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { useApp } from '../../store/AppContext';
import { api, friendlyError } from '../../services/api';
import { colors, typography, spacing, radius } from '../../theme';

type AuthMode = 'signup' | 'login';
type Step = 'credentials' | 'verify';

export default function AuthScreen() {
  const { state, actions } = useApp();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState<Step>('credentials');

  // Credentials step
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Verify step
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── Apple Sign-In ─────────────────────────────────────
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple');
      const user = await api.socialAuth({ provider: 'apple', idToken: credential.identityToken });
      await actions.login(user);
      actions.setPhase(state.plan ? 'trip' : 'onboarding');
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') setError(friendlyError(err));
    } finally {
      setAppleLoading(false);
    }
  };

  // ─── Step 1: submit email + password ──────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      shake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.emailAuth({
        email: email.trim(),
        password,
        displayName: mode === 'signup' ? name.trim() || undefined : undefined,
        mode,
      });
      setCode('');
      startResendCooldown();
      setStep('verify');
    } catch (err: any) {
      setError(friendlyError(err));
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: verify the code ───────────────────────────
  const handleVerify = async () => {
    if (code.trim().length < 4) {
      setError('Please enter the code from your email.');
      shake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await api.verifyCode({ email: email.trim(), code: code.trim() });
      await actions.login(user);
      actions.setPhase(state.plan ? 'trip' : 'onboarding');
    } catch (err: any) {
      setError(friendlyError(err));
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend code ───────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await api.emailAuth({
        email: email.trim(),
        password,
        displayName: mode === 'signup' ? name.trim() || undefined : undefined,
        mode,
      });
      startResendCooldown();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Render: verify step ───────────────────────────────
  if (step === 'verify') {
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
            {/* Back */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setStep('credentials'); setError(''); setCode(''); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.tagline}>OFFPATH</Text>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a verification code to{'\n'}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
              </Text>
            </View>

            <Animated.View
              style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Verification code</Text>
                <TextInput
                  style={[styles.textInput, styles.codeInput]}
                  placeholder="Enter code"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={8}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleVerify}
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
                    <Text style={styles.submitBtnText}>Verify & continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Render: credentials step ──────────────────────────
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

          {/* Apple */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleAppleSignIn}
            activeOpacity={0.7}
            disabled={appleLoading || loading}
          >
            <View style={styles.socialBtnInner}>
              {appleLoading ? (
                <ActivityIndicator color={colors.white} style={{ marginRight: 10 }} />
              ) : (
                <Ionicons name="logo-apple" size={20} color={colors.white} style={{ marginRight: 10 }} />
              )}
              <Text style={styles.socialBtnTextLight}>Continue with Apple</Text>
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
            style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}
          >
            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
                onPress={() => { setMode('signup'); setError(''); }}
              >
                <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>

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

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleEmailAuth}
              disabled={loading || appleLoading}
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
  container: { flex: 1, backgroundColor: colors.bg },
  kav: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },

  backBtn: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },

  header: { marginBottom: 36 },
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
  emailHighlight: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },

  socialBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  socialBtnTextLight: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginHorizontal: 16,
  },

  formCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  modeBtnActive: { backgroundColor: colors.accent },
  modeBtnText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  modeBtnTextActive: { color: colors.white },

  inputGroup: { marginBottom: 16 },
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
    letterSpacing: 0,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },

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

  submitBtn: { borderRadius: radius.lg, overflow: 'hidden' },
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

  resendBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  resendTextDisabled: {
    color: colors.textMuted,
  },
});
