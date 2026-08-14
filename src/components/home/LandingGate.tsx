'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { LANDING } from '@/lib/content/copy';
import { LegalFooter } from './LegalFooter';

export function LandingGate() {
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const [underage, setUnderage] = useState(false);

  useEffect(() => {
    track('landing_view');
  }, []);

  const handleYes = () => {
    track('landing_cta_click', { answer: 'yes' });
    startQuiz();
  };

  const handleNo = () => {
    track('landing_cta_click', { answer: 'no' });
    setUnderage(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-8 text-center">
        <h1 className="text-2xl font-bold leading-tight">{LANDING.titulo}</h1>
        <p className="mt-1 text-xs tracking-wide text-neutral-500">{LANDING.subtitulo}</p>

        <div className="mt-6 h-[360px] w-full overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LANDING.heroSrc}
            alt={LANDING.heroAlt}
            width={1122}
            height={1402}
            className="h-full w-full object-cover object-top"
          />
        </div>

        <div className="mt-6 rounded-card border border-neutral-200 bg-white p-5">
          {underage ? (
            <p role="status" aria-live="polite" className="text-neutral-700">
              {LANDING.ageGateBloqueado}
            </p>
          ) : (
            <>
              <p className="font-semibold">{LANDING.ageGateTitulo}</p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleYes}
                  className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white"
                >
                  {LANDING.ageGateSi}
                </button>
                <button
                  type="button"
                  onClick={handleNo}
                  className="min-h-[44px] w-full rounded-full bg-neutral-100 px-6 py-3 text-lg font-semibold text-neutral-600"
                >
                  {LANDING.ageGateNo}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}
