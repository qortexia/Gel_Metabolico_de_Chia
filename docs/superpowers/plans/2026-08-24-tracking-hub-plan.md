# Tracking Hub — Roadmap de Implementação (todas as fases)

> **Para agentes:** este é o roadmap mestre. Cada fase tem (ou terá) um plano detalhado passo-a-passo em `docs/superpowers/plans/`. Execute os planos detalhados com `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Marque as caixas aqui conforme as fases fecham.

**Objetivo:** sair de "80 cliques, 0 vendas, zero tracking" para sinal limpo no Meta Ads (Pixel + CAPI deduplicados, Purchase real via webhook Kiwify) e visibilidade total do funil (quiz tela a tela, VSL segundo a segundo, checkout, compra, reembolso) por criativo — num hub reutilizável entre quiz-app, Zoioz, PepDose e Conatex.

**Spec aprovada:** `docs/superpowers/specs/2026-08-24-tracking-hub-design.md` (v2, decisões A-F fechadas em 2026-08-24).

**Stack:** Next.js 14 (quiz-app) / Next.js (hub) · TypeScript · Vitest · Supabase Postgres · Meta Graph API (Conversions API) · Kiwify Webhooks + Sales API · Vercel.

---

## Visão geral das fases

| Fase | O quê | Quem | Quando | Plano detalhado |
|---|---|---|---|---|
| **0a** | Pixel + CAPI same-origin no quiz-app, ids determinísticos, propagação s1/s2/s3/sck pro checkout, consentimento, correções de eventos | Claude (código) | **hoje** | `2026-08-24-fase-0a-quiz-app-tracking.md` |
| **0b** | Configuração: Events Manager, Kiwify, anúncios, tokens | **Eduardo** | **hoje**, em paralelo | checklist abaixo |
| **1** | `tracking-hub`: Supabase (schema completo), `/api/ingest`, rewrite first-party, dashboard com drill-down, Basic Auth | Claude | 1-3 dias | a escrever ao fim da Fase 0 |
| **1.5** | Experimento: passo opcional de email no quiz | Claude | após Fase 1 | a escrever |
| **2** | Webhook Kiwify (todos os eventos), Purchase real via CAPI, matching em 3 níveis, cron de retry, compra de teste, troca de bastão do Purchase | Claude + Eduardo (compra de teste) | após Fase 1 | a escrever |
| **3** | Watch-time das VSLs (hook, `video_watch`, milestones → ViewContent, curva de abandono por VSL) | Claude | após Fase 2 | a escrever |
| **4** | SDK como pacote, plugar Zoioz/PepDose/Conatex, `ad_spend` + cron Ads Insights, ROAS por criativo | Claude | quando o funil estiver convertendo | a escrever |

---

## Fase 0a — quiz-app (código, hoje)

Plano detalhado: [`2026-08-24-fase-0a-quiz-app-tracking.md`](./2026-08-24-fase-0a-quiz-app-tracking.md)

**Entregáveis**
- [ ] Meta Pixel carregado no `layout.tsx` (`NEXT_PUBLIC_META_PIXEL_ID`), PageView automático
- [ ] `src/lib/tracking/` (embrião do SDK): `ids.ts` (anon_id/session_id/event_id uuid v5), `attribution.ts` (UTM + IDs de anúncio + fbc/fbp, write-once), `eventMap.ts` (tabela canônica interno→Meta + allowlist de metadata), `consent.ts`, `metaPixel.ts`, `provider.ts`
- [ ] `POST /api/e/capi` same-origin espelhando Lead / InitiateCheckout (/ ViewContent reservado) com `test_event_code` por env
- [ ] `buildCheckoutUrl` injeta `s1=session_id, s2=anon_id, s3=fbc, sck=fbp` + `utm_*`
- [ ] Correções de eventos: Lead no submit do `nombre`; InitiateCheckout **só** em `checkout_click`; `quiz_step_view`; `vsl_view` vs `vsl_play` (onPlay real); `vsl_error`; `vsl_continue_without_video`; `result_view` removido; `quiz_start` no clique real
- [ ] Checkbox de consentimento expresso no `LandingGate` + `/privacy` reescrita (dados sensíveis, identificadores, Meta, retenção)
- [ ] `analytics.ts` bufferiza eventos até o provider existir
- [ ] README + `.env.local.example` com as novas envs
- [ ] QA no Test Events: cada par browser+servidor aparece como **1 linha** ("Deduplicated")

**Critério de aceite:** deploy em produção com Pixel + CAPI validados no Test Events, `s1` visível na URL de checkout, checkbox de consentimento obrigatório, todos os testes verdes.

---

## Fase 0b — configuração (Eduardo, hoje)

Faça na ordem. Itens 1-2 **antes** de eu ligar o CAPI em produção.

- [ ] **1. Events Manager → Data Sources → seu pixel → Configurações.** Existe aviso de restrição "Health and Wellness" / "Data Sharing Restrictions"? Anote o nível (nenhum / leve / moderado / severo). Se houver qualquer restrição: abrir a revisão/apelação **hoje** (é um formulário) e me avisar — muda o que a gente manda pra Meta (spec §11.4).
- [ ] **2. Events Manager → mesma tela → Aggregated Event Measurement.** Ainda aparece configuração manual de 8 eventos priorizados pro domínio? Anote sim/não.
- [ ] **3. Events Manager → Partner Integrations.** Existe integração Kiwify (ou outra) ligada neste pixel? Anote.
- [ ] **4. Painel Kiwify → produto → Pixels/Integrações.** Pixel Meta configurado? Se sim, quais eventos (Checkout / Compra aprovada / por método de pagamento)? **Decisão A:** deixar ligado **só** "Compra aprovada" (Purchase) com o mesmo Pixel ID; **desligar** qualquer evento de Checkout/InitiateCheckout. Se não existir, criar com só Purchase.
- [ ] **5. Ads Manager → cada anúncio ativo → Rastreamento → Parâmetros de URL.** Colar:
  `utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}`
  (não adicionar `fbclid` — a Meta injeta sozinha). Pode ir pra re-revisão rápida; ok.
- [ ] **6. Business Manager → Usuários do sistema → criar/usar System User** com acesso ao pixel (escopo: só este dataset) → gerar token com `ads_management` (ou o mínimo que o Events Manager pedir para Conversions API). Me enviar por canal seguro (não colar no chat/vault). Vai virar `META_CAPI_ACCESS_TOKEN` no Vercel.
- [ ] **7. Events Manager → Test Events.** Copiar o `test_event_code` (ex.: `TEST12345`). Vai virar `META_TEST_EVENT_CODE` só durante o QA.
- [ ] **8. Pixel ID** (número do dataset). Vai virar `NEXT_PUBLIC_META_PIXEL_ID`.
- [ ] **9. Vercel → projeto quiz-app → Environment Variables:** `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_TEST_EVENT_CODE` (temporário), em Production + Preview.
- [ ] **10. Kiwify → API.** Gerar API key (pra Sales API na Fase 2) e anotar. Verificar quais meios de pagamento o checkout mostra pra comprador mexicano (cartão / OXXO / SPEI).
- [ ] **11. Domínio neutro pro hub (Decisão F).** Escolher um domínio/subdomínio **sem** "track", "analytics", "pixel", "stats" no nome (ex.: `hub.<algum-dominio-seu>.com` ou `app-<nome>.com`). Só precisa existir na Fase 1.

---

## Fase 1 — tracking-hub + Supabase + dashboard (1-3 dias)

Plano detalhado: a escrever ao fim da Fase 0 (depende dos resultados de 0b).

**Entregáveis**
- [ ] Repo/app `tracking-hub` (Next.js, Vercel) no domínio neutro; rotas com nomes neutros (`/api/ingest`, `/api/hooks/...`, `/api/cron/...`)
- [ ] Projeto Supabase; migração inicial com **todas** as tabelas da spec §9 (`sessions`, `events`, `video_watch`, `webhook_events`, `orders`, `consents`), `project_id` em tudo, índices listados, **RLS ligado em todas com zero policies**
- [ ] `src/config/projects.ts` (map slug → pixel id, nomes das envs, `allowed_origins`, `ad_account_timezone`, `funnel_steps` ordenados)
- [ ] `POST /api/ingest` conforme spec §6 (origin check, validação de shape, allowlist por projeto, strip de metadata, `is_bot`, `INSERT ... ON CONFLICT (event_id)`, `step_order` server-side, upsert de `sessions`, dispatch CAPI com `capi_status`, sem retry pra eventos espelhados)
- [ ] Circuit breaker de volume por projeto
- [ ] quiz-app: rewrite `/api/e/:path* → https://<hub>/api/:path*` no `next.config.js`; `provider.ts` passa a postar em `/api/e/ingest` (o `/api/e/capi` local é removido — o hub assume o CAPI)
- [ ] `consents` persistido a partir do `consent_accept`
- [ ] `/dashboard/[project]`: Basic Auth (middleware), funil por pessoa (`DISTINCT anon_id`), overall + relativo, filtro `is_bot`, segmentação por `meta_ad_id`/`utm_content`, drill-down nível 1 (sessões do step) e nível 2 (`/sessions/[session_id]` timeline), cards: CAPI failed 24h, receita bruta/líquida, "Meta vs CAPI"
- [ ] Polling 5-15 s; Recharts `FunnelChart`
- [ ] Cláusula de escape: se passar de 3 dias, subir só `sessions` mínima + insert fire-and-forget

