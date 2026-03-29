// Offpath — Cinematic Generating Screen
// Real map with geodesic arc, animated plane, camera zoom, pulsing markers
// Animation runs immediately with estimated destination; API runs concurrently.
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useApp } from '../../store/AppContext';
import { api, pickSurpriseCity } from '../../services/api';
import { colors } from '../../theme';
import { LocationCoordinate } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MIN_DURATION = 9500;
const FLIGHT_DURATION = 6600;
const ZOOM_START_MS = 5600;    // 85% of 6.6s
const ZOOM_DURATION = 2500;
const ARC_SEGMENTS = 80;

// ─── Geocode any city using device's built-in geocoder ─────
// Falls back to a small cache for instant results
const FALLBACK_COORDS: Record<string, LocationCoordinate> = {
  'paris':     { latitude: 48.8566, longitude: 2.3522 },
  'london':    { latitude: 51.5074, longitude: -0.1278 },
  'rome':      { latitude: 41.9028, longitude: 12.4964 },
  'tokyo':     { latitude: 35.6762, longitude: 139.6503 },
  'new york':  { latitude: 40.7128, longitude: -74.0060 },
  'tirana':    { latitude: 41.3275, longitude: 19.8187 },
  'barcelona': { latitude: 41.3874, longitude: 2.1686 },
  'istanbul':  { latitude: 41.0082, longitude: 28.9784 },
  'dubai':     { latitude: 25.2048, longitude: 55.2708 },
};

const DEFAULT_ORIGIN: LocationCoordinate = { latitude: 41.3275, longitude: 19.8187 }; // Tirana
const DEFAULT_DEST: LocationCoordinate = { latitude: 48.8566, longitude: 2.3522 };    // Paris

// Geocode a city name → coordinates (works for ANY city on earth)
async function geocodeCity(cityName: string): Promise<LocationCoordinate> {
  const key = cityName.toLowerCase().trim();

  // 1) Instant fallback check
  for (const [name, coord] of Object.entries(FALLBACK_COORDS)) {
    if (key.includes(name) || name.includes(key)) {
      return coord;
    }
  }

  // 2) Use device geocoder (supports every city worldwide)
  try {
    const results = await Location.geocodeAsync(cityName);
    if (results.length > 0) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }
  } catch (err) {
    console.warn('[GEO] Geocoding failed for', cityName, err);
  }

  return DEFAULT_DEST;
}

const LOADING_MESSAGES = [
  'Reading the city...',
  'Finding local spots...',
  'Building your days...',
  'Adding the details...',
  'Almost ready...',
];

// ─── Geodesic arc math ─────────────────────────────────────
function computeGeodesicArc(
  origin: LocationCoordinate,
  dest: LocationCoordinate,
  segments: number,
  bulge = 0.35,
): LocationCoordinate[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(origin.latitude);
  const lon1 = toRad(origin.longitude);
  const lat2 = toRad(dest.latitude);
  const lon2 = toRad(dest.longitude);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2),
    ),
  );

  if (d < 0.0001) {
    return [origin, dest];
  }

  const points: LocationCoordinate[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    let lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    lat += bulge * Math.sin(f * Math.PI) * d;
    points.push({ latitude: toDeg(lat), longitude: toDeg(lon) });
  }
  return points;
}

function regionForCoordinates(a: LocationCoordinate, b: LocationCoordinate) {
  const midLat = (a.latitude + b.latitude) / 2;
  const midLon = (a.longitude + b.longitude) / 2;
  const dLat = Math.abs(a.latitude - b.latitude);
  const dLon = Math.abs(a.longitude - b.longitude);
  return {
    latitude: midLat,
    longitude: midLon,
    latitudeDelta: Math.max(dLat * 1.6, 15),
    longitudeDelta: Math.max(dLon * 1.6, 15),
  };
}

// ─── Dark map style ────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }, { weight: 0.5 }] },
];

