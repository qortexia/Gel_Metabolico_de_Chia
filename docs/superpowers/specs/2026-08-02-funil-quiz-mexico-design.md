# Funil de Quiz "Gel Metabólico de Chía" — México (Design)

> Status: aprovado em conversa (2026-08-02), pendente de revisão final do usuário sobre este arquivo.
> Fontes: `../../../../funil_quiz.md` e `../../../../quiz.md` (specs originais em PT-BR, mescladas aqui).
> Referência de mercado (o que estamos superando): https://queimadiaria.shop/ ("Gel da Saciedade", PT-BR).

## 1. Objetivo

Funil de vendas (quiz interativo → 2 VSLs → oferta → checkout Kiwify) para o produto
**"Gel Metabólico de Chía"**, 100% em espanhol mexicano, hospedado na Vercel. O quiz
coleta respostas, calcula IMC e uma projeção de resultado, e conduz o usuário até dois
vídeos com CTA "gated" e uma página de oferta com checkout externo (Kiwify).

Meta de experiência: a cada tela o usuário deve sentir que **o quiz o conhece**. O
clímax é a tela de Proyección Personalizada (nome, kg a perder, data-alvo).

## 2. Por que "Gel Metabólico de Chía" e não "Mounjaro de Chia"

"Mounjaro de Chia" é o nome de pasta/projeto interno de Eduardo. O site de referência
real (queimadiaria.shop) já usa o nome **"Gel da Saciedade"**, e os arquivos de vídeo
reais do projeto (`VSL1.Gel da Saciedade.mp4`, `VSL2.Gel da Saciedade.mp4`) confirmam
isso. "Mounjaro" é a marca registrada do medicamento tirzepatida (Eli Lilly) — usá-la
na copy pública de um suplemento não relacionado é risco de propriedade
intelectual/propaganda enganosa. Optamos por **"Gel Metabólico de Chía"** (escolha do
usuário) como nome público em todas as telas, vídeos e checkout.

## 3. Stack

- **Next.js 14 (App Router) + React + TypeScript**
- **Tailwind CSS** para estilo
- **Framer Motion** para transições entre telas e micro-animações
- **Zustand** para estado global das respostas/variáveis do quiz
- Player de vídeo: **HTML5 nativo** com camada de controle própria (necessário para o
  gating do CTA — nada de embed de terceiro tipo VTurb/ConverteAI, que tira o controle
  fino sobre `timeupdate`).
- Sem backend / sem banco de dados. Estado em memória (Zustand) + `localStorage` para
  retomar quiz e posição de vídeo.
- Deploy: Vercel, sem domínio customizado por enquanto (`*.vercel.app`).
- Sem biblioteca de i18n — o site é mono-idioma (espanhol mexicano), copy direto no código.

### Localização do projeto

Novo diretório limpo `Mounjaro de Chia/quiz-app/` (este repositório), separado da
pasta de assets brutos (vídeos crus, `.aep`, `.psd`, gigabytes de b-roll). Apenas os
assets finais necessários (2 VSLs finais, imagens de depoimento/antes-depois
selecionadas, logo) serão copiados para `public/` deste projeto — não a biblioteca de
mídia inteira.

## 4. Fluxo final do funil (21 telas, mesclado)

Estrutura/copy emocional de `quiz.md` como espinha dorsal (inclui as telas
diferenciais de IMC e Projeção), mais a mecânica de CTA "gated com contador visível"
de `funil_quiz.md` (seção 6) nas duas VSLs.

```
1  Deseo (cuánto bajar)
2  Género
3  Edad
4  Espejo (cómo se siente)
5  Área del cuerpo
6  Loader 1 (análisis)
── VSL 1 (receta) — CTA gated con contador ──
7  Peso (RulerSlider)
8  Estatura (RulerSlider)
9  ★ IMC (pantalla dedicada)
10 Objetivo de peso (RulerSlider)
11 ★ Proyección personalizada (pantalla "wow")
12 Impacto en tu vida (captura `dolor`)
13 Satisfacción
14 Bloqueo
15 Agua
16 Sueño
17 Rutina
18 Cuerpo deseado
19 Nombre
20 Loader 2 (etapas nombradas + suspenso)
── VSL 2 (oferta, con eco del dolor) — CTA gated con contador ──
21 Oferta + CTA final → Checkout externo (Kiwify)
```

