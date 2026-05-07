// Offpath — Full Travel History Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../store/AppContext';
import { colors, typography, radius } from '../../theme';
import { TripPlan } from '../../types';
import { getCityPhoto } from '../../services/pexels';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 40;

const STYLE_EMOJI: Record<string, string> = {
  slow: '🌿',
  food: '🍜',
  culture: '🏛️',
  nightlife: '🌙',
};

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { state } = useApp();
  const tripHistory = state.tripHistory ?? [];

  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    tripHistory.forEach((trip) => {
      const key = trip.id ?? trip.destinationCity;
      if (photos[key] !== undefined) return;
      getCityPhoto(trip.destinationCity).then((url) => {
        setPhotos((prev) => ({ ...prev, [key]: url }));
      });
    });
  }, [tripHistory]);

  const formatDate = (createdAt?: string) => {
    if (!createdAt) return '';
    return new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  const renderCard = (trip: TripPlan, index: number) => {
    const key = trip.id ?? trip.destinationCity;
    const photo = photos[key];
    const days = trip.fullDays?.length || trip.previewDays?.length || 0;
    const emoji = STYLE_EMOJI[trip.travelStyle ?? ''] ?? '✈️';
    const date = formatDate(trip.createdAt);

    const cardContent = (
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.4, 1]}
        style={styles.cardGradient}
      >
        <View style={styles.cardTop}>
          <View style={styles.styleBadge}>
            <Text style={styles.styleEmoji}>{emoji}</Text>
            {trip.travelStyle && (
              <Text style={styles.styleText}>{trip.travelStyle}</Text>
            )}
          </View>
          {date ? <Text style={styles.cardDate}>{date}</Text> : null}
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.cardCity}>{trip.destinationCity}</Text>
          <Text style={styles.cardCountry}>{trip.destinationCountry}</Text>
          <View style={styles.cardMeta}>
            {days > 0 && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{days} days</Text>
              </View>
            )}
            {trip.travelerGroup && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{trip.travelerGroup}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    );

    if (photo) {
      return (
        <ImageBackground
          key={key}
          source={{ uri: photo }}
          style={styles.card}
          imageStyle={styles.cardImage}
        >
          {cardContent}
        </ImageBackground>
      );
    }

    return (
      <LinearGradient
        key={key}
        colors={['#1a1208', '#2d1b0e', '#3d2510']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {cardContent}
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel History</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tripHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>No past trips yet. Your adventures will show up here.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>
              {tripHistory.length} {tripHistory.length === 1 ? 'trip' : 'trips'}
            </Text>
            {tripHistory.map((trip, i) => renderCard(trip, i))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.textPrimary,
    fontSize: 22,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  countLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginBottom: 16,
  },

  // Cards
  card: {
    width: CARD_W,
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    borderRadius: 20,
  },
  cardGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  styleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  styleEmoji: {
    fontSize: 13,
  },
  styleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  cardDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  cardBottom: {
    gap: 4,
  },
  cardCity: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: typography.weights.heavy,
    letterSpacing: -0.5,
  },
  cardCountry: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
