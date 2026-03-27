// ─── Enums / Union Types ───────────────────────────────────
export type DestinationMode = 'know' | 'suggest';
export type TravelStyle = 'slow' | 'food' | 'culture' | 'nightlife';
export type TravelerGroup = 'solo' | 'couple' | 'group';
export type AppPhase = 'onboarding' | 'generating' | 'stories' | 'preview' | 'auth' | 'trip';

// ─── Session ───────────────────────────────────────────────
export interface SessionAnswers {
  destinationMode?: DestinationMode;
  destination: string;
  style?: TravelStyle;
  group?: TravelerGroup;
  tripLength: number; // 2–14
}

// ─── Geo ───────────────────────────────────────────────────
export interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

// ─── Itinerary ─────────────────────────────────────────────
export interface ItineraryMoment {
  id: string;
  timeLabel: string;        // e.g. "9:30 AM"
  title: string;            // Place name from Google
  subtitle: string;         // Short descriptor
  rationale: string;        // AI narrative — why this place, what to notice
  transitNote: string;      // How to get to the next stop
  avoidNote: string;        // Tourist trap warning
  coordinate: LocationCoordinate;
  // Real data from Google Places API
  address?: string;         // Full street address
  neighborhood?: string;    // District / area
  category?: string;        // e.g. "Café", "Viewpoint", "Market"
  rating?: number;          // Google rating (1-5)
  reviewCount?: number;     // Number of Google reviews
  photoUrl?: string;        // Google Place photo
  openHours?: string;       // e.g. "Opens 8 AM · Closes 6 PM"
  placeId?: string;         // Google Place ID for deeplink
  googleMapsUrl?: string;   // Direct Google Maps link
  priceLevel?: number;      // 1-4 price level
  duration?: string;        // Suggested time to spend, e.g. "45 min"
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  title: string;            // e.g. "Alfama & The Old Soul"
  mood: string;             // e.g. "Wandering & Wondering"
  summary: string;          // AI-written day overview
  neighborhood?: string;    // Main area for the day
  moments: ItineraryMoment[];
}

// ─── Hidden Places ─────────────────────────────────────────
export interface HiddenPlace {
  id: string;
  name: string;
  neighborhood: string;
  vibe: string;             // e.g. "Locals-only rooftop with sunset views"
  note: string;             // AI-written insider tip
  bestTime: string;         // e.g. "Late afternoon"
  coordinate: LocationCoordinate;
  // Real data
  address?: string;
  category?: string;
  rating?: number;
  photoUrl?: string;
  placeId?: string;
  googleMapsUrl?: string;
}

// ─── Guide ─────────────────────────────────────────────────
export interface GuideMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// ─── Trip Plan ─────────────────────────────────────────────
export interface TripPlan {
  id?: string;
  destinationCity: string;
  destinationCountry: string;
  intro: string;             // AI intro paragraph
  shareLine: string;         // Instagram-worthy one-liner
  previewDays: ItineraryDay[];
  fullDays: ItineraryDay[];
  hiddenPlaces: HiddenPlace[];
  heroCoordinate: LocationCoordinate;
  destinationCoordinate: LocationCoordinate;
  // Extra metadata
  travelStyle?: string;
  travelerGroup?: string;
  totalPlaces?: number;
  neighborhoodGroups?: string[];  // List of neighborhoods covered
}

// ─── Auth ──────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  token: string;
}

// ─── Purchase Tiers ────────────────────────────────────────
export type PurchaseTier = 'free' | 'trippass' | 'tripack3' | 'yearly';

export interface PurchaseProduct {
  id: string;
  tier: PurchaseTier;
  label: string;
  price: string;
  description: string;
}

export const PURCHASE_PRODUCTS: PurchaseProduct[] = [
  {
    id: 'com.offpath.app.trippass',
    tier: 'trippass',
    label: 'Trip Pass',
    price: '$2.99',
    description: 'One full destination',
  },
  {
    id: 'com.offpath.app.trippack3',
    tier: 'tripack3',
    label: '3 Trip Pack',
    price: '$6.99',
    description: 'Your next three escapes',
  },
  {
    id: 'com.offpath.app.yearly',
    tier: 'yearly',
    label: 'Yearly',
    price: '$19.99',
    description: 'Plan every trip',
  },
];
