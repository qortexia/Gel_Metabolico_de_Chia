import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
