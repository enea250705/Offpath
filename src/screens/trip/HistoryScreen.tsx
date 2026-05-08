// Offpath — Journey History: swipeable scrapbook cards
// Each card = full-bleed city photo (StoriesScreen style) + scroll down for memories
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TextInput,
  FlatList,
  Modal,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../store/AppContext';
import { colors, typography, radius } from '../../theme';
import { TripPlan, TripMemory } from '../../types';
import { getCityPhoto } from '../../services/pexels';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Height of the "first page" inside the card (photo fills this fully)
// = total screen minus header/hints/dots overhead
const CARD_FIRST_PAGE = SCREEN_H - (Platform.OS === 'ios' ? 198 : 178);

const STYLE_EMOJI: Record<string, string> = {
  slow: '🌿', food: '🍜', culture: '🏛️', nightlife: '🌙',
};

// ─── Journey Card ─────────────────────────────────────────────────────────────
interface JourneyCardProps {
  trip: TripPlan;
  photo?: string | null;
  onSaveMemories: (memories: TripMemory[]) => Promise<void>;
  onDeleteMemory: (memoryId: string) => Promise<void>;
}

function JourneyCard({ trip, photo, onSaveMemories, onDeleteMemory }: JourneyCardProps) {
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxPage, setLightboxPage] = useState(0);
  const [cardHeight, setCardHeight] = useState(CARD_FIRST_PAGE);
  const scrollRef = useRef<ScrollView>(null);
  const galleryRef = useRef<FlatList>(null);

  const memories = trip.memories ?? [];
  const photoMemories = memories.filter((m) => m.photoUri);
  const textMemories = memories.filter((m) => m.text && !m.photoUri);
  const emoji = STYLE_EMOJI[trip.travelStyle ?? ''] ?? '✈️';

  const handleAddMemory = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', '📸 Add Photos', '✏️ Write a note'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickPhoto();
          if (idx === 2) {
            setShowTextInput(true);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
          }
        },
      );
    } else {
      Alert.alert('Add Memory', '', [
        { text: '📸 Add Photos', onPress: pickPhoto },
        {
          text: '✏️ Write a note', onPress: () => {
            setShowTextInput(true);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add memories.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;
    setSaving(true);
    const newMems: TripMemory[] = result.assets.map((a) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      photoUri: a.uri,
      createdAt: new Date().toISOString(),
    }));
    await onSaveMemories([...newMems, ...memories]);
    setSaving(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const submitText = async () => {
    if (!textInput.trim()) return;
    setSaving(true);
    const newMem: TripMemory = {
      id: Date.now().toString(),
      text: textInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setTextInput('');
    setShowTextInput(false);
    Keyboard.dismiss();
    await onSaveMemories([newMem, ...memories]);
    setSaving(false);
  };

  const handleDeleteMemory = (id: string) => {
    Alert.alert('Delete memory?', 'This cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteMemory(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const PHOTO_CELL = (SCREEN_W - 40 - 32 - 6) / 2; // card padding + inner padding + gap

  return (
    <View
      style={styles.cardSlide}
      onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
    >
      <KeyboardAvoidingView
        style={styles.card}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* ── FIRST PAGE: full-bleed photo, exactly as tall as the card ── */}
          <View style={[styles.firstPage, { height: cardHeight }]}>

            {/* Background photo or gradient */}
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.photoBg}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#0f0c29', '#302b63', '#1a0d05']}
                style={StyleSheet.absoluteFill}
              />
            )}

            {/* Dark overlay gradient — matches StoriesScreen */}
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.30)',
                'rgba(0,0,0,0.02)',
                'rgba(0,0,0,0.10)',
                'rgba(0,0,0,0.88)',
              ]}
              locations={[0, 0.3, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Add memory button — top right */}
            <TouchableOpacity
              style={styles.addMemFab}
              onPress={handleAddMemory}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add-circle" size={32} color="#F97316" />
              )}
            </TouchableOpacity>

            {/* Bottom text block — matches StoriesScreen exactly */}
            <View style={styles.firstPageBottom}>
              {/* Country tag (orange small caps) */}
              <Text style={styles.countryTag}>
                {trip.destinationCountry?.toUpperCase()}
              </Text>

              {/* City name — big & bold */}
              <Text style={styles.cityName}>{trip.destinationCity}</Text>

              {/* Share line / date */}
              <Text style={styles.shareLine}>
                {trip.travelStyle ? `${emoji} ${trip.travelStyle}` : '✈️ Journey'}
                {'  ·  '}
                {trip.createdAt
                  ? new Date(trip.createdAt).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })
                  : ''}
              </Text>

              {/* Scroll hint */}
              <View style={styles.scrollHint}>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.45)" />
                <Text style={styles.scrollHintText}>
                  {memories.length > 0
                    ? `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} · scroll down`
                    : 'Scroll down to add memories'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.45)" />
              </View>
            </View>
          </View>

          {/* ── MEMORIES SECTION (revealed on scroll) ── */}
          <View style={styles.memoriesSection}>

            <View style={styles.memTitleRow}>
              <Text style={styles.memTitle}>Memories</Text>
              <TouchableOpacity
                style={styles.memAddBtn}
                onPress={handleAddMemory}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.memAddBtnText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Empty state */}
            {memories.length === 0 && !showTextInput && (
              <TouchableOpacity
                style={styles.emptyBox}
                onPress={handleAddMemory}
                activeOpacity={0.75}
              >
                <Text style={styles.emptyIcon}>📸</Text>
                <Text style={styles.emptyTitle}>No memories yet</Text>
                <Text style={styles.emptySub}>
                  Tap to capture your favourite moments from {trip.destinationCity}
                </Text>
              </TouchableOpacity>
            )}

            {/* Photo grid */}
            {photoMemories.length > 0 && (
              <View style={styles.photoGrid}>
                {photoMemories.map((m, idx) => {
                  const isWide =
                    photoMemories.length % 2 === 1 && idx === photoMemories.length - 1;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.photoCell,
                        { width: isWide ? '100%' : PHOTO_CELL, height: PHOTO_CELL },
                      ]}
                      onPress={() => {
                        setLightboxIndex(idx);
                        setLightboxPage(idx);
                      }}
                      onLongPress={() => handleDeleteMemory(m.id)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: m.photoUri }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        style={styles.photoGrad}
                      >
                        <Text style={styles.photoDate}>
                          {new Date(m.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Text notes */}
            {textMemories.map((m) => (
              <View key={m.id} style={styles.noteCard}>
                <View style={styles.noteBar} />
                <View style={styles.noteBody}>
                  <Text style={styles.noteText}>{m.text}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>
                      {new Date(m.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMemory(m.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Text input */}
            {showTextInput && (
              <View style={styles.noteInputCard}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Write about this memory…"
                  placeholderTextColor={colors.textMuted}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  autoFocus
                  maxLength={500}
                />
                <View style={styles.noteInputBtns}>
                  <TouchableOpacity
                    onPress={() => { setShowTextInput(false); setTextInput(''); }}
                    style={styles.inputCancelBtn}
                  >
                    <Text style={styles.inputCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inputSaveBtn, !textInput.trim() && { opacity: 0.4 }]}
                    onPress={submitText}
                    disabled={!textInput.trim()}
                  >
                    <Text style={styles.inputSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Swipeable photo gallery — Modal keeps swipes isolated from card pager ── */}
      <Modal
        visible={lightboxIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIndex(null)}
        statusBarTranslucent
      >
        <View style={styles.lightbox}>
          <FlatList
            ref={galleryRef}
            data={photoMemories}
            keyExtractor={(m) => m.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={lightboxIndex ?? 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              setLightboxPage(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.gallerySlide}>
                <Image
                  source={{ uri: item.photoUri }}
                  style={styles.lightboxImg}
                  resizeMode="contain"
                />
                <Text style={styles.galleryDate}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          />

          {/* Counter */}
          <View style={styles.galleryCounter} pointerEvents="none">
            <Text style={styles.galleryCounterText}>
              {lightboxPage + 1} / {photoMemories.length}
            </Text>
          </View>

          {/* Close */}
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxIndex(null)}
          >
            <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.galleryDelete}
            onPress={() => {
              const mem = photoMemories[lightboxPage];
              if (mem) handleDeleteMemory(mem.id);
              setLightboxIndex(null);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main History Screen ───────────────────────────────────────────────────────
export default function HistoryScreen() {
  const navigation = useNavigation();
  const { state, actions } = useApp();
  const trips = state.tripHistory ?? [];

  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<FlatList>(null);

  useEffect(() => {
    trips.forEach((t) => {
      const key = t.id ?? t.destinationCity;
      if (photos[key] !== undefined) return;
      getCityPhoto(t.destinationCity).then((url) =>
        setPhotos((prev) => ({ ...prev, [key]: url })),
      );
    });
  }, [trips]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      setActiveIndex(idx);
    },
    [],
  );

  const handleSaveMemories = useCallback(
    async (newMemories: TripMemory[]) => {
      const trip = trips[activeIndex];
      if (!trip) return;
      await actions.updateTripMemories(trip.id ?? trip.destinationCity, newMemories);
    },
    [activeIndex, trips, actions],
  );

  const handleDeleteMemory = useCallback(
    async (memoryId: string) => {
      const trip = trips[activeIndex];
      if (!trip) return;
      const updated = (trip.memories ?? []).filter((m) => m.id !== memoryId);
      await actions.updateTripMemories(trip.id ?? trip.destinationCity, updated);
    },
    [activeIndex, trips, actions],
  );

  if (trips.length === 0) {
    return (
      <View style={styles.emptyScreen}>
        <LinearGradient colors={['#0a0806', '#150c04']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.emptyIconText}>🗺️</Text>
        <Text style={styles.emptyText}>No journeys yet</Text>
        <Text style={styles.emptySub}>Your travel memories will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0806', '#0a0806']}
        style={StyleSheet.absoluteFill}
      />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <View style={styles.backCircle}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 48 }} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Your Journeys</Text>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {activeIndex + 1}
              <Text style={styles.counterSlash}>/</Text>
              {trips.length}
            </Text>
          </View>
        </View>
        <View style={{ width: 48 }} />
      </View>

      {/* Swipe hint */}
      {trips.length > 1 && (
        <View style={styles.swipeHint} pointerEvents="none">
          <Ionicons name="chevron-back" size={12} color="rgba(255,255,255,0.18)" />
          <Text style={styles.swipeHintText}>swipe to explore</Text>
          <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.18)" />
        </View>
      )}

      {/* Swipeable cards */}
      <FlatList
        ref={pagerRef}
        data={trips}
        keyExtractor={(t) => t.id ?? t.destinationCity}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        decelerationRate="fast"
        style={styles.pager}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        renderItem={({ item }) => {
          const key = item.id ?? item.destinationCity;
          return (
            <JourneyCard
              key={key}
              trip={item}
              photo={photos[key]}
              onSaveMemories={handleSaveMemories}
              onDeleteMemory={handleDeleteMemory}
            />
          );
        }}
      />

      {/* Dot indicators */}
      {trips.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {trips.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_H_PAD = 16;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0806',
  },

  // Back button
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    zIndex: 50,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 4,
    zIndex: 10,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.base,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  counterPill: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  counterText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  counterSlash: {
    color: 'rgba(249,115,22,0.45)',
    fontWeight: '400',
  },

  // Swipe hint
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 6,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Pager
  pager: { flex: 1 },

  // Each slide
  cardSlide: {
    width: SCREEN_W,
    flex: 1,
    paddingHorizontal: CARD_H_PAD,
    paddingBottom: 8,
  },

  // Card
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0f0c0a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  cardScroll: { flex: 1 },
  cardScrollContent: {},

  // ── FIRST PAGE: full-bleed photo ───────────────────────────────────────────
  firstPage: {
    height: CARD_FIRST_PAGE,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
  },
  photoBg: {
    ...StyleSheet.absoluteFillObject as any,
    width: '100%',
    height: '100%',
  },
  addMemFab: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 18 : 14,
    right: 18,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    padding: 5,
  },
  firstPageBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 28,
    gap: 6,
  },
  // Matches StoriesScreen tagText
  countryTag: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  // Matches StoriesScreen cityText
  cityName: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  // Matches StoriesScreen shareText
  shareLine: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    textTransform: 'capitalize',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  scrollHintText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500',
  },

  // ── MEMORIES SECTION ────────────────────────────────────────────────────────
  memoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
    backgroundColor: '#0f0c0a',
  },
  memTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  memTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  memAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F97316',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  memAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: 28,
    lineHeight: 20,
  },

  // Photo grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  photoCell: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 5,
  },
  photoDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '600',
  },

  // Note card
  noteCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  noteBar: {
    width: 3,
    backgroundColor: '#F97316',
    borderRadius: 2,
    marginVertical: 5,
    marginLeft: 5,
  },
  noteBody: { flex: 1, padding: 12 },
  noteText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noteDate: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },

  // Text input
  noteInputCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    marginBottom: 10,
  },
  noteInput: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  noteInputBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  inputCancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  inputCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  inputSaveBtn: {
    backgroundColor: '#F97316',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  inputSaveText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#F97316',
    borderRadius: 3,
  },

  // Lightbox
  lightbox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  lightboxImg: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  lightboxClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 16,
    zIndex: 10,
  },

  // Gallery (swipeable lightbox)
  gallerySlide: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryDate: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  galleryCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  galleryCounterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  galleryDelete: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },

  // Empty screen
  emptyScreen: {
    flex: 1,
    backgroundColor: '#0a0806',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyIconText: { fontSize: 52 },
  emptyText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: '800',
  },
});