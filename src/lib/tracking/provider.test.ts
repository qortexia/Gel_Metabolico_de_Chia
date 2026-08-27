import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrackingProvider, buildCustomData, type IngestTransport } from './provider';
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
      project: 'chia',
      event_id: expectedId,
      internal_name: 'checkout_click',
      meta_event_name: 'InitiateCheckout',
      occurred_at: '2026-08-24T12:00:00.000Z',
      event_source_url: window.location.href,
      anon_id: getAnonId(),
      session_id: getSessionId(),
      fbc: null,
      fbp: null,
      custom_data: { value: 199, currency: 'MXN' },
      metadata: { priceMxn: 199 },
      consent_version: null,
      attribution: {},
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
      createTrackingProvider({ transport: transport as unknown as IngestTransport, now: fixedNow })('quiz_complete')
    ).not.toThrow();
  });

  it('eventos não mapeados não tocam fbq, mas vão ao transport com meta_event_name null', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('vsl_cta_click', { resumeKey: 'vsl1' });
    expect(fbq).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      project: 'chia', internal_name: 'vsl_cta_click', meta_event_name: null, metadata: { resumeKey: 'vsl1' },
    }));
  });

  it('eventos de contexto de saúde não saem sem consentimento (e não entram no dedup), e saem depois dele', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });
    provider('quiz_step_view', { step: 'peso', index: 8 });
    expect(transport).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('gel-chia-quiz-mx:sent_event_ids')).toBeNull();
    saveConsent(fixedNow());
    provider('quiz_step_view', { step: 'peso', index: 8 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('todo evento enviado entra na lista de dedup (também os que não mapeiam para Meta)', () => {
    saveConsent(fixedNow());
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });
    provider('quiz_answer', { step: 'peso', value: 85 });
    provider('quiz_answer', { step: 'peso', value: 85 });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ meta_event_name: null, metadata: { step: 'peso' } }));
    expect(JSON.parse(window.sessionStorage.getItem('gel-chia-quiz-mx:sent_event_ids') ?? '[]')).toHaveLength(1);
  });

  it('durante prerendering o evento é adiado até prerenderingchange, não descartado', () => {
    Object.defineProperty(document, 'prerendering', { value: true, configurable: true });
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    expect(transport).not.toHaveBeenCalled();
    Object.defineProperty(document, 'prerendering', { value: false, configurable: true });
    document.dispatchEvent(new Event('prerenderingchange'));
    expect(transport).toHaveBeenCalledTimes(1);
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
