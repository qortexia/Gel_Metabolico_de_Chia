'use client';

import { useEffect, useMemo } from 'react';
import { useQuizStore } from '@/lib/store';
import {
  SCREENS,
  IMC_TEXTS,
  PROYECCION_TEXTO,
  ECO_DOLOR,
  interpolate,
  buildLoader1Vars,
  RESULT_PHOTOS,
  PROYECCION_FOTOS,
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
import { BeforeAfterPhotos } from './quiz/BeforeAfterPhotos';
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
    // Full-photo options (genero) read better as a 2-column grid; list-style
    // options (image + sublabel, e.g. cuerpoActual) read better stacked.
    const isPhotoGrid = screen.options.some((opt) => opt.image && !opt.sublabel);
    return (
      <QuizStep key={screen.id} current={currentIndex + 1} total={total} title={screen.title} subtitle={screen.subtitle} onBack={showBack}>
        <div className={isPhotoGrid ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {screen.options.map((opt) => {
            const image =
              opt.imageMujer || opt.imageHombre
                ? answers.genero === 'hombre'
                  ? opt.imageHombre
                  : opt.imageMujer
                : opt.image;
            return (
              <ChoiceCard
                key={opt.value}
                label={opt.label}
                sublabel={opt.sublabel}
                image={image}
                selected={answers[screen.variable] === opt.value}
                onSelect={() => handleSelect(opt.value)}
              />
            );
          })}
        </div>
      </QuizStep>
    );
  }

  if (screen.kind === 'multichoice') {
    const selectedValues = answers[screen.variable];
    const toggle = (value: string) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      setAnswer(screen.variable, next);
    };
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
            disabled={selectedValues.length === 0}
            onClick={() => {
              track('quiz_answer', { step: screen.id, value: selectedValues.join(',') });
              goNext();
            }}
            className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            Continuar
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {screen.options.map((opt) => {
            const image = answers.genero === 'hombre' ? opt.imageHombre : opt.imageMujer;
            return (
              <ChoiceCard
                key={opt.value}
                label={opt.label}
                image={image}
                checkbox
                selected={selectedValues.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
              />
            );
          })}
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
    // interpolate() is a no-op on strings with no {placeholder}, so applying the
    // same variable set to both loaders is harmless: loader1 only uses the
    // genero/edad/area/cuerpoActual vars, loader2 only uses imc/objetivo/nombre.
    const vars = {
      imc: String(derived.imc),
      objetivo: String(answers.objetivo ?? ''),
      nombre: answers.nombre ?? '',
      ...buildLoader1Vars(answers),
    };
    return (
      <AnalyzingLoader
        key={screen.id}
        title={interpolate(screen.title, vars)}
        subtitle={interpolate(screen.subtitle, vars)}
        messages={screen.messages.map((m) => interpolate(m, vars))}
        durationMs={screen.durationMs}
        onComplete={goNext}
        resultPhotos={screen.id === 'loader2' ? RESULT_PHOTOS : undefined}
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
    const handleProjectionChoice = (value: string) => {
      track('quiz_answer', { step: screen.id, value });
      goNext();
    };
    const fotosProyeccion = answers.genero === 'hombre' ? PROYECCION_FOTOS.hombre : PROYECCION_FOTOS.mujer;
    return (
      <QuizStep
        key={screen.id}
        current={currentIndex + 1}
        total={total}
        title="Mira lo que revelaron tus respuestas 👀"
        onBack={showBack}
        footer={
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleProjectionChoice('quiero')}
              className="flex w-full items-center gap-3 rounded-card bg-brand px-4 py-3 text-left text-white transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">🌱</span>
              <span>
                <span className="block font-bold">{PROYECCION_TEXTO.ctaPrincipal}</span>
                <span className="block text-sm text-white/80">
                  {PROYECCION_TEXTO.ctaPrincipalSub(String(derived.kgABajar))}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleProjectionChoice('no-se')}
              className="flex w-full items-center gap-3 rounded-card bg-neutral-100 px-4 py-3 text-left text-neutral-600 transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-lg">✕</span>
              <span>
                <span className="block font-semibold">{PROYECCION_TEXTO.ctaSecundaria}</span>
                <span className="block text-sm text-neutral-400">{PROYECCION_TEXTO.ctaSecundariaSub}</span>
              </span>
            </button>
          </div>
        }
      >
        <p className="text-lg font-semibold text-foreground">
          {PROYECCION_TEXTO.resultado(String(answers.peso ?? 0), String(answers.objetivo ?? 0), String(derived.kgABajar))}
        </p>
        <div className="mt-4">
          <BeforeAfterPhotos beforeSrc={fotosProyeccion.antes} afterSrc={fotosProyeccion.despues} />
        </div>
        <p className="mt-3 whitespace-pre-line text-neutral-700">
          {PROYECCION_TEXTO.intro(
            String(derived.imc),
            String(derived.imcObjetivo),
            String(derived.kgABajar),
            derived.fechaObjetivo
          )}
        </p>
        <div className="my-4 flex justify-center">
          <ProjectionChart pesoActual={answers.peso ?? 0} objetivo={answers.objetivo ?? 0} fechaObjetivo={derived.fechaObjetivo} />
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
        <GatedVSL
          src={src}
          revealAtSeconds={screen.revealAtSeconds}
          revealSecondsBeforeEnd={screen.revealSecondsBeforeEnd}
          ctaLabel={screen.ctaLabel}
          overlayText={screen.overlayText}
          resumeKey={screen.resumeKey}
          preventSkip={screen.preventSkip}
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
    <div key={screen.id} className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold">
          ¡Analizamos tus respuestas, {answers.nombre}! Tu análisis está listo ✅
        </h1>
        {eco ? <p className="mt-3 text-center text-neutral-600">{eco}</p> : null}
        <p className="mt-2 text-center text-sm text-neutral-500">Fórmula personalizada para {answers.nombre}.</p>
        <div className="mt-6">
          <OfferCard priceMxn={priceMxn} checkoutUrl={checkoutUrl} onCheckoutClick={() => {}} />
        </div>
      </div>
    </div>
  );
}
