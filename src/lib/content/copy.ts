import { QuizAnswers, ScreenConfig } from '@/types/quiz';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export const SCREENS: ScreenConfig[] = [
  {
    id: 'deseo',
    kind: 'choice',
    variable: 'deseo',
    title: 'Si pudieras dejar un peso atrás y no volver a verlo… ¿cuánto sería?',
    options: [
      { value: 'hasta-5', label: 'Hasta 5 kg 🎯' },
      { value: '6-10', label: '6 a 10 kg 💪' },
      { value: '11-15', label: '11 a 15 kg 🔥' },
      { value: '16-20', label: '16 a 20 kg ⚡' },
      { value: 'mas-20', label: 'Más de 20 kg 🚀' },
    ],
  },
  {
    id: 'genero',
    kind: 'choice',
    variable: 'genero',
    title: '¿Para quién estamos armando este plan?',
    subtitle: 'Esto cambia cómo tu cuerpo responde — por eso ajustamos todo para ti.',
    options: [
      { value: 'mujer', label: 'Mujer', image: '/images/quiz/genero-mujer.jpg' },
      { value: 'hombre', label: 'Hombre', image: '/images/quiz/genero-hombre.jpg' },
    ],
  },
  {
    id: 'cuerpoActual',
    kind: 'choice',
    variable: 'cuerpoActual',
    title: '¿Cómo calificarías tu cuerpo hoy?',
    options: [
      {
        value: 'regular',
        label: 'Regular',
        sublabel: 'Peso normal',
        imageMujer: '/images/quiz/cuerpo-mujer-regular.jpg',
        imageHombre: '/images/quiz/cuerpo-hombre-regular.png',
      },
      {
        value: 'flacido',
        label: 'Flácido',
        sublabel: 'Poca firmeza',
        imageMujer: '/images/quiz/cuerpo-mujer-flacido.jpg',
        imageHombre: '/images/quiz/cuerpo-hombre-flacido.jpg',
      },
      {
        value: 'sobrepeso',
        label: 'Sobrepeso',
        sublabel: 'Grasa visible',
        imageMujer: '/images/quiz/cuerpo-mujer-sobrepeso.jpg',
        imageHombre: '/images/quiz/cuerpo-hombre-sobrepeso.jpg',
      },
    ],
  },
  {
    id: 'edad',
    kind: 'choice',
    variable: 'edad',
    title: '¿Cuántos años tienes hoy?',
    subtitle: 'El metabolismo cambia con la edad. Vamos a respetar tu momento.',
    options: [
      { value: 'menos-25', label: 'Menos de 25' },
      { value: '25-34', label: '25 a 34' },
      { value: '35-44', label: '35 a 44' },
      { value: '45-54', label: '45 a 54' },
      { value: '55-mas', label: '55+' },
    ],
  },
  {
    id: 'espejo',
    kind: 'choice',
    variable: 'espejo',
    title: 'Cuando te ves al espejo hoy, ¿qué sientes?',
    options: [
      { value: 'incomoda', label: 'Me incomoda, pero evito pensar en eso 😔' },
      { value: 'no-soy-quien-era', label: 'Sé que ya no soy quien era 💭' },
      { value: 'esconderme', label: 'Ya me cansé de esconderme dentro de la ropa 🙈' },
    ],
  },
  {
    id: 'area',
    kind: 'multichoice',
    variable: 'area',
    title: '¿En qué áreas te gustaría reducir más grasa?',
    subtitle: 'Puedes marcar más de una',
    options: [
      {
        value: 'abdomen',
        label: 'Abdomen',
        imageMujer: '/images/quiz/area-mujer-abdomen.webp',
        imageHombre: '/images/quiz/area-hombre-abdomen.webp',
      },
      {
        value: 'pecho',
        label: 'Pecho',
        imageMujer: '/images/quiz/area-mujer-pecho.webp',
        imageHombre: '/images/quiz/area-hombre-pecho.webp',
      },
      {
        value: 'costados',
        label: 'Flancos',
        imageMujer: '/images/quiz/area-mujer-flancos.webp',
        imageHombre: '/images/quiz/area-hombre-flancos.webp',
      },
      {
        value: 'brazos',
        label: 'Brazos',
        imageMujer: '/images/quiz/area-mujer-brazos.webp',
        imageHombre: '/images/quiz/area-hombre-brazos.webp',
      },
    ],
  },
  {
    id: 'loader1',
    kind: 'loader',
    title: 'Analizando tus respuestas…',
    subtitle: 'Comparando tu perfil con el de {generoPlural} de {edadTexto} que también querían reducir {areasTexto}.',
    messages: [
      'Mapeando tu perfil: {cuerpoActual}, enfocado en {areasTexto}',
      'Comparando con quienes bajaron 10 kg en el protocolo',
      'Ajustando el cálculo para quienes tienen {edadTexto}',
    ],
    durationMs: 7000,
  },
  {
    id: 'vsl1',
    kind: 'vsl',
    src: 'https://ejdwzyue8qsbigw0.public.blob.vercel-storage.com/VSL%20Dra%201.mp4',
    overlayText:
      'Quédate hasta el final: al final te muestro exactamente cómo usar el Gel Metabólico de Chía para empezar a desinflamarte desde los primeros días.',
    ctaLabel: 'QUIERO MI RECETA',
    // Infinity = fallback while duration is still unknown; once the video's
    // real duration loads, revealSecondsBeforeEnd takes over and the CTA
    // reveals 10s before the end — robust to swapping the source file later.
    revealAtSeconds: Infinity,
    revealSecondsBeforeEnd: 10,
    resumeKey: 'vsl1',
    preventSkip: true,
  },
  {
    id: 'peso',
    kind: 'slider',
    variable: 'peso',
    unitKind: 'peso',
    title: '¿Cuánto pesas hoy?',
    subtitle: 'Sin juicios aquí. Este es el punto de partida de tu cambio.',
    min: 40,
    max: 200,
    defaultValue: 85,
    majorTickEvery: 10,
    instruction: 'Arrastra para ajustar tu peso',
  },
  {
    id: 'estatura',
    kind: 'slider',
    variable: 'estatura',
    unitKind: 'altura',
    title: '¿Y cuál es tu estatura?',
    subtitle: 'Con esto armamos un plan hecho para tu cuerpo — nada de fórmulas genéricas.',
    min: 130,
    max: 210,
    defaultValue: 160,
    majorTickEvery: 10,
    instruction: 'Arrastra para ajustar tu estatura',
  },
  { id: 'imc', kind: 'imc' },
  {
    id: 'objetivo',
    kind: 'slider',
    variable: 'objetivo',
    unitKind: 'peso',
    title: '¿Y cuánto quieres pesar cuando te veas al espejo y sonrías?',
    min: 40,
    max: 200,
    defaultValue: 70,
    majorTickEvery: 10,
    instruction: 'Arrastra para ajustar tu meta',
  },
  { id: 'proyeccion', kind: 'projection' },
  {
    id: 'dolor',
    kind: 'choice',
    variable: 'dolor',
    title: '¿Cómo ha afectado tu peso tu vida en realidad?',
    options: [
      { value: 'fotos', label: 'Evito salir en fotos 📷' },
      { value: 'brillo', label: 'Siento que perdí mi brillo con quien amo 💔' },
      { value: 'confianza', label: 'Perdí mi confianza 😞' },
      { value: 'citas', label: 'Evito citas y eventos 🏠' },
      { value: 'energia', label: 'Vivo sin energía ni ánimo 😴' },
      { value: 'ninguna', label: 'Ninguna de estas ✋' },
    ],
  },
  {
    id: 'satisfaccion',
    kind: 'choice',
    variable: 'satisfaccion',
    title: 'En el fondo, ¿estás satisfecha con tu cuerpo hoy?',
    options: [
      { value: 'sobrepeso', label: 'No, me siento con sobrepeso 😔' },
      { value: 'puedo-mejorar', label: 'Más o menos, sé que puedo mejorar 🤔' },
      { value: 'cambiar-todo', label: 'No — quiero cambiar mi cuerpo Y mi confianza 💪' },
    ],
  },
  {
    id: 'bloqueo',
    kind: 'choice',
    variable: 'bloqueo',
    title: '¿Qué es lo que más te ha impedido bajar de peso hasta hoy?',
    options: [
      { value: 'tiempo', label: 'Falta de tiempo ⏰' },
      { value: 'autocontrol', label: 'Falta de autocontrol 🍕' },
      { value: 'nada-funciona', label: 'Ya probé de todo y nada funciona 😤' },
      { value: 'comida-cara', label: 'La comida saludable es cara y difícil 💸' },
    ],
  },
  {
    id: 'agua',
    kind: 'choice',
    variable: 'agua',
    title: '¿Cuánta agua sueles tomar al día?',
    options: [
      { value: 'cafe', label: 'Solo café, casi nada de agua ☕' },
      { value: 'hasta-2l', label: 'Hasta 2 litros 💧' },
      { value: '2-3l', label: 'Entre 2 y 3 litros 💦' },
      { value: 'mas-3l', label: 'Más de 3 litros 🌊' },
    ],
  },
  {
    id: 'sueno',
    kind: 'choice',
    variable: 'sueno',
    title: '¿Y cómo anda tu sueño?',
    options: [
      { value: 'menos-5h', label: 'Menos de 5h 😵' },
      { value: '5-7h', label: 'Entre 5 y 7h 😐' },
      { value: '7-9h', label: 'Entre 7 y 9h 😊' },
      { value: 'mas-9h', label: 'Más de 9h 😴' },
    ],
  },
  {
    id: 'rutina',
    kind: 'choice',
    variable: 'rutina',
    title: '¿Cómo es tu día a día hoy?',
    options: [
      { value: 'agitada', label: 'Trabajo fuera, rutina agitada 🏃' },
      { value: 'sentada', label: 'Sentada la mayor parte del día 🪑' },
      { value: 'estresante', label: 'Rutina estresante e irregular 😰' },
      { value: 'cambio', label: 'Mi rutina cambió mucho en los últimos años 🔄' },
    ],
  },
  {
    id: 'cuerpoDeseado',
    kind: 'choice',
    variable: 'cuerpoDeseado',
    title: '¿Y qué cuerpo sueñas con ver en el espejo?',
    options: [
      { value: 'en-forma', label: 'En forma — sana y ligera 💪' },
      { value: 'tonificada', label: 'Tonificada — firme y definida 🏋️' },
    ],
  },
  {
    id: 'nombre',
    kind: 'text',
    variable: 'nombre',
    title: 'Para dejar todo a tu manera… ¿cómo te llamas?',
    subtitle: 'Voy a armar tu plan con tu nombre — a tu manera.',
    placeholder: 'Escribe tu nombre…',
  },
  {
    id: 'loader2',
    kind: 'loader',
    title: 'Hay algo en tus respuestas que llamó nuestra atención…',
    subtitle: 'Cruzando toda tu información…',
    messages: [
      '🔍 Cruzando tu IMC de {imc}…',
      '💧 Evaluando tu hidratación y tu sueño…',
      '⚙️ Ajustando la fórmula para tu metabolismo…',
      '🎯 Calculando tu camino hasta {objetivo}kg…',
      '✅ ¡Plan de {nombre} listo!',
    ],
    durationMs: 8000,
  },
  {
    id: 'vsl2',
    kind: 'vsl',
    src: 'https://ejdwzyue8qsbigw0.public.blob.vercel-storage.com/Video01_1.mp4',
    overlayText: '¡Tu análisis está listo! Mira el video para descubrir tu plan completo.',
    ctaLabel: 'QUIERO EMPEZAR MI TRANSFORMACIÓN',
    // Infinity = fallback while duration is still unknown; once known,
    // revealSecondsBeforeEnd reveals the CTA 10s before the end.
    revealAtSeconds: Infinity,
    revealSecondsBeforeEnd: 10,
    resumeKey: 'vsl2',
    preventSkip: true,
  },
  { id: 'oferta', kind: 'offer' },
];

