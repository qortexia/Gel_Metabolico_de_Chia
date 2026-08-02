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
});
