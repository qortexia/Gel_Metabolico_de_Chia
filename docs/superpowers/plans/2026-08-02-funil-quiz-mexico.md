# Funil de Quiz "Gel Metabólico de Chía" — México — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js quiz funnel (23 screens → 2 gated VSLs → personalized offer → Kiwify checkout redirect) in Mexican Spanish for the "Gel Metabólico de Chía" product, deployable to Vercel.

**Architecture:** Single-page client-rendered funnel. A Zustand store holds quiz answers and the current screen index (persisted to `localStorage`). A static, data-driven `SCREENS` array (in `src/lib/content/copy.ts`) describes all 23 screens; a single orchestrator component (`QuizFunnel`) switches on `screen.kind` and renders one of ~8 reusable presentational components. No backend, no database — the only external integration is a redirect to an externally configured Kiwify checkout URL.

**Tech Stack:** Next.js 14 (App Router) + React 18 + TypeScript, Tailwind CSS, Framer Motion, Zustand, Vitest + React Testing Library.

**Source spec:** `../specs/2026-08-02-funil-quiz-mexico-design.md` — read it once before starting; every screen's copy below is taken verbatim from it (with the VSL2/Oferta split decision noted in Task 16).

## Global Constraints

- All user-visible copy is Mexican Spanish. Product name is always **"Gel Metabólico de Chía"** — never "Mounjaro".
- No backend/database. State lives in memory (Zustand) + `localStorage`.
- Mobile-first. Tap targets ≥ 44px. CTA buttons sticky at the bottom on question screens.
- Accessibility AA: full keyboard navigation, `aria-live` on loaders, visible focus, `prefers-reduced-motion` respected.
- Projection formula uses a fixed healthy pace of 0.7 kg/week. Never claim a guaranteed result.
- Price and Kiwify checkout URL are placeholders, configurable via `NEXT_PUBLIC_OFFER_PRICE_MXN` and `NEXT_PUBLIC_CHECKOUT_URL` env vars.
- VSL video sources are configurable via `NEXT_PUBLIC_VSL1_URL` / `NEXT_PUBLIC_VSL2_URL`, falling back to local files in `public/videos/`.
- No custom domain yet — deploys to the default `*.vercel.app` URL.
- Package manager: npm.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `vitest.setup.ts`, `.env.local.example`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (temporary minimal content — replaced in Task 17)

**Interfaces:**
- Produces: a working Next.js + TypeScript + Tailwind + Vitest project that builds and runs `npm test`. All later tasks assume `@/*` resolves to `src/*` (both in `tsconfig.json` `paths` and in `vitest.config.ts` `resolve.alias`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gel-metabolico-chia-quiz",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.4",
    "framer-motion": "^11.3.19"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/node": "^20.14.15",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.9",
    "postcss": "^8.4.41",
    "autoprefixer": "^10.4.19",
    "vitest": "^2.0.5",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/user-event": "^14.5.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts` and `postcss.config.js`**

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F5F4',
        foreground: '#1A1A1A',
        brand: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
        },
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
```

`postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create `vitest.config.ts` and `vitest.setup.ts`**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Create `.env.local.example` and `.gitignore`**

`.env.local.example`:

```
NEXT_PUBLIC_VSL1_URL=/videos/vsl1.mp4
NEXT_PUBLIC_VSL2_URL=/videos/vsl2.mp4
NEXT_PUBLIC_CHECKOUT_URL=https://pay.kiwify.com.mx/REEMPLAZAR
NEXT_PUBLIC_OFFER_PRICE_MXN=690
```

`.gitignore`:

```
node_modules
.next
out
.env*.local
*.tsbuildinfo
next-env.d.ts
.DS_Store
```

- [ ] **Step 7: Create temporary app shell so the project builds**

`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  background-color: #f5f5f4;
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía',
  description: 'Descubre tu plan personalizado.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (placeholder, replaced in Task 17):

```tsx
export default function Home() {
  return <main>Gel Metabólico de Chía — en construcción</main>;
}
```

- [ ] **Step 8: Install dependencies and verify the build**

Run: `npm install && npm run build`
Expected: build completes successfully, producing `.next/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest project"
```

---

### Task 2: Types + Zustand store

**Files:**
- Create: `src/types/quiz.ts`
- Create: `src/lib/store.ts`
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Consumes: nothing (foundation types).
- Produces: `QuizAnswers` type, `INITIAL_ANSWERS` constant, `ScreenConfig` union and its variants (`ChoiceScreenConfig`, `SliderScreenConfig`, `TextScreenConfig`, `LoaderScreenConfig`, `ImcScreenConfig`, `ProjectionScreenConfig`, `VslScreenConfig`, `OfferScreenConfig`) from `@/types/quiz`. `useQuizStore` (Zustand hook) from `@/lib/store` exposing `{ currentIndex: number, answers: QuizAnswers, setAnswer(key, value), goNext(), goBack(), goToIndex(index), reset() }`.

- [ ] **Step 1: Create `src/types/quiz.ts`**

```ts
export interface QuizAnswers {
  deseo: string | null;
  genero: string | null;
  edad: string | null;
  espejo: string | null;
  area: string | null;
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
  edad: null,
  espejo: null,
  area: null,
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
};

export type ChoiceVariable = Exclude<keyof QuizAnswers, 'peso' | 'estatura' | 'objetivo'>;

export type ChoiceScreenConfig = {
  id: string;
  kind: 'choice';
  variable: ChoiceVariable;
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
  resumeKey: string;
};

export type OfferScreenConfig = { id: string; kind: 'offer' };

export type ScreenConfig =
  | ChoiceScreenConfig
  | SliderScreenConfig
  | TextScreenConfig
  | LoaderScreenConfig
  | ImcScreenConfig
  | ProjectionScreenConfig
  | VslScreenConfig
  | OfferScreenConfig;
```

- [ ] **Step 2: Write the failing test for the store**

`src/lib/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useQuizStore } from './store';

describe('useQuizStore', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('starts at index 0 with empty answers', () => {
    const state = useQuizStore.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.answers.nombre).toBeNull();
  });

  it('setAnswer updates only the given field', () => {
    useQuizStore.getState().setAnswer('nombre', 'Valentina');
    expect(useQuizStore.getState().answers.nombre).toBe('Valentina');
    expect(useQuizStore.getState().answers.genero).toBeNull();
  });

  it('goNext advances the index and goBack never goes below 0', () => {
    useQuizStore.getState().goNext();
    useQuizStore.getState().goNext();
    expect(useQuizStore.getState().currentIndex).toBe(2);
    useQuizStore.getState().goBack();
    expect(useQuizStore.getState().currentIndex).toBe(1);
    useQuizStore.getState().goBack();
    useQuizStore.getState().goBack();
    expect(useQuizStore.getState().currentIndex).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- store.test.ts`
Expected: FAIL — `./store` module not found.

- [ ] **Step 4: Create `src/lib/store.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_ANSWERS, QuizAnswers } from '@/types/quiz';

interface QuizState {
  currentIndex: number;
  answers: QuizAnswers;
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void;
  goNext: () => void;
  goBack: () => void;
  goToIndex: (index: number) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      currentIndex: 0,
      answers: INITIAL_ANSWERS,
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      goNext: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
      goBack: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
      goToIndex: (index) => set({ currentIndex: index }),
      reset: () => set({ currentIndex: 0, answers: INITIAL_ANSWERS }),
    }),
    { name: 'gel-chia-quiz-mx' }
  )
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- store.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/quiz.ts src/lib/store.ts src/lib/store.test.ts
git commit -m "feat: add quiz types and Zustand store"
```

---

### Task 3: Cálculos (IMC, kg a bajar, fecha objetivo)

**Files:**
- Create: `src/lib/calculations.ts`
- Test: `src/lib/calculations.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `calcularImc(pesoKg, estaturaCm): number`, `calcularKgABajar(pesoKg, objetivoKg): number`, `categoriaImc(imc): 'bajo'|'medio'|'alto'`, `calcularFechaObjetivo(kgABajar, desde: Date): string` from `@/lib/calculations`.

- [ ] **Step 1: Write the failing tests**

`src/lib/calculations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  calcularImc,
  calcularKgABajar,
  calcularFechaObjetivo,
  categoriaImc,
} from './calculations';

