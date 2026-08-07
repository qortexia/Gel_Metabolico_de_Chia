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

  it('el <video> lleva la clase que oculta la barra de progreso nativa (video-no-scrub)', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-no-scrub-class"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toHaveClass('video-no-scrub');
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

  it('el contador se basa en el tiempo máximo asistido y no retrocede si el usuario rebobina', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={20}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-countdown"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.getByText('El botón se libera en 10s')).toBeInTheDocument();

    // Rewind: the countdown must keep reflecting the max watched (10s), not
    // jump back up to 17s just because the playhead moved backward.
    video.currentTime = 3;
    fireEvent.timeUpdate(video);
    expect(screen.getByText('El botón se libera en 10s')).toBeInTheDocument();
  });

  it('rebobinar después de revelado no vuelve a ocultar el CTA (ratchet de una vía)', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-ratchet"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();

    video.currentTime = 2;
    fireEvent.timeUpdate(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
  });

  it('onEnded revela el CTA aunque maxWatched no haya llegado técnicamente a revealAtSeconds', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={999}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-ended"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    fireEvent.ended(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
  });

  it('persiste el tiempo máximo asistido (maxWatched) en localStorage, no la posición cruda tras rebobinar', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={100}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-maxwatched-persist"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 20, writable: true });
    fireEvent.timeUpdate(video);
    expect(getVideoPosition('test-vsl-maxwatched-persist')).toBe(20);

    video.currentTime = 5;
    fireEvent.timeUpdate(video);
    expect(getVideoPosition('test-vsl-maxwatched-persist')).toBe(20);
  });

  it('preventSkip=true revierte un avance (seek) más allá de lo realmente asistido', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={100}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-preventskip"
        preventSkip
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
    fireEvent.timeUpdate(video);

    video.currentTime = 20;
    fireEvent.seeking(video);
    expect(video.currentTime).toBe(5);
  });

  it('preventSkip=false (o ausente) permite el scrubbing libre sin regresión', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={100}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-no-preventskip"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
    fireEvent.timeUpdate(video);

    video.currentTime = 20;
    fireEvent.seeking(video);
    expect(video.currentTime).toBe(20);
  });

  it('retomar con "Continuar viendo" bajo preventSkip no se revierte a 0 (interacción resume + anti-skip)', () => {
    saveVideoPosition('test-vsl-resume-skip', 50);

    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={90}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-resume-skip"
        preventSkip
      />
    );

    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true });

    const resumeButton = screen.getByText('▶ Continuar viendo');
    fireEvent.click(resumeButton);
    expect(video.currentTime).toBe(50);

    // Simulate the browser firing 'seeking' right after the programmatic
    // resume-seek. Anti-skip must not treat this legitimate resume as an
    // illegal forward-skip and snap the video back to 0.
    fireEvent.seeking(video);
    expect(video.currentTime).toBe(50);
  });

  it('revealAtSeconds=Infinity: no revela por tiempo, solo cuando el video realmente termina', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={Infinity}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-infinite"
      />
    );
    expect(screen.getByText('Mira el video completo para continuar')).toBeInTheDocument();
    expect(screen.queryByText(/El botón se libera en/)).not.toBeInTheDocument();

    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 999999, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.queryByText('QUIERO MI RECETA')).not.toBeInTheDocument();
    expect(screen.getByText('Mira el video completo para continuar')).toBeInTheDocument();

    fireEvent.ended(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
  });

  it('el contador muestra formato m:ss cuando faltan 60 segundos o más', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={125}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-mmss"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 2, writable: true });
    fireEvent.timeUpdate(video);
    // 125 - 2 = 123s restantes -> 2:03
    expect(screen.getByText('El botón se libera en 2:03')).toBeInTheDocument();

    video.currentTime = 66;
    fireEvent.timeUpdate(video);
    // 125 - 66 = 59s restantes -> vuelve al formato "Xs"
    expect(screen.getByText('El botón se libera en 59s')).toBeInTheDocument();
  });

  it('revealSecondsBeforeEnd: antes de conocer la duración, muestra el mensaje genérico', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={Infinity}
        revealSecondsBeforeEnd={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-before-end-unknown-duration"
      />
    );
    expect(screen.getByText('Mira el video completo para continuar')).toBeInTheDocument();
    expect(screen.queryByText(/El botón se libera en/)).not.toBeInTheDocument();
  });

  it('revealSecondsBeforeEnd: una vez conocida la duración, libera 10s antes del final real', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={Infinity}
        revealSecondsBeforeEnd={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-before-end-100"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 100, writable: true, configurable: true });
    fireEvent.loadedMetadata(video);
    // 100 - 10 = 90s de umbral. El contador ya no es el mensaje genérico.
    expect(screen.getByText('El botón se libera en 1:30')).toBeInTheDocument();

    Object.defineProperty(video, 'currentTime', { value: 50, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.getByText('El botón se libera en 40s')).toBeInTheDocument();
    expect(screen.queryByText('QUIERO MI RECETA')).not.toBeInTheDocument();

    video.currentTime = 90;
    fireEvent.timeUpdate(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
  });

  describe('botón dev-only "Liberar CTA"', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('no aparece fuera de development', () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(
        <GatedVSL
          src="/videos/vsl1.mp4"
          revealAtSeconds={999}
          ctaLabel="QUIERO MI RECETA"
          onCtaClick={() => {}}
          resumeKey="test-vsl-dev-button-prod"
        />
      );
      expect(screen.queryByText('⟲ Liberar CTA')).not.toBeInTheDocument();
    });

    it('en development, revela el CTA sin necesidad de mirar el video y luego desaparece', () => {
      vi.stubEnv('NODE_ENV', 'development');
      render(
        <GatedVSL
          src="/videos/vsl1.mp4"
          revealAtSeconds={999}
          ctaLabel="QUIERO MI RECETA"
          onCtaClick={() => {}}
          resumeKey="test-vsl-dev-button-dev"
        />
      );
      expect(screen.queryByText('QUIERO MI RECETA')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('⟲ Liberar CTA'));
      expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
      expect(screen.queryByText('⟲ Liberar CTA')).not.toBeInTheDocument();
    });
  });

  it('revealSecondsBeforeEnd: si el video es más corto que el margen, el umbral se limita a 0 (no queda negativo)', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={Infinity}
        revealSecondsBeforeEnd={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-before-end-short-video"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 5, writable: true, configurable: true });
    fireEvent.loadedMetadata(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
  });
});
