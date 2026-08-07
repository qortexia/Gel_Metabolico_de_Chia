import { describe, it, expect } from 'vitest';
import { SCREENS, ECO_DOLOR, interpolate, buildLoader1Vars } from './copy';
import { INITIAL_ANSWERS } from '@/types/quiz';

describe('SCREENS', () => {
  it('tiene 24 pantallas con ids únicos', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(ids).toHaveLength(24);
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

describe('buildLoader1Vars', () => {
  it('arma las variables de personalización a partir de género, edad, cuerpo y áreas', () => {
    const vars = buildLoader1Vars({
      ...INITIAL_ANSWERS,
      genero: 'hombre',
      edad: '25-34',
      cuerpoActual: 'regular',
      area: ['abdomen', 'brazos'],
    });
    expect(vars).toEqual({
      generoPlural: 'hombres',
      edadTexto: 'entre 25 y 34 años',
      areasTexto: 'abdomen y brazos',
      cuerpoActual: 'regular',
    });
  });

  it('junta tres o más áreas con comas y "y" antes de la última', () => {
    const vars = buildLoader1Vars({
      ...INITIAL_ANSWERS,
      area: ['abdomen', 'pecho', 'costados'],
    });
    expect(vars.areasTexto).toBe('abdomen, pecho y flancos');
  });

  it('usa valores neutros por defecto cuando falta alguna respuesta', () => {
    const vars = buildLoader1Vars(INITIAL_ANSWERS);
    expect(vars).toEqual({
      generoPlural: 'personas',
      edadTexto: '',
      areasTexto: '',
      cuerpoActual: '',
    });
  });
});
