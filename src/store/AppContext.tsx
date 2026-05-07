// Offpath — Global state management (React Context + useReducer)
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  AppPhase,
  AuthUser,
  TripPlan,
  GuideMessage,
  SessionAnswers,
} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import * as storage from '../services/storage';

// ─── State Shape ───────────────────────────────────────────
interface AppState {
  phase: AppPhase;
  user: AuthUser | null;
  plan: TripPlan | null;
  tripHistory: TripPlan[];
  guideMessages: GuideMessage[];
  isPremium: boolean;
  sessionAnswers: SessionAnswers;
  isRestoring: boolean;
  storyPhotos: (string | null)[] | null;
}

const initialAnswers: SessionAnswers = {
  destination: '',
  tripLength: 5,
};

const initialState: AppState = {
  phase: 'onboarding',
  user: null,
  plan: null,
  tripHistory: [],
  guideMessages: [],
  isPremium: false,
  sessionAnswers: initialAnswers,
  isRestoring: true,
  storyPhotos: null,
};

// ─── Actions ───────────────────────────────────────────────
type Action =
  | { type: 'SET_PHASE'; phase: AppPhase }
  | { type: 'SET_USER'; user: AuthUser | null }
  | { type: 'SET_PLAN'; plan: TripPlan }
  | { type: 'SET_GUIDE_MESSAGES'; messages: GuideMessage[] }
  | { type: 'ADD_GUIDE_MESSAGE'; message: GuideMessage }
  | { type: 'SET_PREMIUM'; isPremium: boolean }
  | { type: 'UPDATE_ANSWERS'; answers: Partial<SessionAnswers> }
  | { type: 'SET_STORY_PHOTOS'; photos: (string | null)[] }
  | { type: 'SET_TRIP_HISTORY'; history: TripPlan[] }
  | { type: 'START_NEW_TRIP' }
  | { type: 'RESET_SESSION' }
  | { type: 'RESTORE_DONE' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_PLAN': {
      // Archive existing plan to history before replacing
      const alreadyInHistory = state.plan
        ? state.tripHistory.some(
            (h) =>
              h.id === state.plan!.id &&
              h.destinationCity === state.plan!.destinationCity,
          )
        : true;
      const newHistory =
        state.plan && !alreadyInHistory
          ? [{ ...state.plan, createdAt: state.plan.createdAt ?? new Date().toISOString() }, ...state.tripHistory]
          : state.tripHistory;
      return {
        ...state,
        plan: { ...action.plan, createdAt: action.plan.createdAt ?? new Date().toISOString() },
        tripHistory: newHistory,
      };
    }
    case 'SET_GUIDE_MESSAGES':
      return { ...state, guideMessages: action.messages };
    case 'ADD_GUIDE_MESSAGE':
      return { ...state, guideMessages: [...state.guideMessages, action.message] };
    case 'SET_PREMIUM':
      return { ...state, isPremium: action.isPremium };
    case 'UPDATE_ANSWERS':
      return {
        ...state,
        sessionAnswers: { ...state.sessionAnswers, ...action.answers },
      };
    case 'SET_STORY_PHOTOS':
      return { ...state, storyPhotos: action.photos };
    case 'SET_TRIP_HISTORY':
      return { ...state, tripHistory: action.history };
    case 'START_NEW_TRIP': {
      // Archive current plan to history if not already there
      const alreadyIn = state.plan
        ? state.tripHistory.some(
            (h) =>
              h.id === state.plan!.id &&
              h.destinationCity === state.plan!.destinationCity,
          )
        : true;
      const historyWithCurrent =
        state.plan && !alreadyIn
          ? [{ ...state.plan, createdAt: state.plan.createdAt ?? new Date().toISOString() }, ...state.tripHistory]
          : state.tripHistory;
      return {
        ...initialState,
        isRestoring: false,
        user: state.user,
        isPremium: state.isPremium,
        tripHistory: historyWithCurrent,
        phase: 'onboarding',
      };
    }
    case 'RESET_SESSION':
      return {
        ...initialState,
        isRestoring: false,
      };
    case 'RESTORE_DONE':
      return { ...state, isRestoring: false };
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    setPhase: (phase: AppPhase) => void;
    login: (user: AuthUser) => Promise<void>;
    logout: () => Promise<void>;
    setPlan: (plan: TripPlan) => Promise<void>;
    startNewTrip: () => Promise<void>;
    updateAnswers: (a: Partial<SessionAnswers>) => void;
    addGuideMessage: (msg: GuideMessage) => void;
    setGuideMessages: (msgs: GuideMessage[]) => void;
    setStoryPhotos: (photos: (string | null)[]) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Session restore
  useEffect(() => {
    (async () => {
      try {
        const [user, plan, messages, history] = await Promise.all([
          storage.loadUser(),
          storage.loadPlan(),
          storage.loadGuideMessages(),
          storage.loadTripHistory(),
        ]);

        if (user) {
          api.setToken(user.token);
          dispatch({ type: 'SET_USER', user });
        }
        if (plan) {
          dispatch({ type: 'SET_PLAN', plan });
        }
        if (messages.length) {
          dispatch({ type: 'SET_GUIDE_MESSAGES', messages });
        }
        // Seed a demo past trip once for the dev account
        let resolvedHistory = history;
        const SEED_FLAG = 'offpath.historySeeded';
        const alreadySeeded = await AsyncStorage.getItem(SEED_FLAG).catch(() => null);
        if (
          user?.email === 'eneamuja87@gmail.com' &&
          resolvedHistory.length === 0 &&
          !alreadySeeded
        ) {
          const demoTrip: TripPlan = {
            id: 'demo-lisbon-2024',
            destinationCity: 'Lisbon',
            destinationCountry: 'Portugal',
            intro: 'A sun-drenched city of fado, trams, and pastel de nata.',
            shareLine: 'Lost in Lisbon and loving every second.',
            previewDays: [],
            fullDays: [
              { id: 'd1', dayNumber: 1, title: 'Alfama & The Old Soul', mood: 'Wandering & Wondering', summary: '', moments: [] },
              { id: 'd2', dayNumber: 2, title: 'Belém & The River', mood: 'Breezy & Historic', summary: '', moments: [] },
              { id: 'd3', dayNumber: 3, title: 'LX Factory & Nightlife', mood: 'Creative & Electric', summary: '', moments: [] },
            ],
            hiddenPlaces: [],
            heroCoordinate: { latitude: 38.7169, longitude: -9.1399 },
            destinationCoordinate: { latitude: 38.7169, longitude: -9.1399 },
            travelStyle: 'culture',
            travelerGroup: 'solo',
            totalPlaces: 12,
            createdAt: new Date('2024-11-03').toISOString(),
          };
          resolvedHistory = [demoTrip];
          await storage.saveTripHistory(resolvedHistory).catch(() => {});
          await AsyncStorage.setItem(SEED_FLAG, '1').catch(() => {});
        }
        if (resolvedHistory.length) {
          dispatch({ type: 'SET_TRIP_HISTORY', history: resolvedHistory });
        }

        // Determine starting phase
        if (user && plan) {
          dispatch({ type: 'SET_PHASE', phase: 'trip' });
        } else if (plan) {
          dispatch({ type: 'SET_PHASE', phase: 'preview' });
        }
      } catch {
        // Start fresh on error
      } finally {
        dispatch({ type: 'RESTORE_DONE' });
      }
    })();
  }, []);

  const actions = {
    setPhase: useCallback(
      (phase: AppPhase) => dispatch({ type: 'SET_PHASE', phase }),
      [],
    ),

    login: useCallback(async (user: AuthUser) => {
      api.setToken(user.token);
      dispatch({ type: 'SET_USER', user });
      try { await storage.saveUser(user); } catch (e) { console.warn('[Storage] saveUser failed:', e); }
    }, []),

    logout: useCallback(async () => {
      api.setToken(null);
      dispatch({ type: 'RESET_SESSION' });
      try { await storage.clearAll(); } catch (e) { console.warn('[Storage] clearAll failed:', e); }
    }, []),

    setPlan: useCallback(async (plan: TripPlan) => {
      dispatch({ type: 'SET_PLAN', plan });
      try { await storage.savePlan(plan); } catch (e) { console.warn('[Storage] savePlan failed:', e); }
    }, []),

    startNewTrip: useCallback(async () => {
      dispatch({ type: 'START_NEW_TRIP' });
      // Persist the updated history (state snapshot after dispatch is unavailable here,
      // so we load the current history, merge current plan, then save)
      try {
        const [currentPlan, existingHistory] = await Promise.all([
          storage.loadPlan(),
          storage.loadTripHistory(),
        ]);
        if (currentPlan) {
          const alreadyIn = existingHistory.some(
            (h) =>
              h.id === currentPlan.id &&
              h.destinationCity === currentPlan.destinationCity,
          );
          if (!alreadyIn) {
            const updated = [
              { ...currentPlan, createdAt: currentPlan.createdAt ?? new Date().toISOString() },
              ...existingHistory,
            ];
            await storage.saveTripHistory(updated);
          }
        }
        await storage.clearPlan();
        await storage.clearGuideMessages();
      } catch (e) { console.warn('[Storage] startNewTrip failed:', e); }
    }, []),

    updateAnswers: useCallback(
      (a: Partial<SessionAnswers>) => dispatch({ type: 'UPDATE_ANSWERS', answers: a }),
      [],
    ),

    addGuideMessage: useCallback(
      (msg: GuideMessage) => dispatch({ type: 'ADD_GUIDE_MESSAGE', message: msg }),
      [],
    ),

    setGuideMessages: useCallback(
      (msgs: GuideMessage[]) => dispatch({ type: 'SET_GUIDE_MESSAGES', messages: msgs }),
      [],
    ),

    setStoryPhotos: useCallback(
      (photos: (string | null)[]) => dispatch({ type: 'SET_STORY_PHOTOS', photos }),
      [],
    ),
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
