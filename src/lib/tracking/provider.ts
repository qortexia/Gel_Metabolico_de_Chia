import type { AnalyticsEvent, AnalyticsPayload, AnalyticsProvider } from '@/lib/analytics';
import { getAnonId, getSessionId, eventIdFor } from './ids';
import { EVENT_MAP, EVENT_SCOPE, stepRefFor, pickMetadata, type MetaEventName } from './eventMap';
import { getFbc, getFbp } from './attribution';
import { getConsent } from './consent';
import { fbqTrack } from './metaPixel';

export interface CapiClientPayload {
  event_id: string;
  meta_event_name: MetaEventName;
  occurred_at: string;
  event_source_url: string;
  anon_id: string;
  session_id: string;
  fbc: string | null;
  fbp: string | null;
  custom_data?: Record<string, string | number>;
  // Fase 1 contract fields: the hub persists these to Supabase but they never
  // reach the Meta Graph payload (the route ignores them by construction).
  internal_name: AnalyticsEvent;
  metadata: AnalyticsPayload;
  consent_version: string | null;
}

export type CapiTransport = (payload: CapiClientPayload) => Promise<void>;

const SENT_KEY = 'gel-chia-quiz-mx:sent_event_ids';
const SENT_CAP = 500;

function sessionStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadSent(): Set<string> {
  const storage = sessionStorageOrNull();
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(SENT_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSent(sent: Set<string>, eventId: string) {
  sent.add(eventId);
  const storage = sessionStorageOrNull();
  if (!storage) return;
  try {
    storage.setItem(SENT_KEY, JSON.stringify(Array.from(sent).slice(-SENT_CAP)));
  } catch {
    // in-memory set still guards this pageview
  }
}

// The only custom_data shapes that exist. Anything else in a track() payload
// (answers, IMC, names) has no path to Meta.
export function buildCustomData(meta: MetaEventName, payload?: AnalyticsPayload): Record<string, string | number> | undefined {
  if (meta === 'InitiateCheckout' && typeof payload?.priceMxn === 'number') {
    return { value: payload.priceMxn, currency: 'MXN' };
  }
  if (meta === 'ViewContent' && typeof payload?.content_name === 'string') {
    return { content_name: payload.content_name };
  }
  return undefined;
}

export const defaultTransport: CapiTransport = async (payload) => {
  await fetch('/api/e/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
};

export function createTrackingProvider(
  opts: { transport?: CapiTransport; now?: () => Date } = {}
): AnalyticsProvider {
  const transport = opts.transport ?? defaultTransport;
  const now = opts.now ?? (() => new Date());
  const sent = loadSent();

  return (event: AnalyticsEvent, payload?: AnalyticsPayload) => {
    const anonId = getAnonId();
    const sessionId = getSessionId();
    const scopeId = EVENT_SCOPE[event] === 'anon' ? anonId : sessionId;
    const eventId = eventIdFor(scopeId, event, stepRefFor(event, payload));

    const meta = EVENT_MAP[event];
    if (!meta) return;

    if (sent.has(eventId)) return;
    markSent(sent, eventId);

    const customData = buildCustomData(meta, payload);
    fbqTrack(meta, customData ?? {}, eventId);

    const body: CapiClientPayload = {
      event_id: eventId,
      meta_event_name: meta,
      occurred_at: now().toISOString(),
      event_source_url: window.location.href,
      anon_id: anonId,
      session_id: sessionId,
      fbc: getFbc(),
      fbp: getFbp(),
      internal_name: event,
      metadata: pickMetadata(event, payload),
      consent_version: getConsent()?.policy_version ?? null,
    };
    if (customData) body.custom_data = customData;
    try {
      transport(body).catch(() => {
        // browser pixel already fired; server mirror is best-effort here (retry lives in the hub, Fase 1)
      });
    } catch {
      // transport threw synchronously; browser pixel already fired, server mirror is best-effort here
    }
  };
}
