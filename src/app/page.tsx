'use client';

import dynamic from 'next/dynamic';
import { DevResetButton } from '@/components/dev/DevResetButton';

const QuizGate = dynamic(() => import('@/components/QuizGate').then((mod) => mod.QuizGate), {
  ssr: false,
  // Without this, the page renders nothing at all (ssr: false) until the
  // client JS chunk finishes loading — a blank white screen on any
  // connection slower than instant. This fills that gap with something
  // that matches the app's background instead of an empty page.
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-brand" />
    </div>
  ),
});

export default function Home() {
  return (
    <>
      <QuizGate />
      <DevResetButton />
    </>
  );
}
