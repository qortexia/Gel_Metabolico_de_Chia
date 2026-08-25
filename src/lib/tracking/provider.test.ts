import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrackingProvider, buildCustomData, type CapiTransport } from './provider';
import { getAnonId, getSessionId, eventIdFor } from './ids';
import { saveConsent } from './consent';

describe('createTrackingProvider', () => {
  const fixedNow = () => new Date('2026-08-24T12:00:00Z');

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    delete window.fbq;
  });

  it('checkout_click → fbq InitiateCheckout con eventID determinístico y value/currency MXN, y POST al transport', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });

    provider('checkout_click', { priceMxn: 199 });

    const expectedId = eventIdFor(getSessionId(), 'checkout_click', '');
    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', { value: 199, currency: 'MXN' }, { eventID: expectedId });
    expect(transport).toHaveBeenCalledWith({
      event_id: expectedId,
      meta_event_name: 'InitiateCheckout',
      occurred_at: '2026-08-24T12:00:00.000Z',
      event_source_url: window.location.href,
      anon_id: getAnonId(),
      session_id: getSessionId(),
      fbc: null,
      fbp: null,
      custom_data: { value: 199, currency: 'MXN' },
      internal_name: 'checkout_click',
      metadata: { priceMxn: 199 },
      consent_version: null,
    });
  });

  it('incluye consent_version cuando ya se guardó el consentimiento', () => {
    saveConsent(fixedNow());
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('checkout_click', { priceMxn: 199 });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ consent_version: '2026-08-24' }));
  });

  it('el metadata del payload de transporte nunca lleva claves fuera de la allowlist (nada de peso/salud)', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('checkout_click', { priceMxn: 199, peso: 85 });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ metadata: { priceMxn: 199 } }));
  });

  it('quiz_complete → Lead con event_id por anon_id: misma persona en otra sesión produce el MISMO id', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const expectedId = eventIdFor(getAnonId(), 'quiz_complete', '');

    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    window.sessionStorage.clear(); // nueva sesión, mismo navegador
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');

    expect(fbq).toHaveBeenCalledTimes(2);
    expect(fbq).toHaveBeenNthCalledWith(1, 'track', 'Lead', {}, { eventID: expectedId });
    expect(fbq).toHaveBeenNthCalledWith(2, 'track', 'Lead', {}, { eventID: expectedId });
  });

  it('no reenvía el mismo evento dos veces en la misma sesión, ni siquiera tras un remount/reload del provider', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);

    const first = createTrackingProvider({ transport, now: fixedNow });
    first('checkout_click', { priceMxn: 199 });
    first('checkout_click', { priceMxn: 199 });
    const afterReload = createTrackingProvider({ transport, now: fixedNow });
    afterReload('checkout_click', { priceMxn: 199 });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('eventos no mapeados (imc_view, quiz_answer…) no tocan fbq ni el transport', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });

    provider('imc_view');
    provider('quiz_answer', { step: 'peso', value: 85 });
    provider('vsl_cta_click', { resumeKey: 'vsl1' });

    expect(fbq).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('sin fbq cargado igual envía al transport (el servidor cubre al navegador)', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('incluye fbc y fbp cuando existen las cookies', () => {
    document.cookie = '_fbp=fb.1.1.42; path=/';
    document.cookie = '_fbc=fb.1.1.abc; path=/';
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ fbc: 'fb.1.1.abc', fbp: 'fb.1.1.42' }));
    document.cookie = '_fbp=; max-age=0; path=/';
    document.cookie = '_fbc=; max-age=0; path=/';
  });

  it('un transport que falla no rompe el flujo', () => {
    const transport = vi.fn().mockRejectedValue(new Error('network'));
    expect(() => createTrackingProvider({ transport, now: fixedNow })('quiz_complete')).not.toThrow();
  });

  it('un transport que lanza de forma síncrona tampoco rompe el flujo', () => {
    const transport = vi.fn(() => {
      throw new Error('sync');
    });
    expect(() =>
      createTrackingProvider({ transport: transport as unknown as CapiTransport, now: fixedNow })('quiz_complete')
    ).not.toThrow();
  });

  it('eventos no mapeados no entran en la lista de enviados (no consumen el límite de dedup)', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });
    provider('imc_view');
    provider('quiz_answer', { step: 'peso', value: 85 });
    expect(window.sessionStorage.getItem('gel-chia-quiz-mx:sent_event_ids')).toBeNull();
    provider('quiz_complete');
    expect(JSON.parse(window.sessionStorage.getItem('gel-chia-quiz-mx:sent_event_ids') ?? '[]')).toHaveLength(1);
  });
});

describe('buildCustomData', () => {
  it('InitiateCheckout lleva value + currency MXN', () => {
    expect(buildCustomData('InitiateCheckout', { priceMxn: 199 })).toEqual({ value: 199, currency: 'MXN' });
  });
  it('ViewContent lleva content_name genérico', () => {
    expect(buildCustomData('ViewContent', { content_name: 'vsl2_75' })).toEqual({ content_name: 'vsl2_75' });
  });
  it('Lead no lleva custom_data', () => {
    expect(buildCustomData('Lead', { nombre: 'Ana' })).toBeUndefined();
  });
});