// ─── Main Component ────────────────────────────────────────
export default function GeneratingScreen() {
  const { state, actions } = useApp();

  // Resolve surprise city synchronously before any effects so both
  // the animation geocoding and the API call use the exact same city.
  const resolvedAnswers = useMemo(() => {
    const a = state.sessionAnswers;
    const isSurprise =
      !a.destination?.trim() ||
      a.destination === 'suggest' ||
      a.destinationMode === 'suggest';
    if (!isSurprise) return a;
    const city = pickSurpriseCity(a);
    return { ...a, destination: city, destinationMode: 'know' as const };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [msgIndex, setMsgIndex] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [planeIdx, setPlaneIdx] = useState(0);
  const [trailEnd, setTrailEnd] = useState(0);
  const [realDestCoord, setRealDestCoord] = useState<LocationCoordinate | null>(null);

  const mapRef = useRef<MapView>(null);
  const flightProgress = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const originPulseAnim = useRef(new Animated.Value(1)).current;
  const destPulseAnim = useRef(new Animated.Value(0.4)).current;
  const originRingAnim = useRef(new Animated.Value(1)).current;
  const destRingAnim = useRef(new Animated.Value(1)).current;

  const [origin, setOrigin] = useState<LocationCoordinate>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<LocationCoordinate>(DEFAULT_DEST);
  const [ready, setReady] = useState(false);
  const flightStarted = useRef(false);

  // ─── Resolve destination for animation ───────────────────
  // For surprise mode, the API picks a city in api.ts, so by the time
  // this runs, `answers.destination` may be empty. We use a fallback
  // world city and update once API returns the real destination.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Get user location (parallel)
      const originPromise = (async (): Promise<LocationCoordinate> => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          }
        } catch {}
        return DEFAULT_ORIGIN;
      })();

      // 2) Geocode the resolved destination (surprise city already picked above)
      const destName = resolvedAnswers.destination?.trim();
      const destPromise = destName ? geocodeCity(destName) : Promise.resolve(DEFAULT_DEST);

      const [resolvedOrigin, resolvedDest] = await Promise.all([originPromise, destPromise]);

      if (!cancelled) {
        console.log('[GEO] Origin:', resolvedOrigin.latitude.toFixed(4), resolvedOrigin.longitude.toFixed(4));
        console.log('[GEO] Dest:', resolvedDest.latitude.toFixed(4), resolvedDest.longitude.toFixed(4));
        setOrigin(resolvedOrigin);
        setDestination(resolvedDest);
        setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Compute arc when ready
  const arcPoints = useMemo(() => {
    if (!ready) return [];
    return computeGeodesicArc(origin, destination, ARC_SEGMENTS);
  }, [ready, origin, destination]);

  const planePos = arcPoints[planeIdx] || origin;
  const trailCoords = arcPoints.slice(0, trailEnd);

  // ─── Fade in ────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // ─── Pulsing markers ────────────────────────────────────
  useEffect(() => {
    const pulse = (opacity: Animated.Value, ring: Animated.Value) =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring, { toValue: 2, duration: 2000, useNativeDriver: true }),
            Animated.timing(ring, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
    pulse(originPulseAnim, originRingAnim).start();
    pulse(destPulseAnim, destRingAnim).start();
  }, []);

  // ─── Cycling messages ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setMsgIndex((p) => (p + 1) % LOADING_MESSAGES.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // ─── Flight animation — starts as soon as arc is ready ──
  useEffect(() => {
    if (!ready || arcPoints.length < 2 || flightStarted.current) return;
    flightStarted.current = true;
    console.log('[ANIM] Starting flight animation');

    // Frame map on both points
    setTimeout(() => {
      try { mapRef.current?.animateToRegion(regionForCoordinates(origin, destination), 1000); } catch {}
    }, 300);

    // Poll plane position at ~20fps
    let lastIdx = -1;
    const ticker = setInterval(() => {
      const val = (flightProgress as any).__getValue?.() ?? 0;
      const idx = Math.min(Math.floor(val * ARC_SEGMENTS), ARC_SEGMENTS);
      if (idx !== lastIdx) {
        lastIdx = idx;
        setPlaneIdx(idx);
        setTrailEnd(idx + 1);
      }
    }, 50);

    // Fly plane (6.6s)
    Animated.timing(flightProgress, {
      toValue: 1, duration: FLIGHT_DURATION, useNativeDriver: false,
    }).start();

    // Zoom into destination at 85%
    const zoomTimer = setTimeout(() => {
      try {
        const zoomTarget = realDestCoord || destination;
        mapRef.current?.animateCamera(
          { center: zoomTarget, pitch: 45, heading: 0, zoom: 12, altitude: 5000 },
          { duration: ZOOM_DURATION },
        );
      } catch {}
    }, ZOOM_START_MS);

    // Min duration timer
    const doneTimer = setTimeout(() => { setAnimDone(true); }, MIN_DURATION);

    return () => {
      clearInterval(ticker);
      clearTimeout(zoomTimer);
      clearTimeout(doneTimer);
    };
  }, [ready, arcPoints]);

  // ─── API call (always concurrent) ───────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log('[GEN] Starting trip generation...');
        const plan = await api.generateTrip(resolvedAnswers);
        if (cancelled) return;

        console.log('[GEN] Trip generated:', plan?.destinationCity);

        // Save real coordinates for camera zoom
        if (plan?.destinationCoordinate) {
          setRealDestCoord(plan.destinationCoordinate);
        } else if (plan?.heroCoordinate) {
          setRealDestCoord(plan.heroCoordinate);
        }

        await actions.setPlan(plan);
      } catch (err) {
        console.error('[GEN] Trip generation failed:', err);
      } finally {
        if (!cancelled) setApiDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Exit gate: both animation AND api must finish ──────
  useEffect(() => {
    if (apiDone && animDone) {
      // Small delay so zoom finishes visually
      setTimeout(() => {
        if (state.plan) {
          actions.setPhase('stories');
        } else {
          // API failed — go back to onboarding
          console.warn('[GEN] No plan available, returning to onboarding');
          actions.setPhase('onboarding');
        }
      }, 300);
    }
  }, [apiDone, animDone, state.plan]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={regionForCoordinates(origin, destination)}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsScale={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
      >
        {/* Full arc path (faint dashed) */}
        <Polyline
          coordinates={arcPoints}
          strokeColor="rgba(255,255,255,0.06)"
          strokeWidth={1.5}
          lineDashPattern={[6, 6]}
        />

        {/* Traveled trail (bright orange) */}
        {trailCoords.length > 1 && (
          <Polyline
            coordinates={trailCoords}
            strokeColor="rgba(249,115,22,0.7)"
            strokeWidth={3}
          />
        )}

        {/* Origin marker — pulsing blue */}
        <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.markerWrap}>
            <Animated.View
              style={[styles.markerRing, styles.blueRing, {
                opacity: Animated.multiply(originPulseAnim, 0.3),
                transform: [{ scale: originRingAnim }],
              }]}
            />
            <Animated.View style={[styles.markerDot, styles.blueDot, { opacity: originPulseAnim }]} />
          </View>
        </Marker>

        {/* Destination marker — pulsing orange */}
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.markerWrap}>
            <Animated.View
              style={[styles.markerRing, styles.orangeRing, {
                opacity: Animated.multiply(destPulseAnim, 0.3),
                transform: [{ scale: destRingAnim }],
              }]}
            />
            <Animated.View style={[styles.markerDot, styles.orangeDot, { opacity: destPulseAnim }]} />
          </View>
        </Marker>

        {/* Plane */}
        <Marker coordinate={planePos} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={true}>
          <View style={styles.planeWrap}>
            <View style={styles.planeGlow} />
            <Text style={styles.planeEmoji}>✈️</Text>
          </View>
        </Marker>
      </MapView>

      {/* Bottom content overlay */}
      <View style={styles.bottomOverlay}>
        <LinearGradient
          colors={['transparent', 'rgba(13,17,23,0.9)', '#0d1117']}
          style={styles.bottomFade}
        />
        <View style={styles.bottomCard}>
          {/* Destination heading */}
          <Text style={styles.buildingLabel}>Crafting your trip to</Text>
          <Text style={styles.buildingCity}>
            {resolvedAnswers.destination || 'your destination'}
          </Text>

          {/* Step list */}
          <View style={styles.stepsList}>
            {LOADING_MESSAGES.map((msg, i) => {
              const isDone = i < msgIndex;
              const isActive = i === msgIndex;
              return (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    {isDone ? (
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#F97316" />
                    ) : (
                      <View style={styles.stepDot} />
                    )}
                  </View>
                  <Text style={[
                    styles.stepText,
                    isDone && styles.stepDone,
                    isActive && styles.stepActive,
                  ]}>
                    {msg}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', overflow: 'hidden' },
  map: {
    position: 'absolute',
    top: -100,
    bottom: -100,
    left: -100,
    right: -100,
  },

  // Markers
  markerWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  markerRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  blueRing: { borderColor: '#3B82F6' },
  orangeRing: { borderColor: '#F97316' },
  markerDot: { width: 14, height: 14, borderRadius: 7 },
  blueDot: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 6,
  },
  orangeDot: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 6,
  },

  // Plane
  planeWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  planeGlow: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10,
  },
  planeEmoji: { fontSize: 22 },

  // Bottom
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bottomFade: {
    position: 'absolute', top: -80, left: 0, right: 0, bottom: 0,
  },
  bottomCard: {
    marginHorizontal: 16,
    marginBottom: 48,
    backgroundColor: 'rgba(17,19,24,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  buildingLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  buildingCity: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 18,
    textTransform: 'capitalize',
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 20,
    alignItems: 'center',
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.2)',
  },
  stepActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepDone: {
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'line-through',
  },
});
