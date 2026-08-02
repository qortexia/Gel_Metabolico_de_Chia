'use client';

import { useState } from 'react';
import { OFERTA, DISCLAIMERS } from '@/lib/content/copy';
import { track } from '@/lib/analytics';

type OfferCardProps = {
  priceMxn: number;
  checkoutUrl: string;
  onCheckoutClick: () => void;
};

export function OfferCard({ priceMxn, checkoutUrl, onCheckoutClick }: OfferCardProps) {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  const handleClick = () => {
    track('checkout_click', { priceMxn });
    onCheckoutClick();
    setRedirectAttempted(true);
    try {
      window.location.href = checkoutUrl;
    } catch {
      // el estado redirectAttempted ya muestra el enlace de respaldo abajo
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm rounded-card border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-brand">🔒 OFERTA EXCLUSIVA</p>
      <h2 className="mt-1 text-xl font-bold">
        {OFERTA.nombreProducto} — {OFERTA.planLabel}
      </h2>
      <p className="mt-3 text-3xl font-extrabold">
        ${priceMxn} <span className="text-base font-normal">MXN</span>
      </p>
      <p className="text-sm text-neutral-500">Acceso completo por solo</p>
      <p className="mt-1 inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs">{OFERTA.badgePago}</p>

      <ul className="mt-4 space-y-3">
        {OFERTA.entregables.map((item) => (
          <li key={item.titulo}>
            <p className="font-semibold">✅ {item.titulo}</p>
            <p className="text-sm text-neutral-600">{item.descripcion}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-card bg-brand/10 p-3">
        <p className="font-semibold">🛡️ {OFERTA.garantia.titulo}</p>
        <p className="text-sm text-neutral-600">{OFERTA.garantia.descripcion}</p>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="mt-5 min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white"
      >
        {OFERTA.ctaFinal}
      </button>

      {redirectAttempted ? (
        <p className="mt-3 flex min-h-[44px] flex-wrap items-center justify-center gap-1 text-center text-sm text-neutral-500">
          <span>¿No pasó nada?</span>
          <a
            href={checkoutUrl}
            className="inline-flex min-h-[44px] items-center justify-center font-semibold text-brand underline"
          >
            Ir al pago manualmente
          </a>
        </p>
      ) : null}

      <p className="mt-3 text-xs text-neutral-600">{DISCLAIMERS.salud}</p>
      <p className="mt-1 text-xs text-neutral-600">{DISCLAIMERS.privacidad}</p>
    </div>
  );
}
