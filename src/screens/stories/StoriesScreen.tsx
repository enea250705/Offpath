// Offpath — Stories Carousel (6 slides, 3.5s each, auto-advance)
// City photos from Pexels API
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../store/AppContext';
import { colors, typography, spacing, radius } from '../../theme';
import { getStoryPhotos, isPexelsConfigured } from '../../services/pexels';


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDE_DURATION = 3500;
const NUM_SLIDES = 6;

// Fallback gradients when photos aren't available
const FALLBACK_GRADIENTS: [string, string, string][] = [
  ['#0f0c29', '#302b63', '#24243e'],
  ['#1a1a2e', '#16213e', '#0f3460'],
  ['#2d1b69', '#11001c', '#0d1b2a'],
  ['#1b2838', '#2c5364', '#203a43'],
  ['#0d1117', '#1a1a2e', '#2d1b69'],
  ['#141e30', '#243b55', '#1a1a2e'],
];

export default function StoriesScreen() {
  const { state, actions } = useApp();
  const [current, setCurrent] = useState(0);
  const [photos, setPhotos] = useState<(string | null)[]>(
    state.storyPhotos ?? new Array(NUM_SLIDES).fill(null),
  );
  const progressAnims = useRef(
    Array.from({ length: NUM_SLIDES }, () => new Animated.Value(0)),
  ).current;
  const textAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    })),
  ).current;

  const plan = state.plan;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const city = plan?.destinationCity || 'travel';

  // ─── Photos: use prefetched from state, fall back to fetch ─
  useEffect(() => {
    if (state.storyPhotos) return; // already prefetched in GeneratingScreen
    if (!isPexelsConfigured()) return;
    getStoryPhotos(city).then(setPhotos).catch(() => {});
  }, [city]);

  // Stagger text entrance
  const animateTextIn = useCallback(() => {
    textAnims.forEach((a) => {
      a.opacity.setValue(0);
      a.translateY.setValue(20);
    });
    textAnims.forEach((a, i) => {
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }),
        Animated.spring(a.translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          delay: i * 80,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= NUM_SLIDES) {
        actions.setPhase('preview');
        return;
      }
      if (index < 0) index = 0;

      for (let i = index; i < NUM_SLIDES; i++) {
        progressAnims[i].setValue(0);
      }
      for (let i = 0; i < index; i++) {
        progressAnims[i].setValue(1);
      }

      setCurrent(index);
      animateTextIn();

      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.timing(progressAnims[index], {
        toValue: 1,
        duration: SLIDE_DURATION,
        useNativeDriver: false,
      }).start();

      timerRef.current = setTimeout(() => {
        goToSlide(index + 1);
      }, SLIDE_DURATION);
    },
    [progressAnims, animateTextIn, actions],
  );

  useEffect(() => {
    goToSlide(0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTap = useCallback(
    (side: 'left' | 'right') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (side === 'right') {
        goToSlide(current + 1);
      } else {
        goToSlide(current - 1);
      }
    },
    [current, goToSlide],
  );

  // ─── Slide Content ──────────────────────────────────────
  const renderSlideContent = () => {
    if (!plan) return null;

    const StaggerText = ({
      children,
      index,
      style,
    }: {
      children: React.ReactNode;
      index: number;
      style?: any;
    }) => {
      const anim = textAnims[Math.min(index, 3)];
      return (
        <Animated.Text
          style={[
            style,
            {
              opacity: anim.opacity,
              transform: [{ translateY: anim.translateY }],
            },
          ]}
        >
          {children}
        </Animated.Text>
      );
    };

    switch (current) {
      case 0:
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.tagText}>
              {plan.destinationCountry?.toUpperCase()}
            </StaggerText>
            <StaggerText index={1} style={styles.cityText}>
              {plan.destinationCity}
            </StaggerText>
            <StaggerText index={2} style={styles.shareText}>
              {plan.shareLine}
            </StaggerText>
          </View>
        );
      case 1:
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.tagText}>
              PLANNED LIKE A LOCAL
            </StaggerText>
            <StaggerText index={1} style={styles.headlineText}>
              Your trip,{'\n'}reimagined
            </StaggerText>
            <StaggerText index={2} style={styles.bodyText}>
              {plan.intro}
            </StaggerText>
          </View>
        );
      case 2: {
        const day1 = plan.fullDays?.[0] || plan.previewDays?.[0];
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.moodTag}>
              {day1?.mood?.toUpperCase() || 'DAY ONE'}
            </StaggerText>
            <StaggerText index={1} style={styles.headlineText}>
              {day1?.title || 'Your first day'}
            </StaggerText>
            <StaggerText index={2} style={styles.bodyText}>
              {day1?.summary || ''}
            </StaggerText>
          </View>
        );
      }
      case 3: {
        const day2 = plan.fullDays?.[1];
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.tagText}>
              DAY TWO
            </StaggerText>
            <StaggerText index={1} style={styles.headlineText}>
              {day2?.title || 'Keep going'}
            </StaggerText>
            <StaggerText index={2} style={styles.bodyText}>
              {day2?.summary || 'Another day of exploration awaits.'}
            </StaggerText>
          </View>
        );
      }
      case 4: {
        const hidden = plan.hiddenPlaces?.[0];
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.tagText}>
              HIDDEN GEM
            </StaggerText>
            <StaggerText index={1} style={styles.headlineText}>
              {hidden?.name || 'Secret spots'}
            </StaggerText>
            <StaggerText index={2} style={styles.vibeTag}>
              {hidden?.vibe || 'Off the beaten path'}
            </StaggerText>
          </View>
        );
      }
      case 5:
        return (
          <View style={styles.slideContent}>
            <StaggerText index={0} style={styles.tagText}>
              YOUR PLAN IS WAITING
            </StaggerText>
            <StaggerText index={1} style={styles.headlineText}>
              Ready to{'\n'}explore?
            </StaggerText>
            <Animated.View
              style={{
                opacity: textAnims[2].opacity,
                transform: [{ translateY: textAnims[2].translateY }],
              }}
            >
              <TouchableWithoutFeedback onPress={() => actions.setPhase('preview')}>
                <View style={styles.seePlanBtn}>
                  <LinearGradient
                    colors={['#F97316', '#FB923C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.seePlanGradient}
                  >
                    <Text style={styles.seePlanText}>See your plan</Text>
                  </LinearGradient>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        );
      default:
        return null;
    }
  };

  const currentPhoto = photos[current];
  const hasPhoto = !!currentPhoto;

  return (
    <View style={styles.container}>
      {/* Background: Pexels photo or gradient fallback */}
      {hasPhoto ? (
        <Image
          source={{ uri: currentPhoto }}
          style={styles.bgImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={FALLBACK_GRADIENTS[current] || FALLBACK_GRADIENTS[0]}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Dark gradient overlay for text legibility */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.05)',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.88)',
        ]}
        locations={[0, 0.3, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top gradient for progress bars */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topGradient}
      />

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {progressAnims.map((anim, i) => (
          <View key={i} style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Tap zones */}
      <View style={styles.tapZones}>
        <TouchableWithoutFeedback onPress={() => handleTap('left')}>
          <View style={styles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => handleTap('right')}>
          <View style={styles.tapRight} />
        </TouchableWithoutFeedback>
      </View>

      {/* Slide content */}
      {renderSlideContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingTop: 60,
    paddingHorizontal: 12,
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 100,
    zIndex: 6,
    pointerEvents: 'box-none',
  },
  tagText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cityText: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 58,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  shareText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  headlineText: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 46,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bodyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moodTag: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  vibeTag: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '600',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  seePlanBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  seePlanGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  seePlanText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
