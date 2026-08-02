import { describe, it, expect, beforeEach } from 'vitest';
import { saveVideoPosition, getVideoPosition, clearVideoPosition } from './videoPersistence';

describe('videoPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('guarda y recupera la posición del video', () => {
    saveVideoPosition('vsl1', 42.5);
    expect(getVideoPosition('vsl1')).toBe(42.5);
  });

  it('retorna null cuando no hay posición guardada', () => {
    expect(getVideoPosition('vsl-sin-guardar')).toBeNull();
  });

  it('limpia la posición guardada', () => {
    saveVideoPosition('vsl1', 10);
    clearVideoPosition('vsl1');
    expect(getVideoPosition('vsl1')).toBeNull();
  });
});
