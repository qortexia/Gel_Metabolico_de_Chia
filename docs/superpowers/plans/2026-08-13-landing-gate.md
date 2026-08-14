# Landing Gate (age gate + compliance Meta Ads) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a landing/age-gate screen in front of the quiz's first question so the funnel meets Meta Ads' health-content review requirements (18+ gate, disclaimers, working Términos/Privacidad/Contacto links).

**Architecture:** A new `started: boolean` flag on the existing Zustand store decides which screen renders. `page.tsx`'s existing `next/dynamic(..., { ssr: false })` wrapper is retargeted at a new tiny `QuizGate` component that reads `started` and renders `LandingGate` or `QuizFunnel` — this keeps the store-dependent render entirely client-side (no SSR/hydration mismatch), matching how `QuizFunnel` already avoids that problem today. `LandingGate` is a new presentational component under `src/components/home/`. Two new static routes (`/terms`, `/privacy`) give the footer links real content.

**Tech Stack:** Next.js 14 App Router, React 18, Zustand (persist middleware), Tailwind, Vitest + Testing Library — all already in the project, no new dependencies.

## Global Constraints

- Spanish (México) copy only — matches the rest of `copy.ts` and the LFPDPPP references already in `DISCLAIMERS.privacidad`.
- Mobile-first: every screen in this app is a centered `max-w-sm` column (see `QuizStep.tsx`, `OfferCard.tsx`) — new screens must match, not introduce a new layout width.
- Primary CTA style is `min-h-[44px] rounded-full bg-brand px-6 py-3 text-lg font-bold text-white` (44px = accessible tap target, used everywhere in `QuizFunnel.tsx`/`OfferCard.tsx`) — reuse it, don't invent a new button style.
- Images are plain `<img>` tags with an eslint-disable comment (`{/* eslint-disable-next-line @next/next/no-img-element */}`) — this project does not use `next/image` (see `BeforeAfterPhotos.tsx`). Follow the same pattern.
- Store tests call `useQuizStore.getState()` directly against the real store (no mocking) — see `store.test.ts` and `DevResetButton.test.tsx`. Follow the same pattern; don't introduce a mocking library.
- The "Sí, continuar" button navigates straight into the quiz — there is no separate "Comenzar Quiz" button (confirmed with Eduardo). Don't add one back.
- Contact email placeholder is `soporte@gelmetabolicodechia.com` — no real inbox exists yet in the repo; this is intentionally a placeholder Eduardo will swap later, not a bug to "fix".
- Legal text on `/terms` and `/privacy` is a technical placeholder to satisfy Meta's "link must have real content" requirement — it is not a substitute for lawyer review before real paid traffic. Don't over-invest in wording here.

---

### Task 1: Store — `started` flag and `startQuiz()` action

