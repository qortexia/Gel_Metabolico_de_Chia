'use client';

import { useQuizStore } from '@/lib/store';

// Dev-only convenience: lets Eduardo restart the quiz from question 1 without
// clearing localStorage by hand while building/testing the funnel. Never
// renders outside `npm run dev` — production builds set NODE_ENV to
// 'production', so this is a no-op there.
export function DevResetButton() {
  const reset = useQuizStore((state) => state.reset);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      type="button"
      onClick={reset}
      className="fixed bottom-4 right-4 z-50 rounded-full border border-dashed border-neutral-400 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-600 shadow-md"
    >
      ⟲ Reset quiz
    </button>
  );
}
