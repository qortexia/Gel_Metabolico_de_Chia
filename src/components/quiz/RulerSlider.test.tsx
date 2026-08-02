import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulerSlider } from './RulerSlider';

describe('RulerSlider', () => {
  it('muestra el valor por defecto y la unidad base', () => {
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={85}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('incrementa el valor con la flecha derecha del teclado', async () => {
    const onChange = vi.fn();
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={85}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={onChange}
      />
    );
    screen.getByRole('slider').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(86);
  });

  it('cambia a la unidad lb al hacer clic en el toggle y convierte el valor mostrado', async () => {
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={100}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('lb'));
    expect(screen.getByText('220')).toBeInTheDocument();
  });
});
