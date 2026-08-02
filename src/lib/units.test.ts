import { describe, it, expect } from 'vitest';
import { kgToLb, lbToKg, cmToIn, inToCm } from './units';

describe('unidades', () => {
  it('convierte kg a lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it('convierte lb a kg y de regreso sin perder precisión relevante', () => {
    expect(lbToKg(kgToLb(85))).toBeCloseTo(85, 5);
  });

  it('convierte cm a pulgadas y de regreso sin perder precisión relevante', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 5);
    expect(inToCm(cmToIn(160))).toBeCloseTo(160, 5);
  });
});
