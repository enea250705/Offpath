// Offpath — Liquid Glass Tab Bar
// Frosted glass tab bar with sliding pill indicator,
// press-in squish feedback, and ambient glow.
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_BAR_H = 72;
const TAB_BAR_MARGIN_H = 16;
const TAB_BAR_MARGIN_BOTTOM = Platform.OS === 'ios' ? 28 : 16;
const TAB_BAR_WIDTH = SCREEN_W - TAB_BAR_MARGIN_H * 2;
const TAB_COUNT = 4;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;
const PILL_W = TAB_WIDTH - 16;
const PILL_H = 46;

interface TabMeta {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TABS: Record<string, TabMeta> = {
  Plan:   { icon: 'calendar-outline',   iconActive: 'calendar',   label: 'Plan' },
  Hidden: { icon: 'diamond-outline',    iconActive: 'diamond',    label: 'Hidden' },
  Guide:  { icon: 'chatbubble-outline', iconActive: 'chatbubble', label: 'Guide' },
  Map:    { icon: 'map-outline',        iconActive: 'map',        label: 'Map' },
  You:    { icon: 'person-outline',     iconActive: 'person',     label: 'You' },
};

export default function LiquidGlassTabBar({ state, navigation }: BottomTabBarProps) {
  // Pill slides to active tab
  const pillX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  // Per-tab: press squish + icon scale + label opacity
  const pressScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const iconScales  = useRef(state.routes.map((_, i) => new Animated.Value(i === state.index ? 1.1 : 1))).current;

  useEffect(() => {
    // Slide pill
    Animated.spring(pillX, {
      toValue: state.index * TAB_WIDTH,
      damping: 20,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    // Pulse glow
    Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
    ]).start();

    // Icon scale + label opacity per tab
    state.routes.forEach((_, i) => {
      const active = i === state.index;
      Animated.spring(iconScales[i], {
        toValue: active ? 1.1 : 1,
        damping: 16,
        stiffness: 260,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const onPressIn = (i: number) => {
    Animated.spring(pressScales[i], {
      toValue: 0.80,
      damping: 50,
      stiffness: 700,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = (i: number) => {
    Animated.spring(pressScales[i], {
      toValue: 1,
      damping: 9,
      stiffness: 260,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  };

  const onPress = (index: number, route: (typeof state.routes)[number]) => {
    const isFocused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.shadowLayer} />

      <View style={styles.barWrapper}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Glass gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Top rim */}
        <View style={styles.topRim} />

        {/* Dark tint base */}
        <View style={styles.darkBase} />

        {/* Sliding pill */}
        <Animated.View style={[styles.pillWrapper, { transform: [{ translateX: pillX }] }]}>
          <View style={styles.pillShape}>
            <Animated.View style={[styles.pillGlow, { opacity: glowOpacity }]} />
            <LinearGradient
              colors={['rgba(249,115,22,0.26)', 'rgba(249,115,22,0.09)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.pillBody}
            >
              <View style={styles.pillHighlight} />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const meta = TABS[route.name] ?? {
              icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
              iconActive: 'ellipse' as keyof typeof Ionicons.glyphMap,
              label: route.name,
            };

            return (
              <Pressable
                key={route.key}
                onPressIn={() => onPressIn(index)}
                onPressOut={() => onPressOut(index)}
                onPress={() => onPress(index, route)}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
              >
                <Animated.View
                  style={[
                    styles.tabContent,
                    {
                      transform: [
                        { scale: Animated.multiply(pressScales[index], iconScales[index]) },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name={isFocused ? meta.iconActive : meta.icon}
                    size={22}
                    color={isFocused ? '#F97316' : 'rgba(255,255,255,0.32)'}
                    style={isFocused ? styles.iconGlow : undefined}
                  />
                  <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: TAB_BAR_MARGIN_BOTTOM,
    left: TAB_BAR_MARGIN_H,
    right: TAB_BAR_MARGIN_H,
    height: TAB_BAR_H,
    zIndex: 100,
  },
  shadowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 22,
  },
  barWrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,14,0.58)',
  },
  topRim: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    zIndex: 2,
  },

  // Pill
  pillWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pillShape: {
    width: PILL_W,
    height: PILL_H,
  },
  pillGlow: {
    ...StyleSheet.absoluteFillObject,
    top: -6,
    bottom: -6,
    left: -8,
    right: -8,
    borderRadius: 18,
    backgroundColor: 'rgba(249,115,22,0.10)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  pillBody: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.30)',
    overflow: 'hidden',
  },
  pillHighlight: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 1,
  },

  // Tabs
  tabsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 10,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconGlow: {
    textShadowColor: 'rgba(249,115,22,0.70)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#F97316',
    fontWeight: '700',
  },
});
