export type AnalyticsEvent =
  | 'landing_view'
  | 'consent_view'
  | 'consent_accept'
  | 'landing_cta_click'
  | 'quiz_start'
  | 'quiz_step_view'
  | 'quiz_answer'
  | 'imc_view'
  | 'projection_view'
  | 'quiz_complete'
  | 'vsl_view'
  | 'vsl_play'
  | 'vsl_cta_reveal'
  | 'vsl_cta_click'
  | 'vsl_error'
  | 'vsl_continue_without_video'
  | 'offer_view'
  | 'checkout_click';

export type AnalyticsPayload = Record<string, unknown>;
export type AnalyticsProvider = (event: AnalyticsEvent, payload?: AnalyticsPayload) => void;

const BUFFER_CAP = 100;

let provider: AnalyticsProvider | null = null;
let pending: Array<[AnalyticsEvent, AnalyticsPayload | undefined]> = [];

// Child effects (LandingGate's landing_view) run before the layout-level
// TrackingProvider effect that installs the real provider, so early events are
// held here and flushed in order once a provider exists.
export function setAnalyticsProvider(fn: AnalyticsProvider) {
  provider = fn;
  const queued = pending;
  pending = [];
  for (const [event, payload] of queued) fn(event, payload);
}

export function track(event: AnalyticsEvent, payload?: AnalyticsPayload) {
  if (provider) {
    provider(event, payload);
    return;
  }
  if (pending.length < BUFFER_CAP) pending.push([event, payload]);
}

export function resetAnalytics() {
  provider = null;
  pending = [];
}