// Before/after composite photos (each file already has both halves side by
// side) shown as an auto-rotating carousel on loader2, as social proof while
// the "calculation" runs.
export const RESULT_PHOTOS = [
  '/images/quiz/resultado-01.jpg',
  '/images/quiz/resultado-02.jpg',
  '/images/quiz/resultado-03.jpg',
];

// 'Hoy' / 'en 30 días' illustration pair on the projection screen, branched
// by the earlier genero answer.
export const PROYECCION_FOTOS: Record<'mujer' | 'hombre', { antes: string; despues: string }> = {
  mujer: {
    antes: '/images/quiz/proyeccion-mujer-antes.webp',
    despues: '/images/quiz/proyeccion-mujer-despues.webp',
  },
  hombre: {
    antes: '/images/quiz/proyeccion-hombre-antes.webp',
    despues: '/images/quiz/proyeccion-hombre-despues.webp',
  },
};

const GENERO_PLURAL: Record<string, string> = {
  mujer: 'mujeres',
  hombre: 'hombres',
};

const EDAD_TEXTO: Record<string, string> = {
  'menos-25': 'menos de 25 años',
  '25-34': 'entre 25 y 34 años',
  '35-44': 'entre 35 y 44 años',
  '45-54': 'entre 45 y 54 años',
  '55-mas': '55 años o más',
};