## 5. Variáveis de estado (Zustand store)

| Variável | Origem | Tipo |
|---|---|---|
| `nombre` | tela Nombre | string |
| `genero` | tela Género | enum |
| `edad` | tela Edad | enum |
| `peso` | RulerSlider Peso (kg) | number |
| `estatura` | RulerSlider Estatura (cm) | number |
| `objetivo` | RulerSlider Objetivo (kg) | number |
| `dolor` | tela Impacto en tu vida | enum |
| `imc` | calculado | number |
| `imcObjetivo` | calculado | number |
| `kgABajar` | calculado | number |
| `fechaObjetivo` | calculado | string |

### Fórmulas

```
imc           = peso / ((estatura/100) ** 2)              → redondear 1 decimal
imcObjetivo   = objetivo / ((estatura/100) ** 2)           → redondear 1 decimal
kgABajar      = peso - objetivo
semanas       = Math.ceil(kgABajar / 0.7)   // ritmo saludable ~0.7kg/semana
fechaObjetivo = hoy + (semanas * 7) días → formatear "MMMM 'de' yyyy" (es-MX, ej. "marzo de 2026")
```

Fallback sem data exata: até 8kg → "en cerca de 3 meses" · 8–15kg → "en cerca de 5
meses" · +15kg → "en cerca de 7 meses".

**Regra de honestidade:** ritmo entre 0.5–0.8 kg/semana. Nunca prometer resultado
implausível. A projeção é motivacional, não garantia — reforçado no disclaimer da
página de oferta.

## 6. Componentes reutilizáveis

- `<ProgressBar current total />` — barra fina no topo, sempre visível, animada.
- `<QuizStep>` — wrapper com título, botão voltar (←), logo, área de opções.
- `<ChoiceCard icon label subtitle image selected onSelect />` — cards de opção,
  feedback tátil (vibração leve via `navigator.vibrate` se disponível), alvo de toque
  ≥ 44px.
- `<RulerSlider>` — **não é um slider de bolinha comum.** É uma régua graduada
  horizontal que se arrasta; o marcador é fixo no centro. Usado em Peso, Estatura e
  Objetivo. Props (`min`, `max`, `step`, `defaultValue`, `majorTickEvery`, `units`,
  `onChange`, `instruction`, `helperText`) conforme especificado em `funil_quiz.md`
  seção final. Suporta touch (arraste + inércia), mouse (drag + scroll ±1), teclado
  (← → 1 unidade, PageUp/PageDown intervalo maior, Home/End min/max), `role="slider"`
  com `aria-valuemin/max/now/text`, ticks renderizados via `transform: translateX()`.
- `<AnalyzingLoader messages[] durationMs />` — microcopy que muda conforme o %
  avança, 3–5s, respeita `prefers-reduced-motion`.
- `<GatedVSL>` — ver seção 7.
- `<ImcGauge value />` — barra horizontal verde→amarillo→rojo com marcador na posição
  do IMC.
- `<ProjectionChart />` — mini-gráfico com duas curvas (mantendo x subindo / plano x
  descendo até `objetivo`).
- `<OfferCard price deliverables[] guarantee cta />`.

## 7. Mecânica crítica: `<GatedVSL>`

```ts
interface GatedVSLProps {
  src: string;
  revealAtSeconds: number;   // momento em que o CTA aparece
  ctaLabel: string;          // ex: "QUIERO MI RECETA"
  onCtaClick: () => void;    // avança o funil
  resumeKey: string;         // chave localStorage p/ retomar
  overlayText?: string;      // "Quédate hasta el final..."
}
```

