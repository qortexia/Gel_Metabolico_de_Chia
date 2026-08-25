import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseAttribution,
  persistAttribution,
  getAttribution,
  readCookie,
  getFbp,
  getFbc,
  buildFbc,
  ensureFbc,
  getCheckoutParams,
} from './attribution';
import { getAnonId, getSessionId } from './ids';

function clearCookie(name: string) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

describe('attribution', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearCookie('_fbp');
    clearCookie('_fbc');
  });

  it('parseAttribution extrae utm_*, fbclid y los ids dinámicos del anuncio, ignorando el resto', () => {
    const parsed = parseAttribution(
      '?utm_source=ig&utm_campaign=mx01&fbclid=AbC.123&campaign_id=1&adset_id=2&ad_id=3&placement=feed&foo=bar'
    );
    expect(parsed).toEqual({
      utm_source: 'ig',
      utm_campaign: 'mx01',
      fbclid: 'AbC.123',
      campaign_id: '1',
      adset_id: '2',
      ad_id: '3',
      placement: 'feed',
    });
  });

  it('persistAttribution es write-once: una visita posterior sin UTMs no borra la atribución original', () => {
    persistAttribution('?utm_source=ig&ad_id=3');
    persistAttribution('');
    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '3' });
  });

  it('persistAttribution no sobreescribe claves ya guardadas pero completa las que faltaban', () => {
    persistAttribution('?utm_source=ig');
    persistAttribution('?utm_source=fb&ad_id=9');
    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '9' });
  });

  it('readCookie lee una cookie por nombre y decodifica el valor', () => {
    expect(readCookie('_fbp', '_ga=1; _fbp=fb.1.1700000000000.42')).toBe('fb.1.1700000000000.42');
    expect(readCookie('_fbc', '_fbp=x')).toBeNull();
  });

  it('readCookie no lanza con un valor mal codificado y devuelve el valor crudo', () => {
    expect(readCookie('_fbc', '_fbc=fb.1.1.abc%E0%A4%A')).toBe('fb.1.1.abc%E0%A4%A');
  });

  it('getFbp lee la cookie _fbp del documento', () => {
    document.cookie = '_fbp=fb.1.1700000000000.42; path=/';
    expect(getFbp()).toBe('fb.1.1700000000000.42');
  });

  it('buildFbc arma fb.1.{ts}.{fbclid} sin alterar el fbclid', () => {
    expect(buildFbc('AbC_dEf', 1700000000000)).toBe('fb.1.1700000000000.AbC_dEf');
  });

  it('ensureFbc reconstruye _fbc a partir de fbclid cuando la cookie no existe y la persiste', () => {
    const fbc = ensureFbc('?fbclid=AbC_dEf', 1700000000000);
    expect(fbc).toBe('fb.1.1700000000000.AbC_dEf');
    expect(readCookie('_fbc')).toBe('fb.1.1700000000000.AbC_dEf');
    expect(getFbc()).toBe('fb.1.1700000000000.AbC_dEf');
  });

  it('ensureFbc respeta una cookie _fbc ya existente (la del Pixel gana)', () => {
    document.cookie = '_fbc=fb.1.1600000000000.original; path=/';
    expect(ensureFbc('?fbclid=nuevo', 1700000000000)).toBe('fb.1.1600000000000.original');
  });

  it('ensureFbc devuelve null sin fbclid ni cookie', () => {
    expect(ensureFbc('?utm_source=ig', 1700000000000)).toBeNull();
  });

  it('getCheckoutParams incluye utm_*, s1=session_id, s2=anon_id, s3=fbc y sck=fbp', () => {
    document.cookie = '_fbp=fb.1.1700000000000.42; path=/';
    ensureFbc('?fbclid=AbC', 1700000000000);
    persistAttribution('?utm_source=ig&utm_campaign=mx01&ad_id=3');
    const params = getCheckoutParams('');
    expect(params).toEqual({
      utm_source: 'ig',
      utm_campaign: 'mx01',
      s1: getSessionId(),
      s2: getAnonId(),
      s3: 'fb.1.1700000000000.AbC',
      sck: 'fb.1.1700000000000.42',
    });
  });

  it('getCheckoutParams también toma los UTMs de la URL actual si aún no fueron persistidos', () => {
    const params = getCheckoutParams('?utm_source=direct-test');
    expect(params.utm_source).toBe('direct-test');
    expect(params.s1).toBe(getSessionId());
  });
});
