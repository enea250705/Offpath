import React, { useState, useRef, useMemo, useCallback } from 'react';
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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { colors, typography, radius, shadows } from '../../theme';
import LiquidGlassCard from '../../components/LiquidGlassCard';
import { api } from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

type PinType = 'itinerary' | 'hidden' | 'nearby';

interface ModernPinData {
  type: PinType;
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  dayNumber?: number;
  timeLabel?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  category?: string;
}

interface PlaceInsight {
  summary: string;
  pros: string[];
  cons: string[];
  keyFacts: string[];
}

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const c = (category || '').toLowerCase();
  if (c.includes('restaurant') || c.includes('dining')) return 'restaurant';
  if (c.includes('cafe') || c.includes('coffee')) return 'cafe';
  if (c.includes('bar') || c.includes('night')) return 'wine';
  if (c.includes('museum') || c.includes('gallery') || c.includes('art')) return 'color-palette';
  if (c.includes('park') || c.includes('garden')) return 'leaf';
  if (c.includes('shop') || c.includes('mall')) return 'bag';
  if (c.includes('tourist') || c.includes('attraction')) return 'camera';
  return 'location';
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function MapTab() {
  const { state } = useApp();
  const plan = state.plan;
  const isPremium = state.isPremium;

  const [selectedPin, setSelectedPin] = useState<ModernPinData | null>(null);
  const [insight, setInsight] = useState<PlaceInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(false);
  const insightCache = useRef(new Map<string, PlaceInsight>());
  // Suppress the generic onPress "close card" action right after a POI tap
  const suppressNextMapPress = useRef(false);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  const pins = useMemo<ModernPinData[]>(() => {
    if (!plan) return [];
    const result: ModernPinData[] = [];

    const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];
    days.forEach((day) => {
      const stopCount = day.moments?.length || 0;
      day.moments?.forEach((moment, idx) => {
        const isLocked = !isPremium && stopCount > 2 && idx === stopCount - 1;
        if (isLocked) return;
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

  const centerCoord = plan?.destinationCoordinate
    || plan?.fullDays?.[0]?.moments?.[0]?.coordinate
    || plan?.previewDays?.[0]?.moments?.[0]?.coordinate;

  const initialRegion: Region | undefined = centerCoord
    ? { latitude: centerCoord.latitude, longitude: centerCoord.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : undefined;


  const fetchInsight = useCallback(async (pin: ModernPinData) => {
    const cached = insightCache.current.get(pin.id);
    if (cached) {
      setInsight(cached);
      return;
    }
    setInsightLoading(true);
    setInsightError(false);
    try {
      const result = await api.placeInsight({
        name: pin.name,
        address: pin.address || '',
        category: pin.category || '',
        rating: pin.rating || 0,
        reviewCount: pin.reviewCount || 0,
      });
      insightCache.current.set(pin.id, result);
      setInsight(result);
    } catch {
      setInsightError(true);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  const handlePinPress = (pin: ModernPinData) => {
    if (selectedPin?.id !== pin.id) {
      setInsight(null);
      setInsightError(false);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSelectedPin(pin);
    if (pin.type === 'nearby') {
      fetchInsight(pin);
    }
    Animated.spring(cardAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
    // Prevent the onPress that fires simultaneously (iOS) from closing the card
    suppressNextMapPress.current = true;
    setTimeout(() => { suppressNextMapPress.current = false; }, 300);
  };

  const handleCloseCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedPin(null);
      setInsight(null);
      setInsightError(false);
    });
  };

  const handleMapPress = () => {
    if (suppressNextMapPress.current) return;
    if (selectedPin) handleCloseCard();
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
        onPoiClick={(e) => {
          const { name, coordinate } = e.nativeEvent;
          handlePinPress({
            type: 'nearby',
            id: `poi-${coordinate.latitude}-${coordinate.longitude}`,
            name,
            subtitle: '',
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          });
        }}
      >
        {/* Trip pins */}
        {pins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;
          const isItinerary = pin.type === 'itinerary';
          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => { e.stopPropagation(); handlePinPress(pin); }}
              style={{ zIndex: isSelected ? 10 : 1 }}
            >
              <View style={styles.markerContainer}>
                {isSelected && (
                  <View style={[styles.glowRing, isItinerary ? styles.glowOrange : styles.glowPurple]} />
                )}
                <View style={[
                  styles.pinCore,
                  isItinerary ? styles.bgOrange : styles.bgPurple,
                  isSelected ? styles.pinCoreSelected : styles.pinCoreDefault,
                ]}>
                  <View style={styles.whiteCenterDot} />
                </View>
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
            selectedPin.type === 'nearby' && styles.insightCardWrapper,
            {
              transform: [{
                translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }),
              }],
              opacity: cardAnim,
            },
          ]}
        >
          {selectedPin.type === 'nearby' ? (
            // ── Insight card for nearby places ──
            <LiquidGlassCard style={styles.insightCard} intensity={85}>
              {/* Header */}
              <View style={styles.cardContent}>
                <View style={[styles.cardIconBox, styles.bgTeal]}>
                  <Ionicons name={getCategoryIcon(selectedPin.category || '')} size={18} color={colors.white} />
                </View>
                <View style={styles.insightTitleBlock}>
                  <Text style={styles.cardName} numberOfLines={1}>{selectedPin.name}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.categoryText}>{selectedPin.category}</Text>
                    {(selectedPin.rating ?? 0) > 0 && (
                      <Text style={styles.ratingText}>
                        {'  ·  '}⭐ {selectedPin.rating!.toFixed(1)}
                        {(selectedPin.reviewCount ?? 0) > 0 ? ` · ${formatCount(selectedPin.reviewCount!)}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.cardClose} onPress={handleCloseCard}>
                  <Ionicons name="close" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* AI Content */}
              {insightLoading ? (
                <View style={styles.insightLoading}>
                  <ActivityIndicator size="small" color="#14B8A6" />
                  <Text style={styles.insightLoadingText}>AI analyzing this place…</Text>
                </View>
              ) : insightError ? (
                <Text style={styles.insightError}>Couldn't load insight — tap again to retry.</Text>
              ) : insight ? (
                <ScrollView
                  style={styles.insightScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <Text style={styles.insightSummary}>{insight.summary}</Text>

                  {insight.pros?.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>Pros</Text>
                      {insight.pros.map((pro, i) => (
                        <View key={i} style={styles.insightRow}>
                          <View style={[styles.insightDot, styles.dotGreen]} />
                          <Text style={styles.insightRowText}>{pro}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {insight.cons?.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>Cons</Text>
                      {insight.cons.map((con, i) => (
                        <View key={i} style={styles.insightRow}>
                          <View style={[styles.insightDot, styles.dotRed]} />
                          <Text style={styles.insightRowText}>{con}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {insight.keyFacts?.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>Good to know</Text>
                      {insight.keyFacts.map((fact, i) => (
                        <View key={i} style={styles.insightRow}>
                          <Ionicons name="information-circle" size={14} color="#60A5FA" style={{ marginRight: 8, marginTop: 1 }} />
                          <Text style={styles.insightRowText}>{fact}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              ) : null}
            </LiquidGlassCard>
          ) : (
            // ── Simple card for itinerary / hidden pins ──
            <LiquidGlassCard style={styles.bottomCardContainer} intensity={70}>
              <View style={styles.cardContent}>
                <View style={[
                  styles.cardIconBox,
                  selectedPin.type === 'itinerary' ? styles.bgOrange : styles.bgPurple,
                ]}>
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
            </LiquidGlassCard>
          )}
        </Animated.View>
      )}

      {/* Legend */}
      <View style={styles.legendContainer}>
        <LiquidGlassCard style={styles.legendPill} intensity={60}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.bgOrange]} />
            <Text style={styles.legendText}>Itinerary spots</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.bgPurple]} />
            <Text style={styles.legendText}>Hidden places</Text>
          </View>
        </LiquidGlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.md },
  map: { position: 'absolute', top: -100, left: -100, right: -100, bottom: -100 },

  // Markers
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, opacity: 0.25 },
  glowOrange: { backgroundColor: '#F97316' },
  glowPurple: { backgroundColor: '#A855F7' },
  glowTeal:   { backgroundColor: '#14B8A6' },
  pinCore: { justifyContent: 'center', alignItems: 'center', ...shadows.md },
  pinCoreDefault: { width: 20, height: 20, borderRadius: 10 },
  pinCoreSelected: { width: 26, height: 26, borderRadius: 13 },
  whiteCenterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  bgOrange: { backgroundColor: '#F97316', shadowColor: '#F97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  bgPurple: { backgroundColor: '#A855F7', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  bgTeal:   { backgroundColor: '#14B8A6', shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  markerLabel: {
    position: 'absolute', top: '100%', marginTop: 6,
    color: '#18181B', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden', textAlign: 'center', width: 100,
  },
  markerLabelSelected: { fontSize: 12, marginTop: 8, backgroundColor: '#fff', color: '#000', ...shadows.sm },

  // Nearby loading pill
  nearbyLoadingPill: {
    position: 'absolute', top: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(20,184,166,0.85)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  nearbyLoadingText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Bottom cards
  bottomCardWrapper: {
    position: 'absolute', bottom: 120, left: 16, right: 16,
    borderRadius: radius.xl, overflow: 'hidden',
  },
  insightCardWrapper: { bottom: 100 },
  bottomCardContainer: { padding: 16, borderRadius: radius.xl },
  insightCard: { padding: 16, borderRadius: radius.xl },

  // Shared card row
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  cardName: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  cardSubtitle: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 },
  cardClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },

  // Insight card specifics
  insightTitleBlock: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  categoryText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  ratingText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },

  insightLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  insightLoadingText: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginLeft: 10 },
  insightError: { color: colors.textSecondary, fontSize: typography.sizes.sm, paddingVertical: 8, fontStyle: 'italic' },

  insightScroll: { maxHeight: 220 },
  insightSummary: { color: colors.white, fontSize: typography.sizes.sm, lineHeight: 20, marginBottom: 12 },
  insightSection: { marginBottom: 10 },
  insightSectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4ADE80' },
  dotRed:   { backgroundColor: '#F87171' },
  insightRowText: { flex: 1, color: colors.white, fontSize: typography.sizes.sm, lineHeight: 18 },

  // Legend
  legendContainer: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 300, justifyContent: 'center' },
  legendPill: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.pill, overflow: 'hidden' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
});