describe('calcularImc', () => {
  it('calcula el IMC redondeado a 1 decimal', () => {
    expect(calcularImc(85, 160)).toBe(33.2);
  });
});

describe('calcularKgABajar', () => {
  it('calcula la diferencia entre peso actual y objetivo', () => {
    expect(calcularKgABajar(85, 70)).toBe(15);
  });
});

describe('categoriaImc', () => {
  it('clasifica correctamente cada franja', () => {
    expect(categoriaImc(22)).toBe('bajo');
    expect(categoriaImc(27)).toBe('medio');
    expect(categoriaImc(32)).toBe('alto');
  });
});

describe('calcularFechaObjetivo', () => {
  it('proyecta la fecha en formato "mes de año" en español', () => {
    const desde = new Date('2026-08-02T00:00:00Z');
    const resultado = calcularFechaObjetivo(15, desde);
    expect(resultado).toMatch(/^[a-zñáéíóú]+ de \d{4}$/);
  });

  it('nunca produce una proyección de menos de 1 semana', () => {
    const desde = new Date('2026-08-02T00:00:00Z');
    expect(() => calcularFechaObjetivo(0, desde)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- calculations.test.ts`
Expected: FAIL — `./calculations` module not found.

- [ ] **Step 3: Create `src/lib/calculations.ts`**

```ts
export function calcularImc(pesoKg: number, estaturaCm: number): number {
  const estaturaM = estaturaCm / 100;
  return Math.round((pesoKg / (estaturaM * estaturaM)) * 10) / 10;
}

export function calcularKgABajar(pesoKg: number, objetivoKg: number): number {
  return Math.round((pesoKg - objetivoKg) * 10) / 10;
}

export type CategoriaImc = 'bajo' | 'medio' | 'alto';

export function categoriaImc(imc: number): CategoriaImc {
  if (imc < 25) return 'bajo';
  if (imc < 30) return 'medio';
  return 'alto';
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const RITMO_SEMANAL_KG = 0.7;
const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

export function calcularFechaObjetivo(kgABajar: number, desde: Date): string {
  const semanas = Math.max(1, Math.ceil(kgABajar / RITMO_SEMANAL_KG));
  const fecha = new Date(desde.getTime() + semanas * MS_POR_SEMANA);
  const mes = MESES_ES[fecha.getUTCMonth()];
  const anio = fecha.getUTCFullYear();
  return `${mes} de ${anio}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- calculations.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculations.ts src/lib/calculations.test.ts
git commit -m "feat: add IMC, kg-to-lose and target-date calculations"
```

---

### Task 4: Conversión de unidades

**Files:**
- Create: `src/lib/units.ts`
- Test: `src/lib/units.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `kgToLb(kg): number`, `lbToKg(lb): number`, `cmToIn(cm): number`, `inToCm(inches): number` from `@/lib/units`.

- [ ] **Step 1: Write the failing tests**

`src/lib/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { kgToLb, lbToKg, cmToIn, inToCm } from './units';

describe('unidades', () => {
  it('convierte kg a lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it('convierte lb a kg y de regreso sin perder precisión relevante', () => {
    expect(lbToKg(kgToLb(85))).toBeCloseTo(85, 5);
  });

  it('convierte cm a pulgadas y de regreso sin perder precisión relevante', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 5);
    expect(inToCm(cmToIn(160))).toBeCloseTo(160, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- units.test.ts`
Expected: FAIL — `./units` module not found.

- [ ] **Step 3: Create `src/lib/units.ts`**

```ts
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_INCH;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- units.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/units.ts src/lib/units.test.ts
git commit -m "feat: add kg/lb and cm/inch unit conversions"
```

---

### Task 5: Contenido — las 23 pantallas en español

**Files:**
- Create: `src/lib/content/copy.ts`
- Test: `src/lib/content/copy.test.ts`

**Interfaces:**
- Consumes: `ScreenConfig` and variants from `@/types/quiz` (Task 2).
- Produces: `SCREENS: ScreenConfig[]` (23 entries), `IMC_TEXTS: Record<'bajo'|'medio'|'alto', {texto: string; cta: string}>`, `PROYECCION_TEXTO: {intro(...): string; contraste(...): string; cta: string}`, `ECO_DOLOR: Record<string, string>`, `OFERTA` object, `DISCLAIMERS` object, `MICRO_REVELACION: string`, `interpolate(template, vars): string` — all from `@/lib/content/copy`.

- [ ] **Step 1: Write the failing tests**

`src/lib/content/copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCREENS, ECO_DOLOR, interpolate } from './copy';

describe('SCREENS', () => {
  it('tiene 23 pantallas con ids únicos', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(ids).toHaveLength(23);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('incluye las pantallas clave del funil en el orden correcto', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(ids.indexOf('vsl1')).toBeLessThan(ids.indexOf('imc'));
    expect(ids.indexOf('imc')).toBeLessThan(ids.indexOf('proyeccion'));
    expect(ids.indexOf('nombre')).toBeLessThan(ids.indexOf('vsl2'));
    expect(ids.indexOf('vsl2')).toBeLessThan(ids.indexOf('oferta'));
  });

  it('cada opción de la pantalla dolor tiene su eco correspondiente', () => {
    const dolorScreen = SCREENS.find((s) => s.id === 'dolor');
    if (!dolorScreen || dolorScreen.kind !== 'choice') throw new Error('pantalla dolor no encontrada');
    dolorScreen.options.forEach((opt) => {
      expect(ECO_DOLOR[opt.value]).toBeDefined();
    });
  });
});

describe('interpolate', () => {
  it('reemplaza los placeholders {var} con los valores dados', () => {
    expect(interpolate('Hola {nombre}, en {fecha}', { nombre: 'Ana', fecha: 'marzo de 2026' })).toBe(
      'Hola Ana, en marzo de 2026'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- copy.test.ts`
Expected: FAIL — `./copy` module not found.

- [ ] **Step 3: Create `src/lib/content/copy.ts`**

```ts
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
    revealAtSeconds: 60,
    resumeKey: 'vsl1',
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
      '🔍 Cruzando tu IMC…',
      '💧 Evaluando tu hidratación y tu sueño…',
      '⚙️ Ajustando la fórmula para tu metabolismo…',
      '🎯 Calculando tu camino hasta tu meta…',
      '✅ ¡Tu plan está listo!',
    ],
    durationMs: 4000,
  },
  {
    id: 'vsl2',
    kind: 'vsl',
    src: '/videos/vsl2.mp4',
    overlayText: '¡Tu análisis está listo! Mira el video para descubrir tu plan completo.',
    ctaLabel: 'QUIERO EMPEZAR MI TRANSFORMACIÓN',
    revealAtSeconds: 90,
    resumeKey: 'vsl2',
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- copy.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/copy.ts src/lib/content/copy.test.ts
git commit -m "feat: add full Spanish (Mexico) copy for all 23 screens"
```

---

### Task 6: Analytics

**Files:**
- Create: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AnalyticsEvent` union type, `track(event, payload?)`, `setAnalyticsProvider(fn)` from `@/lib/analytics`.

- [ ] **Step 1: Write the failing tests**

`src/lib/analytics.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { track, setAnalyticsProvider } from './analytics';

describe('analytics', () => {
  afterEach(() => {
    setAnalyticsProvider(() => {});
  });

  it('no lanza error si no hay provider configurado', () => {
    expect(() => track('quiz_start')).not.toThrow();
  });

  it('reenvía el evento y el payload al provider configurado', () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    track('checkout_click', { priceMxn: 690 });
    expect(spy).toHaveBeenCalledWith('checkout_click', { priceMxn: 690 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- analytics.test.ts`
Expected: FAIL — `./analytics` module not found.

- [ ] **Step 3: Create `src/lib/analytics.ts`**

```ts
export type AnalyticsEvent =
  | 'quiz_start'
  | 'quiz_answer'
  | 'vsl_play'
  | 'vsl_cta_reveal'
  | 'vsl_cta_click'
  | 'imc_view'
  | 'projection_view'
  | 'quiz_complete'
  | 'result_view'
  | 'offer_view'
  | 'checkout_click';

type AnalyticsProvider = (event: AnalyticsEvent, payload?: Record<string, unknown>) => void;

let provider: AnalyticsProvider = () => {};

export function setAnalyticsProvider(fn: AnalyticsProvider) {
  provider = fn;
}

export function track(event: AnalyticsEvent, payload?: Record<string, unknown>) {
  provider(event, payload);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- analytics.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat: add pluggable analytics tracker"
```

---

### Task 7: Checkout URL builder + UTMs

**Files:**
- Create: `src/lib/checkout.ts`
- Test: `src/lib/checkout.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildCheckoutUrl(baseUrl, utms): string`, `getUtmsFromLocation(search): Record<string,string>` from `@/lib/checkout`.

- [ ] **Step 1: Write the failing tests**

`src/lib/checkout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCheckoutUrl, getUtmsFromLocation } from './checkout';

describe('buildCheckoutUrl', () => {
  it('agrega los parámetros UTM a la URL base', () => {
    const url = buildCheckoutUrl('https://pay.kiwify.com.mx/x', {
      utm_source: 'meta',
      utm_campaign: 'mx-01',
    });
    expect(url).toBe('https://pay.kiwify.com.mx/x?utm_source=meta&utm_campaign=mx-01');
  });

  it('no agrega parámetros vacíos', () => {
    const url = buildCheckoutUrl('https://pay.kiwify.com.mx/x', { utm_source: '' });
    expect(url).toBe('https://pay.kiwify.com.mx/x');
  });
});

describe('getUtmsFromLocation', () => {
  it('extrae solo los parámetros utm_* conocidos', () => {
    const utms = getUtmsFromLocation('?utm_source=meta&foo=bar&utm_campaign=mx-01');
    expect(utms).toEqual({ utm_source: 'meta', utm_campaign: 'mx-01' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- checkout.test.ts`
Expected: FAIL — `./checkout` module not found.

- [ ] **Step 3: Create `src/lib/checkout.ts`**

```ts
export function buildCheckoutUrl(baseUrl: string, utms: Record<string, string>): string {
  const url = new URL(baseUrl);
  Object.entries(utms).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

const KNOWN_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function getUtmsFromLocation(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utms: Record<string, string> = {};
  KNOWN_UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) utms[key] = value;
  });
  return utms;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- checkout.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/checkout.ts src/lib/checkout.test.ts
git commit -m "feat: add checkout URL builder with UTM propagation"
```

---

### Task 8: Persistencia de posición de video

**Files:**
- Create: `src/lib/videoPersistence.ts`
- Test: `src/lib/videoPersistence.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `saveVideoPosition(key, seconds)`, `getVideoPosition(key): number | null`, `clearVideoPosition(key)` from `@/lib/videoPersistence`.

- [ ] **Step 1: Write the failing tests**

`src/lib/videoPersistence.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveVideoPosition, getVideoPosition, clearVideoPosition } from './videoPersistence';

describe('videoPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('guarda y recupera la posición del video', () => {
    saveVideoPosition('vsl1', 42.5);
    expect(getVideoPosition('vsl1')).toBe(42.5);
  });

  it('retorna null cuando no hay posición guardada', () => {
    expect(getVideoPosition('vsl-sin-guardar')).toBeNull();
  });

  it('limpia la posición guardada', () => {
    saveVideoPosition('vsl1', 10);
    clearVideoPosition('vsl1');
    expect(getVideoPosition('vsl1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- videoPersistence.test.ts`
Expected: FAIL — `./videoPersistence` module not found.

- [ ] **Step 3: Create `src/lib/videoPersistence.ts`**

```ts
const PREFIX = 'gel-chia-quiz-mx:video:';

export function saveVideoPosition(key: string, seconds: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${PREFIX}${key}`, String(seconds));
}

export function getVideoPosition(key: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${PREFIX}${key}`);
  return raw ? Number(raw) : null;
}

export function clearVideoPosition(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${PREFIX}${key}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- videoPersistence.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/videoPersistence.ts src/lib/videoPersistence.test.ts
git commit -m "feat: add video resume-position persistence"
```

---

### Task 9: `ProgressBar`

**Files:**
- Create: `src/components/quiz/ProgressBar.tsx`
- Test: `src/components/quiz/ProgressBar.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `ProgressBar({ current: number; total: number })` from `@/components/quiz/ProgressBar`.

- [ ] **Step 1: Write the failing test**

`src/components/quiz/ProgressBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('refleja el progreso actual en aria-valuenow', () => {
    render(<ProgressBar current={5} total={20} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProgressBar.test.tsx`
Expected: FAIL — `./ProgressBar` module not found.

- [ ] **Step 3: Create `src/components/quiz/ProgressBar.tsx`**

```tsx
'use client';

type ProgressBarProps = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div
      className="h-1.5 w-full bg-neutral-200"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-brand transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProgressBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/ProgressBar.tsx src/components/quiz/ProgressBar.test.tsx
git commit -m "feat: add ProgressBar component"
```

---

### Task 10: `ChoiceCard` + `QuizStep`

**Files:**
- Create: `src/components/quiz/ChoiceCard.tsx`, `src/components/quiz/QuizStep.tsx`
- Test: `src/components/quiz/ChoiceCard.test.tsx`, `src/components/quiz/QuizStep.test.tsx`

**Interfaces:**
- Consumes: `ProgressBar` from `@/components/quiz/ProgressBar` (Task 9).
- Produces: `ChoiceCard({ label: string; selected: boolean; onSelect: () => void })` from `@/components/quiz/ChoiceCard`. `QuizStep({ current: number; total: number; title: string; subtitle?: string; onBack?: () => void; children: ReactNode; footer?: ReactNode })` from `@/components/quiz/QuizStep`.

- [ ] **Step 1: Write the failing tests**

`src/components/quiz/ChoiceCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceCard } from './ChoiceCard';

describe('ChoiceCard', () => {
  it('llama a onSelect al hacer clic', async () => {
    const onSelect = vi.fn();
    render(<ChoiceCard label="Mujer" selected={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Mujer'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('marca aria-pressed cuando está seleccionado', () => {
    render(<ChoiceCard label="Mujer" selected onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
```

`src/components/quiz/QuizStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizStep } from './QuizStep';

describe('QuizStep', () => {
  it('renderiza título y subtítulo', () => {
    render(
      <QuizStep current={1} total={10} title="Título" subtitle="Sub">
        <p>contenido</p>
      </QuizStep>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('llama a onBack al hacer clic en la flecha', async () => {
    const onBack = vi.fn();
    render(
      <QuizStep current={1} total={10} title="Título" onBack={onBack}>
        <p>contenido</p>
      </QuizStep>
    );
    await userEvent.click(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ChoiceCard.test.tsx QuizStep.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/quiz/ChoiceCard.tsx`**

```tsx
'use client';

type ChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export function ChoiceCard({ label, selected, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full min-h-[44px] rounded-card border px-4 py-3 text-left text-base transition-transform active:scale-[0.98] ${
        selected ? 'border-brand bg-brand/10 font-semibold' : 'border-neutral-200 bg-white'
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Create `src/components/quiz/QuizStep.tsx`**

```tsx
'use client';

import { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';

type QuizStepProps = {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function QuizStep({ current, total, title, subtitle, onBack, children, footer }: QuizStepProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ProgressBar current={current} total={total} />
      <div className="flex items-center px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl"
          >
            ←
          </button>
        ) : (
          <span className="min-h-[44px] min-w-[44px]" />
        )}
      </div>
      <div className="flex-1 px-5 pb-6">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle ? <p className="mt-2 text-base text-neutral-600">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="sticky bottom-0 border-t border-neutral-200 bg-background p-4">{footer}</div> : null}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- ChoiceCard.test.tsx QuizStep.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/quiz/ChoiceCard.tsx src/components/quiz/ChoiceCard.test.tsx src/components/quiz/QuizStep.tsx src/components/quiz/QuizStep.test.tsx
git commit -m "feat: add ChoiceCard and QuizStep components"
```

---

### Task 11: `RulerSlider`

**Files:**
- Create: `src/components/quiz/RulerSlider.tsx`
- Test: `src/components/quiz/RulerSlider.test.tsx`

**Interfaces:**
- Consumes: `kgToLb, lbToKg, cmToIn, inToCm` from `@/lib/units` (Task 4).
- Produces: `RulerSlider({ min: number; max: number; defaultValue: number; majorTickEvery: number; unitKind: 'peso'|'altura'; instruction: string; onChange: (baseValue: number) => void })` from `@/components/quiz/RulerSlider`.

**Design notes:** value drag/keyboard/wheel is tracked internally in the base unit (kg or cm); the unit toggle only changes the *displayed* number and label, never the base value passed to `onChange`. Tick marks are laid out at 1-base-unit spacing and moved with `transform: translateX()` (GPU) — for the ranges used here (≤170 ticks) this is cheap enough that no windowing/virtualization is implemented (a deliberate YAGNI call, not a gap). Momentum/inertia on release is explicitly marked optional in the spec and is not implemented; release simply stops at the current value (already an integer, so no separate snap step is needed).

- [ ] **Step 1: Write the failing tests**

`src/components/quiz/RulerSlider.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulerSlider } from './RulerSlider';

describe('RulerSlider', () => {
  it('muestra el valor por defecto y la unidad base', () => {
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={85}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('incrementa el valor con la flecha derecha del teclado', async () => {
    const onChange = vi.fn();
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={85}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={onChange}
      />
    );
    screen.getByRole('slider').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(86);
  });

  it('cambia a la unidad lb al hacer clic en el toggle y convierte el valor mostrado', async () => {
    render(
      <RulerSlider
        min={40}
        max={200}
        defaultValue={100}
        majorTickEvery={10}
        unitKind="peso"
        instruction="Arrastra"
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('lb'));
    expect(screen.getByText('220')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- RulerSlider.test.tsx`
Expected: FAIL — `./RulerSlider` module not found.

- [ ] **Step 3: Create `src/components/quiz/RulerSlider.tsx`**

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import { kgToLb, lbToKg, cmToIn, inToCm } from '@/lib/units';

type UnitDef = { label: string; toBase: (v: number) => number; fromBase: (v: number) => number };

const UNIT_SETS: Record<'peso' | 'altura', UnitDef[]> = {
  peso: [
    { label: 'kg', toBase: (v) => v, fromBase: (v) => v },
    { label: 'lb', toBase: lbToKg, fromBase: kgToLb },
  ],
  altura: [
    { label: 'cm', toBase: (v) => v, fromBase: (v) => v },
    { label: 'pulg', toBase: inToCm, fromBase: cmToIn },
  ],
};

const PX_PER_UNIT = 16;

type RulerSliderProps = {
  min: number;
  max: number;
  defaultValue: number;
  majorTickEvery: number;
  unitKind: 'peso' | 'altura';
  instruction: string;
  onChange: (baseValue: number) => void;
};

export function RulerSlider({
  min,
  max,
  defaultValue,
  majorTickEvery,
  unitKind,
  instruction,
  onChange,
}: RulerSliderProps) {
  const units = UNIT_SETS[unitKind];
  const [unitIndex, setUnitIndex] = useState(0);
  const [baseValue, setBaseValue] = useState(defaultValue);
  const dragState = useRef<{ startX: number; startValue: number } | null>(null);

  const unit = units[unitIndex];
  const displayValue = Math.round(unit.fromBase(baseValue));

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round(next)));
      setBaseValue(clamped);
      onChange(clamped);
    },
    [max, min, onChange]
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startValue: baseValue };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const deltaPx = e.clientX - dragState.current.startX;
    const deltaUnits = -deltaPx / PX_PER_UNIT;
    commit(dragState.current.startValue + deltaUnits);
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') commit(baseValue + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') commit(baseValue - 1);
    if (e.key === 'PageUp') commit(baseValue + majorTickEvery);
    if (e.key === 'PageDown') commit(baseValue - majorTickEvery);
    if (e.key === 'Home') commit(min);
    if (e.key === 'End') commit(max);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    commit(baseValue + (e.deltaY > 0 ? -1 : 1));
  };

  const ticks: number[] = [];
  for (let v = min; v <= max; v += 1) ticks.push(v);
  const centerOffsetPx = -(baseValue - min) * PX_PER_UNIT;

  return (
    <div>
      <div className="mb-3 flex justify-center gap-2">
        {units.map((u, idx) => (
          <button
            key={u.label}
            type="button"
            onClick={() => setUnitIndex(idx)}
            className={`rounded-full px-3 py-1 text-sm ${
              idx === unitIndex ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
      <div className="text-center text-4xl font-bold">
        {displayValue} <span className="text-lg font-normal">{unit.label}</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={baseValue}
        aria-valuetext={`${displayValue} ${unit.label}`}
        aria-label={instruction}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        className="relative mt-6 h-20 touch-none overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-brand" />
        <div
          className="absolute top-0 flex h-full items-end"
          style={{ transform: `translateX(calc(50% + ${centerOffsetPx}px))` }}
        >
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center" style={{ width: PX_PER_UNIT }}>
              <div className={v % majorTickEvery === 0 ? 'h-8 w-px bg-neutral-400' : 'h-4 w-px bg-neutral-300'} />
              {v % majorTickEvery === 0 ? (
                <span className="mt-1 text-xs text-neutral-500">{Math.round(unit.fromBase(v))}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-neutral-500">{instruction}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- RulerSlider.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/RulerSlider.tsx src/components/quiz/RulerSlider.test.tsx
git commit -m "feat: add RulerSlider component"
```

---

### Task 12: `AnalyzingLoader`

**Files:**
- Create: `src/components/quiz/AnalyzingLoader.tsx`
- Test: `src/components/quiz/AnalyzingLoader.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `AnalyzingLoader({ title: string; subtitle: string; messages: string[]; durationMs: number; onComplete: () => void })` from `@/components/quiz/AnalyzingLoader`.

- [ ] **Step 1: Write the failing tests**

`src/components/quiz/AnalyzingLoader.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalyzingLoader } from './AnalyzingLoader';

describe('AnalyzingLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el título inmediatamente', () => {
    render(<AnalyzingLoader title="Analizando" subtitle="S" messages={['a']} durationMs={100} onComplete={() => {}} />);
    expect(screen.getByText('Analizando')).toBeInTheDocument();
  });

  it('llama a onComplete cuando termina la duración', () => {
    const onComplete = vi.fn();
    render(
      <AnalyzingLoader title="T" subtitle="S" messages={['a', 'b']} durationMs={200} onComplete={onComplete} />
    );
    vi.advanceTimersByTime(250);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AnalyzingLoader.test.tsx`
Expected: FAIL — `./AnalyzingLoader` module not found.

- [ ] **Step 3: Create `src/components/quiz/AnalyzingLoader.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';

type AnalyzingLoaderProps = {
  title: string;
  subtitle: string;
  messages: string[];
  durationMs: number;
  onComplete: () => void;
};

export function AnalyzingLoader({ title, subtitle, messages, durationMs, onComplete }: AnalyzingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const stepMs = 50;
    const totalSteps = durationMs / stepMs;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(pct);
      setMessageIndex(Math.min(messages.length - 1, Math.floor((pct / 100) * messages.length)));
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        onComplete();
      }
    }, stepMs);
    return () => clearInterval(interval);
  }, [durationMs, messages.length, onComplete]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
      aria-live="polite"
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-neutral-600">{subtitle}</p>
      <div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full bg-brand transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-4 text-sm text-neutral-500">{messages[messageIndex]}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AnalyzingLoader.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/AnalyzingLoader.tsx src/components/quiz/AnalyzingLoader.test.tsx
git commit -m "feat: add AnalyzingLoader component"
```

---

### Task 13: `ImcGauge` + `ProjectionChart`

**Files:**
- Create: `src/components/quiz/ImcGauge.tsx`, `src/components/quiz/ProjectionChart.tsx`
- Test: `src/components/quiz/ImcGauge.test.tsx`, `src/components/quiz/ProjectionChart.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `ImcGauge({ value: number })` from `@/components/quiz/ImcGauge`. `ProjectionChart({ pesoActual: number; objetivo: number })` from `@/components/quiz/ProjectionChart`.

- [ ] **Step 1: Write the failing tests**

`src/components/quiz/ImcGauge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImcGauge } from './ImcGauge';

describe('ImcGauge', () => {
  it('posiciona el marcador según el valor de IMC', () => {
    render(<ImcGauge value={27.5} />);
    expect(screen.getByLabelText('IMC 27.5')).toBeInTheDocument();
  });
});
```

`src/components/quiz/ProjectionChart.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectionChart } from './ProjectionChart';

describe('ProjectionChart', () => {
  it('renderiza un gráfico accesible con las dos curvas', () => {
    render(<ProjectionChart pesoActual={85} objetivo={70} />);
    expect(screen.getByRole('img', { name: /proyección de peso/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ImcGauge.test.tsx ProjectionChart.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/quiz/ImcGauge.tsx`**

```tsx
type ImcGaugeProps = { value: number };

const IMC_MIN = 15;
const IMC_MAX = 40;

export function ImcGauge({ value }: ImcGaugeProps) {
  const pct = Math.min(100, Math.max(0, ((value - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100));
  return (
    <div className="w-full">
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-brand via-warning to-danger">
        <div
          className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded bg-foreground"
          style={{ left: `${pct}%` }}
          role="img"
          aria-label={`IMC ${value}`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/quiz/ProjectionChart.tsx`**

```tsx
type ProjectionChartProps = {
  pesoActual: number;
  objetivo: number;
};

export function ProjectionChart({ pesoActual, objetivo }: ProjectionChartProps) {
  const width = 280;
  const height = 120;
  const maxVal = Math.max(pesoActual, objetivo) + 5;
  const minVal = Math.min(pesoActual, objetivo) - 5;
  const scaleY = (v: number) => height - ((v - minVal) / (maxVal - minVal)) * height;

  const seguirIgual = `M0,${scaleY(pesoActual)} L${width},${scaleY(pesoActual + 3)}`;
  const conPlan = `M0,${scaleY(pesoActual)} L${width},${scaleY(objetivo)}`;

  return (
    <svg width={width} height={height} role="img" aria-label="Proyección de peso con y sin el plan">
      <path d={seguirIgual} stroke="#EF4444" strokeWidth={2} fill="none" />
      <path d={conPlan} stroke="#16A34A" strokeWidth={3} fill="none" />
    </svg>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- ImcGauge.test.tsx ProjectionChart.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/quiz/ImcGauge.tsx src/components/quiz/ImcGauge.test.tsx src/components/quiz/ProjectionChart.tsx src/components/quiz/ProjectionChart.test.tsx
git commit -m "feat: add ImcGauge and ProjectionChart components"
```

---

### Task 14: `GatedVSL`

**Files:**
- Create: `src/components/vsl/GatedVSL.tsx`
- Test: `src/components/vsl/GatedVSL.test.tsx`

**Interfaces:**
- Consumes: `saveVideoPosition, getVideoPosition, clearVideoPosition` from `@/lib/videoPersistence` (Task 8); `track` from `@/lib/analytics` (Task 6).
- Produces: `GatedVSL({ src: string; revealAtSeconds: number; ctaLabel: string; onCtaClick: () => void; resumeKey: string; overlayText?: string })` from `@/components/vsl/GatedVSL`.

- [ ] **Step 1: Write the failing tests**

`src/components/vsl/GatedVSL.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GatedVSL } from './GatedVSL';

describe('GatedVSL', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mantiene el CTA oculto y muestra el contador antes de revealAtSeconds', () => {
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={() => {}}
        resumeKey="test-vsl-1"
      />
    );
    expect(screen.queryByText('QUIERO MI RECETA')).not.toBeInTheDocument();
    expect(screen.getByText(/El botón se libera en/)).toBeInTheDocument();
  });

  it('revela el CTA al alcanzar revealAtSeconds y avanza el funil al hacer clic', () => {
    const onCtaClick = vi.fn();
    render(
      <GatedVSL
        src="/videos/vsl1.mp4"
        revealAtSeconds={10}
        ctaLabel="QUIERO MI RECETA"
        onCtaClick={onCtaClick}
        resumeKey="test-vsl-2"
      />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);
    expect(screen.getByText('QUIERO MI RECETA')).toBeInTheDocument();
    fireEvent.click(screen.getByText('QUIERO MI RECETA'));
    expect(onCtaClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- GatedVSL.test.tsx`
Expected: FAIL — `./GatedVSL` module not found.

- [ ] **Step 3: Create `src/components/vsl/GatedVSL.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoPosition, saveVideoPosition, clearVideoPosition } from '@/lib/videoPersistence';
import { track } from '@/lib/analytics';

type GatedVSLProps = {
  src: string;
  revealAtSeconds: number;
  ctaLabel: string;
  onCtaClick: () => void;
  resumeKey: string;
  overlayText?: string;
};

export function GatedVSL({ src, revealAtSeconds, ctaLabel, onCtaClick, resumeKey, overlayText }: GatedVSLProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(revealAtSeconds);
  const [revealed, setRevealed] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const saved = getVideoPosition(resumeKey);
    if (saved && saved > 5) setShowResumePrompt(true);
    track('vsl_play', { resumeKey });
  }, [resumeKey]);

  useEffect(() => {
    if (revealed) {
      ctaRef.current?.focus();
      track('vsl_cta_reveal', { resumeKey });
    }
  }, [revealed, resumeKey]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    saveVideoPosition(resumeKey, video.currentTime);
    setSecondsLeft(Math.max(0, Math.ceil(revealAtSeconds - video.currentTime)));
    if (video.currentTime >= revealAtSeconds) setRevealed(true);
  };

  const handleResume = () => {
    const saved = getVideoPosition(resumeKey);
    if (saved && videoRef.current) videoRef.current.currentTime = saved;
    setShowResumePrompt(false);
  };

  const handleRestart = () => {
    clearVideoPosition(resumeKey);
    setShowResumePrompt(false);
  };

  const handleCtaClick = () => {
    track('vsl_cta_click', { resumeKey });
    onCtaClick();
  };

  return (
    <div className="flex flex-col items-center px-4">
      {overlayText ? <p className="mb-3 text-center text-sm font-medium text-neutral-700">{overlayText}</p> : null}

      {videoError ? (
        <div className="flex h-64 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-card bg-neutral-100 p-4 text-center">
          <p>No pudimos cargar el video.</p>
          <button type="button" onClick={handleCtaClick} className="rounded-full bg-brand px-4 py-2 text-white">
            Continuar sin video
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="w-full max-w-sm rounded-card"
          onTimeUpdate={handleTimeUpdate}
          onError={() => setVideoError(true)}
        >
          <track kind="captions" />
        </video>
      )}

      {showResumePrompt ? (
        <div className="mt-3 flex gap-2 text-sm">
          <span>Ya empezaste a ver este video</span>
          <button type="button" onClick={handleResume} className="font-semibold text-brand">
            ▶ Continuar viendo
          </button>
          <button type="button" onClick={handleRestart} className="font-semibold text-neutral-500">
            ↺ Ver desde el inicio
          </button>
        </div>
      ) : null}

      <div className="mt-4 w-full max-w-sm">
        {revealed ? (
          <button
            ref={ctaRef}
            type="button"
            onClick={handleCtaClick}
            className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white"
          >
            {ctaLabel}
          </button>
        ) : (
          <p className="text-center text-sm text-neutral-500">El botón se libera en {secondsLeft}s</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- GatedVSL.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/vsl/GatedVSL.tsx src/components/vsl/GatedVSL.test.tsx
git commit -m "feat: add GatedVSL component with countdown reveal and resume"
```

---

### Task 15: `OfferCard`

**Files:**
- Create: `src/components/offer/OfferCard.tsx`
- Test: `src/components/offer/OfferCard.test.tsx`

**Interfaces:**
- Consumes: `OFERTA, DISCLAIMERS` from `@/lib/content/copy` (Task 5); `track` from `@/lib/analytics` (Task 6).
- Produces: `OfferCard({ priceMxn: number; checkoutUrl: string; onCheckoutClick: () => void })` from `@/components/offer/OfferCard`.

- [ ] **Step 1: Write the failing tests**

`src/components/offer/OfferCard.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- OfferCard.test.tsx`
Expected: FAIL — `./OfferCard` module not found.

- [ ] **Step 3: Create `src/components/offer/OfferCard.tsx`**

```tsx
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
        <p className="mt-3 text-center text-sm text-neutral-500">
          ¿No pasó nada?{' '}
          <a href={checkoutUrl} className="font-semibold text-brand underline">
            Ir al pago manualmente
          </a>
        </p>
      ) : null}

      <p className="mt-3 text-xs text-neutral-400">{DISCLAIMERS.salud}</p>
      <p className="mt-1 text-xs text-neutral-400">{DISCLAIMERS.privacidad}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- OfferCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/offer/OfferCard.tsx src/components/offer/OfferCard.test.tsx
git commit -m "feat: add OfferCard component"
```

---

### Task 16: `QuizFunnel` orchestrator

**Files:**
- Create: `src/components/QuizFunnel.tsx`
- Test: `src/components/QuizFunnel.test.tsx`

**Interfaces:**
- Consumes: `useQuizStore` (Task 2); `SCREENS, IMC_TEXTS, PROYECCION_TEXTO, ECO_DOLOR, interpolate, MICRO_REVELACION` (Task 5); `calcularImc, calcularKgABajar, calcularFechaObjetivo, categoriaImc` (Task 3); `buildCheckoutUrl, getUtmsFromLocation` (Task 7); `track` (Task 6); `QuizStep, ChoiceCard, RulerSlider, AnalyzingLoader, ImcGauge, ProjectionChart` (Tasks 9-13); `GatedVSL` (Task 14); `OfferCard` (Task 15).
- Produces: `QuizFunnel()` — default rendering component, no props, used directly by `src/app/page.tsx`.

**Note on the spec:** the design spec (section 8) groups VSL 2 and the offer under one narrative "página de resultado", but the flow diagram (section 4) already lists them as two sequential items connected by the gated-CTA mechanic — identical in shape to how VSL 1 transitions into the weight screen. This task implements them as two sequential screens (`vsl2` then `oferta`), which is both simpler to implement consistently with `vsl1` and avoids duplicating the "página de resultado" header inside a single giant screen. The header text is shown once, at the top of the `vsl2` screen (via `overlayText`); "Fórmula personalizada para {nombre}" is shown on the `oferta` screen instead of literally "below the video" — same words, adjacent screens.

- [ ] **Step 1: Write the failing tests**

`src/components/QuizFunnel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizFunnel } from './QuizFunnel';
import { useQuizStore } from '@/lib/store';

describe('QuizFunnel', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('renderiza la primera pantalla del funil', () => {
    render(<QuizFunnel />);
    expect(screen.getByText(/Si pudieras dejar un peso atrás/)).toBeInTheDocument();
  });

  it('avanza a la siguiente pantalla y guarda la respuesta al seleccionar una opción', async () => {
    render(<QuizFunnel />);
    await userEvent.click(screen.getByText('Hasta 5 kg 🎯'));
    expect(screen.getByText(/Para quién estamos armando este plan/)).toBeInTheDocument();
    expect(useQuizStore.getState().answers.deseo).toBe('hasta-5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- QuizFunnel.test.tsx`
Expected: FAIL — `./QuizFunnel` module not found.

- [ ] **Step 3: Create `src/components/QuizFunnel.tsx`**

```tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useQuizStore } from '@/lib/store';
import {
  SCREENS,
  IMC_TEXTS,
  PROYECCION_TEXTO,
  ECO_DOLOR,
  interpolate,
  MICRO_REVELACION,
} from '@/lib/content/copy';
import { calcularImc, calcularKgABajar, calcularFechaObjetivo, categoriaImc } from '@/lib/calculations';
import { buildCheckoutUrl, getUtmsFromLocation } from '@/lib/checkout';
import { track } from '@/lib/analytics';
import { QuizStep } from './quiz/QuizStep';
import { ChoiceCard } from './quiz/ChoiceCard';
import { RulerSlider } from './quiz/RulerSlider';
import { AnalyzingLoader } from './quiz/AnalyzingLoader';
import { ImcGauge } from './quiz/ImcGauge';
import { ProjectionChart } from './quiz/ProjectionChart';
import { GatedVSL } from './vsl/GatedVSL';
import { OfferCard } from './offer/OfferCard';

export function QuizFunnel() {
  const { currentIndex, answers, setAnswer, goNext, goBack } = useQuizStore();
  const screen = SCREENS[currentIndex];
  const total = SCREENS.length;
  const showBack = currentIndex > 0 ? goBack : undefined;

  const derived = useMemo(() => {
    const peso = answers.peso ?? 0;
    const estatura = answers.estatura ?? 0;
    const objetivo = answers.objetivo ?? 0;
    const imc = estatura ? calcularImc(peso, estatura) : 0;
    const imcObjetivo = estatura ? calcularImc(objetivo, estatura) : 0;
    const kgABajar = calcularKgABajar(peso, objetivo);
    const fechaObjetivo = calcularFechaObjetivo(kgABajar, new Date());
    return { imc, imcObjetivo, kgABajar, fechaObjetivo };
  }, [answers.peso, answers.estatura, answers.objetivo]);

  useEffect(() => {
    if (currentIndex === 0) track('quiz_start');
    if (screen?.kind === 'imc') track('imc_view');
    if (screen?.kind === 'projection') track('projection_view');
    if (screen?.kind === 'offer') {
      track('result_view');
      track('offer_view');
    }
    if (currentIndex === SCREENS.length - 1) track('quiz_complete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  if (!screen) return null;

  if (screen.kind === 'choice') {
    const handleSelect = (value: string) => {
      setAnswer(screen.variable, value);
      track('quiz_answer', { step: screen.id, value });
      goNext();
    };
    return (
      <QuizStep key={screen.id} current={currentIndex + 1} total={total} title={screen.title} subtitle={screen.subtitle} onBack={showBack}>
        <div className="space-y-3">
          {screen.options.map((opt) => (
            <ChoiceCard
              key={opt.value}
              label={opt.label}
              selected={answers[screen.variable] === opt.value}
              onSelect={() => handleSelect(opt.value)}
            />
          ))}
        </div>
      </QuizStep>
    );
  }

  if (screen.kind === 'slider') {
    const currentValue = answers[screen.variable] ?? screen.defaultValue;
    return (
      <QuizStep
        key={screen.id}
        current={currentIndex + 1}
        total={total}
        title={screen.title}
        subtitle={screen.subtitle}
        onBack={showBack}
        footer={
          <button
            type="button"
            onClick={() => {
              track('quiz_answer', { step: screen.id, value: currentValue });
              goNext();
            }}
            className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white"
          >
            Continuar
          </button>
        }
      >
        <RulerSlider
          min={screen.min}
          max={screen.max}
          defaultValue={currentValue}
          majorTickEvery={screen.majorTickEvery}
          unitKind={screen.unitKind}
          instruction={screen.instruction}
          onChange={(v) => setAnswer(screen.variable, v)}
        />
      </QuizStep>
    );
  }

  if (screen.kind === 'text') {
    const value = answers[screen.variable] ?? '';
    const isValid = value.trim().length > 0;
    return (
      <QuizStep
        key={screen.id}
        current={currentIndex + 1}
        total={total}
        title={screen.title}
        subtitle={screen.subtitle}
        onBack={showBack}
        footer={
          <button
            type="button"
            disabled={!isValid}
            onClick={() => {
              track('quiz_answer', { step: screen.id, value });
              goNext();
            }}
            className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            Continuar
          </button>
        }
      >
        <input
          type="text"
          value={value}
          placeholder={screen.placeholder}
          onChange={(e) => setAnswer(screen.variable, e.target.value)}
          className="w-full rounded-card border border-neutral-200 px-4 py-3 text-lg"
        />
      </QuizStep>
    );
  }

  if (screen.kind === 'loader') {
    return (
      <AnalyzingLoader
        key={screen.id}
        title={screen.title}
        subtitle={screen.subtitle}
        messages={screen.messages}
        durationMs={screen.durationMs}
        onComplete={goNext}
      />
    );
  }

  if (screen.kind === 'imc') {
    const categoria = categoriaImc(derived.imc);
    const info = IMC_TEXTS[categoria];
    return (
      <QuizStep
        key={screen.id}
        current={currentIndex + 1}
        total={total}
        title={`${answers.nombre ?? ''}, tu IMC hoy es ${derived.imc}.`}
        onBack={showBack}
        footer={
          <button type="button" onClick={goNext} className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white">
            {info.cta}
          </button>
        }
      >
        <ImcGauge value={derived.imc} />
        <p className="mt-4 text-neutral-700">{info.texto}</p>
      </QuizStep>
    );
  }

  if (screen.kind === 'projection') {
    return (
      <QuizStep
        key={screen.id}
        current={currentIndex + 1}
        total={total}
        title={`${answers.nombre ?? ''}, mira lo que revelaron tus respuestas 👀`}
        onBack={showBack}
        footer={
          <button type="button" onClick={goNext} className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white">
            {PROYECCION_TEXTO.cta}
          </button>
        }
      >
        <p className="whitespace-pre-line text-neutral-700">
          {PROYECCION_TEXTO.intro(
            String(derived.imc),
            String(derived.imcObjetivo),
            String(derived.kgABajar),
            derived.fechaObjetivo
          )}
        </p>
        <div className="my-4 flex justify-center">
          <ProjectionChart pesoActual={answers.peso ?? 0} objetivo={answers.objetivo ?? 0} />
        </div>
        <p className="text-neutral-700">{PROYECCION_TEXTO.contraste(derived.fechaObjetivo)}</p>
      </QuizStep>
    );
  }

  if (screen.kind === 'vsl') {
    const src =
      screen.id === 'vsl1'
        ? process.env.NEXT_PUBLIC_VSL1_URL || screen.src
        : process.env.NEXT_PUBLIC_VSL2_URL || screen.src;
    return (
      <div key={screen.id} className="min-h-screen bg-background py-8">
        {screen.id === 'vsl1' ? (
          <p className="mx-auto mb-4 max-w-sm px-4 text-center text-sm text-neutral-500">{MICRO_REVELACION}</p>
        ) : null}
        <GatedVSL
          src={src}
          revealAtSeconds={screen.revealAtSeconds}
          ctaLabel={screen.ctaLabel}
          overlayText={screen.overlayText}
          resumeKey={screen.resumeKey}
          onCtaClick={goNext}
        />
      </div>
    );
  }

  // screen.kind === 'offer'
  const eco = answers.dolor
    ? interpolate(ECO_DOLOR[answers.dolor] ?? '', { fecha: derived.fechaObjetivo })
    : '';
  const priceMxn = Number(process.env.NEXT_PUBLIC_OFFER_PRICE_MXN ?? 690);
  const checkoutBase = process.env.NEXT_PUBLIC_CHECKOUT_URL ?? 'https://pay.kiwify.com.mx/REEMPLAZAR';
  const utms = typeof window !== 'undefined' ? getUtmsFromLocation(window.location.search) : {};
  const checkoutUrl = buildCheckoutUrl(checkoutBase, utms);

  return (
    <div key={screen.id} className="min-h-screen bg-background px-4 py-8">
      <h1 className="text-center text-2xl font-bold">
        ¡Analizamos tus respuestas, {answers.nombre}! Tu análisis está listo ✅
      </h1>
      {eco ? <p className="mx-auto mt-3 max-w-sm text-center text-neutral-600">{eco}</p> : null}
      <p className="mx-auto mt-2 max-w-sm text-center text-sm text-neutral-500">
        Fórmula personalizada para {answers.nombre}.
      </p>
      <div className="mt-6">
        <OfferCard priceMxn={priceMxn} checkoutUrl={checkoutUrl} onCheckoutClick={() => {}} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- QuizFunnel.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/QuizFunnel.tsx src/components/QuizFunnel.test.tsx
git commit -m "feat: add QuizFunnel orchestrator wiring all 23 screens"
```

---

### Task 17: App shell final + verificación manual

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes: `QuizFunnel` from `@/components/QuizFunnel` (Task 16).
- Produces: the real app entry point.

- [ ] **Step 1: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía — Tu plan personalizado',
  description: 'Descubre tu plan personalizado para bajar de peso con Gel Metabólico de Chía.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import { QuizFunnel } from '@/components/QuizFunnel';

export default function Home() {
  return <QuizFunnel />;
}
```

- [ ] **Step 3: Add reduced-motion support to `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  background-color: #f5f5f4;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests from Tasks 2-16 green.

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 6: Manual smoke check on the dev server**

Run: `npm run dev`, open `http://localhost:3000` in a mobile viewport (browser devtools, ~390px width), and walk through:
- Answer screens 1-5 (`deseo` → `area`), confirm auto-advance and the progress bar filling.
- Loader 1 auto-advances after ~3.5s.
- VSL1 shows the countdown, no CTA visible; skip ahead in the video (or wait) until the CTA appears and is clickable.
- Weight/height sliders respond to drag, keyboard arrows, and the unit toggle.
- IMC screen shows a name-personalized title and the correct conditional text for the entered weight/height.
- Projection screen shows the chart and the correct kg/date math.
- Remaining question screens advance correctly; the name screen blocks "Continuar" until text is entered.
- Loader 2 auto-advances; VSL2 gates the same way as VSL1.
- Offer screen shows the price, all 5 deliverables, the guarantee, and clicking "QUIERO MI PLAN" attempts to navigate to the placeholder Kiwify URL.
- Reload the page mid-quiz and confirm answers + current step persist (Zustand `persist` via `localStorage`).

Note any visual/UX issues found and fix them before proceeding — this is the only manual QA pass in this plan (see spec section 16, no automated E2E in scope).

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: wire QuizFunnel into the app shell"
```

---

### Task 18: Assets de video + variables de entorno reales

**Files:**
- Create: `public/videos/vsl1.mp4`, `public/videos/vsl2.mp4` (copied binaries)
- Create: `.env.local` (local only, gitignored)
- Create: `README.md`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_VSL1_URL`, `NEXT_PUBLIC_VSL2_URL`, `NEXT_PUBLIC_CHECKOUT_URL`, `NEXT_PUBLIC_OFFER_PRICE_MXN` env vars, already read in `QuizFunnel` (Task 16) and defaulting to `/videos/vsl1.mp4` / `/videos/vsl2.mp4` when unset.

- [ ] **Step 1: Copy the real VSL videos into `public/`**

Run:

```bash
mkdir -p public/videos
cp "../VSL1.Gel da Saciedade.mp4" public/videos/vsl1.mp4
cp "../VSL2.Gel da Saciedade.mp4" public/videos/vsl2.mp4
```

(paths are relative to the `quiz-app/` project root; source files are ~50MB and ~35MB — committing them directly to git is acceptable at this size, but if the checkout is later moved to a CDN/blob host, just set `NEXT_PUBLIC_VSL1_URL`/`NEXT_PUBLIC_VSL2_URL` to the external URLs and remove the local files — no code changes needed).

- [ ] **Step 2: Create `.env.local` from the example**

Run: `cp .env.local.example .env.local`

(Leave `NEXT_PUBLIC_CHECKOUT_URL` as the placeholder until Eduardo provides the real Kiwify link; update `NEXT_PUBLIC_OFFER_PRICE_MXN` if the MXN price is decided before launch.)

- [ ] **Step 3: Create `README.md`**

```markdown
# Gel Metabólico de Chía — Quiz MX

Funil de quiz interactivo en español (México) para el producto "Gel Metabólico de Chía".

## Desarrollo

\`\`\`bash
npm install
cp .env.local.example .env.local
npm run dev
\`\`\`

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `NEXT_PUBLIC_VSL1_URL` | URL del video VSL 1 (receta) | `/videos/vsl1.mp4` |
| `NEXT_PUBLIC_VSL2_URL` | URL del video VSL 2 (oferta) | `/videos/vsl2.mp4` |
| `NEXT_PUBLIC_CHECKOUT_URL` | URL de checkout de Kiwify | placeholder |
| `NEXT_PUBLIC_OFFER_PRICE_MXN` | Precio mostrado en la oferta (MXN) | `690` |

## Pruebas

\`\`\`bash
npm test
\`\`\`

## Deploy

Conectar este repositorio a un proyecto de Vercel y configurar las variables de entorno de la
tabla anterior en el dashboard del proyecto (Production + Preview). No requiere base de datos
ni backend.
```

- [ ] **Step 4: Verify the app serves the real videos**

Run: `npm run dev`, open the app, advance to the VSL1 screen, and confirm the real video plays (not a broken video icon).

- [ ] **Step 5: Commit**

```bash
git add public/videos/vsl1.mp4 public/videos/vsl2.mp4 README.md
git commit -m "feat: add real VSL video assets and project README"
```

(`.env.local` is gitignored and intentionally not committed.)

---

### Task 19: Preparación para deploy en Vercel

**Files:**
- Create: `vercel.json` (only if a non-default setting is needed — see Step 1)

**Interfaces:**
- Consumes: the full app from Tasks 1-18.
- Produces: a deployable repository.

- [ ] **Step 1: Confirm no custom Vercel config is required**

Next.js App Router projects deploy on Vercel with zero configuration (framework auto-detected from `package.json`). Do **not** create a `vercel.json` unless a specific need arises later (custom headers, redirects, etc.) — none exist in this plan's scope.

- [ ] **Step 2: Run a clean production build one more time**

Run: `rm -rf .next && npm run build`
Expected: build succeeds with no errors or warnings about missing env vars.

- [ ] **Step 3: Document the deploy steps in `README.md`**

Already covered in Task 18 Step 3 ("Deploy" section). Re-read it and confirm it's accurate.

- [ ] **Step 4: Hand off to Eduardo for the actual Vercel connection**

This step is manual and outside automation scope: push this repository to a Git remote (GitHub/GitLab) of Eduardo's choice, then import it in the Vercel dashboard, setting the four env vars from Task 18 Step 3. No commit needed for this step — it's an external action, not a code change.

---

## Post-implementation notes (not tasks — read before starting)

- The COFEPRIS badge image (`../Dra_AME/COFEPRIS.jpg`) and any before/after testimonial photos were confirmed usable but are **not wired into a task above** — the approved spec scope for this plan is the funnel mechanics and copy, not a final asset/testimonial layout pass. Adding them is a natural follow-up plan once the funnel is working end-to-end (e.g., a small "Task 20: trust badges + testimonials on the offer screen").
- `revealAtSeconds` (60s for VSL1, 90s for VSL2, in `src/lib/content/copy.ts`) are placeholder values — adjust after watching the real videos and noting when the narration actually reveals the CTA-worthy moment.
