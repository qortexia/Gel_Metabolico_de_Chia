import type { AnalyticsEvent, AnalyticsPayload, AnalyticsProvider } from '@/lib/analytics';
import { getAnonId, getSessionId, eventIdFor } from './ids';
import { EVENT_MAP, EVENT_SCOPE, HEALTH_CONTEXT_EVENTS, stepRefFor, pickMetadata, type MetaEventName } from './eventMap';
import { getFbc, getFbp, getAttribution } from './attribution';
import { getConsent } from './consent';
import { fbqTrack } from './metaPixel';

export const PROJECT_SLUG = 'chia';

export interface IngestPayload {
  project: string;
  event_id: string;
  internal_name: AnalyticsEvent;
  meta_event_name: MetaEventName | null;
  occurred_at: string;
  event_source_url: string;
  anon_id: string;
  session_id: string;
  fbc: string | null;
  fbp: string | null;
  custom_data?: Record<string, string | number>;
  metadata: AnalyticsPayload;
  consent_version: string | null;
  attribution: Record<string, string>;
}

export type IngestTransport = (payload: IngestPayload) => Promise<void>;

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

export const defaultTransport: IngestTransport = async (payload) => {
  await fetch('/api/e/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
};

export function createTrackingProvider(
  opts: { transport?: IngestTransport; now?: () => Date } = {}
): AnalyticsProvider {
  const transport = opts.transport ?? defaultTransport;
  const now = opts.now ?? (() => new Date());
  const sent = loadSent();

  const provider: AnalyticsProvider = (event: AnalyticsEvent, payload?: AnalyticsPayload) => {
    // (0) prerender (spec §6): DEFER until activation, never drop — otherwise landing_view/consent_view vanish
    if (typeof document !== 'undefined' && (document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener('prerenderingchange', () => provider(event, payload), { once: true });
      return;
    }
    // (1) consent gate BEFORE touching `sent`: event_id is deterministic and markSent persists it in
    //     sessionStorage; marking here would leave the event dead for the session after consent (spec §11.1)
    if (HEALTH_CONTEXT_EVENTS.includes(event) && !getConsent()) return;

    const anonId = getAnonId();
    const sessionId = getSessionId();
    const scopeId = EVENT_SCOPE[event] === 'anon' ? anonId : sessionId;
    const eventId = eventIdFor(scopeId, event, stepRefFor(event, payload));
    const meta = EVENT_MAP[event];

    // (2) dedup for EVERY event (all of them go to the hub now)
    if (sent.has(eventId)) return;
    markSent(sent, eventId);

    // (3) Pixel only for mapped events
    const customData = meta ? buildCustomData(meta, payload) : undefined;
    if (meta) fbqTrack(meta, customData ?? {}, eventId);

    // (4) hub payload; getAttribution() already returns only keys with a value
    const body: IngestPayload = {
      project: PROJECT_SLUG,
      event_id: eventId,
      internal_name: event,
      meta_event_name: meta ?? null,
      occurred_at: now().toISOString(),
      event_source_url: window.location.href,
      anon_id: anonId,
      session_id: sessionId,
      fbc: getFbc(),
      fbp: getFbp(),
      metadata: pickMetadata(event, payload),
      consent_version: getConsent()?.policy_version ?? null,
      attribution: getAttribution() as Record<string, string>,
    };
    if (customData) body.custom_data = customData;
    try {
      transport(body).catch(() => {
        // pixel already fired; the server mirror is best-effort (retry lives in the hub)
      });
    } catch {
      // transport threw synchronously; same reasoning
    }
  };
  return provider;
}
