import { describe, it, expect } from 'vitest';
import { buildCheckoutUrl, getUtmsFromLocation } from './checkout';

describe('buildCheckoutUrl', () => {
  it('agrega los parámetros UTM a la URL base', () => {
    const url = buildCheckoutUrl('https://pay.kiwify.com.mx/x', {
      utm_source: 'meta',
      utm_campaign: 'mx-01',
    });
    expect(url).toBe('https://pay.kiwify.com.mx/x?utm_source=meta&utm_campaign=mx-01');
  });

  it('no agrega parámetros vacíos', () => {
    const url = buildCheckoutUrl('https://pay.kiwify.com.mx/x', { utm_source: '' });
    expect(url).toBe('https://pay.kiwify.com.mx/x');
  });
});

describe('getUtmsFromLocation', () => {
  it('extrae solo los parámetros utm_* conocidos', () => {
    const utms = getUtmsFromLocation('?utm_source=meta&foo=bar&utm_campaign=mx-01');
    expect(utms).toEqual({ utm_source: 'meta', utm_campaign: 'mx-01' });
  });
});
