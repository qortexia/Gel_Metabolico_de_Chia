'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { LANDING, DISCLAIMERS } from '@/lib/content/copy';

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

        <div className="mt-6 max-h-[360px] overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LANDING.heroSrc} alt={LANDING.heroAlt} className="w-full object-cover" />
        </div>

        <div className="mt-6 rounded-card border border-neutral-200 bg-white p-5">
          {underage ? (
            <p className="text-neutral-700">{LANDING.ageGateBloqueado}</p>
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

      <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-6 text-center">
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/terms" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
            {LANDING.footerLinks.terminos}
          </a>
          <a href="/privacy" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
            {LANDING.footerLinks.privacidad}
          </a>
          <a
            href={`mailto:${LANDING.contactoEmail}`}
            className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
          >
            {LANDING.footerLinks.contacto}
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[10px] leading-relaxed text-neutral-500">{DISCLAIMERS.aviso}</p>
        <p className="mx-auto mt-2 max-w-sm text-[10px] leading-relaxed text-neutral-500">
          {DISCLAIMERS.privacidad}
        </p>
        <p className="mt-3 text-[10px] text-neutral-400">{LANDING.copyright}</p>
      </div>
    </div>
  );
}
