import { describe, it, expect, vi, afterEach } from 'vitest';
import { track, setAnalyticsProvider } from './analytics';

describe('analytics', () => {
  afterEach(() => {
    setAnalyticsProvider(() => {});
  });

  it('no lanza error si no hay provider configurado', () => {
    expect(() => track('quiz_start')).not.toThrow();
  });

  it('reenvía el evento y el payload al provider configurado', () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    track('checkout_click', { priceMxn: 690 });
    expect(spy).toHaveBeenCalledWith('checkout_click', { priceMxn: 690 });
  });
});

import { resetAnalytics } from './analytics';

describe('analytics buffer', () => {
  afterEach(() => {
    resetAnalytics();
  });

  it('guarda los eventos emitidos antes de configurar el provider y los entrega al configurarlo', () => {
    resetAnalytics();
    track('landing_view');
    track('quiz_start');
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    expect(spy).toHaveBeenNthCalledWith(1, 'landing_view', undefined);
    expect(spy).toHaveBeenNthCalledWith(2, 'quiz_start', undefined);
  });

  it('después de configurado, el provider recibe los eventos directamente (sin repetir los ya entregados)', () => {
    resetAnalytics();
    track('landing_view');
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    track('quiz_start');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('no acumula más de 100 eventos sin provider', () => {
    resetAnalytics();
    for (let i = 0; i < 150; i++) track('quiz_answer', { step: String(i) });
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    expect(spy).toHaveBeenCalledTimes(100);
  });
});
