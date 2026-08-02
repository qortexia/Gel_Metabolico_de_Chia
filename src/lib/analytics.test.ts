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
