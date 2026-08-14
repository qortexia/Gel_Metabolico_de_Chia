import { LANDING } from '@/lib/content/copy';

export const metadata = {
  title: 'Términos de Uso — Gel Metabólico de Chía',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <a href="/" className="text-sm text-neutral-500 underline-offset-2 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-4 text-xl font-bold">Términos de Uso</h1>
        <p className="mt-4 text-sm text-neutral-600">
          Al usar este sitio y el test educativo de Gel Metabólico de Chía, aceptas los
          siguientes términos.
        </p>

        <h2 className="mt-6 text-base font-semibold">1. Naturaleza del contenido</h2>
        <p className="mt-2 text-sm text-neutral-600">
          El test y los resultados que muestra son educativos e informativos. No constituyen
          diagnóstico, tratamiento ni consejo médico o nutricional individualizado. Este
          producto no está diseñado para diagnosticar, tratar, curar o prevenir ninguna
          enfermedad.
        </p>

        <h2 className="mt-6 text-base font-semibold">2. Elegibilidad</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Este sitio está dirigido únicamente a personas mayores de 18 años.
        </p>

        <h2 className="mt-6 text-base font-semibold">3. Resultados</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Los resultados y proyecciones mostrados varían de persona a persona y no garantizan
          un resultado específico. Consulta a un profesional de la salud antes de iniciar
          cualquier cambio en tu dieta o rutina.
        </p>

        <h2 className="mt-6 text-base font-semibold">4. Pagos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Las compras se procesan a través de un proveedor de pagos externo (Kiwify). Sus
          propios términos y política de reembolso aplican al proceso de pago.
        </p>

        <h2 className="mt-6 text-base font-semibold">5. Contacto</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Dudas sobre estos términos:{' '}
          <a href={`mailto:${LANDING.contactoEmail}`} className="underline">
            {LANDING.contactoEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
