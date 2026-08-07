import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AnalyzingLoader } from './AnalyzingLoader';

describe('AnalyzingLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el título inmediatamente', () => {
    render(<AnalyzingLoader title="Analizando" subtitle="S" messages={['a']} durationMs={100} onComplete={() => {}} />);
    expect(screen.getByText('Analizando')).toBeInTheDocument();
  });

  it('llama a onComplete cuando termina la duración', () => {
    const onComplete = vi.fn();
    render(
      <AnalyzingLoader title="T" subtitle="S" messages={['a', 'b']} durationMs={200} onComplete={onComplete} />
    );
    vi.advanceTimersByTime(250);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('muestra el checklist completo desde el inicio, con 0% y ningún ítem marcado', () => {
    render(
      <AnalyzingLoader title="T" subtitle="S" messages={['uno', 'dos', 'tres']} durationMs={300} onComplete={() => {}} />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('uno')).toBeInTheDocument();
    expect(screen.getByText('tres')).toBeInTheDocument();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('va marcando los ítems del checklist a medida que avanza el progreso', () => {
    render(
      <AnalyzingLoader title="T" subtitle="S" messages={['uno', 'dos', 'tres']} durationMs={300} onComplete={() => {}} />
    );
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getAllByText('✓')).toHaveLength(3);
  });

  it('no muestra el carrusel de fotos cuando no se pasa resultPhotos', () => {
    const { container } = render(
      <AnalyzingLoader title="T" subtitle="S" messages={['a']} durationMs={100} onComplete={() => {}} />
    );
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('muestra el carrusel de fotos cuando se pasa resultPhotos', () => {
    const { container } = render(
      <AnalyzingLoader
        title="T"
        subtitle="S"
        messages={['a']}
        durationMs={100}
        onComplete={() => {}}
        resultPhotos={['/images/quiz/resultado-01.jpg', '/images/quiz/resultado-02.jpg']}
      />
    );
    expect(screen.getByText('Resultados reales de nuestra comunidad')).toBeInTheDocument();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });
});
