import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const ANON_KEY = 'gel-chia-quiz-mx:anon_id';
const SESSION_KEY = 'gel-chia-quiz-mx:session_id';

// Fixed forever: changing it changes every event_id and breaks dedup against
// events Meta already received.
export const EVENT_ID_NAMESPACE = '6f1a3b2e-7c4d-4e5f-9a8b-1c2d3e4f5a6b';

function safeStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readOrCreate(storage: Storage | null, key: string): string {
  if (!storage) return uuidv4();
  const existing = storage.getItem(key);
  if (existing) return existing;
  const created = uuidv4();
  storage.setItem(key, created);
  return created;
}

export function getAnonId(): string {
  return readOrCreate(safeStorage('local'), ANON_KEY);
}

export function getSessionId(): string {
  return readOrCreate(safeStorage('session'), SESSION_KEY);
}

export function eventIdFor(scopeId: string, eventName: string, stepRef = ''): string {
  return uuidv5(`${scopeId}:${eventName}:${stepRef}`, EVENT_ID_NAMESPACE);
}
