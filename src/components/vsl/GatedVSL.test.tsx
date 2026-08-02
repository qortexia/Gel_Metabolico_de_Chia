import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GatedVSL } from './GatedVSL';

describe('GatedVSL', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
});
