import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizFunnel } from './QuizFunnel';
import { useQuizStore } from '@/lib/store';
import { SCREENS } from '@/lib/content/copy';

describe('QuizFunnel', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('renderiza la primera pantalla del funil', () => {
    render(<QuizFunnel />);
    expect(screen.getByText(/Si pudieras dejar un peso atrás/)).toBeInTheDocument();
  });

  it('avanza a la siguiente pantalla y guarda la respuesta al seleccionar una opción', async () => {
    render(<QuizFunnel />);
    await userEvent.click(screen.getByText('Hasta 5 kg 🎯'));
    expect(screen.getByText(/Para quién estamos armando este plan/)).toBeInTheDocument();
    expect(useQuizStore.getState().answers.deseo).toBe('hasta-5');
  });

  it('guarda el valor por defecto del slider al continuar sin arrastrar', async () => {
    const pesoIndex = SCREENS.findIndex((s) => s.id === 'peso');
    useQuizStore.getState().goToIndex(pesoIndex);
    render(<QuizFunnel />);
    await userEvent.click(screen.getByText('Continuar'));
    expect(useQuizStore.getState().answers.peso).toBe(85);
  });

  it('no antepone un nombre vacío al título de la pantalla de IMC', () => {
    const imcIndex = SCREENS.findIndex((s) => s.id === 'imc');
    useQuizStore.getState().goToIndex(imcIndex);
    render(<QuizFunnel />);
    expect(screen.getByText(/^Tu IMC hoy es/)).toBeInTheDocument();
    expect(screen.queryByText(/^,/)).not.toBeInTheDocument();
  });

  describe('pantalla de oferta con variables de entorno vacías', () => {
    const originalCheckoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL;
    const originalPrice = process.env.NEXT_PUBLIC_OFFER_PRICE_MXN;

    afterEach(() => {
      process.env.NEXT_PUBLIC_CHECKOUT_URL = originalCheckoutUrl;
      process.env.NEXT_PUBLIC_OFFER_PRICE_MXN = originalPrice;
    });

    it('no se cae y usa el precio/URL por defecto cuando las env vars son cadenas vacías', () => {
      process.env.NEXT_PUBLIC_CHECKOUT_URL = '';
      process.env.NEXT_PUBLIC_OFFER_PRICE_MXN = '';

      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);

      expect(() => render(<QuizFunnel />)).not.toThrow();
      expect(screen.getByText('QUIERO MI PLAN')).toBeInTheDocument();
      // No debe mostrar "$0 MXN": debe caer al precio por defecto (690).
      expect(screen.getByText('$690')).toBeInTheDocument();
    });
  });
});
