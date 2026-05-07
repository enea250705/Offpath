// Offpath — Liquid Glass Card
// Reusable frosted-glass card. Drop in place of any solid-bg View card.
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  onPress?: () => void;
  activeOpacity?: number;
}

export default function LiquidGlassCard({
  children,
  style,
  intensity = 22,
  onPress,
  activeOpacity = 0.7,
}: Props) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.base, style]}
      onPress={onPress}
      activeOpacity={onPress ? activeOpacity : undefined}
    >
      {/* Frosted blur layer */}
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Dark base so glass reads even when no content is behind */}
      <View style={styles.darkBase} />
      {/* Subtle gradient sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top rim highlight — gives the glass its bright edge */}
      <View style={styles.rim} />
      {/* Content renders on top of all absolute layers */}
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,14,0.50)',
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    zIndex: 1,
  },
});