function joinConY(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// Deriva las variables de {placeholder} que personalizan la pantalla 'loader1'
// (justo después de 'area') a partir de las respuestas ya dadas en ese punto
// del funil: genero, edad, cuerpoActual y area.
export function buildLoader1Vars(answers: QuizAnswers): Record<string, string> {
  const areaScreen = SCREENS.find((s) => s.id === 'area');
  const cuerpoScreen = SCREENS.find((s) => s.id === 'cuerpoActual');
  const areaLabels =
    areaScreen && areaScreen.kind === 'multichoice'
      ? answers.area
          .map((v) => areaScreen.options.find((o) => o.value === v)?.label.toLowerCase())
          .filter((v): v is string => Boolean(v))
      : [];
  const cuerpoLabel =
    cuerpoScreen && cuerpoScreen.kind === 'choice'
      ? cuerpoScreen.options.find((o) => o.value === answers.cuerpoActual)?.label.toLowerCase() ?? ''
      : '';
  return {
    generoPlural: (answers.genero && GENERO_PLURAL[answers.genero]) || 'personas',
    edadTexto: (answers.edad && EDAD_TEXTO[answers.edad]) || '',
    areasTexto: joinConY(areaLabels),
    cuerpoActual: cuerpoLabel,
  };
}

export const IMC_TEXTS: Record<'bajo' | 'medio' | 'alto', { texto: string; cta: string }> = {
  bajo: {
    texto:
      'Estás más cerca de lo que imaginas. Falta poco para llegar al cuerpo que quieres — y puedes lograrlo en las próximas semanas.',
    cta: 'QUIERO SALIR DE ESTA ZONA',
  },
  medio: {
    texto:
      'Tu cuerpo está en el punto donde la incomodidad empieza a volverse rutina. La buena noticia: es justo aquí donde el Gel Metabólico de Chía actúa más rápido.',
    cta: 'QUIERO SALIR DE ESTA ZONA',
  },
  alto: {
    texto:
      'Esto va mucho más allá de la apariencia — es sobre tu energía y tu salud todos los días. Y el cambio puede empezar esta misma semana.',
    cta: 'QUIERO SALIR DE ESTA ZONA',
  },
};

export const PROYECCION_TEXTO = {
  resultado: (pesoActual: string, objetivo: string, kgABajar: string) =>
    `De ${pesoActual} kg para ${objetivo} kg — ${kgABajar} kg menos siguiendo el plan.`,
  intro: (imc: string, imcObjetivo: string, kgABajar: string, fecha: string) =>
    `Hoy tu IMC es ${imc}. Tu meta lo llevaría a ${imcObjetivo} — el rango de quienes se sienten ligeras, seguras y cómodas en su propio cuerpo.\n\nEso son ${kgABajar}kg. Al ritmo correcto, puedes llegar ahí para ${fecha}.`,
  contraste: (fecha: string) =>
    `Pero hay dos caminos: si sigues como estás hoy, la tendencia es que la aguja se mueva para el lado equivocado. Con el plan correcto, inviertes eso — y ${fecha} puede ser el mes en que por fin te veas al espejo y sonrías.`,
  ctaPrincipal: 'Sí, quiero tener ese resultado ahora mismo',
  ctaPrincipalSub: (kgABajar: string) => `Protocolo personalizado de ${kgABajar} kg`,
  ctaSecundaria: 'No sé todavía, pero puedo intentar',
  ctaSecundariaSub: 'Ver el plan de todas formas',
};

export const ECO_DOLOR: Record<string, string> = {
  fotos:
    'Me dijiste que evitas las fotos. Imagina, en {fecha}, ser la primera en decir "ven, tomémonos una foto juntas".',
  brillo:
    'Me contaste que sientes que perdiste tu brillo con quien amas. Este plan empieza justo por ahí.',
  confianza:
    '¿Recuerdas que dijiste que perdiste la confianza? Ahí es donde empieza el cambio: no solo es el cuerpo, eres tú reconociéndote de nuevo.',
  citas:
    'Dijiste que evitas las citas. Imagina aceptar la próxima invitación sin pensarlo dos veces en qué ponerte.',
  energia:
    'Me contaste que vives sin energía. Una de las primeras señales es justo despertar con ganas otra vez.',
  ninguna: 'Ya diste el paso más difícil: decidir cambiar. Ahora solo falta seguir el plan correcto.',
};

export const OFERTA = {
  nombreProducto: 'Protocolo de gel metabólico de chía',
  precioMxnDefault: 199,
  badgePago: 'Pago único • Acceso inmediato',
  entregables: [
    { titulo: 'Receta Completa', descripcion: 'El paso a paso completo para prepararlo en casa.' },
    { titulo: 'Plan de 30 Días', descripcion: 'Plan diario completo para potenciar tus resultados.' },
    {
      titulo: 'Guía de Alimentos Permitidos',
      descripcion: 'Lista completa de lo que puedes y debes comer.',
    },
    { titulo: 'Clases en Video Exclusivas', descripcion: 'Clases prácticas y directas en cada etapa.' },
    { titulo: 'Soporte por WhatsApp', descripcion: 'Resuelve tus dudas con nuestro equipo especializado.' },
  ],
  garantia: {
    titulo: 'GARANTÍA INCONDICIONAL DE 30 DÍAS',
    descripcion: '¿No te gustó? Te devolvemos todo tu dinero. Sin preguntas, sin trámites.',
  },
  ctaFinal: 'QUIERO MI PLAN',
};

export const DISCLAIMERS = {
  salud:
    'Los resultados pueden variar de persona a persona. Este producto no sustituye una consulta médica o nutricional profesional.',
  privacidad:
    'Al continuar, aceptas nuestro tratamiento de tus datos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y nuestra Política de Privacidad.',
};
