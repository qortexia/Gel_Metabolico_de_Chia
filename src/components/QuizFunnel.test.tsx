import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizFunnel } from './QuizFunnel';
import { useQuizStore } from '@/lib/store';
import { SCREENS } from '@/lib/content/copy';
import { setAnalyticsProvider, resetAnalytics } from '@/lib/analytics';
import { getAnonId, getSessionId } from '@/lib/tracking/ids';

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

  it('en la pantalla "area" (multi-selección), permite marcar más de una opción y deshabilita Continuar hasta elegir al menos una', async () => {
    const areaIndex = SCREENS.findIndex((s) => s.id === 'area');
    useQuizStore.getState().goToIndex(areaIndex);
    render(<QuizFunnel />);

    expect(screen.getByText('Continuar')).toBeDisabled();

    await userEvent.click(screen.getByText('Abdomen'));
    await userEvent.click(screen.getByText('Brazos'));
    expect(screen.getByText('Continuar')).not.toBeDisabled();

    await userEvent.click(screen.getByText('Continuar'));
    expect(useQuizStore.getState().answers.area).toEqual(['abdomen', 'brazos']);
    expect(useQuizStore.getState().currentIndex).toBe(areaIndex + 1);
  });

  it('en la pantalla "proyeccion", cualquiera de las dos opciones avanza a la siguiente pantalla', async () => {
    const proyeccionIndex = SCREENS.findIndex((s) => s.id === 'proyeccion');
    useQuizStore.getState().setAnswer('peso', 85);
    useQuizStore.getState().setAnswer('estatura', 165);
    useQuizStore.getState().setAnswer('objetivo', 70);
    useQuizStore.getState().goToIndex(proyeccionIndex);
    render(<QuizFunnel />);

    expect(screen.getByText('De 85 kg para 70 kg — 15 kg menos siguiendo el plan.')).toBeInTheDocument();

    await userEvent.click(screen.getByText('No sé todavía, pero puedo intentar'));
    expect(useQuizStore.getState().currentIndex).toBe(proyeccionIndex + 1);
  });

  it('en la pantalla "proyeccion", las fotos de antes/después dependen del género respondido', () => {
    const proyeccionIndex = SCREENS.findIndex((s) => s.id === 'proyeccion');
    useQuizStore.getState().setAnswer('genero', 'hombre');
    useQuizStore.getState().goToIndex(proyeccionIndex);
    render(<QuizFunnel />);
    expect(screen.getByAltText('Hoy')).toHaveAttribute('src', '/images/quiz/proyeccion-hombre-antes.webp');
    expect(screen.getByAltText('En 30 días')).toHaveAttribute('src', '/images/quiz/proyeccion-hombre-despues.webp');
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
      // No debe mostrar "$0 MXN": debe caer al precio por defecto (199).
      expect(screen.getByText('$199')).toBeInTheDocument();
    });

    it('no muestra "$NaN" y usa el precio por defecto cuando la env var no es numérica', () => {
      process.env.NEXT_PUBLIC_OFFER_PRICE_MXN = 'no-es-un-numero';

      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);

      expect(() => render(<QuizFunnel />)).not.toThrow();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
      expect(screen.getByText('$199')).toBeInTheDocument();
    });
  });

  describe('eventos de tracking', () => {
    beforeEach(() => {
      resetAnalytics();
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      resetAnalytics();
    });

    it('emite quiz_step_view con el id de la pantalla al montar cada paso', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const imcIndex = SCREENS.findIndex((s) => s.id === 'imc');
      useQuizStore.getState().goToIndex(imcIndex);
      render(<QuizFunnel />);
      expect(spy).toHaveBeenCalledWith('quiz_step_view', { step: 'imc', index: imcIndex });
      expect(spy).toHaveBeenCalledWith('imc_view', undefined);
    });

    it('emite quiz_complete al confirmar el nombre (última pregunta), no al llegar a la oferta', async () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const nombreIndex = SCREENS.findIndex((s) => s.id === 'nombre');
      useQuizStore.getState().goToIndex(nombreIndex);
      render(<QuizFunnel />);
      await userEvent.type(screen.getByPlaceholderText('Escribe tu nombre…'), 'Ana');
      await userEvent.click(screen.getByText('Continuar'));
      expect(spy).toHaveBeenCalledWith('quiz_complete', undefined);
    });

    it('en la pantalla de oferta no emite result_view ni quiz_complete, solo offer_view', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);
      render(<QuizFunnel />);
      expect(spy).toHaveBeenCalledWith('offer_view', undefined);
      expect(spy).not.toHaveBeenCalledWith('quiz_complete', expect.anything());
      const names = spy.mock.calls.map((c) => c[0]);
      expect(names).not.toContain('result_view');
      expect(names).not.toContain('quiz_start');
    });

    it('la URL de checkout lleva s1=session_id y s2=anon_id', async () => {
      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);
      render(<QuizFunnel />);
      // jsdom no implementa navegación: al asignar window.location.href logea
      // "Error: Not implemented: navigation" por console.error. Se silencia solo
      // en este test para mantener la salida limpia.
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await userEvent.click(screen.getByText('QUIERO MI PLAN'));
        const link = screen.getByText('Ir al pago manualmente');
        const href = link.getAttribute('href') ?? '';
        expect(href).toContain(`s1=${getSessionId()}`);
        expect(href).toContain(`s2=${getAnonId()}`);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });
});
