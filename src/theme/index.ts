// Offpath Design System — Theme tokens
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Color Palette ─────────────────────────────────────────
export const colors = {
  // Backgrounds
  bg: '#0D0D0F',
  bgCard: '#18181B',
  bgCardLight: '#1E1E23',
  bgElevated: '#222228',
  bgGlass: 'rgba(24,24,27,0.82)',

  // Primary / Accent
  accent: '#F97316',        // Orange
  accentLight: '#FB923C',
  accentMuted: 'rgba(249,115,22,0.18)',
  purple: '#A855F7',
  purpleMuted: 'rgba(168,85,247,0.18)',

  // Day accent cycle
  dayAccents: [
    '#F97316', // orange
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
  ],

  // Text
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#0D0D0F',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Borders
  border: '#27272A',
  borderLight: '#3F3F46',

  // Social
  apple: '#FFFFFF',
  google: '#FFFFFF',

  // Misc
  overlay: 'rgba(0,0,0,0.60)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

// ─── Typography ────────────────────────────────────────────
export const typography = {
  // Font families (system defaults; swap for custom if loaded)
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  fontFamilyMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),

  // Sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 42,
    display: 52,
  },

  // Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },

  // Line heights
  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 2.0,
  },
};

// ─── Spacing ───────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

// ─── Radius ────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  pill: 999,
};

// ─── Shadows ───────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// ─── Layout ────────────────────────────────────────────────
export const layout = {
  screenW: SCREEN_W,
  screenH: SCREEN_H,
  tabBarHeight: 80,
  headerHeight: 56,
  bottomInset: Platform.OS === 'ios' ? 34 : 16,
  horizontalPadding: 20,
};

// ─── Animation Constants ───────────────────────────────────
export const animConfig = {
  spring: {
    damping: 18,
    stiffness: 180,
    mass: 1,
  },
  springBouncy: {
    damping: 12,
    stiffness: 220,
    mass: 0.8,
  },
  timing: {
    fast: 200,
    normal: 350,
    slow: 500,
  },
  stagger: 80,
};
