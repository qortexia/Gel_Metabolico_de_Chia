import { ScreenConfig } from '@/types/quiz';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export const MICRO_REVELACION =
  'La verdad que nadie te cuenta: lo que frena tu pérdida de peso casi nunca es fuerza de voluntad — es tu cuerpo pidiendo comida sin necesitarla realmente. Por eso las dietas a base de sacrificio casi siempre fallan. El Gel Metabólico de Chía actúa justo ahí.';

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
      { value: 'mujer', label: 'Mujer' },
      { value: 'hombre', label: 'Hombre' },
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
    kind: 'choice',
    variable: 'area',
    title: '¿Qué parte de tu cuerpo te incomoda más cuando te ves?',
    options: [
      { value: 'abdomen', label: 'Abdomen' },
      { value: 'pecho', label: 'Pecho' },
      { value: 'costados', label: 'Costados (llantitas)' },
      { value: 'brazos', label: 'Brazos' },
    ],
  },
  {
    id: 'loader1',
    kind: 'loader',
    title: 'Listo. Ya entendimos qué ha frenado tu pérdida de peso hasta ahora…',
    subtitle: 'Preparando tu receta personalizada…',
    messages: [
      'Analizando tus respuestas…',
      'Comparando tu perfil con miles de casos…',
      'Preparando tu receta personalizada…',
    ],
    durationMs: 3500,
  },
  {
    id: 'vsl1',
    kind: 'vsl',
    src: '/videos/vsl1.mp4',
    overlayText:
      'Quédate hasta el final: al final te muestro exactamente cómo usar el Gel Metabólico de Chía para empezar a desinflamarte desde los primeros días.',
    ctaLabel: 'QUIERO MI RECETA',
    // Infinity = reveal only when the video actually finishes (onEnded),
    // regardless of its duration — robust to swapping the source file later.
    revealAtSeconds: Infinity,
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
    durationMs: 4000,
  },
  {
    id: 'vsl2',
    kind: 'vsl',
    src: '/videos/vsl2.mp4',
    overlayText: '¡Tu análisis está listo! Mira el video para descubrir tu plan completo.',
    ctaLabel: 'QUIERO EMPEZAR MI TRANSFORMACIÓN',
    // Infinity = reveal only when the video actually finishes (onEnded).
    revealAtSeconds: Infinity,
    resumeKey: 'vsl2',
    preventSkip: true,
  },
  { id: 'oferta', kind: 'offer' },
];

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
  intro: (imc: string, imcObjetivo: string, kgABajar: string, fecha: string) =>
    `Hoy tu IMC es ${imc}. Tu meta lo llevaría a ${imcObjetivo} — el rango de quienes se sienten ligeras, seguras y cómodas en su propio cuerpo.\n\nEso son ${kgABajar}kg. Al ritmo correcto, puedes llegar ahí para ${fecha}.`,
  contraste: (fecha: string) =>
    `Pero hay dos caminos: si sigues como estás hoy, la tendencia es que la aguja se mueva para el lado equivocado. Con el plan correcto, inviertes eso — y ${fecha} puede ser el mes en que por fin te veas al espejo y sonrías.`,
  cta: 'QUIERO LLEGAR A ESE RESULTADO',
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
  nombreProducto: 'Gel Metabólico de Chía',
  planLabel: 'PLAN COMPLETO',
  precioMxnDefault: 690,
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
