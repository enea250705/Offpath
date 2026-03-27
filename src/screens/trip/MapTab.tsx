// Offpath — Map Tab (Interactive map with itinerary + hidden pins)
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useApp } from '../../store/AppContext';
import { colors, typography, radius, shadows } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

type PinType = 'itinerary' | 'hidden';

interface ModernPinData {
  type: PinType;
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  dayNumber?: number;
  timeLabel?: string;
}

export default function MapTab() {
  const { state } = useApp();
  const plan = state.plan;
  const isPremium = state.isPremium;
  const [selectedPin, setSelectedPin] = useState<ModernPinData | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // Build pins
  const pins = useMemo<ModernPinData[]>(() => {
    if (!plan) return [];
    const result: ModernPinData[] = [];

    // Itinerary moments
    const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];
    days.forEach((day) => {
      day.moments?.forEach((moment) => {
        if (moment.coordinate) {
          result.push({
            type: 'itinerary',
            id: moment.id,
            name: moment.title,
            subtitle: `${day.title || `Day ${day.dayNumber}`} · ${moment.timeLabel}`,
            latitude: moment.coordinate.latitude,
            longitude: moment.coordinate.longitude,
            dayNumber: day.dayNumber,
            timeLabel: moment.timeLabel,
          });
        }
      });
    });

    // Hidden places
    const visibleHidden = isPremium
      ? plan.hiddenPlaces || []
      : (plan.hiddenPlaces || []).slice(0, 2);

    visibleHidden.forEach((place) => {
      if (place.coordinate) {
        result.push({
          type: 'hidden',
          id: place.id,
          name: place.name,
          subtitle: place.neighborhood,
          latitude: place.coordinate.latitude,
          longitude: place.coordinate.longitude,
        });
      }
    });

    return result;
  }, [plan, isPremium]);

  const centerCoord = plan?.destinationCoordinate || plan?.fullDays?.[0]?.moments?.[0]?.coordinate || plan?.previewDays?.[0]?.moments?.[0]?.coordinate;

  const initialRegion: Region | undefined = centerCoord
    ? {
        latitude: centerCoord.latitude,
        longitude: centerCoord.longitude,

        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  const handlePinPress = (pin: ModernPinData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSelectedPin(pin);
    Animated.spring(cardAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedPin(null));
  };

  const handleMapPress = () => {
    if (selectedPin) {
      handleCloseCard();
    }
  };

  if (!plan || !initialRegion) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No map data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={handleMapPress}
      >
        {pins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;
          const isItinerary = pin.type === 'itinerary';

          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => {
                e.stopPropagation();
                handlePinPress(pin);
              }}
              style={{ zIndex: isSelected ? 10 : 1 }}
            >
              <View style={styles.markerContainer}>
                {/* Glow Ring (only visible if selected) */}
                {isSelected && (
                  <View
                    style={[
                      styles.glowRing,
                      isItinerary ? styles.glowOrange : styles.glowPurple,
                    ]}
                  />
                )}
                
                {/* Core Pin */}
                <View
                  style={[
                    styles.pinCore,
                    isItinerary ? styles.bgOrange : styles.bgPurple,
                    isSelected ? styles.pinCoreSelected : styles.pinCoreDefault,
                  ]}
                >
                  <View style={styles.whiteCenterDot} />
                </View>

                {/* Map Label */}
                <Text style={[styles.markerLabel, isSelected && styles.markerLabelSelected]}>
                  {pin.name}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Bottom Card */}
      {selectedPin && (
        <Animated.View
          style={[
            styles.bottomCardWrapper,
            {
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
              opacity: cardAnim,
            },
          ]}
        >
          <BlurView intensity={70} tint="dark" style={styles.bottomCardBlur}>
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.cardIconBox,
                  selectedPin.type === 'itinerary' ? styles.bgOrange : styles.bgPurple,
                ]}
              >
                <Ionicons
                  name={selectedPin.type === 'itinerary' ? 'sparkles' : 'eye-off'}
                  size={18}
                  color={colors.white}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{selectedPin.name}</Text>
                <Text style={styles.cardSubtitle}>{selectedPin.subtitle}</Text>
              </View>
              <TouchableOpacity style={styles.cardClose} onPress={handleCloseCard}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Legend Bar */}
      <View style={styles.legendContainer}>
        <BlurView intensity={60} tint="dark" style={styles.legendBlur}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.bgOrange]} />
            <Text style={styles.legendText}>Itinerary spots</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.bgPurple]} />
            <Text style={styles.legendText}>Hidden places</Text>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  map: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100, // Stretches map deeply underneath the screen to forcefully hide legal logo
  },

  // Marker & Pin Styling
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Tightly wraps the pin, allowing flawless 0.5, 0.5 anchor calculations
  },
  glowRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.25,
  },
  glowOrange: {
    backgroundColor: '#F97316',
  },
  glowPurple: {
    backgroundColor: '#A855F7',
  },
  pinCore: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  pinCoreDefault: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  pinCoreSelected: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  whiteCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  bgOrange: {
    backgroundColor: '#F97316', // tailwind orange-500
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  bgPurple: {
    backgroundColor: '#A855F7', // tailwind purple-500
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabel: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    color: '#18181B',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
    width: 100,
  },
  markerLabelSelected: {
    fontSize: 12,
    marginTop: 8,
    backgroundColor: '#fff',
    color: '#000',
    ...shadows.sm,
  },

  // Bottom Card
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 120, // Above legend and tab bar
    left: 16,
    right: 16,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  bottomCardBlur: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  cardClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Legend
  legendContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 280,
    justifyContent: 'center',
  },
  legendBlur: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: colors.white, // bright for dark blur
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
