// Offpath — persistence layer (Secure Store + AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, TripPlan, GuideMessage } from '../types';

const KEYS = {
  user: 'offpath.user',
  plan: 'offpath.currentPlan',
  guideMessages: 'offpath.guideMessages',
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

// ─── Clear All ─────────────────────────────────────────────
export async function clearAll(): Promise<void> {
  await Promise.all([clearUser(), clearPlan(), clearGuideMessages()]);
}
