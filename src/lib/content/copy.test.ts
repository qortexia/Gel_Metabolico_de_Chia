import { describe, it, expect } from 'vitest';
import { SCREENS, ECO_DOLOR, interpolate } from './copy';

describe('SCREENS', () => {
  it('tiene 23 pantallas con ids únicos', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(ids).toHaveLength(23);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('incluye las pantallas clave del funil en el orden correcto', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(ids.indexOf('vsl1')).toBeLessThan(ids.indexOf('imc'));
    expect(ids.indexOf('imc')).toBeLessThan(ids.indexOf('proyeccion'));
    expect(ids.indexOf('nombre')).toBeLessThan(ids.indexOf('vsl2'));
    expect(ids.indexOf('vsl2')).toBeLessThan(ids.indexOf('oferta'));
  });

  it('cada opción de la pantalla dolor tiene su eco correspondiente', () => {
    const dolorScreen = SCREENS.find((s) => s.id === 'dolor');
    if (!dolorScreen || dolorScreen.kind !== 'choice') throw new Error('pantalla dolor no encontrada');
    dolorScreen.options.forEach((opt) => {
      expect(ECO_DOLOR[opt.value]).toBeDefined();
    });
  });
});

describe('interpolate', () => {
  it('reemplaza los placeholders {var} con los valores dados', () => {
    expect(interpolate('Hola {nombre}, en {fecha}', { nombre: 'Ana', fecha: 'marzo de 2026' })).toBe(
      'Hola Ana, en marzo de 2026'
    );
  });
});
