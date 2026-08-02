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
  OFERTA,
} from '@/lib/content/copy';
import { calcularImc, calcularKgABajar, calcularFechaObjetivo, categoriaImc } from '@/lib/calculations';
import { buildCheckoutUrl, getUtmsFromLocation, DEFAULT_CHECKOUT_URL } from '@/lib/checkout';
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
              setAnswer(screen.variable, currentValue);
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
              // Trim only what gets persisted on "Continuar" — the controlled input's
              // live value stays untouched while the user is still typing.
              const trimmed = value.trim();
              setAnswer(screen.variable, trimmed);
              track('quiz_answer', { step: screen.id, value: trimmed });
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
    // interpolate() is a no-op on strings with no {placeholder}, so applying it
    // unconditionally is harmless for loader1 (no variables) and personalizes
    // loader2 (imc/objetivo/nombre are all captured by this point in the funnel).
    const messages = screen.messages.map((m) =>
      interpolate(m, {
        imc: String(derived.imc),
        objetivo: String(answers.objetivo ?? ''),
        nombre: answers.nombre ?? '',
      })
    );
    return (
      <AnalyzingLoader
        key={screen.id}
        title={screen.title}
        subtitle={screen.subtitle}
        messages={messages}
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
        title={`Tu IMC hoy es ${derived.imc}.`}
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
        title="Mira lo que revelaron tus respuestas 👀"
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
          <p className="mx-auto mb-4 max-w-sm px-4 text-center text-sm text-neutral-600">{MICRO_REVELACION}</p>
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
  const rawPriceMxn = Number(process.env.NEXT_PUBLIC_OFFER_PRICE_MXN);
  const priceMxn = Number.isFinite(rawPriceMxn) && rawPriceMxn > 0 ? rawPriceMxn : OFERTA.precioMxnDefault;
  const checkoutBase = process.env.NEXT_PUBLIC_CHECKOUT_URL || DEFAULT_CHECKOUT_URL;
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
