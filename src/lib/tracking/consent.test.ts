import { describe, it, expect, beforeEach } from 'vitest';
import { getConsent, saveConsent, PRIVACY_POLICY_VERSION } from './consent';

describe('consent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sin aceptación previa devuelve null', () => {
    expect(getConsent()).toBeNull();
  });

  it('saveConsent guarda fecha y versión de la política y getConsent la devuelve', () => {
    const record = saveConsent(new Date('2026-08-24T15:00:00Z'));
    expect(record).toEqual({ accepted_at: '2026-08-24T15:00:00.000Z', policy_version: PRIVACY_POLICY_VERSION });
    expect(getConsent()).toEqual(record);
    expect(window.localStorage.getItem('gel-chia-quiz-mx:consent')).toContain(PRIVACY_POLICY_VERSION);
  });
});
