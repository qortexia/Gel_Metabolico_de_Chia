export interface QuizAnswers {
  deseo: string | null;
  genero: string | null;
  cuerpoActual: string | null;
  edad: string | null;
  espejo: string | null;
  area: string[];
  peso: number | null;
  estatura: number | null;
  objetivo: number | null;
  dolor: string | null;
  satisfaccion: string | null;
  bloqueo: string | null;
  agua: string | null;
  sueno: string | null;
  rutina: string | null;
  cuerpoDeseado: string | null;
  nombre: string | null;
}

export const INITIAL_ANSWERS: QuizAnswers = {
  deseo: null,
  genero: null,
  cuerpoActual: null,
  edad: null,
  espejo: null,
  area: [],
  peso: null,
  estatura: null,
  objetivo: null,
  dolor: null,
  satisfaccion: null,
  bloqueo: null,
  agua: null,
  sueno: null,
  rutina: null,
  cuerpoDeseado: null,
  nombre: null,
};

export type ChoiceOption = {
  value: string;
  label: string;
  sublabel?: string;
  image?: string;
  // Used instead of `image` when the photo should depend on the earlier
  // 'genero' answer (e.g. body-type reference photos).
  imageMujer?: string;
  imageHombre?: string;
};

export type ChoiceVariable = Exclude<keyof QuizAnswers, 'peso' | 'estatura' | 'objetivo' | 'area'>;

export type ChoiceScreenConfig = {
  id: string;
  kind: 'choice';
  variable: ChoiceVariable;
  title: string;
  subtitle?: string;
  options: ChoiceOption[];
};

export type MultiChoiceScreenConfig = {
  id: string;
  kind: 'multichoice';
  variable: 'area';
  title: string;
  subtitle?: string;
  options: ChoiceOption[];
};

export type SliderScreenConfig = {
  id: string;
  kind: 'slider';
  variable: 'peso' | 'estatura' | 'objetivo';
  unitKind: 'peso' | 'altura';
  title: string;
  subtitle?: string;
  min: number;
  max: number;
  defaultValue: number;
  majorTickEvery: number;
  instruction: string;
};

export type TextScreenConfig = {
  id: string;
  kind: 'text';
  variable: 'nombre';
  title: string;
  subtitle?: string;
  placeholder: string;
};

export type LoaderScreenConfig = {
  id: string;
  kind: 'loader';
  title: string;
  subtitle: string;
  messages: string[];
  durationMs: number;
};

export type ImcScreenConfig = { id: string; kind: 'imc' };
export type ProjectionScreenConfig = { id: string; kind: 'projection' };

export type VslScreenConfig = {
  id: string;
  kind: 'vsl';
  src: string;
  overlayText: string;
  ctaLabel: string;
  revealAtSeconds: number;
  revealSecondsBeforeEnd?: number;
  resumeKey: string;
  preventSkip?: boolean;
};

export type OfferScreenConfig = { id: string; kind: 'offer' };

export type ScreenConfig =
  | ChoiceScreenConfig
  | MultiChoiceScreenConfig
  | SliderScreenConfig
  | TextScreenConfig
  | LoaderScreenConfig
  | ImcScreenConfig
  | ProjectionScreenConfig
  | VslScreenConfig
  | OfferScreenConfig;
