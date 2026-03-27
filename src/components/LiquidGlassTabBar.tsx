// Offpath — Liquid Glass Tab Bar
// Premium frosted glass tab bar with animated pill indicator,
// spring bounce icons, and ambient glow effects.
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
const TAB_BAR_MARGIN_H = 20;
const TAB_BAR_MARGIN_BOTTOM = Platform.OS === 'ios' ? 28 : 16;
const TAB_BAR_WIDTH = SCREEN_W - TAB_BAR_MARGIN_H * 2;
const TAB_COUNT = 4;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;
const PILL_WIDTH = TAB_WIDTH - 12;
const PILL_HEIGHT = 44;

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

export default function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const pillX = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;
  const iconScales = useRef(
    state.routes.map(() => new Animated.Value(1)),
  ).current;
  const iconTranslateY = useRef(
    state.routes.map(() => new Animated.Value(0)),
  ).current;

  // Slide pill to active tab
  useEffect(() => {
    const targetX = state.index * TAB_WIDTH;
    Animated.spring(pillX, {
      toValue: targetX,
      damping: 16,
      stiffness: 160,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    // Glow pulse on change
    Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.5,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state.index]);

  // Icon bounce on select
  const bounceIcon = (index: number) => {
    // Reset all icons
    iconScales.forEach((s, i) => {
      if (i !== index) {
        Animated.spring(s, {
          toValue: 1,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }).start();
        Animated.spring(iconTranslateY[i], {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }).start();
      }
    });

    // Bounce selected
    Animated.sequence([
      Animated.spring(iconScales[index], {
        toValue: 0.75,
        damping: 30,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(iconScales[index], {
        toValue: 1.15,
        damping: 8,
        stiffness: 250,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.spring(iconScales[index], {
        toValue: 1,
        damping: 14,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Lift up
    Animated.spring(iconTranslateY[index], {
      toValue: -2,
      damping: 14,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Outer glow / shadow layer */}
      <View style={styles.shadowLayer} />

      {/* Glass bar */}
      <View style={styles.barWrapper}>
        <BlurView
          intensity={40}
          tint="dark"
          style={styles.blurView}
        >
          {/* Inner glass layers */}
          <View style={styles.glassInner}>
            {/* Subtle gradient overlay for depth */}
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0.03)',
                'rgba(255,255,255,0.01)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassGradient}
            />

            {/* Top edge highlight — gives the glass a bright rim */}
            <View style={styles.topEdge} />

            {/* Animated pill wrapper (matches tab width perfectly) */}
            <Animated.View
              style={[
                styles.pillWrapper,
                { transform: [{ translateX: pillX }] },
              ]}
            >
              {/* Actual pill shape centered inside */}
              <View style={styles.pillShape}>
                {/* Pill glow (behind) */}
                <Animated.View style={[styles.pillGlow, { opacity: glowOpacity }]} />
                {/* Pill body */}
                <LinearGradient
                  colors={['rgba(249,115,22,0.25)', 'rgba(249,115,22,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.pillBody}
                >
                  {/* Pill inner top highlight */}
                  <View style={styles.pillHighlight} />
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Tab buttons */}
            <View style={styles.tabsRow}>
              {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const meta = TABS[route.name] || {
                  icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
                  iconActive: 'ellipse' as keyof typeof Ionicons.glyphMap,
                  label: route.name,
                };

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    bounceIcon(index);
                    navigation.navigate(route.name, route.params);
                  }
                };

                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    activeOpacity={0.7}
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
                            { scale: iconScales[index] },
                            { translateY: iconTranslateY[index] },
                          ],
                        },
                      ]}
                    >
                      <Ionicons
                        name={isFocused ? meta.iconActive : meta.icon}
                        size={22}
                        color={
                          isFocused
                            ? '#F97316'
                            : 'rgba(255,255,255,0.35)'
                        }
                        style={isFocused ? styles.iconGlow : undefined}
                      />
                      <Text
                        style={[
                          styles.tabLabel,
                          isFocused && styles.tabLabelActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </BlurView>

        {/* Bottom border glow line */}
        <View style={styles.bottomGlowLine} />
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

  // Shadow under the entire bar
  shadowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },

  barWrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  blurView: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },

  glassInner: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(12,12,16,0.55)',
  },

  glassGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },

  topEdge: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },

  // ─── Pill Indicator ─────────────────────────────
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
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
  },

  pillGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(249,115,22,0.15)',
    top: -4,
    bottom: -4,
    left: -4,
    right: -4,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },

  pillBody: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },

  pillHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },

  // ─── Tabs ───────────────────────────────────────
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
  },

  iconGlow: {
    textShadowColor: 'rgba(249,115,22,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 0.3,
    marginTop: 3,
  },

  tabLabelActive: {
    color: 'rgba(249,115,22,0.95)',
    fontWeight: '700',
  },

  bottomGlowLine: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