**Critério de aceite:** um lead real aparece no funil do dashboard em < 15 s, com atribuição (`ad_id`) e timeline de eventos; nenhum acesso ao Supabase funciona com anon key; CAPI do hub deduplicado no Test Events.

---

## Fase 1.5 — experimento: passo de email (Decisão B)

- [ ] Tela opcional entre `nombre` e `loader2`: "¿A dónde te envío tu plan personalizado, {nombre}?" · CTA "Recibir mi plan" · link "Continuar sin correo" · microcopy de consentimento (1 linha)
- [ ] Eventos `email_view` / `email_submit` / `email_skip`
- [ ] Email cru (lowercase/trim) + `email_sha256` na `sessions`; `em` hasheado entra no `user_data` dos eventos seguintes (fbq advanced matching re-init + CAPI)
- [ ] Medir skip-rate por 1-2 semanas → decidir se vira obrigatório

**Critério de aceite:** EMQ de Lead/InitiateCheckout sobe (checar Diagnostics ~24 h depois); taxa de conclusão do quiz não cai mais que o combinado.

---

## Fase 2 — webhook Kiwify + Purchase real

Plano detalhado: a escrever após Fase 1.

**Pré-requisito:** compra de teste (spec §14) com `META_TEST_EVENT_CODE` ligado.