- CTA existe no DOM desde o início, oculto (`display:none`/height 0) até
  `revealAtSeconds` via `timeupdate` do `<video>`; então aparece com fade/slide + foco
  automático.
- **Contador visível** "El botón se libera en Xs" em vez de esconder totalmente —
  mais honesto, reduz abandono (melhoria sobre a referência, que esconde por
  completo).
- Barra de progresso custom do vídeo no rodapé (verde).
- Persistência via `localStorage` (`resumeKey`): ao retornar, overlay "Ya empezaste a
  ver este video" → `[▶ Continuar viendo]` / `[↺ Ver desde el inicio]`.
- Acessibilidade: legendas (`<track>`), play/pause por teclado, foco no CTA ao
  revelar, `prefers-reduced-motion` desliga animações de reveal.
- Vídeos reais a usar: `VSL1.Gel da Saciedade.mp4` (tela 6→7) e
  `VSL2.Gel da Saciedade.mp4` (tela 20→21), copiados para `public/videos/`.
  `revealAtSeconds` fica configurável (valor placeholder inicial; ajustar depois de
  assistir aos vídeos com atenção ao timing do CTA mencionado na narração).

## 8. Conteúdo completo — copy em espanhol (México)

> `[variable]` = campo dinâmico. Tom: "tú" informal, direto, caloroso, 2ª pessoa,
> frases curtas. Nunca termos clínicos ("dosis", "protocolo", "sistema" cru — dizer
> "plan"). Nome do produto sempre **"Gel Metabólico de Chía"**.

### 1 — Deseo
**Si pudieras dejar un peso atrás y no volver a verlo… ¿cuánto sería?**
`Hasta 5 kg 🎯` · `6 a 10 kg 💪` · `11 a 15 kg 🔥` · `16 a 20 kg ⚡` · `Más de 20 kg 🚀`

### 2 — Género
**¿Para quién estamos armando este plan?**
*Esto cambia cómo tu cuerpo responde — por eso ajustamos todo para ti.*
`Mujer` · `Hombre`

### 3 — Edad
**¿Cuántos años tienes hoy?**
*El metabolismo cambia con la edad. Vamos a respetar tu momento.*
`Menos de 25` · `25 a 34` · `35 a 44` · `45 a 54` · `55+`

### 4 — Espejo
**Cuando te ves al espejo hoy, ¿qué sientes?**
`Me incomoda, pero evito pensar en eso 😔` · `Sé que ya no soy quien era 💭` ·
`Ya me cansé de esconderme dentro de la ropa 🙈`

### 5 — Área del cuerpo
**¿Qué parte de tu cuerpo te incomoda más cuando te ves?**
`Abdomen` · `Pecho` · `Costados (llantitas)` · `Brazos`

### 6 — Loader 1
**Listo. Ya entendimos qué ha frenado tu pérdida de peso hasta ahora…**
*Preparando tu receta personalizada…* (barra animada, microcopy variando)

### VSL 1
Encima del video: **Quédate hasta el final: al final te muestro exactamente cómo usar
el Gel Metabólico de Chía para empezar a desinflamarte desde los primeros días.**
CTA (gated): **QUIERO MI RECETA**

*(Micro-revelación opcional antes del video, se optar por incluir:)*
> La verdad que nadie te cuenta: lo que frena tu pérdida de peso casi nunca es fuerza
> de voluntad — es tu cuerpo pidiendo comida sin necesitarla realmente. Por eso las
> dietas a base de sacrificio casi siempre fallan. El Gel Metabólico de Chía actúa
> justo ahí.

### 7 — Peso
**¿Cuánto pesas hoy?** — RulerSlider kg/lb (50–250), valor grande, default 85 kg.
*Sin juicios aquí. Este es el punto de partida de tu cambio.* → guarda `peso`

