import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GatedVSL } from './GatedVSL';
import { saveVideoPosition, getVideoPosition } from '@/lib/videoPersistence';
import { setAnalyticsProvider } from '@/lib/analytics';

describe('GatedVSL', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    setAnalyticsProvider(() => {});
  });

  it('mantiene el CTA oculto y muestra el contador antes de revealAtSeconds', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-1"
      />
    );
    expect(screen.queryByText('QUIERO MI RECETA')).not.toBeInTheDocument();
    expect(screen.getByText(/El botón se libera en/)).toBeInTheDocument();
  });

  it('revela el CTA al alcanzar revealAtSeconds y avanza el funil al hacer clic', () => {
    const onCtaClick = vi.fn();
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={onCtaClick}
        resumeKey="test-vsl-2"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
    fireEvent.click(screen.getByText('QUIERO MI RECETA'));
    expect(onCtaClick).toHaveBeenCalledOnce();
  });

  it('resume desde la posición capturada al montar aunque un timeupdate posterior la sobrescriba en localStorage', () => {
    saveVideoPosition('test-vsl-resume', 42);

    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={30}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-resume"
      />
    );

    const resumeButton = screen.getByText('▶ Continuar viendo');
    expect(resumeButton).toBeInTheDocument();
    expect(resumeButton).toHaveClass('min-h-[44px]');
    expect(screen.getByText('↺ Ver desde el inicio')).toHaveClass('min-h-[44px]');

    // Simulate the user pressing the native <video> play control instead of
    // "Continuar viendo" first: playback starts from 0 and handleTimeUpdate
    // overwrites the persisted position with a near-zero value.
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 1, writable: true });
    fireEvent.timeUpdate(video);
    expect(getVideoPosition('test-vsl-resume')).toBe(1);

    // Clicking "Continuar viendo" must still seek to the position captured
    // at mount (42), not the corrupted persisted value (1).
    fireEvent.click(resumeButton);
    expect(video.currentTime).toBe(42);
  });

  it('no emite vsl_cta_click cuando el usuario continúa sin video tras un error de carga', () => {
    const trackSpy = vi.fn();
    setAnalyticsProvider(trackSpy);
    const onCtaClick = vi.fn();

    render(
      <GatedVSL
        src="/videos/broken.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={onCtaClick}
        resumeKey="test-vsl-error"
      />
    );

    const video = document.querySelector('video') as HTMLVideoElement;
    fireEvent.error(video);

    const fallbackButton = screen.getByText('Continuar sin video');
    expect(fallbackButton).toHaveClass('min-h-[44px]');
    fireEvent.click(fallbackButton);

    expect(onCtaClick).toHaveBeenCalledOnce();
    expect(trackSpy).not.toHaveBeenCalledWith('vsl_cta_click', expect.anything());
  });
});
