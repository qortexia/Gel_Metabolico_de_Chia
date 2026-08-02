import { describe, it, expect, beforeEach } from 'vitest';
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
});