### 8 — Estatura
**¿Y cuál es tu estatura?** — RulerSlider cm/pulg (100–250), default 160 cm.
*Con esto armamos un plan hecho para tu cuerpo — nada de fórmulas genéricas.*
→ guarda `estatura`

### 9 — ★ IMC
**[nombre], tu IMC hoy es [imc].**
`<ImcGauge>` verde→amarillo→rojo con marcador en `imc`. Texto condicional (solo la
franja correspondiente):
- `imc < 25`: *Estás más cerca de lo que imaginas. Falta poco para llegar al cuerpo
  que quieres — y puedes lograrlo en las próximas semanas.*
- `25 ≤ imc < 30`: *Tu cuerpo está en el punto donde la incomodidad empieza a volverse
  rutina. La buena noticia: es justo aquí donde el Gel Metabólico de Chía actúa más
  rápido.*
- `imc ≥ 30`: *Esto va mucho más allá de la apariencia — es sobre tu energía y tu
  salud todos los días. Y el cambio puede empezar esta misma semana.*
CTA: **QUIERO SALIR DE ESTA ZONA**

### 10 — Objetivo de peso
**¿Y cuánto quieres pesar cuando te veas al espejo y sonrías?** — RulerSlider kg/lb
→ guarda `objetivo`

### 11 — ★ Proyección personalizada (clímax "wow")
**[nombre], mira lo que revelaron tus respuestas 👀**
> Hoy tu IMC es **[imc]**. Tu meta lo llevaría a **[imcObjetivo]** — el rango de
> quienes se sienten ligeras, seguras y cómodas en su propio cuerpo.
>
> Eso son **[kgABajar]kg**. Al ritmo correcto, puedes llegar ahí para
> **[fechaObjetivo]**.

Bloque de contraste:
> Pero hay dos caminos: si sigues como estás hoy, la tendencia es que la aguja se
> mueva para el lado equivocado. Con el plan correcto, inviertes eso — y
> **[fechaObjetivo]** puede ser el mes en que por fin te veas al espejo y sonrías.

`<ProjectionChart>` — dos curvas. CTA: **QUIERO LLEGAR A ESE RESULTADO**

### 12 — Impacto en tu vida (captura `dolor`)
**¿Cómo ha afectado tu peso tu vida en realidad?**
`Evito salir en fotos 📷` · `Siento que perdí mi brillo con quien amo 💔` ·
`Perdí mi confianza 😞` · `Evito citas y eventos 🏠` ·
`Vivo sin energía ni ánimo 😴` · `Ninguna de estas ✋`

### 13 — Satisfacción
**En el fondo, ¿estás satisfecha con tu cuerpo hoy?**
`No, me siento con sobrepeso 😔` · `Más o menos, sé que puedo mejorar 🤔` ·
`No — quiero cambiar mi cuerpo Y mi confianza 💪`

### 14 — Bloqueo
**¿Qué es lo que más te ha impedido bajar de peso hasta hoy?**
`Falta de tiempo ⏰` · `Falta de autocontrol 🍕` ·
`Ya probé de todo y nada funciona 😤` · `La comida saludable es cara y difícil 💸`

### 15 — Agua
**¿Cuánta agua sueles tomar al día?**
`Solo café, casi nada de agua ☕` · `Hasta 2 litros 💧` · `Entre 2 y 3 litros 💦` ·
`Más de 3 litros 🌊`

### 16 — Sueño
**¿Y cómo anda tu sueño?**
`Menos de 5h 😵` · `Entre 5 y 7h 😐` · `Entre 7 y 9h 😊` · `Más de 9h 😴`

### 17 — Rutina
**¿Cómo es tu día a día hoy?**
`Trabajo fuera, rutina agitada 🏃` · `Sentada la mayor parte del día 🪑` ·
`Rutina estresante e irregular 😰` · `Mi rutina cambió mucho en los últimos años 🔄`

### 18 — Cuerpo deseado
**¿Y qué cuerpo sueñas con ver en el espejo?**
`En forma — sana y ligera 💪` · `Tonificada — firme y definida 🏋️`

