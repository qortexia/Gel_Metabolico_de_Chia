import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { PhotoCarousel } from './PhotoCarousel';

describe('PhotoCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const images = ['/a.jpg', '/b.jpg', '/c.jpg'];

  it('muestra las tres imágenes, la primera visible y las demás ocultas', () => {
    const { container } = render(<PhotoCarousel images={images} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(3);
    expect(imgs[0].className).toContain('opacity-100');
    expect(imgs[1].className).toContain('opacity-0');
    expect(imgs[2].className).toContain('opacity-0');
  });

  it('avanza automáticamente a la siguiente imagen y da la vuelta al llegar al final', () => {
    const { container } = render(<PhotoCarousel images={images} intervalMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    let imgs = container.querySelectorAll('img');
    expect(imgs[1].className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    imgs = container.querySelectorAll('img');
    expect(imgs[0].className).toContain('opacity-100');
  });

  it('con una sola imagen, no crea un intervalo (no avanza nada que mostrar)', () => {
    const { container } = render(<PhotoCarousel images={['/a.jpg']} intervalMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });
});
