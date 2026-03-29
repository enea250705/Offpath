// Offpath API service — network layer with retry + backoff
import { TripPlan, AuthUser, SessionAnswers, GuideMessage } from '../types';

const BASE_URL = 'https://offpath.onrender.com';

// ─── Retry Configuration ──────────────────────────────────
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 800;
const AUTH_TIMEOUT_MS = 60_000; // Render cold-start can take 30-50s

// ─── Error Types ───────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

// ─── Helpers ───────────────────────────────────────────────
function isTransient(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions,
  timeoutMs = 30_000,
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      const errorBody = await res.text().catch(() => '');

      if (!isTransient(res.status)) {
        throw new ApiError(
          errorBody || res.statusText,
          res.status,
          res.status === 401 ? 'unauthorized' : 'client_error',
        );
      }

      lastError = new ApiError(errorBody || res.statusText, res.status, 'transient');
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError && !isTransient(err.status)) {
        throw err;
      }

      if (err.name === 'AbortError') {
        lastError = new ApiError('Request timed out', 408, 'timeout');
      } else if (err.message?.includes('Network request failed')) {
        lastError = new ApiError('No internet connection', 0, 'no_internet');
      } else {
        lastError = err;
      }
    }

    if (attempt < MAX_RETRIES - 1) {
      await delay(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// ─── Service Object ────────────────────────────────────────
let _token: string | null = null;

export const api = {
  setToken(token: string | null) {
    _token = token;
  },

  getToken(): string | null {
    return _token;
  },

  _headers(requireAuth = false): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = `Bearer ${_token}`;
    else if (requireAuth) throw new ApiError('Not authenticated', 401, 'unauthorized');
    return h;
  },

  // ── Auth ──────────────────────────────────────────────────
  async emailAuth(body: {
    email: string;
    password: string;
    displayName?: string;
    mode: 'login' | 'signup';
  }): Promise<{ requiresVerification: true; email: string }> {
    return fetchWithRetry(
      `${BASE_URL}/v1/auth/email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      AUTH_TIMEOUT_MS,
    );
  },

  async verifyCode(body: { email: string; code: string }): Promise<AuthUser> {
    const res = await fetchWithRetry(
      `${BASE_URL}/v1/auth/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      AUTH_TIMEOUT_MS,
    );
    _token = res.token;
    return res as AuthUser;
  },

  async socialAuth(body: { provider: string; idToken: string }): Promise<AuthUser> {
    const res = await fetchWithRetry(
      `${BASE_URL}/v1/auth/social`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      AUTH_TIMEOUT_MS,
    );
    _token = res.token;
    return res as AuthUser;
  },

  // ── Places ────────────────────────────────────────────────
  async cityAutocomplete(q: string): Promise<{ city: string; country: string; countryCode: string }[]> {
    if (q.trim().length < 2) return [];
    return fetchWithRetry(
      `${BASE_URL}/v1/places/city-autocomplete?q=${encodeURIComponent(q)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      10_000,
    );
  },

  // ── Trip ──────────────────────────────────────────────────
  async generateTrip(answers: SessionAnswers): Promise<TripPlan> {
    const headers = { 'Content-Type': 'application/json' } as Record<string, string>;
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    // ── Smart surprise: personalized by style + group ────────
    type Tagged = { city: string; styles: string[]; groups: string[] };
    const SURPRISE_POOL: Tagged[] = [
      // Culture & history
      { city: 'Kyoto',           styles: ['culture','slow'],     groups: ['solo','couple'] },
      { city: 'Florence',        styles: ['culture','food'],     groups: ['solo','couple'] },
      { city: 'Prague',          styles: ['culture','nightlife'],groups: ['solo','friends'] },
      { city: 'Istanbul',        styles: ['culture','food'],     groups: ['solo','couple','friends'] },
      { city: 'Rome',            styles: ['culture','food'],     groups: ['solo','couple','family'] },
      { city: 'Athens',          styles: ['culture','adventure'],groups: ['solo','couple','friends'] },
      { city: 'Vienna',          styles: ['culture','slow'],     groups: ['solo','couple'] },
      { city: 'Fez',             styles: ['culture','adventure'],groups: ['solo','couple'] },
      { city: 'Jaipur',          styles: ['culture','adventure'],groups: ['solo','couple','friends'] },
      { city: 'Cusco',           styles: ['culture','adventure'],groups: ['solo','friends'] },
      { city: 'Cairo',           styles: ['culture','adventure'],groups: ['solo','friends','family'] },
      { city: 'Hoi An',          styles: ['culture','food','slow'],groups: ['solo','couple'] },
      // Nightlife & social
      { city: 'Berlin',          styles: ['nightlife','culture'],groups: ['solo','friends'] },
      { city: 'Barcelona',       styles: ['nightlife','food','culture'],groups: ['friends','couple'] },
      { city: 'Bangkok',         styles: ['nightlife','food','adventure'],groups: ['solo','friends'] },
      { city: 'Buenos Aires',    styles: ['nightlife','culture','food'],groups: ['solo','couple','friends'] },
      { city: 'Amsterdam',       styles: ['nightlife','culture'],groups: ['solo','friends'] },
      { city: 'New Orleans',     styles: ['nightlife','food','culture'],groups: ['friends','couple'] },
      { city: 'Medellín',        styles: ['nightlife','adventure'],groups: ['solo','friends'] },
      { city: 'Belgrade',        styles: ['nightlife','culture'],groups: ['solo','friends'] },
      // Romantic & slow
      { city: 'Santorini',       styles: ['slow','romantic'],    groups: ['couple'] },
      { city: 'Paris',           styles: ['culture','romantic','food'],groups: ['couple','solo'] },
      { city: 'Dubrovnik',       styles: ['slow','culture'],     groups: ['couple','solo'] },
      { city: 'Porto',           styles: ['slow','food','culture'],groups: ['couple','solo'] },
      { city: 'Lisbon',          styles: ['slow','nightlife','culture'],groups: ['couple','solo','friends'] },
      { city: 'Copenhagen',      styles: ['slow','food'],        groups: ['couple','solo'] },
      { city: 'Bruges',          styles: ['slow','culture','food'],groups: ['couple','solo'] },
      { city: 'Valparaíso',      styles: ['slow','culture'],     groups: ['couple','solo'] },
      // Adventure & nature
      { city: 'Reykjavik',       styles: ['adventure','slow'],   groups: ['solo','couple','friends'] },
      { city: 'Cape Town',       styles: ['adventure','food'],   groups: ['solo','couple','friends'] },
      { city: 'Bali',            styles: ['adventure','slow'],   groups: ['solo','couple','friends','family'] },
      { city: 'Auckland',        styles: ['adventure'],          groups: ['solo','couple','friends','family'] },
      { city: 'Tbilisi',         styles: ['adventure','food','culture'],groups: ['solo','friends'] },
      { city: 'Chiang Mai',      styles: ['adventure','slow','food'],groups: ['solo','couple'] },
      { city: 'Zanzibar',        styles: ['adventure','slow'],   groups: ['couple','friends'] },
      { city: 'Luang Prabang',   styles: ['adventure','slow','culture'],groups: ['solo','couple'] },
      // Food-focused
      { city: 'Tokyo',           styles: ['food','culture'],     groups: ['solo','couple','friends'] },
      { city: 'Seoul',           styles: ['food','culture','nightlife'],groups: ['solo','friends'] },
      { city: 'Mexico City',     styles: ['food','culture','nightlife'],groups: ['solo','friends','family'] },
      { city: 'Oaxaca',          styles: ['food','culture','slow'],groups: ['solo','couple'] },
      { city: 'Lyon',            styles: ['food','culture'],     groups: ['solo','couple'] },
      { city: 'Singapore',       styles: ['food','culture'],     groups: ['solo','couple','family'] },
      { city: 'Marrakech',       styles: ['food','culture','adventure'],groups: ['couple','friends'] },
      // Family-friendly
      { city: 'Sydney',          styles: ['adventure','culture'],groups: ['family','couple','friends'] },
      { city: 'Edinburgh',       styles: ['culture','adventure'],groups: ['family','solo','couple'] },
      { city: 'Montreal',        styles: ['culture','food'],     groups: ['family','couple','friends'] },
      { city: 'Stockholm',       styles: ['slow','culture'],     groups: ['family','couple','solo'] },
      { city: 'San Francisco',   styles: ['culture','food'],     groups: ['family','couple','solo'] },
      { city: 'Budapest',        styles: ['culture','nightlife','food'],groups: ['friends','couple','solo'] },
      { city: 'Split',           styles: ['adventure','slow'],   groups: ['friends','couple','family'] },
    ];

    // In 'suggest' mode, pick a personalized city
    let destination = answers.destination;
    let destMode = answers.destinationMode || 'know';
    const isSurprise = !destination?.trim() || destination === 'suggest' || destMode === 'suggest';

    console.log(`[API] Pre-surprise check: dest="${destination}", mode="${destMode}", isSurprise=${isSurprise}`);

    if (isSurprise) {
      const style = (answers.style || 'culture').toLowerCase();
      const group = (answers.group || 'solo').toLowerCase();

      // Score each city: +2 for style match, +1 for group match
      const scored = SURPRISE_POOL.map((entry) => ({
        city: entry.city,
        score:
          (entry.styles.includes(style) ? 2 : 0) +
          (entry.groups.includes(group) ? 1 : 0),
      }));

      // Get best matches (score 3 = perfect, 2 = style match, 1 = group match)
      const maxScore = Math.max(...scored.map((s) => s.score));
      const bestMatches = scored.filter((s) => s.score >= Math.max(maxScore - 1, 1));

      // Pick random from best matches
      destination = bestMatches[Math.floor(Math.random() * bestMatches.length)].city;
      destMode = 'know';
      console.log(`[API] Surprise picked: style=${style}, group=${group} → ${destination} (${bestMatches.length} candidates)`);
    }

    // Map local field names to backend-expected names
    const payload: Record<string, any> = {
      destination,
      travelStyle: answers.style || 'culture',
      travelerGroup: answers.group || 'solo',
      tripLength: answers.tripLength || 5,
      destinationMode: destMode,
    };

    console.log('[API] generateTrip payload:', JSON.stringify(payload));

    const result = await fetchWithRetry(
      `${BASE_URL}/v1/trips/full`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      90_000, // trip gen can be slow
    ) as TripPlan;

    console.log('[API] generateTrip response city:', result?.destinationCity, 'coord:', result?.destinationCoordinate);
    return result;
  },

  // ── Guide ─────────────────────────────────────────────────
  async sendGuideMessage(
    tripId: string,
    destination: string,
    messages: { role: string; text: string }[],
  ): Promise<{ role: string; text: string }> {
    // Backend expects: { destination, message (latest), history (prior messages) }
    const message = messages[messages.length - 1].text;
    const history = messages.slice(0, -1);
    return fetchWithRetry(
      `${BASE_URL}/v1/guide/chat`,
      {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify({ tripId, destination, message, history }),
      },
    );
  },

  async getGuideMessages(tripId: string): Promise<GuideMessage[]> {
    return fetchWithRetry(
      `${BASE_URL}/v1/guide/messages/${tripId}`,
      {
        method: 'GET',
        headers: this._headers(true),
      },
    );
  },
};

// ─── Error Message Helpers ─────────────────────────────────
export function friendlyError(err: any): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'no_internet':
        return 'No internet connection. Check your connection and try again.';
      case 'timeout':
        return 'The server is waking up — this can take up to a minute on first load. Try again in a moment.';
      case 'unauthorized':
        return 'Wrong password. Try again or create a new account.';
      default:
        return "Couldn't reach the server. Try again in a moment.";
    }
  }
  return "Couldn't reach the server. Try again in a moment.";
}
