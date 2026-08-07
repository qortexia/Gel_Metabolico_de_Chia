import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_ANSWERS, QuizAnswers } from '@/types/quiz';

interface QuizState {
  currentIndex: number;
  answers: QuizAnswers;
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void;
  goNext: () => void;
  goBack: () => void;
  goToIndex: (index: number) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      currentIndex: 0,
      answers: INITIAL_ANSWERS,
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      goNext: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
      goBack: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
      goToIndex: (index) => set({ currentIndex: index }),
      reset: () => set({ currentIndex: 0, answers: INITIAL_ANSWERS }),
    }),
    {
      name: 'gel-chia-quiz-mx',
      // Browsers with quiz progress saved before a QuizAnswers shape change
      // (e.g. a new field, or 'area' going from string|null to string[]) must
      // not crash on rehydration. The default persist merge replaces the whole
      // `answers` object with whatever was saved, so any field missing from —
      // or shaped differently in — old localStorage data would otherwise leak
      // straight into state. Merge onto fresh defaults field-by-field instead,
      // and coerce 'area' back into an array no matter what shape was saved.
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<QuizState>;
        const persistedAnswers = (persistedState.answers ?? {}) as Partial<QuizAnswers>;
        return {
          ...current,
          ...persistedState,
          answers: {
            ...current.answers,
            ...persistedAnswers,
            area: Array.isArray(persistedAnswers.area) ? persistedAnswers.area : [],
          },
        };
      },
    }
  )
);
