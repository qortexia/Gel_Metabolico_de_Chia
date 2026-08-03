'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoPosition, saveVideoPosition, clearVideoPosition } from '@/lib/videoPersistence';
import { track } from '@/lib/analytics';

type GatedVSLProps = {
  src: string;
  // Pass Infinity to gate purely on the video actually finishing (`onEnded`)
  // instead of a fixed timestamp — the right choice whenever the source
  // video's duration isn't a known, stable constant (e.g. it may be swapped
  // for a differently-timed cut later). A finite value still gates at that
  // exact point in maxWatched time, same as before.
  revealAtSeconds: number;
  // If set, overrides revealAtSeconds once the video's real duration is
  // known (onLoadedMetadata): the effective gate becomes
  // `duration - revealSecondsBeforeEnd`, computed dynamically so it stays
  // correct no matter how long the source video actually is. Until
  // duration is known, falls back to revealAtSeconds (Infinity = show the
  // generic "watch to continue" message with no countdown in the meantime).
  revealSecondsBeforeEnd?: number;
  ctaLabel: string;
  onCtaClick: () => void;
  resumeKey: string;
  overlayText?: string;
  preventSkip?: boolean;
};

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function GatedVSL({
  src,
  revealAtSeconds,
  revealSecondsBeforeEnd,
  ctaLabel,
  onCtaClick,
  resumeKey,
  overlayText,
  preventSkip,
}: GatedVSLProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const savedPositionRef = useRef<number | null>(null);
  // High-water mark of playback: the furthest point actually watched.
  // Gating, the countdown, and persistence all key off this instead of raw
  // `currentTime`, so rewinding/seeking can't falsely reveal or un-reveal
  // the CTA. It never resets to 0 on its own — see handleResume for the one
  // legitimate case where it's fast-forwarded to match a resumed position.
  const maxWatchedRef = useRef(0);
  const durationRef = useRef<number | null>(null);
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

  // Resolves the real gate threshold for this render/tick: once the video's
  // duration is known and revealSecondsBeforeEnd is set, that takes over
  // from the static revealAtSeconds — recomputed every call so it always
  // reflects the latest known duration, never a stale snapshot.
  const getEffectiveRevealAt = () =>
    revealSecondsBeforeEnd != null && durationRef.current != null
      ? Math.max(0, durationRef.current - revealSecondsBeforeEnd)
      : revealAtSeconds;

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    durationRef.current = video.duration;
    const effectiveRevealAt = getEffectiveRevealAt();
    setSecondsLeft(Math.max(0, Math.ceil(effectiveRevealAt - maxWatchedRef.current)));
    if (maxWatchedRef.current >= effectiveRevealAt) setRevealed(true);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime);
    saveVideoPosition(resumeKey, maxWatchedRef.current);
    const effectiveRevealAt = getEffectiveRevealAt();
    setSecondsLeft(Math.max(0, Math.ceil(effectiveRevealAt - maxWatchedRef.current)));
    if (maxWatchedRef.current >= effectiveRevealAt) setRevealed(true);
  };

  // Anti-skip: if the user drags the scrubber past what's actually been
  // watched, snap back to maxWatched. The 0.5s tolerance avoids fighting
  // normal playback, where `currentTime` can tick slightly ahead of the
  // last-recorded maxWatched between events.
  const handleSeeking = () => {
    if (!preventSkip) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime > maxWatchedRef.current + 0.5) {
      video.currentTime = maxWatchedRef.current;
    }
  };

  const handleEnded = () => {
    // Safety net: guarantee the CTA reveals once the video has genuinely
    // finished, even if rounding kept maxWatched a hair under revealAtSeconds.
    setRevealed(true);
  };

  const handleResume = () => {
    const saved = savedPositionRef.current;
    if (saved && videoRef.current) {
      videoRef.current.currentTime = saved;
      // Must also fast-forward maxWatched to the resumed position. Otherwise
      // it would still read 0 right after this legitimate seek, and the
      // preventSkip anti-skip check (currentTime > maxWatched + 0.5) would
      // immediately treat the resume itself as an illegal forward-skip and
      // snap the video straight back to 0.
      maxWatchedRef.current = Math.max(maxWatchedRef.current, saved);
    }
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
          className="video-no-scrub w-full max-w-sm rounded-card"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeking={handleSeeking}
          onEnded={handleEnded}
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
          ) : getEffectiveRevealAt() === Infinity ? (
            <p aria-live="polite" className="text-center text-sm text-neutral-600">
              Mira el video completo para continuar
            </p>
          ) : (
            <p aria-live="polite" className="text-center text-sm text-neutral-600">
              El botón se libera en {formatCountdown(secondsLeft)}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
