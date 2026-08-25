import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MetaPixelScript } from './MetaPixelScript';

describe('MetaPixelScript', () => {
  it('desactiva autoConfig antes de inicializar el pixel (evita el auto-detect de eventos con datos de salud)', () => {
    render(<MetaPixelScript pixelId="123" />);

    const script = document.getElementById('meta-pixel');
    expect(script).not.toBeNull();
    const text = script!.textContent ?? '';

    const autoConfigCall = "fbq('set', 'autoConfig', false, '123')";
    const initCall = "fbq('init', '123')";
    expect(text).toContain(autoConfigCall);
    expect(text).toContain(initCall);
    expect(text.indexOf(autoConfigCall)).toBeLessThan(text.indexOf(initCall));
  });
});
