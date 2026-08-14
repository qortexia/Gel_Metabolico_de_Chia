import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuizGate } from './QuizGate';
import { useQuizStore } from '@/lib/store';
import { LANDING } from '@/lib/content/copy';

describe('QuizGate', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('renderiza LandingGate cuando started=false', () => {
    render(<QuizGate />);
    expect(screen.getByText(LANDING.ageGateTitulo)).toBeInTheDocument();
  });

  it('renderiza QuizFunnel cuando started=true', () => {
    useQuizStore.getState().startQuiz();
    render(<QuizGate />);
    expect(screen.queryByText(LANDING.ageGateTitulo)).not.toBeInTheDocument();
  });
});
