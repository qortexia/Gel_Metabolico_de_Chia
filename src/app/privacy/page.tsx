import { LANDING } from '@/lib/content/copy';

export const metadata = {
  title: 'Política de Privacidad — Gel Metabólico de Chía',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <a href="/" className="text-sm text-neutral-500 underline-offset-2 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-4 text-xl font-bold">Política de Privacidad</h1>
        <p className="mt-4 text-sm text-neutral-600">
          Esta política describe cómo tratamos tus datos conforme a la Ley Federal de
          Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México.
        </p>

        <h2 className="mt-6 text-base font-semibold">1. Datos que recopilamos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Durante el test recopilamos las respuestas que proporcionas (por ejemplo nombre,
          edad, peso, estatura y objetivo) para personalizar tu protocolo. Si realizas una
          compra, el proveedor de pagos recopila los datos necesarios para procesarla.
        </p>

        <h2 className="mt-6 text-base font-semibold">2. Uso de los datos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Usamos estos datos únicamente para calcular y mostrar tu protocolo personalizado y,
          si nos das tu consentimiento, para contactarte con información relacionada.
        </p>

        <h2 className="mt-6 text-base font-semibold">3. Con quién compartimos tus datos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          No vendemos tus datos. Los compartimos únicamente con proveedores necesarios para
          operar el servicio, como el procesador de pagos (Kiwify).
        </p>

        <h2 className="mt-6 text-base font-semibold">4. Tus derechos ARCO</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Puedes solicitar acceder, rectificar, cancelar u oponerte al uso de tus datos
          personales en cualquier momento escribiendo a{' '}
          <a href={`mailto:${LANDING.contactoEmail}`} className="underline">
            {LANDING.contactoEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