**Files:**
- Modify: `src/lib/store.ts`
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Consumes: nothing new (existing `INITIAL_ANSWERS`, `QuizAnswers` from `@/types/quiz`).
- Produces: `useQuizStore.getState().started: boolean` (default `false`), `useQuizStore.getState().startQuiz(): void` (sets `started` to `true`). `reset()` now also sets `started` back to `false`. Task 2 and Task 3 both depend on these exact names.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/lib/store.test.ts` (inside the existing top-level `describe('useQuizStore', ...)` block, as new `it` blocks alongside the existing ones):

```ts
  it('starts with started=false', () => {
    expect(useQuizStore.getState().started).toBe(false);
  });

  it('startQuiz sets started=true', () => {
    useQuizStore.getState().startQuiz();
    expect(useQuizStore.getState().started).toBe(true);
  });

  it('reset() also sets started back to false', () => {
    useQuizStore.getState().startQuiz();
    useQuizStore.getState().goNext();
    useQuizStore.getState().reset();
    expect(useQuizStore.getState().started).toBe(false);
    expect(useQuizStore.getState().currentIndex).toBe(0);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/store.test.ts`
Expected: FAIL — `started` is `undefined`, `startQuiz` is not a function.

- [ ] **Step 3: Implement the store changes**

Replace the full contents of `src/lib/store.ts` with:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_ANSWERS, QuizAnswers } from '@/types/quiz';

interface QuizState {
  currentIndex: number;
  started: boolean;
  answers: QuizAnswers;
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void;
  goNext: () => void;
  goBack: () => void;
  goToIndex: (index: number) => void;
  startQuiz: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      currentIndex: 0,
      started: false,
      answers: INITIAL_ANSWERS,
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      goNext: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
      goBack: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
      goToIndex: (index) => set({ currentIndex: index }),
      startQuiz: () => set({ started: true }),
      reset: () => set({ currentIndex: 0, started: false, answers: INITIAL_ANSWERS }),
    }),
    {
      name: 'gel-chia-quiz-mx',
      // Browsers with quiz progress saved before a QuizAnswers shape change
      // (e.g. a new field, or 'area' going from string|null to string[]) must
      // not crash on rehydration. The default persist merge replaces the whole
      // `answers` object with whatever was saved, so any field missing from —
      // or shaped differently in — old localStorage data would otherwise leak
      // straight into state. Merge onto fresh defaults field-by-field instead,
      // and coerce 'area' back into an array no matter what shape was saved.
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<QuizState>;
        const persistedAnswers = (persistedState.answers ?? {}) as Partial<QuizAnswers>;
        return {
          ...current,
          ...persistedState,
          answers: {
            ...current.answers,
            ...persistedAnswers,
            area: Array.isArray(persistedAnswers.area) ? persistedAnswers.area : [],
          },
        };
      },
    }
  )
);
```

(Only change from the current file: `started: boolean` + `startQuiz: () => void` added to the interface, `started: false` + `startQuiz: () => set({ started: true })` added to the store body, and `started: false` added to `reset()`. The `merge` function needs no changes — `started` is a top-level field, so `...persistedState` already carries it over the same way it already does for `currentIndex`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/store.test.ts`
Expected: PASS, all tests including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts src/lib/store.test.ts
git commit -m "feat(quiz): add started flag to gate the quiz behind a landing screen"
```

---

### Task 2: `LandingGate` component (content, copy, analytics events, UI)

**Files:**
- Create: `public/images/home/hero-app.png` (copied asset, not code)
- Modify: `src/lib/content/copy.ts`
- Modify: `src/lib/analytics.ts`
- Create: `src/components/home/LandingGate.tsx`
- Test: `src/components/home/LandingGate.test.tsx`

**Interfaces:**
- Consumes: `useQuizStore().started` / `.startQuiz()` (Task 1), `track()` from `@/lib/analytics`.
- Produces: `LandingGate` (default-less named export, no props) — Task 3 renders `<LandingGate />` with no arguments when `started` is `false`.

- [ ] **Step 1: Copy the hero image asset**

```bash
mkdir -p "public/images/home"
cp "../Pagina Home/imagehome.png" "public/images/home/hero-app.png"
```

Verify: `ls public/images/home/hero-app.png` shows the file (~1.6MB).

- [ ] **Step 2: Add `DISCLAIMERS.aviso` and the `LANDING` content block**

In `src/lib/content/copy.ts`, change the existing `DISCLAIMERS` export (currently the last export in the file, around line 438) from:

```ts
export const DISCLAIMERS = {
  salud:
    'Los resultados pueden variar de persona a persona. Este producto no sustituye una consulta médica o nutricional profesional.',
  privacidad:
    'Al continuar, aceptas nuestro tratamiento de tus datos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y nuestra Política de Privacidad.',
};
```

to:

```ts
export const DISCLAIMERS = {
  salud:
    'Los resultados pueden variar de persona a persona. Este producto no sustituye una consulta médica o nutricional profesional.',
  privacidad:
    'Al continuar, aceptas nuestro tratamiento de tus datos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y nuestra Política de Privacidad.',
  aviso:
    'Este producto no está diseñado para diagnosticar, tratar, curar o prevenir ninguna enfermedad.',
};

export const LANDING = {
  titulo: 'Descubre tu protocolo personalizado',
  subtitulo: 'Test educativo',
  heroSrc: '/images/home/hero-app.png',
  heroAlt: 'Mujer revisando su protocolo personalizado en la app',
  ageGateTitulo: '¿Tienes 18 años o más?',
  ageGateSi: 'Sí, continuar',
  ageGateNo: 'No, salir',
  ageGateBloqueado: 'Este contenido es exclusivamente para mayores de 18 años.',
  footerLinks: {
    terminos: 'Términos',
    privacidad: 'Privacidad',
    contacto: 'Contacto',
  },
  contactoEmail: 'soporte@gelmetabolicodechia.com',
  copyright: '© 2026 Gel Metabólico de Chía. Todos los derechos reservados.',
};
```

- [ ] **Step 3: Add the new analytics events**

In `src/lib/analytics.ts`, change the `AnalyticsEvent` union from:

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
```

to:

```ts
export type AnalyticsEvent =
  | 'landing_view'
  | 'landing_cta_click'
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
```

- [ ] **Step 4: Write the failing test**

Create `src/components/home/LandingGate.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingGate } from './LandingGate';
import { useQuizStore } from '@/lib/store';
import { setAnalyticsProvider } from '@/lib/analytics';
import { LANDING } from '@/lib/content/copy';

describe('LandingGate', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    setAnalyticsProvider(() => {});
  });

  it('renderiza título, hero y el age gate', () => {
    render(<LandingGate />);
    expect(screen.getByText(LANDING.titulo)).toBeInTheDocument();
    expect(screen.getByAltText(LANDING.heroAlt)).toBeInTheDocument();
    expect(screen.getByText(LANDING.ageGateTitulo)).toBeInTheDocument();
  });

  it('renderiza los links del footer', () => {
    render(<LandingGate />);
    expect(screen.getByText(LANDING.footerLinks.terminos)).toHaveAttribute('href', '/terms');
    expect(screen.getByText(LANDING.footerLinks.privacidad)).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(LANDING.footerLinks.contacto)).toHaveAttribute(
      'href',
      `mailto:${LANDING.contactoEmail}`
    );
  });

  it('clic en "Sí, continuar" llama startQuiz() y trackea landing_cta_click', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByText(LANDING.ageGateSi));

    expect(useQuizStore.getState().started).toBe(true);
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'yes' });
  });

  it('clic en "No, salir" muestra el mensaje de bloqueo y no llama startQuiz()', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByText(LANDING.ageGateNo));

    expect(screen.getByText(LANDING.ageGateBloqueado)).toBeInTheDocument();
    expect(screen.queryByText(LANDING.ageGateSi)).not.toBeInTheDocument();
    expect(useQuizStore.getState().started).toBe(false);
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'no' });
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- src/components/home/LandingGate.test.tsx`
Expected: FAIL — `./LandingGate` module not found.

- [ ] **Step 6: Implement `LandingGate`**

Create `src/components/home/LandingGate.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { LANDING, DISCLAIMERS } from '@/lib/content/copy';

