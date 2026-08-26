import { describe, it, expect } from 'vitest';
import { EVENT_MAP, META_EVENT_ALLOWLIST, EVENT_SCOPE, stepRefFor, pickMetadata } from './eventMap';

describe('eventMap', () => {
  it('solo quiz_complete y checkout_click se traducen a eventos estándar de Meta (Lead / InitiateCheckout)', () => {
    expect(EVENT_MAP.quiz_complete).toBe('Lead');
    expect(EVENT_MAP.checkout_click).toBe('InitiateCheckout');
    const mapped = Object.entries(EVENT_MAP).filter(([, meta]) => meta !== null);
    expect(mapped).toEqual([
      ['quiz_complete', 'Lead'],
      ['checkout_click', 'InitiateCheckout'],
    ]);
  });

  it('los eventos con contexto de salud y los CTA de VSL nunca se mapean a Meta', () => {
    expect(EVENT_MAP.imc_view).toBeNull();
    expect(EVENT_MAP.projection_view).toBeNull();
    expect(EVENT_MAP.vsl_cta_click).toBeNull();
    expect(EVENT_MAP.landing_cta_click).toBeNull();
  });

  it('todo nombre mapeado pertenece a la allowlist de Meta', () => {
    for (const meta of Object.values(EVENT_MAP)) {
      if (meta) expect(META_EVENT_ALLOWLIST).toContain(meta);
    }
  });

  it('Lead usa scope por persona (anon); el resto por sesión', () => {
    expect(EVENT_SCOPE.quiz_complete).toBe('anon');
    expect(EVENT_SCOPE.checkout_click).toBeUndefined();
  });

  it('stepRefFor toma step o resumeKey del payload', () => {
    expect(stepRefFor('quiz_answer', { step: 'peso', value: 85 })).toBe('peso');
    expect(stepRefFor('vsl_play', { resumeKey: 'vsl2' })).toBe('vsl2');
    expect(stepRefFor('quiz_complete')).toBe('');
  });

  it('pickMetadata deja pasar solo las claves permitidas: el valor de la respuesta nunca sale', () => {
    expect(pickMetadata('quiz_answer', { step: 'peso', value: 85 })).toEqual({ step: 'peso' });
    expect(pickMetadata('checkout_click', { priceMxn: 199, extra: 'x' })).toEqual({ priceMxn: 199 });
    expect(pickMetadata('imc_view', { imc: 33 })).toEqual({});
  });
});
