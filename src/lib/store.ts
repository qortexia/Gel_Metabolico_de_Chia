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
    { name: 'gel-chia-quiz-mx' }
  )
);
