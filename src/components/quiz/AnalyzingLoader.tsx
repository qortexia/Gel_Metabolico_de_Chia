'use client';

import { useEffect, useState } from 'react';

type AnalyzingLoaderProps = {
  title: string;
  subtitle: string;
  messages: string[];
  durationMs: number;
  onComplete: () => void;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AnalyzingLoader({ title, subtitle, messages, durationMs, onComplete }: AnalyzingLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepMs = 50;
    const totalSteps = durationMs / stepMs;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(pct);
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        onComplete();
      }
    }, stepMs);
    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  // Checklist items complete one at a time as progress crosses each
  // messages.length-th of the way to 100%, instead of cycling through them.
  const completedCount = Math.min(messages.length, Math.floor((progress / 100) * messages.length));

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-8 text-center"
      aria-live="polite"
    >
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} strokeWidth="10" className="stroke-neutral-200" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            strokeWidth="10"
            className="stroke-brand transition-all duration-100"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{progress}%</span>
      </div>
      <h1 className="mt-6 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-neutral-600">{subtitle}</p>
      <div className="mt-6 w-full max-w-sm space-y-3 text-left">
        {messages.map((message, index) => {
          const done = index < completedCount;
          return (
            <div
              key={message}
              className={`flex items-center gap-3 rounded-card border px-4 py-3 ${
                done ? 'border-brand bg-brand/5' : 'border-neutral-200 bg-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm text-white ${
                  done ? 'border-brand bg-brand' : 'border-neutral-300 bg-white'
                }`}
              >
                {done ? '✓' : null}
              </span>
              <span className={done ? 'text-foreground' : 'text-neutral-400'}>{message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