### 19 — Nombre
**Para dejar todo a tu manera… ¿cómo te llamas?**
Campo de texto, placeholder "Escribe tu nombre…" → guarda `nombre`
*Voy a armar tu plan con tu nombre — a tu manera.*

### 20 — Loader 2 (etapas nombradas, ~3–4s)
Líneas apareciendo una a una, cada una se marca ✓ al completar:
```
🔍 Cruzando tu IMC de [imc]...
💧 Evaluando tu hidratación y tu sueño...
⚙️ Ajustando la fórmula para tu metabolismo...
🎯 Calculando tu camino hasta [objetivo]kg...
✅ ¡Plan de [nombre] listo!
```
Frase de suspenso antes de liberar el video: **Hay algo en tus respuestas que llamó
nuestra atención…**

### 20→21 — Página de resultado (VSL 2 + Oferta, una sola página)

Encabezado (tope de la página, antes del video):
**¡Analizamos tus respuestas, [nombre]! Tu análisis está listo ✅**
*Ahora mira este video para descubrir cómo usar el Gel Metabólico de Chía para bajar
hasta **[kgABajar]kg** en los próximos 30 días — y por fin [ECO_DOLOR].*

Video (gated): CTA **QUIERO EMPEZAR MI TRANSFORMACIÓN**

Etiqueta debajo del video: **Fórmula personalizada para [nombre].** *Hecha con todo lo
que me contaste aquí.*

### Eco del dolor (`[ECO_DOLOR]`, condicional por `dolor`)
| `dolor` | Texto |
|---|---|
| Evito salir en fotos | *Me dijiste que evitas las fotos. Imagina, en [fechaObjetivo], ser la primera en decir "ven, tomémonos una foto juntas".* |
| Perdí mi brillo con quien amo | *Me contaste que sientes que perdiste tu brillo con quien amas. Este plan empieza justo por ahí.* |
| Perdí mi confianza | *¿Recuerdas que dijiste que perdiste la confianza? Ahí es donde empieza el cambio: no solo es el cuerpo, eres tú reconociéndote de nuevo.* |
| Evito citas y eventos | *Dijiste que evitas las citas. Imagina aceptar la próxima invitación sin pensarlo dos veces en qué ponerte.* |
| Vivo sin energía ni ánimo | *Me contaste que vives sin energía. Una de las primeras señales es justo despertar con ganas otra vez.* |
| Ninguna de estas (fallback) | *Ya diste el paso más difícil: decidir cambiar. Ahora solo falta seguir el plan correcto.* |

Bloque de oferta, debajo del video (🔒 OFERTA EXCLUSIVA):
- **Gel Metabólico de Chía — PLAN COMPLETO**
- Precio destacado (placeholder, configurável): **$690 MXN** — "Acceso completo por
  solo"
- Badge: "Pago único • Acceso inmediato"
- Entregables:
  1. **Receta Completa** — El paso a paso completo para prepararlo en casa.
  2. **Plan de 30 Días** — Plan diario completo para potenciar tus resultados.
  3. **Guía de Alimentos Permitidos** — Lista completa de lo que puedes y debes comer.
  4. **Clases en Video Exclusivas** — Clases prácticas y directas en cada etapa.
  5. **Soporte por WhatsApp** — Resuelve tus dudas con nuestro equipo especializado.
- Garantía: 🛡️ **GARANTÍA INCONDICIONAL DE 30 DÍAS** — ¿No te gustó? Te devolvemos
  todo tu dinero. Sin preguntas, sin trámites.
- Selo de confiança: badge COFEPRIS (`Dra_AME/COFEPRIS.jpg`, confirmado pelo usuário
  que o produto tem o registro correspondente).
- CTA final: **QUIERO MI PLAN** → redireciona ao checkout Kiwify (placeholder).

## 9. Disclaimers e conformidade (México)

