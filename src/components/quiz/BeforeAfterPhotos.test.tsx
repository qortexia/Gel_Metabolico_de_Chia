import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BeforeAfterPhotos } from './BeforeAfterPhotos';

describe('BeforeAfterPhotos', () => {
  it('muestra las fotos de "Hoy" y "En 30 días" con los src correctos', () => {
    render(<BeforeAfterPhotos beforeSrc="/before.webp" afterSrc="/after.webp" />);
    expect(screen.getByAltText('Hoy')).toHaveAttribute('src', '/before.webp');
    expect(screen.getByAltText('En 30 días')).toHaveAttribute('src', '/after.webp');
  });
});
