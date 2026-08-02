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
});
