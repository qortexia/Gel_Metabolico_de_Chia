import type { AnalyticsEvent, AnalyticsPayload } from '@/lib/analytics';

export type MetaEventName = 'Lead' | 'InitiateCheckout' | 'ViewContent';

export const META_EVENT_ALLOWLIST: readonly MetaEventName[] = ['Lead', 'InitiateCheckout', 'ViewContent'];

// Single source of truth for internal → Meta translation. It happens once, in
// the client; the server only validates against META_EVENT_ALLOWLIST. null =
// stays internal (Supabase-only from Fase 1 on). ViewContent is reserved for
// the VSL milestones of Fase 3.
export const EVENT_MAP: Record<AnalyticsEvent, MetaEventName | null> = {
  landing_view: null, // PageView is fired by the pixel init snippet itself
  consent_view: null,
  consent_accept: null,
  landing_cta_click: null,
  quiz_start: null,
  quiz_step_view: null,
  quiz_answer: null,
  imc_view: null, // health context: must never reach Meta
  projection_view: null, // health context: must never reach Meta
  quiz_complete: 'Lead',
  vsl_view: null,
  vsl_play: null,
  vsl_cta_reveal: null,
  vsl_cta_click: null, // also fires on VSL1 mid-quiz; never InitiateCheckout
  vsl_error: null,
  vsl_continue_without_video: null,
  offer_view: null,
  checkout_click: 'InitiateCheckout',
};

// Keys of a track() payload allowed to leave the browser. Answer values and
// anything health-related are not listed, so they are dropped by construction.
export const METADATA_ALLOWLIST: Partial<Record<AnalyticsEvent, readonly string[]>> = {
  landing_cta_click: ['answer'],
  consent_accept: ['policy_version'],
  quiz_step_view: ['step', 'index'],
  quiz_answer: ['step'],
  vsl_view: ['resumeKey'],
  vsl_play: ['resumeKey'],
  vsl_cta_reveal: ['resumeKey'],
  vsl_cta_click: ['resumeKey'],
  vsl_error: ['resumeKey', 'code'],
  vsl_continue_without_video: ['resumeKey'],
  checkout_click: ['priceMxn'],
};

// Lead is keyed by person: the same person finishing the quiz again tomorrow
// (new session) must produce the same event_id so Meta dedups it.
export const EVENT_SCOPE: Partial<Record<AnalyticsEvent, 'anon'>> = {
  quiz_complete: 'anon',
};

export function stepRefFor(event: AnalyticsEvent, payload?: AnalyticsPayload): string {
  void event;
  const ref = payload?.step ?? payload?.resumeKey ?? '';
  return typeof ref === 'string' || typeof ref === 'number' ? String(ref) : '';
}

export function pickMetadata(event: AnalyticsEvent, payload?: AnalyticsPayload): AnalyticsPayload {
  const allowed = METADATA_ALLOWLIST[event] ?? [];
  const out: AnalyticsPayload = {};
  for (const key of allowed) {
    if (payload && payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}
