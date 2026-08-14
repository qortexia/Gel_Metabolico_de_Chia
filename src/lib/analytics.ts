export type AnalyticsEvent =
  | 'landing_view'
  | 'landing_cta_click'
  | 'quiz_start'
  | 'quiz_answer'
  | 'vsl_play'
  | 'vsl_cta_reveal'
  | 'vsl_cta_click'
  | 'imc_view'
  | 'projection_view'
  | 'quiz_complete'
  | 'result_view'
  | 'offer_view'
  | 'checkout_click';

type AnalyticsProvider = (event: AnalyticsEvent, payload?: Record<string, unknown>) => void;

let provider: AnalyticsProvider = () => {};

export function setAnalyticsProvider(fn: AnalyticsProvider) {
  provider = fn;
}

export function track(event: AnalyticsEvent, payload?: Record<string, unknown>) {
  provider(event, payload);
}