**Entregáveis**
- [ ] `POST /api/hooks/[project]/kiwify` conforme spec §7.3: token → `INSERT webhook_events ON CONFLICT (project_id, dedupe_key, event_type)` → 200 em conflito → ramifica por `event_type` → Purchase só em `compra_aprovada` com `capi_purchase_sent_at IS NULL` → Graph API síncrono com 2 tentativas → **200 sempre**
- [ ] Matching em 3 níveis (spec §7.4): `s1` → Sales API `GET /v1/sales/{order_id}` → `unattributed` (dispara com `em/ph/fn/ln` do `Customer`, sem IP/UA)
- [ ] `event_id` do Purchase = `uuidv5("purchase:{order_id}")`; `event_time` = `approved_at` ou recebimento; `value` **bruto** (Decisão D), `currency: 'MXN'`; request próprio (sem batch)
- [ ] `fbc` fallback: `COALESCE(fbc da sessão, fbc ≤ 7 dias mais recente do mesmo anon_id)`
- [ ] Ciclo de vida (spec §7.5): `carrinho_abandonado` → `checkout_abandoned` (+ email do abandonador na sessão), `compra_recusada` → `payment_refused`, `compra_reembolsada`/`chargeback` → `orders.status` + `refunded_at` (**nada pra Meta**, Decisão D9), `pix_gerado`/`boleto_gerado` só gravados
- [ ] `GET /api/cron/capi-retry` 1×/dia para `orders.capi_status = 'failed'` + botão de reenvio manual no dashboard
- [ ] Backfill das vendas do período Fase 0-1 via Sales API (casando por `s1`)
- [ ] Assinar **todos** os gatilhos no painel Kiwify apontando pro endpoint
- [ ] **Compra de teste** (spec §14, 6 asserções + reembolso) — Eduardo executa, Claude verifica payloads
- [ ] **Troca de bastão do Purchase (Decisão A):** se o `event_id` do Purchase nativo da Kiwify for derivado do `order_id` → hub usa o mesmo e as duas camadas coexistem; senão → **desligar o Purchase nativo no painel Kiwify no mesmo dia**. Registrar a data.
- [ ] Dashboard: steps `checkout_abandoned` / `payment_refused` / `purchase`; taxa `unattributed`; Purchases pendentes de CAPI

**Critério de aceite:** compra de teste gera **exatamente 1** Purchase no Test Events (conferido por `event_id`), com `MXN` e valor bruto correto; replay 2× do payload não duplica; reembolso muda `orders.status` sem novo Purchase.

---

## Fase 3 — watch-time das VSLs

Plano detalhado: a escrever após Fase 2.

