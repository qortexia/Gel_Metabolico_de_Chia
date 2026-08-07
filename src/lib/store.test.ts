import { describe, it, expect, beforeEach } from 'vitest';
import { useQuizStore } from './store';

describe('useQuizStore', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('starts at index 0 with empty answers', () => {
    const state = useQuizStore.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.answers.nombre).toBeNull();
  });

  it('setAnswer updates only the given field', () => {
    useQuizStore.getState().setAnswer('nombre', 'Valentina');
    expect(useQuizStore.getState().answers.nombre).toBe('Valentina');
    expect(useQuizStore.getState().answers.genero).toBeNull();
  });

  it('goNext advances the index and goBack never goes below 0', () => {
    useQuizStore.getState().goNext();
    useQuizStore.getState().goNext();
    expect(useQuizStore.getState().currentIndex).toBe(2);
    useQuizStore.getState().goBack();
    expect(useQuizStore.getState().currentIndex).toBe(1);
    useQuizStore.getState().goBack();
    useQuizStore.getState().goBack();
    expect(useQuizStore.getState().currentIndex).toBe(0);
  });

  describe('rehidratación desde localStorage con un esquema anterior', () => {
    it('corrige "area" a un array vacío si el guardado anterior tenía string|null (evita el crash de selectedValues.length)', () => {
      const merge = useQuizStore.persist.getOptions().merge;
      expect(merge).toBeDefined();
      const current = useQuizStore.getState();
      const merged = merge!(
        { currentIndex: 3, answers: { ...current.answers, area: null, nombre: 'Ana' } },
        current
      ) as typeof current;
      expect(merged.answers.area).toEqual([]);
      expect(merged.answers.nombre).toBe('Ana');
    });

    it('conserva un array de "area" ya válido tal cual', () => {
      const merge = useQuizStore.persist.getOptions().merge!;
      const current = useQuizStore.getState();
      const merged = merge({ answers: { ...current.answers, area: ['abdomen'] } }, current) as typeof current;
      expect(merged.answers.area).toEqual(['abdomen']);
    });

    it('rellena con los valores por defecto los campos ausentes en un guardado más antiguo', () => {
      const merge = useQuizStore.persist.getOptions().merge!;
      const current = useQuizStore.getState();
      const { cuerpoActual, ...answersSinCuerpoActual } = current.answers;
      const merged = merge({ answers: answersSinCuerpoActual }, current) as typeof current;
      expect(merged.answers.cuerpoActual).toBeNull();
    });
  });
});
