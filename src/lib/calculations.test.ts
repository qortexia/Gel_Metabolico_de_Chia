import { describe, it, expect } from 'vitest';
import {
  calcularImc,
  calcularKgABajar,
  calcularFechaObjetivo,
  categoriaImc,
} from './calculations';

describe('calcularImc', () => {
  it('calcula el IMC redondeado a 1 decimal', () => {
    expect(calcularImc(85, 160)).toBe(33.2);
  });
});

describe('calcularKgABajar', () => {
  it('calcula la diferencia entre peso actual y objetivo', () => {
    expect(calcularKgABajar(85, 70)).toBe(15);
  });

  it('nunca regresa un valor negativo cuando el objetivo es mayor que el peso actual', () => {
    expect(calcularKgABajar(70, 85)).toBe(0);
  });
});

describe('categoriaImc', () => {
  it('clasifica correctamente cada franja', () => {
    expect(categoriaImc(22)).toBe('bajo');
    expect(categoriaImc(27)).toBe('medio');
    expect(categoriaImc(32)).toBe('alto');
  });
});

describe('calcularFechaObjetivo', () => {
  it('proyecta la fecha en formato "mes de año" en español', () => {
    const desde = new Date('2026-08-02T00:00:00Z');
    const resultado = calcularFechaObjetivo(15, desde);
    expect(resultado).toMatch(/^[a-zñáéíóú]+ de \d{4}$/);
  });

  it('nunca produce una proyección de menos de 1 semana', () => {
    const desde = new Date('2026-08-02T00:00:00Z');
    expect(() => calcularFechaObjetivo(0, desde)).not.toThrow();
  });
});
