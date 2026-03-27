// Offpath — Navigation (Stack + Bottom Tabs)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../store/AppContext';
import { colors, typography } from '../theme';

// Screens
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import GeneratingScreen from '../screens/generating/GeneratingScreen';
import StoriesScreen from '../screens/stories/StoriesScreen';
import PreviewScreen from '../screens/preview/PreviewScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import PlanTab from '../screens/trip/PlanTab';
import HiddenTab from '../screens/trip/HiddenTab';
import GuideTab from '../screens/trip/GuideTab';
import MapTab from '../screens/trip/MapTab';
import YouTab from '../screens/trip/YouTab';

// Custom tab bar
import LiquidGlassTabBar from '../components/LiquidGlassTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Trip Tab Navigator ────────────────────────────────────
function TripTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Plan" component={PlanTab} />
      <Tab.Screen name="Guide" component={GuideTab} />
      <Tab.Screen name="Map" component={MapTab} />
      <Tab.Screen name="You" component={YouTab} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────
export default function AppNavigator() {
  const { state } = useApp();

  if (state.isRestoring) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>OFFPATH</Text>
        <Text style={styles.splashSub}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.bg },
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        {state.phase === 'onboarding' && (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
        {state.phase === 'generating' && (
          <Stack.Screen
            name="Generating"
            component={GeneratingScreen}
            options={{ ...TransitionPresets.FadeFromBottomAndroid }}
          />
        )}
        {state.phase === 'stories' && (
          <Stack.Screen
            name="Stories"
            component={StoriesScreen}
            options={{ ...TransitionPresets.FadeFromBottomAndroid }}
          />
        )}
        {state.phase === 'preview' && (
          <Stack.Screen name="Preview" component={PreviewScreen} />
        )}
        {state.phase === 'auth' && (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ ...TransitionPresets.ModalSlideFromBottomIOS }}
          />
        )}
        {state.phase === 'trip' && (
          <Stack.Screen
            name="Trip"
            component={TripTabs}
            options={{ ...TransitionPresets.FadeFromBottomAndroid }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    color: colors.accent,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.heavy,
    letterSpacing: 6,
    marginBottom: 12,
  },
  splashSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
});
