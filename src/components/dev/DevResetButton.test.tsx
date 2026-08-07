import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevResetButton } from './DevResetButton';
import { useQuizStore } from '@/lib/store';

describe('DevResetButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('no renderiza fuera de development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<DevResetButton />);
    expect(screen.queryByText('⟲ Reset quiz')).not.toBeInTheDocument();
  });

  describe('en development', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      useQuizStore.getState().goToIndex(3);
      useQuizStore.getState().setAnswer('nombre', 'Valentina');
    });

    it('renderiza el botón', () => {
      render(<DevResetButton />);
      expect(screen.getByText('⟲ Reset quiz')).toBeInTheDocument();
    });

    it('al hacer clic, resetea el store a la pregunta 1 sin respuestas', async () => {
      const user = userEvent.setup();
      render(<DevResetButton />);
      await user.click(screen.getByText('⟲ Reset quiz'));
      expect(useQuizStore.getState().currentIndex).toBe(0);
      expect(useQuizStore.getState().answers.nombre).toBeNull();
    });
  });
});
