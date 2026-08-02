'use client';

import { useEffect, useState } from 'react';

type AnalyzingLoaderProps = {
  title: string;
  subtitle: string;
  messages: string[];
  durationMs: number;
  onComplete: () => void;
};

export function AnalyzingLoader({ title, subtitle, messages, durationMs, onComplete }: AnalyzingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const stepMs = 50;
    const totalSteps = durationMs / stepMs;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(pct);
      setMessageIndex(Math.min(messages.length - 1, Math.floor((pct / 100) * messages.length)));
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        onComplete();
      }
    }, stepMs);
    return () => clearInterval(interval);
  }, [durationMs, messages.length, onComplete]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
      aria-live="polite"
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-neutral-600">{subtitle}</p>
      <div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full bg-brand transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-4 text-sm text-neutral-500">{messages[messageIndex]}</p>
    </div>
  );
}
