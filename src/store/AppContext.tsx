// Offpath — Global state management (React Context + useReducer)
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  AppPhase,
  AuthUser,
  TripPlan,
  GuideMessage,
  SessionAnswers,
} from '../types';
import { api } from '../services/api';
import * as storage from '../services/storage';

// ─── State Shape ───────────────────────────────────────────
interface AppState {
  phase: AppPhase;
  user: AuthUser | null;
  plan: TripPlan | null;
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
  | { type: 'RESET_SESSION' }
  | { type: 'RESTORE_DONE' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_PLAN':
      return { ...state, plan: action.plan };
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
        const [user, plan, messages] = await Promise.all([
          storage.loadUser(),
          storage.loadPlan(),
          storage.loadGuideMessages(),
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
