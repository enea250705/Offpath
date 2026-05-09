// Offpath — persistence layer (Secure Store + AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, TripPlan, GuideMessage } from '../types';

const KEYS = {
  user: 'offpath.user',
  plan: 'offpath.currentPlan',
  guideMessages: 'offpath.guideMessages',
  tripHistory: 'offpath.tripHistory',
  reviewRequested: 'offpath.reviewRequested',
  unlockState: 'offpath.unlockState',
};

// ─── Auth (Secure Store) ───────────────────────────────────
export async function saveUser(user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}

export async function loadUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.user);
}

// ─── Trip Plan (AsyncStorage) ──────────────────────────────
export async function savePlan(plan: TripPlan): Promise<void> {
  await AsyncStorage.setItem(KEYS.plan, JSON.stringify(plan));
}

export async function loadPlan(): Promise<TripPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.plan);
    return raw ? (JSON.parse(raw) as TripPlan) : null;
  } catch {
    return null;
  }
}

export async function clearPlan(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.plan);
}

// ─── Guide Messages (AsyncStorage) ────────────────────────
export async function saveGuideMessages(msgs: GuideMessage[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.guideMessages, JSON.stringify(msgs));
}

export async function loadGuideMessages(): Promise<GuideMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.guideMessages);
    return raw ? (JSON.parse(raw) as GuideMessage[]) : [];
  } catch {
    return [];
  }
}

export async function clearGuideMessages(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.guideMessages);
}

// ─── Trip History (AsyncStorage) ──────────────────────────
export async function saveTripHistory(plans: TripPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.tripHistory, JSON.stringify(plans));
}

export async function loadTripHistory(): Promise<TripPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.tripHistory);
    return raw ? (JSON.parse(raw) as TripPlan[]) : [];
  } catch {
    return [];
  }
}

export async function clearTripHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.tripHistory);
}

// ─── Review Requested Flag ─────────────────────────────────
export async function hasRequestedReview(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.reviewRequested);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markReviewRequested(): Promise<void> {
  await AsyncStorage.setItem(KEYS.reviewRequested, 'true');
}

// ─── Unlock State (AsyncStorage) ──────────────────────────
type UnlockState = { unlockedTripIds: string[]; tripCredits: number; isYearlyActive: boolean };

export async function saveUnlockState(data: UnlockState): Promise<void> {
  await AsyncStorage.setItem(KEYS.unlockState, JSON.stringify(data));
}

export async function loadUnlockState(): Promise<UnlockState> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.unlockState);
    return raw ? (JSON.parse(raw) as UnlockState) : { unlockedTripIds: [], tripCredits: 0, isYearlyActive: false };
  } catch {
    return { unlockedTripIds: [], tripCredits: 0, isYearlyActive: false };
  }
}

export async function clearUnlockState(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.unlockState);
}

// ─── Clear All ─────────────────────────────────────────────
export async function clearAll(): Promise<void> {
  await Promise.all([clearUser(), clearPlan(), clearGuideMessages(), clearTripHistory(), clearUnlockState()]);
}
