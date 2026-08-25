import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { TrackingProvider } from './TrackingProvider';
import { track, resetAnalytics } from '@/lib/analytics';
import { getAttribution, getFbc } from '@/lib/tracking/attribution';

describe('TrackingProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetAnalytics();
    document.cookie = '_fbc=; max-age=0; path=/';
    window.history.replaceState({}, '', '/?utm_source=ig&ad_id=7&fbclid=XyZ');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('al montar persiste la atribución de la URL, reconstruye fbc e instala el provider', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    render(<TrackingProvider transport={transport} />);

    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '7', fbclid: 'XyZ' });
    expect(getFbc()).toMatch(/^fb\.1\.\d+\.XyZ$/);

    track('quiz_complete');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ meta_event_name: 'Lead', fbc: expect.stringMatching(/XyZ$/) }));
  });

  it('entrega al provider los eventos emitidos antes de montar (buffer)', () => {
    track('quiz_complete');
    const transport = vi.fn().mockResolvedValue(undefined);
    render(<TrackingProvider transport={transport} />);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
