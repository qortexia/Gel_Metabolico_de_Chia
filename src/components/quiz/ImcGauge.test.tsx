import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImcGauge } from './ImcGauge';

describe('ImcGauge', () => {
  it('posiciona el marcador según el valor de IMC', () => {
    render(<ImcGauge value={27.5} />);
    expect(screen.getByLabelText('IMC 27.5')).toBeInTheDocument();
  });
});
