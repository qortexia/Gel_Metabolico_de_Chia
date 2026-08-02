'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoPosition, saveVideoPosition, clearVideoPosition } from '@/lib/videoPersistence';
import { track } from '@/lib/analytics';

type GatedVSLProps = {
  src: string;
  revealAtSeconds: number;
  ctaLabel: string;
  onCtaClick: () => void;
  resumeKey: string;
  overlayText?: string;
};

export function GatedVSL({ src, revealAtSeconds, ctaLabel, onCtaClick, resumeKey, overlayText }: GatedVSLProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const savedPositionRef = useRef<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(revealAtSeconds);
  const [revealed, setRevealed] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Capture the saved position once, at mount, before any playback or
    // timeupdate event has a chance to overwrite it in localStorage.
    // `handleResume` seeks using this captured ref instead of re-reading
    // localStorage at click time, so native-controls playback started before
    // the user picks "Continuar viendo" can't silently corrupt the resume target.
    const saved = getVideoPosition(resumeKey);
    if (saved && saved > 5) {
      savedPositionRef.current = saved;
      setShowResumePrompt(true);
    }
    track('vsl_play', { resumeKey });
  }, [resumeKey]);

  useEffect(() => {
    if (revealed) {
      ctaRef.current?.focus();
      track('vsl_cta_reveal', { resumeKey });
    }
  }, [revealed, resumeKey]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    saveVideoPosition(resumeKey, video.currentTime);
    setSecondsLeft(Math.max(0, Math.ceil(revealAtSeconds - video.currentTime)));
    if (video.currentTime >= revealAtSeconds) setRevealed(true);
  };

  const handleResume = () => {
    const saved = savedPositionRef.current;
    if (saved && videoRef.current) videoRef.current.currentTime = saved;
    setShowResumePrompt(false);
  };

  const handleRestart = () => {
    clearVideoPosition(resumeKey);
    setShowResumePrompt(false);
  };

  const handleCtaClick = () => {
    track('vsl_cta_click', { resumeKey });
    onCtaClick();
  };

  // The video-failed-to-load fallback advances the funnel without the CTA
  // ever having been gated/revealed, so it must not emit `vsl_cta_click` —
  // that event should mean "the real gated CTA was revealed and clicked."
  const handleContinueWithoutVideo = () => {
    onCtaClick();
  };

  return (
    <div className="flex flex-col items-center px-4">
      {overlayText ? <p className="mb-3 text-center text-sm font-medium text-neutral-700">{overlayText}</p> : null}

      {videoError ? (
        <div className="flex h-64 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-card bg-neutral-100 p-4 text-center">
          <p>No pudimos cargar el video.</p>
          <button
            type="button"
            onClick={handleContinueWithoutVideo}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-4 py-2 text-white"
          >
            Continuar sin video
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="w-full max-w-sm rounded-card"
          onTimeUpdate={handleTimeUpdate}
          onError={() => setVideoError(true)}
        >
          <track kind="captions" />
        </video>
      )}

      {showResumePrompt ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>Ya empezaste a ver este video</span>
          <button
            type="button"
            onClick={handleResume}
            className="inline-flex min-h-[44px] items-center justify-center px-3 font-semibold text-brand"
          >
            ▶ Continuar viendo
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex min-h-[44px] items-center justify-center px-3 font-semibold text-neutral-500"
          >
            ↺ Ver desde el inicio
          </button>
        </div>
      ) : null}

      {!videoError ? (
        <div className="mt-4 w-full max-w-sm">
          {revealed ? (
            <button
              ref={ctaRef}
              type="button"
              onClick={handleCtaClick}
              className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white"
            >
              {ctaLabel}
            </button>
          ) : (
            <p aria-live="polite" className="text-center text-sm text-neutral-500">
              El botón se libera en {secondsLeft}s
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
