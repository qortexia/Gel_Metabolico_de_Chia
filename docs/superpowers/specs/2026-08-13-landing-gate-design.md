# Página Home / Age Gate (compliance Meta Ads) — Design

> Status: aprovado em conversa (2026-08-13).

## 1. Objetivo

Hoje `/` renderiza `QuizFunnel` direto na pergunta 1 — sem age gate, sem disclaimers,
sem links de Términos/Privacidad. Pra rodar tráfego pago no Meta Ads (nicho de saúde/
emagrecimento), a página de entrada precisa desses elementos ou o anúncio/página é
reprovado na revisão. Esta spec cobre a página que entra **antes** da pergunta 1.

## 2. Escopo

- Nova tela `LandingGate`, mostrada quando o usuário ainda não começou o quiz.
- Fluxo do CTA (decidido em conversa): o botão **"Sí, continuar"** do próprio age gate
  já navega direto pra pergunta 1. Não existe um segundo botão "Comenzar Quiz" —
  seria redundante com o que foi pedido.
- **"No, salir"**: troca o conteúdo do card do age gate por uma mensagem curta
  ("Este contenido es exclusivamente para mayores de 18 años.") e não mostra mais
  nenhum CTA. Não há como de fato bloquear o acesso (é client-side, sem verificação
  real) — é o padrão de compliance aceito pelo Meta, não uma trava de segurança.
- Hero: imagem `imagehome.png` (fornecida pelo Eduardo em
  `../../Pagina Home/imagehome.png`), copiada para
  `public/images/home/hero-app.png`. É o mockup do dashboard do member-app ("Hola,
  Sofía", progresso semanal) com uma foto de mulher usando tablet.
- Footer: links **Términos** / **Privacidad** / **Contacto**, disclaimer de saúde
  ("Este producto no está diseñado para diagnosticar, tratar, curar o prevenir
  ninguna enfermedad.") e copyright.

## 3. Implementação

- `src/lib/store.ts`: novo campo `started: boolean` (persistido, default `false`) +
  ação `startQuiz()` (`set({ started: true })`). `reset()` volta `started` pra
  `false` também (mantém o dev-reset consistente).
- `src/components/home/LandingGate.tsx` (client component):
  - Título "Descubre tu protocolo personalizado" + subtítulo pequeno "Test educativo"
    (mesmo texto do template).
  - Hero: `<img src="/images/home/hero-app.png" alt="Mujer revisando su protocolo
    personalizado en la app" className="w-full rounded-card object-cover" />`,
    dentro de um container com altura máxima pra não estourar a tela mobile
    (`max-h-[360px] overflow-hidden`), seguindo o padrão de `<img>` cru já usado em
    `BeforeAfterPhotos.tsx` (o projeto não usa `next/image`).
  - Card do age gate: pergunta + dois botões (`Sí, continuar` estilo primário
    `rounded-full bg-brand`, `No, salir` estilo neutro `bg-neutral-100
    text-neutral-600`), mesmo padrão visual dos botões de `QuizFunnel.tsx`.
  - Estado local `underage` (`useState`) — quando `true`, troca o conteúdo do card
    pela mensagem de bloqueio.
  - Footer com os 3 links + `DISCLAIMERS.aviso` (novo) + `DISCLAIMERS.privacidad`
    (já existe em `copy.ts`) + copyright "© 2026 Gel Metabólico de Chía. Todos los
    derechos reservados."
- `src/lib/content/copy.ts`: adicionar `DISCLAIMERS.aviso = 'Este producto no está
  diseñado para diagnosticar, tratar, curar o prevenir ninguna enfermedad.'`.
- `src/app/page.tsx`: lê `started` do store; `started ? <QuizFunnel/> :
  <LandingGate/>`. `DevResetButton` continua irmão de ambos.
- `src/lib/analytics.ts`: novos eventos `landing_view` e `landing_cta_click`
  (payload `{ answer: 'yes' | 'no' }`), seguindo o padrão existente de `track()`.
- `src/app/terms/page.tsx` e `src/app/privacy/page.tsx`: páginas estáticas com texto
  legal padrão (LFPDPPP, sem garantias médicas, sem coleta indevida) — **placeholder
  técnico**, não substitui revisão jurídica antes de tráfego pago real.
- `src/app/contact/page.tsx` **ou** link direto `mailto:` — decidido: `mailto:` com
  placeholder `soporte@gelmetabolicodechia.com` (nenhum e-mail real foi encontrado no
  repo; Eduardo troca depois pelo real).

## 4. Teste

`LandingGate.test.tsx` (vitest + testing-library):
- Renderiza título, hero, age gate e footer.
- Clique em "Sí, continuar" chama `startQuiz()` do store (mock) e dispara
  `landing_cta_click`.
- Clique em "No, salir" esconde os CTAs e mostra a mensagem de bloqueio, sem chamar
  `startQuiz()`.

`page.test.tsx` (se existir) ou teste novo: `started=false` renderiza `LandingGate`;
`started=true` renderiza `QuizFunnel`.
