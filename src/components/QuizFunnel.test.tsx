import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

  it('recorta los espacios del nombre al guardarlo en el store al hacer clic en Continuar, sin alterar lo que se ve mientras se escribe', async () => {
    const nombreIndex = SCREENS.findIndex((s) => s.id === 'nombre');
    useQuizStore.getState().goToIndex(nombreIndex);
    render(<QuizFunnel />);
    const input = screen.getByPlaceholderText('Escribe tu nombre…');
    await userEvent.type(input, '  Ana  ');
    // Mientras se escribe, el valor visible conserva los espacios tal cual los tecleó.
    expect(input).toHaveValue('  Ana  ');
    await userEvent.click(screen.getByText('Continuar'));
    expect(useQuizStore.getState().answers.nombre).toBe('Ana');
  });

  it('no antepone un nombre vacío al título de la pantalla de IMC', () => {
    const imcIndex = SCREENS.findIndex((s) => s.id === 'imc');
    useQuizStore.getState().goToIndex(imcIndex);
    render(<QuizFunnel />);
    expect(screen.getByText(/^Tu IMC hoy es/)).toBeInTheDocument();
    expect(screen.queryByText(/^,/)).not.toBeInTheDocument();
  });

  describe('pantalla loader2 con interpolación de variables', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('interpola el IMC, el objetivo y el nombre en los mensajes de loader2 en vez de mostrar los placeholders literales', () => {
      useQuizStore.setState((s) => ({
        answers: { ...s.answers, peso: 85, estatura: 160, objetivo: 70, nombre: 'Ana' },
      }));
      const loader2Index = SCREENS.findIndex((s) => s.id === 'loader2');
      useQuizStore.getState().goToIndex(loader2Index);
      render(<QuizFunnel />);

      // Primer mensaje: usa el IMC calculado (85kg / 1.60m -> 33.2).
      expect(screen.getByText(/Cruzando tu IMC de 33\.2/)).toBeInTheDocument();

      // Avanza el timer falso hasta el mensaje que interpola el objetivo.
      act(() => {
        vi.advanceTimersByTime(2400);
      });
      expect(screen.getByText(/Calculando tu camino hasta 70kg/)).toBeInTheDocument();

      // Avanza hasta el mensaje final, que interpola el nombre.
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText(/¡Plan de Ana listo!/)).toBeInTheDocument();

      expect(screen.queryByText(/\{imc\}|\{objetivo\}|\{nombre\}/)).not.toBeInTheDocument();
    });
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

    it('no muestra "$NaN" y usa el precio por defecto cuando la env var no es numérica', () => {
      process.env.NEXT_PUBLIC_OFFER_PRICE_MXN = 'no-es-un-numero';

      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);

      expect(() => render(<QuizFunnel />)).not.toThrow();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
      expect(screen.getByText('$690')).toBeInTheDocument();
    });
  });
});
