import { describe, it, expect, vi, afterEach } from 'vitest';
import { fbqTrack } from './metaPixel';

describe('fbqTrack', () => {
  afterEach(() => {
    delete window.fbq;
  });

  it('llama a fbq("track", nombre, params, { eventID }) y devuelve true', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    expect(fbqTrack('Lead', {}, 'evt-1')).toBe(true);
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', {}, { eventID: 'evt-1' });
  });

  it('sin fbq cargado devuelve false sin lanzar', () => {
    expect(fbqTrack('Lead', {}, 'evt-1')).toBe(false);
  });
});
