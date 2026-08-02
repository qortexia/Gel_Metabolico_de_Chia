import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectionChart } from './ProjectionChart';

describe('ProjectionChart', () => {
  it('renderiza un gráfico accesible con las dos curvas', () => {
    render(<ProjectionChart pesoActual={85} objetivo={70} />);
    expect(screen.getByRole('img', { name: /proyección de peso/i })).toBeInTheDocument();
  });
});
