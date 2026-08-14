'use client';

import { useQuizStore } from '@/lib/store';
import { QuizFunnel } from './QuizFunnel';
import { LandingGate } from './home/LandingGate';

// Kept as its own component (rather than inlined in page.tsx) so page.tsx can
// keep loading it via next/dynamic(..., { ssr: false }) — that avoids ever
// server-rendering `started`, which would otherwise mismatch the client's
// first paint while the Zustand persist middleware is still rehydrating from
// localStorage.
export function QuizGate() {
  const started = useQuizStore((state) => state.started);
  return started ? <QuizFunnel /> : <LandingGate />;
}
