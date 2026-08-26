export const PRIVACY_POLICY_VERSION = '2026-08-24';

const CONSENT_KEY = 'gel-chia-quiz-mx:consent';

export type ConsentRecord = { accepted_at: string; policy_version: string };

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

export function saveConsent(now: Date = new Date(), policyVersion: string = PRIVACY_POLICY_VERSION): ConsentRecord {
  const record: ConsentRecord = { accepted_at: now.toISOString(), policy_version: policyVersion };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      // blocked storage: consent still valid for this pageview
    }
  }
  return record;
}
