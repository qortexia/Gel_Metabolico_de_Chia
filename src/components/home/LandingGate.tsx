'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { saveConsent, PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';
import { LANDING } from '@/lib/content/copy';
import { LegalFooter } from './LegalFooter';

export function LandingGate() {
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const [underage, setUnderage] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    track('landing_view');
    track('consent_view', { policy_version: PRIVACY_POLICY_VERSION });
  }, []);

  const handleYes = () => {
    if (!consented) return;
    saveConsent();
    track('consent_accept', { policy_version: PRIVACY_POLICY_VERSION });
    track('landing_cta_click', { answer: 'yes' });
    startQuiz();
    track('quiz_start');
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
              <label className="mt-4 flex items-start gap-2 text-left text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  aria-label={LANDING.consentAria}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                />
                <span>
                  {LANDING.consentTexto}{' '}
                  <a href="/privacy" className="underline">
                    {LANDING.consentLink}
                  </a>
                  .
                </span>
              </label>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleYes}
                  disabled={!consented}
                  className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-40"
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
