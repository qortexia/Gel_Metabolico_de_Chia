import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingGate } from './LandingGate';
import { useQuizStore } from '@/lib/store';
import { setAnalyticsProvider } from '@/lib/analytics';
import { LANDING } from '@/lib/content/copy';

describe('LandingGate', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    setAnalyticsProvider(() => {});
  });

  it('renderiza título, hero y el age gate', () => {
    render(<LandingGate />);
    expect(screen.getByText(LANDING.titulo)).toBeInTheDocument();
    expect(screen.getByAltText(LANDING.heroAlt)).toBeInTheDocument();
    expect(screen.getByText(LANDING.ageGateTitulo)).toBeInTheDocument();
  });

  it('renderiza los links del footer', () => {
    render(<LandingGate />);
    expect(screen.getByText(LANDING.footerLinks.terminos)).toHaveAttribute('href', '/terms');
    expect(screen.getByText(LANDING.footerLinks.privacidad)).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(LANDING.footerLinks.contacto)).toHaveAttribute(
      'href',
      `mailto:${LANDING.contactoEmail}`
    );
  });

  it('clic en "Sí, continuar" llama startQuiz() y trackea landing_cta_click', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByText(LANDING.ageGateSi));

    expect(useQuizStore.getState().started).toBe(true);
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'yes' });
  });

  it('clic en "No, salir" muestra el mensaje de bloqueo y no llama startQuiz()', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByText(LANDING.ageGateNo));

    expect(screen.getByText(LANDING.ageGateBloqueado)).toBeInTheDocument();
    expect(screen.queryByText(LANDING.ageGateSi)).not.toBeInTheDocument();
    expect(useQuizStore.getState().started).toBe(false);
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'no' });
  });
});