export function LandingGate() {
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const [underage, setUnderage] = useState(false);

  useEffect(() => {
    track('landing_view');
  }, []);

  const handleYes = () => {
    track('landing_cta_click', { answer: 'yes' });
    startQuiz();
  };

  const handleNo = () => {
    track('landing_cta_click', { answer: 'no' });
    setUnderage(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-8 text-center">
        <h1 className="text-2xl font-bold leading-tight">{LANDING.titulo}</h1>
        <p className="mt-1 text-xs tracking-wide text-neutral-500">{LANDING.subtitulo}</p>

        <div className="mt-6 max-h-[360px] overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LANDING.heroSrc} alt={LANDING.heroAlt} className="w-full object-cover" />
        </div>

        <div className="mt-6 rounded-card border border-neutral-200 bg-white p-5">
          {underage ? (
            <p className="text-neutral-700">{LANDING.ageGateBloqueado}</p>
          ) : (
            <>
              <p className="font-semibold">{LANDING.ageGateTitulo}</p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleYes}
                  className="min-h-[44px] min-w-[120px] rounded-full bg-brand px-6 py-3 text-sm font-bold text-white"
                >
                  {LANDING.ageGateSi}
                </button>
                <button
                  type="button"
                  onClick={handleNo}
                  className="min-h-[44px] min-w-[120px] rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-500"
                >
                  {LANDING.ageGateNo}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-6 text-center">
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/terms" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
            {LANDING.footerLinks.terminos}
          </a>
          <a href="/privacy" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
            {LANDING.footerLinks.privacidad}
          </a>
          <a
            href={`mailto:${LANDING.contactoEmail}`}
            className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
          >
            {LANDING.footerLinks.contacto}
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[10px] leading-relaxed text-neutral-500">{DISCLAIMERS.aviso}</p>
        <p className="mx-auto mt-2 max-w-sm text-[10px] leading-relaxed text-neutral-500">
          {DISCLAIMERS.privacidad}
        </p>
        <p className="mt-3 text-[10px] text-neutral-400">{LANDING.copyright}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- src/components/home/LandingGate.test.tsx`
Expected: PASS, all 4 tests.

- [ ] **Step 8: Commit**

```bash
git add public/images/home/hero-app.png src/lib/content/copy.ts src/lib/analytics.ts \
  src/components/home/LandingGate.tsx src/components/home/LandingGate.test.tsx
git commit -m "feat(quiz): add LandingGate screen with age gate and Meta Ads disclaimers"
```

---

### Task 3: Wire `LandingGate` in front of the quiz

**Files:**
- Create: `src/components/QuizGate.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useQuizStore().started` (Task 1), `LandingGate` (Task 2), existing `QuizFunnel`.
- Produces: nothing consumed by later tasks — this is the final composition point.

- [ ] **Step 1: Create `QuizGate`**

Create `src/components/QuizGate.tsx`:

```tsx
'use client';

import { useQuizStore } from '@/lib/store';
import { QuizFunnel } from './QuizFunnel';
import { LandingGate } from './home/LandingGate';

// Kept as its own component (rather than inlined in page.tsx) so page.tsx can
// keep loading it via next/dynamic(..., { ssr: false }) — that avoids ever
// server-rendering `started`, which would otherwise mismatch the client's
// first paint while the Zustand persist middleware is still rehydrating from
// localStorage.
export function QuizGate() {
  const started = useQuizStore((state) => state.started);
  return started ? <QuizFunnel /> : <LandingGate />;
}
```

- [ ] **Step 2: Point `page.tsx` at `QuizGate` instead of `QuizFunnel`**

Replace the full contents of `src/app/page.tsx` with:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { DevResetButton } from '@/components/dev/DevResetButton';

const QuizGate = dynamic(() => import('@/components/QuizGate').then((mod) => mod.QuizGate), {
  ssr: false,
  // Without this, the page renders nothing at all (ssr: false) until the
  // client JS chunk finishes loading — a blank white screen on any
  // connection slower than instant. This fills that gap with something
  // that matches the app's background instead of an empty page.
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-brand" />
    </div>
  ),
});

export default function Home() {
  return (
    <>
      <QuizGate />
      <DevResetButton />
    </>
  );
}
```

(Only change from the current file: `QuizFunnel` import/dynamic swapped for `QuizGate`.)

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests plus the new ones from Task 1 and Task 2. This task has no dedicated test file (`page.tsx`/`QuizGate.tsx` composition isn't unit-tested anywhere else in this codebase either — there's no existing `page.test.tsx`), so the full suite plus the manual check in Step 4 is the verification.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open `http://localhost:3000`.
Expected:
- First load shows `LandingGate` (title "Descubre tu protocolo personalizado", hero image, age gate).
- Clicking "Sí, continuar" immediately shows the quiz's first question.
- Reloading the page after that keeps you on the quiz (not back on the landing screen) — confirms `started` persisted correctly.
- Clicking the dev reset button (bottom-right, only visible in `npm run dev`) sends you back to `LandingGate`.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuizGate.tsx src/app/page.tsx
git commit -m "feat(quiz): show the landing gate before the quiz starts"
```

---

### Task 4: `/terms` and `/privacy` static pages

**Files:**
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: nothing (static content, no store/props).
- Produces: nothing consumed elsewhere — these are leaf routes, only linked *to* (from `LandingGate`, already wired in Task 2).

- [ ] **Step 1: Create the Términos page**

Create `src/app/terms/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the Privacidad page**

Create `src/app/privacy/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Run the full test suite, typecheck and lint**

Run: `npm test`
Expected: PASS — no test changes needed for these two pages (static content, no logic — same as `layout.tsx`, which also has no test in this codebase).

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new warnings/errors (existing `<img>` warnings in `ProgressPhotos`, if any, are pre-existing and out of scope).

- [ ] **Step 4: Manual check**

With `npm run dev` running, open `http://localhost:3000/terms` and `http://localhost:3000/privacy` directly, and click the "Términos"/"Privacidad" links from the landing screen.
Expected: both routes render, "← Volver" returns to `/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/terms/page.tsx src/app/privacy/page.tsx
git commit -m "feat(quiz): add placeholder Términos and Privacidad pages"
```
