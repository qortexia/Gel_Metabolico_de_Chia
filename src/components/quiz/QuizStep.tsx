'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { ProgressBar } from './ProgressBar';

type QuizStepProps = {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function QuizStep({ current, total, title, subtitle, onBack, children, footer }: QuizStepProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // QuizStep is remounted on every screen transition (the orchestrator renders it
  // with key={screen.id}), so this effect re-runs on each new screen and moves
  // keyboard/screen-reader focus to the new title instead of leaving it on <body>
  // after the previous screen's answer button unmounts.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background text-foreground">
      <div className="flex w-full max-w-sm flex-1 flex-col">
        <ProgressBar current={current} total={total} />
        <div className="flex items-center px-4 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl"
            >
              ←
            </button>
          ) : (
            <span className="min-h-[44px] min-w-[44px]" />
          )}
        </div>
        <div className="flex-1 px-5 pb-6">
          <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-bold leading-tight outline-none">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-base text-neutral-600">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="sticky bottom-0 border-t border-neutral-200 bg-background p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
