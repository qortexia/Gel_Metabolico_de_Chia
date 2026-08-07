import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceCard } from './ChoiceCard';

describe('ChoiceCard', () => {
  it('llama a onSelect al hacer clic', async () => {
    const onSelect = vi.fn();
    render(<ChoiceCard label="Mujer" selected={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Mujer'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('marca aria-pressed cuando está seleccionado', () => {
    render(<ChoiceCard label="Mujer" selected onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('con image, renderiza una foto en vez de texto y sigue siendo seleccionable', async () => {
    const onSelect = vi.fn();
    render(<ChoiceCard label="Mujer" image="/images/quiz/genero-mujer.jpg" selected={false} onSelect={onSelect} />);
    const img = screen.getByRole('img', { name: 'Mujer' });
    expect(img).toHaveAttribute('src', '/images/quiz/genero-mujer.jpg');
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  describe('con image y sublabel (variante lista)', () => {
    it('muestra la miniatura, el título y el subtítulo', () => {
      const { container } = render(
        <ChoiceCard
          label="Regular"
          sublabel="Peso normal"
          image="/images/quiz/cuerpo-mujer-regular.jpg"
          selected={false}
          onSelect={() => {}}
        />
      );
      expect(screen.getByText('Regular')).toBeInTheDocument();
      expect(screen.getByText('Peso normal')).toBeInTheDocument();
      // alt="" es decorativo a propósito (el texto ya da el nombre accesible
      // del botón), así que la imagen no tiene role "img" — se busca por tag.
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', '/images/quiz/cuerpo-mujer-regular.jpg');
      expect(img).toHaveAttribute('alt', '');
    });

    it('llama a onSelect al hacer clic', async () => {
      const onSelect = vi.fn();
      render(
        <ChoiceCard
          label="Regular"
          sublabel="Peso normal"
          image="/images/quiz/cuerpo-mujer-regular.jpg"
          selected={false}
          onSelect={onSelect}
        />
      );
      await userEvent.click(screen.getByRole('button'));
      expect(onSelect).toHaveBeenCalledOnce();
    });

    it('marca aria-pressed cuando está seleccionado', () => {
      render(
        <ChoiceCard
          label="Regular"
          sublabel="Peso normal"
          image="/images/quiz/cuerpo-mujer-regular.jpg"
          selected
          onSelect={() => {}}
        />
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('con checkbox (variante multi-selección)', () => {
    it('muestra la foto y el label, y llama a onSelect al hacer clic', async () => {
      const onSelect = vi.fn();
      const { container } = render(
        <ChoiceCard label="Abdomen" image="/images/quiz/area-mujer-abdomen.webp" checkbox selected={false} onSelect={onSelect} />
      );
      expect(screen.getByText('Abdomen')).toBeInTheDocument();
      expect(container.querySelector('img')).toHaveAttribute('src', '/images/quiz/area-mujer-abdomen.webp');
      await userEvent.click(screen.getByRole('button'));
      expect(onSelect).toHaveBeenCalledOnce();
    });

    it('marca aria-pressed cuando está seleccionado, sin desmarcar otras tarjetas (multi-selección)', () => {
      render(<ChoiceCard label="Abdomen" image="/images/quiz/area-mujer-abdomen.webp" checkbox selected onSelect={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
