import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingGate } from './LandingGate';
import { useQuizStore } from '@/lib/store';
import { setAnalyticsProvider } from '@/lib/analytics';
import { LANDING } from '@/lib/content/copy';
import { getConsent, PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';

describe('LandingGate', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
    window.localStorage.clear();
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

  it('clic en "Sí, continuar" (con consentimiento marcado) llama startQuiz() y trackea consent_accept, landing_cta_click y quiz_start', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText(LANDING.ageGateSi));

    expect(useQuizStore.getState().started).toBe(true);
    expect(spy).toHaveBeenCalledWith('consent_accept', { policy_version: PRIVACY_POLICY_VERSION });
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'yes' });
    expect(spy).toHaveBeenCalledWith('quiz_start', undefined);
    expect(getConsent()?.policy_version).toBe(PRIVACY_POLICY_VERSION);
  });

  it('"Sí, continuar" queda deshabilitado hasta marcar el consentimiento', async () => {
    const user = userEvent.setup();
    render(<LandingGate />);
    const yes = screen.getByText(LANDING.ageGateSi);
    expect(yes).toBeDisabled();
    await user.click(yes);
    expect(useQuizStore.getState().started).toBe(false);
    await user.click(screen.getByRole('checkbox'));
    expect(yes).not.toBeDisabled();
  });

  it('el texto de consentimiento menciona datos de salud y enlaza al Aviso de Privacidad', () => {
    render(<LandingGate />);
    expect(screen.getByText(/datos de salud/)).toBeInTheDocument();
    expect(screen.getByText(LANDING.consentLink)).toHaveAttribute('href', '/privacy');
  });

  it('emite consent_view junto con landing_view al montar', () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    render(<LandingGate />);
    expect(spy).toHaveBeenCalledWith('landing_view', undefined);
    expect(spy).toHaveBeenCalledWith('consent_view', { policy_version: PRIVACY_POLICY_VERSION });
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
