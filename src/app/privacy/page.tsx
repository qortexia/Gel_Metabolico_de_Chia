import { LANDING } from '@/lib/content/copy';
import { PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';

export const metadata = {
  title: 'Aviso de Privacidad — Gel Metabólico de Chía',
};

const SECTION = 'mt-6 text-base font-semibold';
const TEXT = 'mt-2 text-sm text-neutral-600';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <a href="/" className="text-sm text-neutral-500 underline-offset-2 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-4 text-xl font-bold">Aviso de Privacidad</h1>
        <p className={TEXT}>
          Este aviso describe cómo tratamos tus datos conforme a la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares (LFPDPPP) de México y a la Ley General
          de Protección de Datos (LGPD) de Brasil, país desde el que operamos el servicio.
        </p>

        <h2 className={SECTION}>1. Datos que recopilamos</h2>
        <p className={TEXT}>
          <strong>Datos personales sensibles (estado de salud):</strong> las respuestas del test
          (peso, estatura, objetivo de peso, hábitos y cómo te sientes con tu cuerpo). Solo las
          tratamos con tu consentimiento expreso, que otorgas al marcar la casilla antes de iniciar.
        </p>
        <p className={TEXT}>
          <strong>Datos de identificación:</strong> tu nombre y, si compras, los datos que el
          procesador de pagos necesita.
        </p>
        <p className={TEXT}>
          <strong>Identificadores técnicos:</strong> dirección IP, tipo de navegador, identificadores
          de sesión y de visitante que generamos nosotros, cookies de Meta (_fbp, _fbc) y los
          parámetros de la campaña por la que llegaste (utm_*, identificadores de anuncio).
        </p>

        <h2 className={SECTION}>2. Para qué los usamos</h2>
        <p className={TEXT}>
          Para calcular y mostrarte tu protocolo personalizado; para medir el rendimiento de nuestras
          campañas publicitarias (qué anuncios traen visitantes que completan el test o compran); y
          para mejorar el funcionamiento del sitio.
        </p>

        <h2 className={SECTION}>3. Con quién los compartimos</h2>
        <p className={TEXT}>
          <strong>Kiwify</strong> (procesador de pagos), cuando compras.
          <br />
          <strong>Meta (Facebook/Instagram)</strong>: le enviamos únicamente identificadores técnicos
          y eventos de navegación genéricos (por ejemplo, &quot;completó el test&quot;, &quot;fue al
          pago&quot;). Si nos das tu correo o teléfono, los enviamos cifrados de forma irreversible
          (hash SHA-256). <strong>Nunca</strong> enviamos a Meta tus respuestas de salud (peso,
          estatura, objetivo ni hábitos).
          <br />
          <strong>Supabase</strong> (proveedor de infraestructura) aloja nuestra base de datos.
        </p>

        <h2 className={SECTION}>4. Conservación</h2>
        <p className={TEXT}>
          Los identificadores técnicos (IP, navegador) se eliminan a los 90 días. Los datos de tu
          test se conservan mientras uses el servicio o hasta que solicites su eliminación.
        </p>

        <h2 className={SECTION}>5. Tus derechos ARCO y revocación del consentimiento</h2>
        <p className={TEXT}>
          Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, y revocar tu
          consentimiento en cualquier momento, escribiendo a{' '}
          <a href={`mailto:${LANDING.contactoEmail}`} className="underline">
            {LANDING.contactoEmail}
          </a>
          .
        </p>

        <p className="mt-8 text-xs text-neutral-400">Versión del aviso: {PRIVACY_POLICY_VERSION}</p>
      </div>
    </div>
  );
}