- Aviso de saúde visível na página de oferta: *"Los resultados pueden variar de
  persona a persona. Este producto no sustituye una consulta médica o nutricional
  profesional."*
- Política de Privacidad + consentimento explícito na captura do nome (tela 19),
  referenciando a **Ley Federal de Protección de Datos Personales en Posesión de los
  Particulares (LFPDPPP)** — a lei mexicana equivalente à LGPD brasileira citada nos
  specs originais (correção necessária: LGPD é brasileira, não se aplica ao México).
- Selo COFEPRIS usado apenas por confirmação do usuário de que o produto tem o
  registro correspondente.
- **Nota para o usuário:** como é copy de saúde/suplemento anunciada no México,
  recomenda-se revisão final das alegações de saúde (telas de IMC, projeção, oferta)
  contra as regras de publicidade da COFEPRIS/Ley General de Salud antes de rodar
  tráfego pago — isso está fora do escopo de implementação deste projeto (é revisão
  jurídica, não código).

## 10. Oferta / Checkout — integração Kiwify

- `NEXT_PUBLIC_CHECKOUT_URL` (env var) — placeholder até o usuário ter o link real da
  Kiwify.
- `NEXT_PUBLIC_OFFER_PRICE_MXN` (env var) — placeholder `690`.
- UTMs da URL de entrada propagadas como query params na URL de checkout.
- Evento `checkout_click` disparado antes do redirect.
- Sem formulário de pagamento na própria página — apenas monta a URL e redireciona.

## 11. Persistência e retomada

- `localStorage`: respostas do quiz (todas as variáveis da seção 5) + posição/estado
  de cada `<GatedVSL>` (via `resumeKey`).
- Ao recarregar a página, o funil retoma no último step respondido.

## 12. Analytics (eventos)

`quiz_start`, `quiz_answer` (step + valor), `vsl1_play`, `vsl1_cta_reveal`,
`vsl1_cta_click`, `imc_view`, `projection_view`, `quiz_complete`, `result_view`,
`vsl2_play`, `vsl2_cta_reveal`, `offer_view`, `checkout_click`. Sem provider de
analytics configurado ainda — `track()` fica pronto com um provider vazio (plugável
depois com GA/Meta Pixel).

## 13. Tratamento de erro

- Vídeo falha ao carregar → fallback com botão "Continuar sin video" (não trava o
  funil).
- Nome vazio na tela 19 → validação inline, não avança sem preencher.
- Falha ao redirecionar ao checkout → mensagem de erro + botão de retry.
- Todas as animações têm fallback estático quando `prefers-reduced-motion` está
  ativo.

## 14. Acessibilidade (obrigatório, AA)

- Navegação por teclado completa (incluindo `<RulerSlider>` e `<GatedVSL>`).
- Foco visível, `aria-live` nos loaders, contraste AA.
- Alvos de toque ≥ 44px.
- Legendas (`<track>`) nos dois vídeos.
- `prefers-reduced-motion` respeitado em todas as transições/animações.

## 15. Performance / Mobile-first

- Lazy-load de imagens, `poster` nos vídeos, pré-carregar só o próximo step.
- Ticks do `<RulerSlider>` via `transform: translateX()` (GPU), virtualizados no
  range de peso (50–250).
- 100% vertical/mobile-first — CTA sticky no rodapé em mobile.

## 16. Testes

- Unitários: funções puras de cálculo (`imc`, `imcObjetivo`, `kgABajar`,
  `fechaObjetivo`, formatação MXN).
- Verificação manual guiada: rodar o dev server e percorrer o fluxo completo em
  viewport mobile antes de considerar pronto (sem framework de E2E visual neste
  escopo).

## 17. Fora de escopo (explícito)

- Domínio customizado (fica para depois).
- Preço/link real da Kiwify (usuário fornece depois via env var).
- Provider de analytics real (GA/Pixel) — só os hooks `track()` prontos.
- Revisão jurídica das alegações de saúde perante COFEPRIS.
- Testes E2E automatizados / visual regression.