**Entregáveis**
- [ ] Hook `useVideoWatchTracking({ videoId })` (spec §8): `played` TimeRanges (unique seconds) + high-water-mark + engaged seconds (Page Visibility); milestones 25/50/75/100 uma vez; heartbeat ~10 s; flush em `visibilitychange→hidden` via `sendBeacon` (`text/plain`) com fallback `fetch(keepalive)`
- [ ] `GatedVSL` passa a usar o hook (mantém gate/anti-skip/resume existentes)
- [ ] `vsl_autoplay_blocked` quando `play()` rejeita
- [ ] `vsl_milestone` → ViewContent com `content_name = "vsl{n}_{pct}"` (allowlist no hub e no payload builder)
- [ ] Hub: upsert `video_watch` por `(session_id, video_id)` com GREATEST
- [ ] Dashboard: curva de abandono por segundo **por VSL** (`% sessões com max_watched ≥ s`); drill-down de sessão mostra segundos por VSL
- [ ] Documentar regra de audiences: **só** `vsl2_75`, `vsl2_100`, `vsl_cta_reveal(vsl2)`, InitiateCheckout, Purchase semeiam Custom Audience / Lookalike; VSL1 nunca

**Critério de aceite:** para uma sessão real, o dashboard mostra até que segundo cada VSL foi assistida; os 4 milestones da VSL2 aparecem como ViewContent deduplicado no Test Events; nenhum termo de saúde chega à Meta.

---

## Fase 4 — multi-projeto e custo

Plano detalhado: a escrever quando o funil estiver convertendo.

**Entregáveis**
- [ ] Extrair `src/lib/tracking/` do quiz-app para pacote `@eduardo/tracking-sdk` (core sem imports de framework + hooks React); quiz-app passa a importar o pacote
- [ ] Plugar Zoioz, PepDose, Conatex: entrada no `projects.ts`, rewrite, envs, `EVENT_MAP` próprio por projeto
- [ ] Tabela `ad_spend` + `GET /api/cron/ad-spend` (Ads Insights API, token de System User, janela retroativa 3-7 dias, upsert idempotente, `date` no timezone da ad account)
- [ ] Dashboard: spend, CPC/CPM, CPA e ROAS por `ad_id`/`adset_id`/`campaign_id` (join no relatório, nunca inline)
- [ ] Promover `projects`/`funnel_steps` a tabela **só se** surgir necessidade de adicionar projeto sem deploy
- [ ] Supabase Auth com allowlist de emails **só se** o dashboard virar multiusuário

**Critério de aceite:** um segundo projeto envia eventos ao hub trocando só config; ROAS por criativo bate com o Ads Manager dentro da variância esperada (20-40%).

---

## Backlog explícito (não fazer sem gatilho)

| Item | Gatilho para fazer |
|---|---|
| Fingerprint IP+UA+janela no matching do webhook | `unattributed` > 20-30% das vendas |
| `video_watch_buckets` (heatmap por segundo com re-watch) | player permitir seek livre **e** volume justificar |
| AddPaymentInfo via CAPI pra "pagamento gerado" | nomes reais dos eventos OXXO/SPEI confirmados na compra de teste |
| Supabase Realtime no dashboard | volume tornar polling insuficiente |
| Sankey | quiz ganhar branches reais |
| Rate limit Upstash em `/api/ingest` | abuso observado |
| Custom event `VSL2_CTA` pra audience | ≥100 eventos `vsl2_75+` |
| Passo de email obrigatório | skip-rate medido na Fase 1.5 |
| Copy do site sem termos de saúde | apelação Health & Wellness negada (decisão de negócio) |

---

## Incertezas a resolver (e onde)

| # | Incerteza | Resolvida em |
|---|---|---|
| 1 | Webhook Kiwify traz `tracking.s1`? | Fase 2, compra de teste (fallback Sales API já cobre) |
| 2 | `s2/s3/sck` voltam como `s1`? | Fase 2, compra de teste |
| 3 | Nomes dos eventos "pagamento gerado" OXXO/SPEI | Fase 2, compra de teste |
| 4 | `event_id` do Purchase nativo da Kiwify é derivado do `order_id`? | Fase 2, compra de teste |
| 5 | Teto AEM de 8 eventos vale pra esta conta? | Fase 0b item 2 |
| 6 | Restrição Health & Wellness no domínio | Fase 0b item 1 |
| 7 | Termos da Meta cobrem as CPCs da ANPD (transferência internacional)? | jurídico, fora de engenharia |
