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

  it('ancla el contenedor de marcas con left-1/2 y lo traslada en px puros (sin % en el transform), para que el 50% no se resuelva contra el ancho de la propia tira de marcas', () => {
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
    const slider = screen.getByRole('slider');
    const ticksContainer = slider.children[1] as HTMLElement;
    expect(ticksContainer.className).toContain('left-1/2');
    // centerOffsetPx = -(85 - 40) * 16 = -720; menos la mitad de PX_PER_UNIT (8) = -728.
    // Con left-1/2 (resuelto contra el track, el padre) + este translateX en px puros,
    // la marca de 85 queda centrada bajo el marcador verde sin importar el ancho del track.
    expect(ticksContainer.style.transform).toBe('translateX(-728px)');
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
