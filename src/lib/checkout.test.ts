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

  it('no lanza excepción si baseUrl es una cadena vacía y regresa una URL válida de respaldo', () => {
    expect(() => buildCheckoutUrl('', {})).not.toThrow();
    const url = buildCheckoutUrl('', {});
    expect(() => new URL(url)).not.toThrow();
    expect(url).toBe('https://pay.kiwify.com.mx/REEMPLAZAR');
  });

  it('agrega UTMs incluso cuando baseUrl está vacío y usa el fallback', () => {
    const url = buildCheckoutUrl('', { utm_source: 'meta' });
    expect(url).toBe('https://pay.kiwify.com.mx/REEMPLAZAR?utm_source=meta');
  });

  it('no lanza excepción si baseUrl no es una URL válida y regresa el fallback', () => {
    expect(() => buildCheckoutUrl('not-a-valid-url', {})).not.toThrow();
    const url = buildCheckoutUrl('not-a-valid-url', {});
    expect(url).toBe('https://pay.kiwify.com.mx/REEMPLAZAR');
  });
});

describe('getUtmsFromLocation', () => {
  it('extrae solo los parámetros utm_* conocidos', () => {
    const utms = getUtmsFromLocation('?utm_source=meta&foo=bar&utm_campaign=mx-01');
    expect(utms).toEqual({ utm_source: 'meta', utm_campaign: 'mx-01' });
  });
});
