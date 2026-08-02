import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferCard } from './OfferCard';

describe('OfferCard', () => {
  beforeEach(() => {
    // @ts-expect-error jsdom navigation stub
    delete window.location;
    // @ts-expect-error jsdom navigation stub
    window.location = { href: '' };
  });

  it('muestra el precio recibido por props', () => {
    render(<OfferCard priceMxn={690} checkoutUrl="https://pay.kiwify.com.mx/x" onCheckoutClick={() => {}} />);
    expect(screen.getByText('$690')).toBeInTheDocument();
  });

  it('llama a onCheckoutClick y redirige al hacer clic en el CTA', async () => {
    const onCheckoutClick = vi.fn();
    render(
      <OfferCard priceMxn={690} checkoutUrl="https://pay.kiwify.com.mx/x" onCheckoutClick={onCheckoutClick} />
    );
    await userEvent.click(screen.getByText(/QUIERO MI PLAN/));
    expect(onCheckoutClick).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('https://pay.kiwify.com.mx/x');
  });

  it('muestra un enlace de respaldo con botón de reintentar tras el clic, por si el redirect falla', async () => {
    render(<OfferCard priceMxn={690} checkoutUrl="https://pay.kiwify.com.mx/x" onCheckoutClick={() => {}} />);
    expect(screen.queryByText(/¿No pasó nada\?/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/QUIERO MI PLAN/));
    const fallbackLink = screen.getByText('Ir al pago manualmente');
    expect(fallbackLink).toHaveAttribute('href', 'https://pay.kiwify.com.mx/x');
  });
});
