import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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
  TextInput,
  Keyboard,
  Linking,
} from 'react-native';
import MapView, { Marker, Region, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useApp, isTripUnlocked } from '../../store/AppContext';
import { colors, typography, radius, shadows } from '../../theme';
import LiquidGlassCard from '../../components/LiquidGlassCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
type PinType = 'itinerary' | 'hidden';
type RouteMode = 'driving' | 'walking';

interface ModernPinData {
  type: PinType;
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface NavStep {
  instruction: string;
  distance: number;   // meters to next maneuver
  duration: number;   // seconds
  maneuverType: string;
  maneuverModifier?: string;
  coordinate: { latitude: number; longitude: number };
}

interface RouteInfo {
  coords: { latitude: number; longitude: number }[];
  duration: number;
  distance: number;
  steps: NavStep[];
}

// ─── Pure helpers ────────────────────────────────────────────
function formatDuration(s: number): string {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatNavDist(m: number): string {
  if (m < 20) return 'Now';
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildInstruction(type: string, modifier: string | undefined, name: string): string {
  if (type === 'depart')   return name ? `Head onto ${name}` : 'Depart';
  if (type === 'arrive')   return 'You have arrived';
  if (type === 'roundabout' || type === 'rotary')
    return name ? `Enter the roundabout, take exit onto ${name}` : 'Enter the roundabout';
  if (type === 'exit roundabout' || type === 'exit rotary')
    return name ? `Exit the roundabout onto ${name}` : 'Exit the roundabout';
  if (type === 'merge')    return name ? `Merge onto ${name}` : 'Merge';
  if (type === 'on ramp')  return name ? `Take the ramp onto ${name}` : 'Take the ramp';
  if (type === 'off ramp') return name ? `Take the exit onto ${name}` : 'Take the exit';
  if (type === 'fork')     return modifier?.includes('left') ? 'Keep left at the fork' : 'Keep right at the fork';
  const dirMap: Record<string, string> = {
    uturn:         'Make a U-turn',
    'sharp right': 'Turn sharp right',
    right:         'Turn right',
    'slight right':'Keep slight right',
    straight:      'Continue straight',
    'slight left': 'Keep slight left',
    left:          'Turn left',
    'sharp left':  'Turn sharp left',
  };
  const dir = modifier ? (dirMap[modifier] ?? 'Continue') : 'Continue';
  return name ? `${dir} onto ${name}` : dir;
}

function maneuverIcon(type: string, modifier?: string): keyof typeof Ionicons.glyphMap {
  if (type === 'arrive')   return 'flag-outline';
  if (type === 'depart')   return 'navigate-outline';
  if (type === 'roundabout' || type === 'rotary') return 'reload-outline';
  const m = modifier ?? '';
  if (m === 'uturn')           return 'arrow-undo-outline';
  if (m.includes('sharp right') || m === 'right') return 'arrow-forward-outline';
  if (m.includes('sharp left')  || m === 'left')  return 'arrow-back-outline';
  if (m.includes('slight right')) return 'arrow-up-outline';
  if (m.includes('slight left'))  return 'arrow-up-outline';
  return 'arrow-up-outline';
}

// ─── OSRM fetch ──────────────────────────────────────────────
async function fetchOsrmRoute(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number,
  mode: RouteMode,
): Promise<RouteInfo | null> {
  try {
    const base = mode === 'driving'
      ? 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
      : 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
    const url = `${base}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
    const res  = await fetch(url, { headers: { 'User-Agent': 'OffpathApp/1.0' } });
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) return null;

    const route = json.routes[0];
    const coords = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => ({ latitude: lat, longitude: lng }),
    );

    const rawSteps: any[] = route.legs?.[0]?.steps ?? [];
    const steps: NavStep[] = rawSteps.map((s) => ({
      instruction:      buildInstruction(s.maneuver.type, s.maneuver.modifier, s.name ?? ''),
      distance:         s.distance,
      duration:         s.duration,
      maneuverType:     s.maneuver.type,
      maneuverModifier: s.maneuver.modifier,
      coordinate: {
        latitude:  s.maneuver.location[1],
        longitude: s.maneuver.location[0],
      },
    }));

    return { coords, duration: route.duration, distance: route.distance, steps };
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────
export default function MapTab() {
  const { state } = useApp();
  const plan      = state.plan;
  const isPremium = isTripUnlocked(state, plan?.id);

  // Existing pin card
  const [selectedPin, setSelectedPin] = useState<ModernPinData | null>(null);
  const suppressNextMapPress = useRef(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Search
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef    = useRef<TextInput>(null);

  // Directions
  const [destMarker,   setDestMarker]   = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [drivingRoute, setDrivingRoute] = useState<RouteInfo | null>(null);
  const [walkingRoute, setWalkingRoute] = useState<RouteInfo | null>(null);
  const [routeMode,    setRouteMode]    = useState<RouteMode>('driving');
  const [routeLoading, setRouteLoading] = useState(false);
  const routeCardAnim = useRef(new Animated.Value(0)).current;

  // Navigation (turn-by-turn)
  const [isNavigating,   setIsNavigating]   = useState(false);
  const [navRoute,       setNavRoute]       = useState<RouteInfo | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [distToNext,     setDistToNext]     = useState<number | null>(null);
  const currentStepIdxRef  = useRef(0);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const navBannerAnim = useRef(new Animated.Value(0)).current;
  const navBottomAnim = useRef(new Animated.Value(0)).current;

  // User location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Search dropdown animation
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const mapRef = useRef<MapView>(null);

  // Keep step-idx ref in sync
  useEffect(() => { currentStepIdxRef.current = currentStepIdx; }, [currentStepIdx]);

  // Cleanup watcher on unmount
  useEffect(() => () => { locationWatcherRef.current?.remove(); }, []);

  // Get user location once on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // ── Trip pins ─────────────────────────────────────────────
  const pins = useMemo<ModernPinData[]>(() => {
    if (!plan) return [];
    const result: ModernPinData[] = [];
    const days = plan.fullDays?.length ? plan.fullDays : plan.previewDays || [];
    days.forEach((day) => {
      const stopCount = day.moments?.length || 0;
      day.moments?.forEach((moment, idx) => {
        const isLocked = !isPremium && stopCount > 2 && idx === stopCount - 1;
        if (isLocked || !moment.coordinate) return;
        result.push({
          type: 'itinerary',
          id: moment.id,
          name: moment.title,
          subtitle: `${day.title || `Day ${day.dayNumber}`} · ${moment.timeLabel}`,
          latitude: moment.coordinate.latitude,
          longitude: moment.coordinate.longitude,
        });
      });
    });
    const visibleHidden = isPremium ? plan.hiddenPlaces || [] : (plan.hiddenPlaces || []).slice(0, 2);
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

  // ── Pin press ─────────────────────────────────────────────
  const handlePinPress = useCallback((pin: ModernPinData) => {
    if (isNavigating) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSelectedPin(pin);
    Animated.spring(cardAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }).start();
    suppressNextMapPress.current = true;
    setTimeout(() => { suppressNextMapPress.current = false; }, 300);
    mapRef.current?.animateToRegion({ latitude: pin.latitude, longitude: pin.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 400);
    Keyboard.dismiss();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating]);

  const handleClosePinCard = () => {
    Animated.timing(cardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSelectedPin(null));
  };

  const handleMapPress = () => {
    if (suppressNextMapPress.current) return;
    if (selectedPin) handleClosePinCard();
    Keyboard.dismiss();
  };

  // ── Search ────────────────────────────────────────────────
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    Animated.timing(dropdownAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
  }, [dropdownAnim]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      Animated.timing(dropdownAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const lat      = centerCoord?.latitude  ?? 0;
        const lng      = centerCoord?.longitude ?? 0;
        const cityName = plan?.destinationCity  ?? '';
        const delta    = 0.5;
        const viewbox  = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
        const q        = cityName ? `${text}, ${cityName}` : text;
        const url      = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=7&viewbox=${viewbox}&addressdetails=0`;
        const res      = await fetch(url, { headers: { 'User-Agent': 'OffpathApp/1.0', 'Accept-Language': 'en' } });
        const data: SearchResult[] = await res.json();
        setSearchResults(data.slice(0, 7));
        Animated.spring(dropdownAnim, { toValue: data.length > 0 ? 1 : 0, damping: 18, stiffness: 200, useNativeDriver: true }).start();
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // ── Fetch both routes ─────────────────────────────────────
  const fetchRoutes = async (toLat: number, toLng: number) => {
    const fromLat = userLocation?.lat ?? centerCoord?.latitude  ?? toLat;
    const fromLng = userLocation?.lng ?? centerCoord?.longitude ?? toLng;
    setRouteLoading(true);
    setDrivingRoute(null);
    setWalkingRoute(null);
    const [driving, walking] = await Promise.all([
      fetchOsrmRoute(fromLat, fromLng, toLat, toLng, 'driving'),
      fetchOsrmRoute(fromLat, fromLng, toLat, toLng, 'walking'),
    ]);
    setDrivingRoute(driving);
    setWalkingRoute(walking);
    setRouteMode('driving');
    setRouteLoading(false);
  };

  // ── Select search result ──────────────────────────────────
  const handleSearchSelect = async (result: SearchResult) => {
    const lat  = parseFloat(result.lat);
    const lng  = parseFloat(result.lon);
    const name = result.display_name.split(',')[0].trim();
    clearSearch();
    Keyboard.dismiss();
    setDestMarker({ name, lat, lng });
    Animated.spring(routeCardAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }).start();
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
    await fetchRoutes(lat, lng);
  };

  // ── Clear directions ──────────────────────────────────────
  const clearDirections = () => {
    stopNavigation();
    Animated.timing(routeCardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setDestMarker(null);
      setDrivingRoute(null);
      setWalkingRoute(null);
    });
  };

  // ── START navigation ──────────────────────────────────────
  const startNavigation = async () => {
    const route = routeMode === 'driving' ? drivingRoute : walkingRoute;
    if (!route || route.steps.length === 0) { openNativeMaps(); return; }

    setNavRoute(route);
    setCurrentStepIdx(0);
    setDistToNext(route.steps[0]?.distance ?? null);
    setIsNavigating(true);
    clearSearch();
    Keyboard.dismiss();

    // Animate UI in
    Animated.parallel([
      Animated.spring(navBannerAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
      Animated.spring(navBottomAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
    ]).start();

    // Zoom map to first step
    const firstStep = route.steps[0];
    if (firstStep) {
      mapRef.current?.animateCamera({
        center:   { latitude: firstStep.coordinate.latitude, longitude: firstStep.coordinate.longitude },
        pitch:    50,
        heading:  0,
        altitude: 400,
        zoom:     17,
      }, { duration: 600 });
    }

    // Start location watch
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationWatcherRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude, heading } = loc.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const steps  = route.steps;
        const idx    = currentStepIdxRef.current;
        const step   = steps[idx];
        if (!step) return;

        const dist = haversine(latitude, longitude, step.coordinate.latitude, step.coordinate.longitude);
        setDistToNext(dist);

        // Advance to next step when close enough
        if (dist < 40 && idx < steps.length - 1) {
          const next = idx + 1;
          currentStepIdxRef.current = next;
          setCurrentStepIdx(next);
        }

        // Follow camera with heading tilt
        mapRef.current?.animateCamera({
          center:   { latitude, longitude },
          pitch:    50,
          heading:  heading ?? 0,
          altitude: 300,
          zoom:     18,
        }, { duration: 800 });
      },
    );
  };

  // ── STOP navigation ───────────────────────────────────────
  const stopNavigation = () => {
    locationWatcherRef.current?.remove();
    locationWatcherRef.current = null;
    Animated.parallel([
      Animated.timing(navBannerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(navBottomAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setIsNavigating(false);
      setNavRoute(null);
      setCurrentStepIdx(0);
      currentStepIdxRef.current = 0;
      setDistToNext(null);
    });
    // Restore overview
    if (centerCoord) {
      mapRef.current?.animateCamera({
        center:   { latitude: centerCoord.latitude, longitude: centerCoord.longitude },
        pitch:    0,
        heading:  0,
        altitude: 5000,
        zoom:     13,
      }, { duration: 600 });
    }
  };

  // ── Open native Maps ──────────────────────────────────────
  const openNativeMaps = () => {
    if (!destMarker) return;
    const { lat, lng } = destMarker;
    const url = Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}&dirflg=${routeMode === 'driving' ? 'd' : 'w'}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${routeMode === 'driving' ? 'driving' : 'walking'}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
    );
  };

  if (!plan || !initialRegion) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No map data available</Text>
      </View>
    );
  }

  // Derived nav values
  const activeRoute    = isNavigating ? navRoute : (routeMode === 'driving' ? drivingRoute : walkingRoute);
  const currentStep    = navRoute?.steps[currentStepIdx];
  const nextStep       = navRoute?.steps[currentStepIdx + 1];
  const remainingSteps = navRoute?.steps.slice(currentStepIdx) ?? [];
  const remainingDist  = remainingSteps.reduce((s, step) => s + step.distance, 0);
  const remainingTime  = remainingSteps.reduce((s, step) => s + step.duration, 0);

  // Split route: grey (done) + colored (remaining) during navigation
  const routeColor = routeMode === 'driving' ? '#3B82F6' : '#10B981';

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
        {/* Route polyline */}
        {activeRoute && (
          <Polyline
            coordinates={activeRoute.coords}
            strokeColor={routeColor}
            strokeWidth={5}
            lineDashPattern={routeMode === 'walking' ? [10, 7] : undefined}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Destination marker */}
        {destMarker && (
          <Marker coordinate={{ latitude: destMarker.lat, longitude: destMarker.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerContainer}>
              <View style={[styles.glowRing, styles.glowBlue]} />
              <View style={[styles.pinCore, styles.bgBlue, styles.pinCoreSelected]}>
                <Ionicons name="flag" size={13} color="#fff" />
              </View>
              <Text style={[styles.markerLabel, styles.markerLabelSelected]}>{destMarker.name}</Text>
            </View>
          </Marker>
        )}

        {/* Trip pins */}
        {!isNavigating && pins.map((pin) => {
          const isSelected  = selectedPin?.id === pin.id;
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
                {isSelected && <View style={[styles.glowRing, isItinerary ? styles.glowOrange : styles.glowPurple]} />}
                <View style={[styles.pinCore, isItinerary ? styles.bgOrange : styles.bgPurple, isSelected ? styles.pinCoreSelected : styles.pinCoreDefault]}>
                  <View style={styles.whiteCenterDot} />
                </View>
                <Text style={[styles.markerLabel, isSelected && styles.markerLabelSelected]}>{pin.name}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Search bar (always visible, hidden during navigation) ── */}
      {!isNavigating && (
        <View style={styles.searchContainer} pointerEvents="box-none">
          <LiquidGlassCard style={styles.searchPill} intensity={75}>
            <View style={styles.searchIconBtn}>
              <Ionicons name="search" size={20} color={colors.white} />
            </View>
            <View style={styles.searchInputArea}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search any place…"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onSubmitEditing={() => {
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  if (searchQuery.trim()) handleSearchChange(searchQuery);
                }}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchLoading
                ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 12 }} />
                : searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.searchClearBtn} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )
              }
            </View>
          </LiquidGlassCard>

          {/* Dropdown */}
          {searchResults.length > 0 && (
            <Animated.View
              style={[
                styles.dropdownWrapper,
                { opacity: dropdownAnim, transform: [{ translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
              ]}
            >
              <LiquidGlassCard style={styles.dropdownCard} intensity={80}>
                <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {searchResults.map((item, idx) => {
                    const name = item.display_name.split(',')[0].trim();
                    const sub  = item.display_name.split(',').slice(1, 3).join(',').trim();
                    return (
                      <TouchableOpacity
                        key={item.place_id}
                        style={[styles.dropdownRow, idx < searchResults.length - 1 && styles.dropdownRowBorder]}
                        onPress={() => handleSearchSelect(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.dropdownIcon, styles.bgBlue]}>
                          <Ionicons name="location" size={14} color={colors.white} />
                        </View>
                        <View style={styles.dropdownTextBlock}>
                          <Text style={styles.dropdownName} numberOfLines={1}>{name}</Text>
                          {!!sub && <Text style={styles.dropdownSub} numberOfLines={1}>{sub}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </LiquidGlassCard>
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Turn-by-turn banner (top, during navigation) ── */}
      {isNavigating && currentStep && (
        <Animated.View
          style={[
            styles.navBannerWrapper,
            {
              opacity: navBannerAnim,
              transform: [{ translateY: navBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }],
            },
          ]}
        >
          <LiquidGlassCard style={styles.navBannerCard} intensity={90}>
            {/* Main instruction */}
            <View style={styles.navMainRow}>
              <View style={[styles.navIconCircle, { backgroundColor: routeMode === 'driving' ? '#3B82F6' : '#10B981' }]}>
                <Ionicons name={maneuverIcon(currentStep.maneuverType, currentStep.maneuverModifier)} size={28} color="#fff" />
              </View>
              <View style={styles.navTextBlock}>
                <Text style={styles.navInstruction} numberOfLines={2}>{currentStep.instruction}</Text>
                <Text style={[styles.navDistance, { color: routeMode === 'driving' ? '#60A5FA' : '#34D399' }]}>
                  {formatNavDist(distToNext ?? currentStep.distance)}
                </Text>
              </View>
            </View>
            {/* Next step preview */}
            {nextStep && (
              <View style={styles.navNextRow}>
                <Ionicons name="arrow-forward" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.navNextText} numberOfLines={1}>
                  Then: {nextStep.instruction}
                </Text>
              </View>
            )}
          </LiquidGlassCard>
        </Animated.View>
      )}

      {/* ── Directions card (pre-navigation) ── */}
      {destMarker && !isNavigating && (
        <Animated.View
          style={[
            styles.routeCardWrapper,
            {
              transform: [{ translateY: routeCardAnim.interpolate({ inputRange: [0, 1], outputRange: [280, 0] }) }],
              opacity: routeCardAnim,
            },
          ]}
        >
          <LiquidGlassCard style={styles.routeCard} intensity={85}>
            {/* Header */}
            <View style={styles.routeHeader}>
              <View style={[styles.routeIconBox, styles.bgBlue]}>
                <Ionicons name="navigate" size={18} color={colors.white} />
              </View>
              <View style={styles.routeTitleBlock}>
                <Text style={styles.routeName} numberOfLines={1}>{destMarker.name}</Text>
                <Text style={styles.routeSub}>{userLocation ? 'From your location' : 'From city centre'}</Text>
              </View>
              <TouchableOpacity style={styles.cardClose} onPress={clearDirections}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Mode toggle */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, routeMode === 'driving' && styles.modeBtnDriveActive]}
                onPress={() => setRouteMode('driving')}
                activeOpacity={0.8}
              >
                <Ionicons name="car" size={16} color={routeMode === 'driving' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.modeBtnText, routeMode === 'driving' && styles.modeBtnTextActive]}>
                  Drive{drivingRoute ? `  ${formatDuration(drivingRoute.duration)}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, routeMode === 'walking' && styles.modeBtnWalkActive]}
                onPress={() => setRouteMode('walking')}
                activeOpacity={0.8}
              >
                <Ionicons name="walk" size={16} color={routeMode === 'walking' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.modeBtnText, routeMode === 'walking' && styles.modeBtnTextActive]}>
                  Walk{walkingRoute ? `  ${formatDuration(walkingRoute.duration)}` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ETA + Start */}
            {routeLoading ? (
              <View style={styles.etaLoading}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.etaLoadingText}>Calculating route…</Text>
              </View>
            ) : activeRoute ? (
              <View style={styles.startRow}>
                <View style={styles.etaInfo}>
                  <Text style={styles.etaTime}>{formatDuration(activeRoute.duration)}</Text>
                  <Text style={styles.etaDist}>{formatDistance(activeRoute.distance)}</Text>
                </View>
                <TouchableOpacity style={styles.startBtn} onPress={startNavigation} activeOpacity={0.85}>
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.startBtnText}>Start</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.routeError}>Route unavailable.</Text>
            )}
          </LiquidGlassCard>
        </Animated.View>
      )}

      {/* ── Navigation bottom bar ── */}
      {isNavigating && (
        <Animated.View
          style={[
            styles.navBottomWrapper,
            {
              opacity: navBottomAnim,
              transform: [{ translateY: navBottomAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }],
            },
          ]}
        >
          <LiquidGlassCard style={styles.navBottomCard} intensity={85}>
            <View style={styles.navBottomRow}>
              <View>
                <Text style={styles.navRemainingTime}>{formatDuration(remainingTime)}</Text>
                <Text style={styles.navRemainingDist}>{formatDistance(remainingDist)}</Text>
              </View>
              <TouchableOpacity style={styles.endNavBtn} onPress={stopNavigation} activeOpacity={0.85}>
                <Text style={styles.endNavBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          </LiquidGlassCard>
        </Animated.View>
      )}

      {/* ── Pin card ── */}
      {selectedPin && !isNavigating && (
        <Animated.View
          style={[
            styles.bottomCardWrapper,
            { transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }], opacity: cardAnim },
          ]}
        >
          <LiquidGlassCard style={styles.bottomCardContainer} intensity={70}>
            <View style={styles.cardContent}>
              <View style={[styles.cardIconBox, selectedPin.type === 'itinerary' ? styles.bgOrange : styles.bgPurple]}>
                <Ionicons name={selectedPin.type === 'itinerary' ? 'sparkles' : 'eye-off'} size={18} color={colors.white} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{selectedPin.name}</Text>
                <Text style={styles.cardSubtitle}>{selectedPin.subtitle}</Text>
              </View>
              <TouchableOpacity style={styles.cardClose} onPress={handleClosePinCard}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </LiquidGlassCard>
        </Animated.View>
      )}

      {/* ── Legend (hidden during navigation) ── */}
      {!isNavigating && !destMarker && (
        <View style={styles.legendContainer}>
          <LiquidGlassCard style={styles.legendPill} intensity={60}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.bgOrange]} />
              <Text style={styles.legendText}>Itinerary</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.bgPurple]} />
              <Text style={styles.legendText}>Hidden</Text>
            </View>
          </LiquidGlassCard>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.md },
  map: { position: 'absolute', top: -100, left: -100, right: -100, bottom: -100 },

  // Markers
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, opacity: 0.3 },
  glowOrange: { backgroundColor: '#F97316' },
  glowPurple: { backgroundColor: '#A855F7' },
  glowBlue:   { backgroundColor: '#3B82F6' },
  pinCore: { justifyContent: 'center', alignItems: 'center', ...shadows.md },
  pinCoreDefault:  { width: 20, height: 20, borderRadius: 10 },
  pinCoreSelected: { width: 28, height: 28, borderRadius: 14 },
  whiteCenterDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  bgOrange: { backgroundColor: '#F97316', shadowColor: '#F97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  bgPurple: { backgroundColor: '#A855F7', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  bgBlue:   { backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  markerLabel: {
    position: 'absolute', top: '100%', marginTop: 6,
    color: '#18181B', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden', textAlign: 'center', width: 100,
  },
  markerLabelSelected: { fontSize: 12, marginTop: 8, backgroundColor: '#fff', color: '#000', ...shadows.sm },

  // Search bar
  searchContainer: { position: 'absolute', top: 54, left: 16, right: 16, zIndex: 100 },
  searchPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, height: 48, overflow: 'hidden' },
  searchIconBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  searchInputArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, color: colors.white, fontSize: typography.sizes.base, paddingVertical: 0 },
  searchClearBtn: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },

  // Dropdown
  dropdownWrapper: { marginTop: 6, width: SCREEN_W - 32, borderRadius: radius.xl, overflow: 'hidden' },
  dropdownCard:    { borderRadius: radius.xl, overflow: 'hidden' },
  dropdownRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  dropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dropdownIcon:    { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  dropdownTextBlock: { flex: 1, marginRight: 8 },
  dropdownName: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  dropdownSub:  { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },

  // Navigation top banner
  navBannerWrapper: { position: 'absolute', top: 54, left: 16, right: 16, zIndex: 100 },
  navBannerCard:    { padding: 16, borderRadius: radius.xl },
  navMainRow:       { flexDirection: 'row', alignItems: 'center' },
  navIconCircle:    { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16, flexShrink: 0 },
  navTextBlock:     { flex: 1 },
  navInstruction:   { color: colors.white, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, lineHeight: 26 },
  navDistance:      { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, marginTop: 4 },
  navNextRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  navNextText:      { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.sm },

  // Directions card (pre-nav)
  routeCardWrapper: { position: 'absolute', bottom: 110, left: 16, right: 16, borderRadius: radius.xl, overflow: 'hidden' },
  routeCard:        { padding: 16, borderRadius: radius.xl },
  routeHeader:      { flexDirection: 'row', alignItems: 'center' },
  routeIconBox:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  routeTitleBlock:  { flex: 1 },
  routeName: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  routeSub:  { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },

  modeRow:  { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  modeBtnDriveActive: { backgroundColor: '#3B82F6' },
  modeBtnWalkActive:  { backgroundColor: '#10B981' },
  modeBtnText:       { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  modeBtnTextActive: { color: colors.white },

  etaLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  etaLoadingText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etaInfo:  { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  etaTime:  { color: colors.white, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  etaDist:  { color: colors.textSecondary, fontSize: typography.sizes.sm },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: radius.pill,
    paddingHorizontal: 22, paddingVertical: 12,
    ...shadows.md,
  },
  startBtnText: { color: '#fff', fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  routeError: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontStyle: 'italic' },

  // Navigation bottom HUD
  navBottomWrapper: { position: 'absolute', bottom: 100, left: 16, right: 16, borderRadius: radius.xl, overflow: 'hidden' },
  navBottomCard:    { padding: 16, borderRadius: radius.xl },
  navBottomRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRemainingTime: { color: colors.white, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  navRemainingDist: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 },
  endNavBtn: {
    backgroundColor: '#EF4444', borderRadius: radius.pill,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  endNavBtnText: { color: '#fff', fontSize: typography.sizes.base, fontWeight: typography.weights.bold },

  // Pin card
  bottomCardWrapper:     { position: 'absolute', bottom: 120, left: 16, right: 16, borderRadius: radius.xl, overflow: 'hidden' },
  bottomCardContainer:   { padding: 16, borderRadius: radius.xl },
  cardContent:  { flexDirection: 'row', alignItems: 'center' },
  cardIconBox:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardInfo:     { flex: 1 },
  cardName:     { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  cardSubtitle: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 },
  cardClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },

  // Legend
  legendContainer: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 260, justifyContent: 'center' },
  legendPill:  { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.pill, overflow: 'hidden' },
  legendItem:  { flexDirection: 'row', alignItems: 'center' },
  legendDot:   { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText:  { color: colors.white, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
});
