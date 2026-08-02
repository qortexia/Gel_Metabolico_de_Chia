import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizStep } from './QuizStep';

describe('QuizStep', () => {
  it('renderiza título y subtítulo', () => {
    render(
      <QuizStep current={1} total={10} title="Título" subtitle="Sub">
        <p>contenido</p>
      </QuizStep>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('llama a onBack al hacer clic en la flecha', async () => {
    const onBack = vi.fn();
    render(
      <QuizStep current={1} total={10} title="Título" onBack={onBack}>
        <p>contenido</p>
      </QuizStep>
    );
    await userEvent.click(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('mueve el foco al título al montar, para que no se pierda en <body> tras cada transición de pantalla', () => {
    render(
      <QuizStep current={1} total={10} title="Título">
        <p>contenido</p>
      </QuizStep>
    );
    expect(screen.getByText('Título')).toHaveFocus();
  });

  it('vuelve a enfocar el nuevo título cuando QuizStep se remonta con una key distinta (simulando el cambio de pantalla)', () => {
    const { rerender } = render(
      <QuizStep key="pantalla-1" current={1} total={10} title="Título 1">
        <p>contenido</p>
      </QuizStep>
    );
    expect(screen.getByText('Título 1')).toHaveFocus();

    rerender(
      <QuizStep key="pantalla-2" current={2} total={10} title="Título 2">
        <p>contenido</p>
      </QuizStep>
    );
    expect(screen.getByText('Título 2')).toHaveFocus();
  });
});
