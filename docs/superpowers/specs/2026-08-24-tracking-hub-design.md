# Spec — Módulo de Tracking Avançado Meta Ads (`tracking-hub`) — v2

**Data:** 2026-08-24
**Status:** **APROVADA pelo Eduardo em 2026-08-24** (pós-revisão adversarial, 49 gaps incorporados; decisões A-F fechadas em §15). Plano de implementação: `docs/superpowers/plans/2026-08-24-tracking-hub-plan.md`.
**Escopo:** funil Gel Metabólico de Chía (quiz-app, MX) hoje; Zoioz, PepDose e Conatex depois.

---

## 1. Objetivo

Sair da cegueira total (80 cliques, 0 vendas, nenhum tracking real) e entregar três coisas:

1. **Sinal limpo pro Meta Ads** — Pixel + Conversions API deduplicados, Purchase real com valor em MXN vindo do webhook da Kiwify, sem duplicação e sem vazar dado de saúde.
2. **Visibilidade total do funil** — até onde cada lead foi (tela a tela do quiz, segundo a segundo em cada VSL, chegada/abandono/recusa no checkout, compra, reembolso), por criativo/anúncio.
3. **Módulo reutilizável** — um hub central que qualquer app Next.js do Eduardo pluga com um SDK fino e uma linha de rewrite.

---

## 2. Decisões travadas

| # | Decisão | Origem |
|---|---|---|
| D1 | Fix tático hoje (Fase 0) e módulo completo depois | Eduardo |
| D2 | Eduardo tem acesso à conta Kiwify (webhook + API de Sales) | Eduardo |
| D3 | Persistência em Supabase/Postgres | Eduardo |
| D4 | Arquitetura **hub centralizado** (um serviço, N projetos), não pacote embutido | Eduardo |
| D5 | **Purchase tem UMA fonte de verdade por vez.** Nunca duas fontes disparam Purchase no mesmo pixel sem `event_id` compartilhado e verificado no Test Events | revisão |
| D6 | **`event_id` é determinístico**, nunca aleatório por emissão (ver §4.3) | revisão |
| D7 | **Dado de saúde nunca sai pra Meta** e, por padrão, **nem é persistido no Supabase** — só `question_id`/`step_order` (ver §11) | revisão |
| D8 | Tradução evento interno → evento Meta acontece **uma única vez, no cliente**, via tabela fechada; o hub só valida (fail-closed) | revisão |
| D9 | Refund/chargeback **não geram evento pra Meta** (CAPI web não tem Refund; Ads Manager reporta bruto, nosso dashboard reporta líquido) | revisão |
| D10 | Segredos (token CAPI, token webhook) vivem em **env vars do Vercel**, nunca em coluna de banco | revisão |

---

## 3. Arquitetura

```
 quiz-app (Vercel)            Zoioz / PepDose / Conatex (futuro)
 ├─ Meta Pixel (fbq) ────────────────────────────────────────▶ Meta
 ├─ @eduardo/tracking-sdk
 │    track() → fbq(eventID) + POST /api/e/ingest   (same-origin)
 └─ next.config.js rewrite:  /api/e/:path* → https://<hub>/api/:path*
                                   │
                                   ▼
                     tracking-hub (Next.js 14, Vercel)
                     ├─ POST /api/ingest              ← eventos de funil
                     ├─ POST /api/hooks/[project]/kiwify   ← TODOS os eventos Kiwify
                     ├─ GET  /api/cron/capi-retry     ← Purchases com capi_status=failed (1x/dia)
                     ├─ GET  /api/cron/ad-spend       ← Ads Insights (Fase 4)
                     └─ /dashboard/[project]/...      ← Basic Auth (middleware)
                                   │  service_role (server-side only)
                                   ▼
                     Supabase (RLS ligado em tudo, zero policies)
                     projects(config em código) · sessions · events · video_watch
                     · webhook_events · orders · consents · ad_spend(F4)
```

**Por que o rewrite first-party é obrigatório:** hostname com "tracking"/"analytics" e paths `/api/track` caem nas listas EasyPrivacy (uBlock/AdGuard) e em bloqueadores de DNS. Com o rewrite, o browser só vê `seudominio.com/api/e/ingest`. Regras: nomes neutros em **todas** as rotas públicas do hub (nada de `track`, `tracking`, `analytics`, `pixel`); o hub lê `client_ip_address` do primeiro IP de `x-forwarded-for` e `client_user_agent` do header repassado (senão o EMQ degrada pra 100% do tráfego, não só quem tem blocker). CORS no hub restrito à allowlist de origens do projeto, apenas como fallback documentado.

**Se o hub cair:** o Pixel continua disparando direto pra Meta (client-side); só o espelho CAPI e a gravação no Supabase param. Purchase via webhook é o único caminho que precisa de retry (§7.4).

---

## 4. Identidade, sessão e `event_id`

### 4.1 Identidade
- **`anon_id`** — uuid em `localStorage`, nunca rotaciona. É a chave canônica de **pessoa** (mesmo browser = mesma pessoa). Limitação aceita: cross-device e limpeza de storage não são resolvíveis pré-compra.
- **`session_id`** — uuid em `sessionStorage` (nova por aba/retorno). Sem timeout de 30 min no MVP.
- **Lead que volta no dia seguinte:** cai numa sessão nova sem fbclid/UTM. Por isso o SDK lê `_fbc`/`_fbp` dos cookies em **todo** pageload (não só quando há fbclid) e o upsert de `sessions` grava fbc/fbp mesmo em visita direta. No Purchase, `fbc = COALESCE(fbc da sessão casada, fbc não-nulo mais recente ≤ 7 dias entre as sessões daquele anon_id)`.

### 4.2 Captura na primeira página (write-once na criação da sessão)
Allowlist explícita: `utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, campaign_id, adset_id, ad_id, placement`. Upserts posteriores **não** sobrescrevem com NULL.

`_fbc` ausente mas `?fbclid=` presente → SDK reconstrói `fb.1.{now_ms}.{fbclid}` (fbclid case-sensitive, intocado) e persiste em cookie first-party 90 dias.

**Dependência operacional (Fase 0b):** os anúncios precisam de URL Parameters no nível do anúncio:
`utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}`
(IDs numéricos sobrevivem a renomeação; nunca adicionar `fbclid` manualmente.)

### 4.3 `event_id` determinístico
`event_id = uuidv5(NAMESPACE, "{scope_id}:{event_name}:{step_ref}")`

| Evento | scope_id | step_ref |
|---|---|---|
| `quiz_complete` → Lead | `anon_id` | — (mata o duplo Lead do retorno no dia seguinte dentro da janela de 48h) |
| `checkout_click` → InitiateCheckout | `session_id` | — |
| `vsl_milestone` → ViewContent | `session_id` | `{vsl_id}_{pct}` |
| `quiz_answer`, `quiz_step_view` | `session_id` | `step_id` |
| heartbeat de vídeo | `session_id` | `{vsl_id}_{bucket_10s}` |
| **Purchase** (webhook) | — | `uuidv5(NAMESPACE, "purchase:{kiwify_order_id}")` |

Consequências: Pixel e CAPI deduplicam entre si; re-mount/reload/back-nav re-emitem o mesmo id e a Meta (48h) + `events.event_id UNIQUE` absorvem; retries do webhook não duplicam Purchase. O SDK mantém um `Set` em memória só pra não spammar o hub dentro do mesmo mount — não é camada de correção.

### 4.4 `event_time`
- Funil: SDK envia `occurred_at` do cliente. Hub usa esse valor se `|occurred_at − now| ≤ 10 min`, senão o horário de recebimento. Em retry, usa **sempre** o timestamp persistido, nunca `now()`.
- Purchase: `event_time = approved_at` do payload Kiwify se presente e ≤ recebimento; senão, recebimento do webhook. **Nunca** o timestamp da sessão. Aprovação > 7 dias após o clique é enviada normalmente (válida pro Graph API; pode cair fora da janela de atribuição — esperado, não bug).
- Purchase vai em request próprio, nunca batcheado (batch é tudo-ou-nada).

---

## 5. Contrato de evento e tabela canônica

### 5.1 O que o SDK manda ao hub
```
{ project, anon_id, session_id, event_id, internal_name, meta_event_name | null,
  occurred_at, metadata (allowlist por evento), page_url, consent_version | null }
```
O SDK **nunca** envia `step_order` (o hub resolve pelo mapeamento do projeto). O SDK **nunca** envia Purchase.

### 5.2 Tabela canônica (quiz-app) — vive numa constante `EVENT_MAP` no SDK; o hub tem cópia como allowlist e rejeita mismatch (grava no Supabase, **não** dispara CAPI, loga warning)

| Interno | Meta | Notas |
|---|---|---|
| `landing_view` | PageView (só Pixel, disparo automático do init; sem espelho CAPI) | |
| `consent_view`, `consent_accept` | — | `metadata.policy_version` |
| `landing_cta_click` | — | fronteira "sessão humana confirmada" no dashboard |
| `quiz_start` | — | once-per-session |
| `quiz_step_view` | — | **novo**; `{step_id, step_order}`; cobre loaders invisíveis hoje |
| `quiz_answer` | — | `metadata = {step_id}` apenas — **sem valores** (§11) |
| `quiz_complete` | **Lead** | dispara no **submit do `nombre`** (última pergunta), não após a VSL2 |
| `vsl_view` | — | renomeado do atual `vsl_play` (dispara no mount) |
| `vsl_play` | — | **novo**: primeiro `onPlay` real, guarda por mount |
| `vsl_milestone` | **ViewContent** | `content_name = "vsl{1|2}_{25|50|75|100}"` — nomes genéricos, nunca termos de saúde |
| `vsl_heartbeat` | — | a cada ~10 s tocados (visibility-gated) |
| `vsl_cta_reveal`, `vsl_cta_click` | — | com `resumeKey`; **nunca** InitiateCheckout (VSL1 fica no meio do quiz) |
| `vsl_error`, `vsl_continue_without_video` | — | **novos**; `{src, code}` |
| `imc_view`, `projection_view`, `result_view` | — | **proibidos** de virar evento Meta (vazariam contexto de saúde). `result_view` some (redundante com `offer_view`) |
| `offer_view` | — | once-per-session |
| `checkout_click` | **InitiateCheckout** | **somente** ele |
| `email_view/submit/skip` | — | só se o passo de email entrar (§15) |
| *(webhook)* `compra_aprovada` | **Purchase** | `value`, `currency: 'MXN'` |
| *(webhook)* demais eventos Kiwify | — | Supabase-only (§7.5) |

Regra de manutenção: evento novo nasce com `meta_event_name = null`; promover exige editar a tabela nos dois lados no mesmo PR.

### 5.3 `user_data` por evento
| Campo | Hash | Fonte |
|---|---|---|
| `em`, `ph`, `fn`, `ln` | SHA-256 (lowercase/trim; telefone E.164, default `+52` se sem DDI) | **Purchase:** `Customer` do webhook Kiwify. **Funil:** só se o passo de email existir |
| `fbc`, `fbp` | nunca | cookies / reconstrução; no Purchase, da sessão casada |
| `client_ip_address`, `client_user_agent` | nunca | request do ingest (via `x-forwarded-for`). No Purchase, da **sessão** — nunca do request do webhook (é o servidor da Kiwify) |
| `external_id` | SHA-256 | `anon_id` |

### 5.4 Once-per-session
`quiz_start, quiz_complete, offer_view, vsl_view (por resumeKey), vsl_play (por resumeKey), consent_accept` — garantido por `event_id` determinístico + UNIQUE; **e** corrigido na origem: mover emissões dos `useEffect[currentIndex]` (QuizFunnel.tsx) pros handlers de transição reais.

### 5.5 Escada de otimização por volume (nota pro Ads Manager)
Hoje: otimizar em **Lead**. Quando InitiateCheckout passar de ~30-50/semana: migrar. Purchase só com volume real. Abaixo de ~50 eventos/semana a campanha fica em learning de qualquer forma.

---

## 6. Ingest — `POST /api/ingest`

Ordem do handler:
1. Resolve `project` contra o map em código (`src/config/projects.ts`); slug desconhecido → 400.
2. Checa `Origin`/`Referer` contra `allowed_origins` do projeto (camada anti-abuso casual; spoofável, documentado).
3. Valida body com zod (shape fixo) + `internal_name` na allowlist do projeto + par `(internal_name, meta_event_name)` bate com a tabela. **Rejeita Purchase.**
4. **Strip de metadata** por allowlist de chaves por evento (defesa em profundidade contra SDK desatualizado — nenhum valor de saúde entra).
5. `is_bot` = regex de UA (`bot|crawler|spider|preview|headless|facebookexternalhit|meta-externalagent|whatsapp|telegrambot|slurp|bingpreview`). Grava normalmente (auditoria), **suprime CAPI**.
6. `INSERT INTO events ... ON CONFLICT (event_id) DO NOTHING RETURNING id` — resolve `step_order` pelo map do projeto.
7. Upsert `sessions` (GREATEST em `furthest_step`; last-touch em `client_ip`/`client_user_agent`; write-once nos campos de atribuição).
8. Se o insert retornou linha **e** `meta_event_name` não é null **e** não é bot **e** dataset não está bloqueado (§11.4): dispara CAPI (1 evento por request). Marca `capi_status = sent | failed` (+ `capi_error`, `fbtrace_id`). **Sem retry** pra eventos espelhados (o Pixel já entregou; retentar exigiria gerir a janela de 48h pra ganho marginal).
9. Responde 200 (também em conflito — POST idempotente, SDK pode retentar em rede móvel).

Guardas no SDK: não emitir durante `document.prerendering`; ignorar `pageshow` com `persisted=true` pra eventos `*_view`.

Circuit breaker de volume (Fase 1, query barata): se eventos/hora de um projeto exceder N× a média móvel, pausar dispatch CAPI daquele projeto e sinalizar no dashboard. Rate limit por IP (Upstash Ratelimit) fica **opcional** — só se aparecer abuso.

---

## 7. Checkout Kiwify

### 7.1 Propagação (Fase 0a — obrigatório, o webhook depende disso)
`buildCheckoutUrl()` passa a injetar: `s1 = session_id`, `s2 = anon_id`, `s3 = fbc`, `sck = fbp`, mais os `utm_*` e `campaign_id/adset_id/ad_id` capturados. **Validar na compra de teste** que s2/s3/sck voltam como s1.

### 7.2 Fonte de verdade do Purchase (resolve a contradição entre revisores)
- **Fase 0b:** auditar no painel Kiwify (conta e produto) se há Pixel/CAPI nativo ligado neste pixel ID e **quais** eventos dispara. **Decisão pendente do Eduardo (§15-A):** ligar o Purchase nativo da Kiwify como sinal **interino** até a Fase 2 (recomendado — sem duplicação, pois o hub ainda não emite Purchase; **nunca** habilitar o InitiateCheckout da Kiwify, que duplicaria o do quiz-app).
- **Fase 2, na compra de teste:** anotar o `event_id` do Purchase nativo no Test Events. Se for derivado do `order_id` (replicável) → o hub usa o mesmo e as duas camadas coexistem com dedup real. Se for opaco → **desligar o nativo no mesmo dia** em que o Purchase do hub validar. Registrar a data (marco na série do Events Manager).
- Critério de aceite permanente: **exatamente 1 Purchase por compra** no Test Events, conferido por `event_id`.

### 7.3 Handler — `POST /api/hooks/[project]/kiwify` (todos os eventos Kiwify no mesmo endpoint)
1. Valida token (env `KIWIFY_SECRET_<PROJECT>`); inválido → 401.
2. `INSERT INTO webhook_events (raw, order_id, event_type, ...) ON CONFLICT (order_id, event_type) DO NOTHING` — **UNIQUE composto**, nunca só `order_id` (o mesmo pedido emite `pix_gerado → compra_aprovada → compra_reembolsada`). `carrinho_abandonado` pode não ter `order_id` → chave fallback `sha256(payload)`.
3. Conflito → 200 e fim (retry da Kiwify).
4. Ramifica por `event_type` (§7.5): upsert em `orders`, atualiza `sessions`.
5. **Só `compra_aprovada` e `orders.capi_purchase_sent_at IS NULL`:** matching (§7.4) → monta Purchase → chama Graph API **sincronamente** com 2 tentativas (backoff 1 s; Graph responde em centenas de ms, cabe no timeout) → `capi_status = sent | failed`, `capi_purchase_sent_at` só após 2xx.
6. Responde **200 sempre** (política de retry da Kiwify não é documentada; a idempotência já protege).

### 7.4 Matching em 3 níveis (nunca segurar o Purchase)
1. `tracking.s1` do payload → sessão. `match_type = 's1'`.
2. s1 ausente → `GET https://public-api.kiwify.com/v1/sales/{order_id}` e ler `tracking.s1/s2/s3/sck`. `match_type = 'sales_api'`. (Rebaixa a incerteza #1 de bloqueador pra detalhe.)
3. Nada casou → dispara **mesmo assim** com `em/ph/fn/ln` do `Customer` (+ `fbc` de `s3`/`fbp` de `sck` se vieram na URL), **sem** IP/UA. `match_type = 'unattributed'`. Taxa exposta no dashboard.

Fingerprint IP+UA+janela: **fora** (CGNAT móvel mexicano); só se `unattributed` > 20-30%.

Retry assíncrono: `GET /api/cron/capi-retry` 1×/dia (Vercel Hobby) varrendo `orders.capi_status = 'failed'`, com `event_time` original persistido. Card "Purchases pendentes de CAPI" + botão de reenvio manual no dashboard.

### 7.5 Ciclo de vida (assinar **todos** os gatilhos no painel)
| Evento Kiwify | Efeito | Meta |
|---|---|---|
| `compra_aprovada` | `orders.status = approved`, `sessions.purchase_status`, `furthest_step = purchase` | **Purchase** |
| `carrinho_abandonado` | `furthest_step = checkout_abandoned` (semântica: digitou email e não pagou); grava email do abandonador na sessão (cru só no Supabase) | — |
| `compra_recusada` | `furthest_step = payment_refused` — hipótese prioritária pros "80 cliques / 0 vendas" (recusa cross-border) | — |
| `pix_gerado`, `boleto_gerado` | grava; provavelmente inertes pra MX (cartão/OXXO/SPEI — nomes reais a confirmar) | — (AddPaymentInfo é sub-etapa opcional depois de confirmar) |
| `compra_reembolsada`, `chargeback` | `orders.status`, `refunded_at`; sessão deriva | — (D9) |

Não existe "checkout_arrived": nenhum webhook sinaliza mera chegada. Diagnóstico "redirect quebrou vs. desistiu" = comparar InitiateCheckout (Meta) com visitas ao checkout no painel Kiwify, manualmente.

---

## 8. Watch-time das VSLs

Hook `useVideoWatchTracking({ videoId: 'vsl1' | 'vsl2', ... })` generalizando o `GatedVSL`:

- **Três sinais:** `played` TimeRanges (unique-seconds, imune a seek) · high-water-mark (já existe como `maxWatchedRef`) · engaged seconds (`!paused && !document.hidden`, via Page Visibility — nunca `setInterval` livre).
- **Emissão:** milestone 25/50/75/100 uma vez cada (Set) + heartbeat a cada ~10 s tocados + flush final em `visibilitychange → hidden` (fallback `pagehide`; **nunca** `beforeunload`) via `sendBeacon` com corpo `text/plain` (sem preflight); fallback `fetch(keepalive)`.
- **Mobile:** detectar rejeição da Promise de `play()` como `vsl_autoplay_blocked` (senão sessões mobile parecem "0% assistido").
- **VSL1 vs VSL2 (regra derivada, no contrato):** VSL1 é gate obrigatório com `preventSkip` — quem passa assistiu ~100% por construção; seu sinal útil é o **drop-off durante** o vídeo (diagnóstico de criativo). **Custom Audiences e seeds de Lookalike usam somente `vsl2_75`, `vsl2_100`, `vsl_cta_reveal(vsl2)`, InitiateCheckout e Purchase. Eventos da VSL1 nunca semeiam audience.** Lookalike só com ≥100 eventos `vsl2_75+`.
- Público "Video Engagement" nativo da Meta **não funciona** pra `<video>` self-hosted — a via manual (ViewContent por milestone → Website Custom Audience) é obrigatória.
- Dashboard (Fase 3): curva de abandono por segundo **por VSL** (`% de sessões com max_watched ≥ s`, derivado de `video_watch`). Buckets por segundo (`video_watch_buckets`) ficam no backlog, condicionados a seek livre + volume.

---

## 9. Schema Supabase

Convenções: toda tabela tem `project_id text NOT NULL`; todo timestamp é `timestamptz`; RLS **ligado em todas** com **zero policies** (deny-all pra anon/authenticated; hub usa `service_role` só server-side; nenhuma env `SUPABASE_*` com `NEXT_PUBLIC_` no hub; nenhum app-cliente recebe anon key).

```sql
-- config de projeto vive em código (src/config/projects.ts), não no banco:
-- { slug, meta_pixel_id, capi_token_env, kiwify_secret_env, allowed_origins[],
--   ad_account_timezone (IANA, ex. 'America/Mexico_City'), funnel_steps[] }

create table sessions (
  session_id uuid primary key,
  project_id text not null,
  anon_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  furthest_step int not null default 0,
  furthest_event text,
  -- atribuição (write-once)
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  fbclid text, fbc text, fbp text,
  meta_campaign_id text, meta_adset_id text, meta_ad_id text, placement text,
  landing_url text,
  -- matching (last-touch)
  client_ip inet, client_user_agent text,
  -- contato (só se o passo de email existir / abandono de carrinho)
  email text, email_sha256 text,
  -- compra (cache derivado de orders)
  purchase_status text check (purchase_status in ('approved','refunded','chargeback')),
  is_bot boolean not null default false,
  consent_version text, consent_at timestamptz
);
create index on sessions (project_id, furthest_step);
create index on sessions (anon_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  event_id uuid not null unique,          -- o mesmo do fbq/CAPI
  session_id uuid not null,
  anon_id uuid not null,
  internal_name text not null,
  meta_event_name text,
  step_order int,                          -- cache derivado do map do projeto
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}',    -- pós-strip (sem valores de saúde)
  is_bot boolean not null default false,
  capi_status text check (capi_status in ('sent','failed','skipped')),
  capi_error text, fbtrace_id text,
  created_at timestamptz not null default now()
);
create index on events (session_id, occurred_at);
create index on events (project_id, internal_name, occurred_at);

create table video_watch (
  project_id text not null,
  session_id uuid not null,
  video_id text not null,                  -- 'vsl1' | 'vsl2'
  max_watched_seconds numeric not null default 0,
  engaged_seconds numeric not null default 0,
  unique_seconds numeric not null default 0,
  duration_seconds numeric,
  updated_at timestamptz not null default now(),
  primary key (session_id, video_id)
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  provider text not null default 'kiwify',
  event_type text not null,
  order_id text,                           -- null em carrinho_abandonado
  dedupe_key text not null,                -- order_id ou sha256(payload)
  raw jsonb not null,
  received_at timestamptz not null default now(),
  unique (project_id, dedupe_key, event_type)
);

create table orders (
  order_id text primary key,               -- kiwify order id
  project_id text not null,
  session_id uuid, anon_id uuid,           -- null quando unattributed
  match_type text check (match_type in ('s1','sales_api','unattributed')),
  status text not null check (status in ('approved','refunded','chargeback')),
  value numeric, currency text not null default 'MXN',
  approved_at timestamptz, refunded_at timestamptz,
  customer_email_sha256 text,
  capi_status text check (capi_status in ('pending','sent','failed')),
  capi_attempts int not null default 0, capi_last_error text, capi_purchase_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null, anon_id uuid not null, session_id uuid,
  accepted_at timestamptz not null, policy_version text not null, user_agent text
);

-- Fase 4
-- ad_spend(project_id, date, campaign_id, adset_id, ad_id, spend, impressions, clicks,
--          currency, synced_at, unique(project_id, date, ad_id))
-- cron re-busca janela retroativa de 3-7 dias com upsert (a Meta reprocessa spend recente).
```

Regras derivadas:
- `events.step_order` e `sessions.furthest_step` são **caches** recomputáveis a partir de `internal_name` + map do projeto. Mudança de funil = atualizar o map + backfill. Sem `funnel_version` por ora.
- `sessions.email` cru só existe pra recuperação e matching; pra Meta sai só o hash.
- Retenção: `client_ip`/`client_user_agent` expurgados junto com sessões > 90 dias (IP é dado pessoal).
- Agregações "por dia" usam `(occurred_at AT TIME ZONE ad_account_timezone)::date` — evita três "dias" diferentes (UTC / BR / MX).

---

## 10. Dashboard — `/dashboard/[project]`

- **Auth:** Basic Auth no middleware (credencial em env). Supabase Auth só na Fase 4.
- **Dados:** só via route handlers/RSC com `service_role`. Polling 5-15 s. Realtime é v2.
- **Funil principal:** por **pessoa** (`COUNT(DISTINCT anon_id)` por step, `MAX(furthest_step)` entre sessões), overall e relativo ao step anterior; filtro `is_bot = false` (toggle); segmentação por `meta_ad_id`/`meta_adset_id`/`meta_campaign_id` e por `utm_content`. Steps incluem `checkout_abandoned`, `payment_refused`, `purchase`.
- **Drill-down nível 1:** clique no step → lista de sessões do bucket.
- **Drill-down nível 2:** `/dashboard/[project]/sessions/[session_id]` — cabeçalho da sessão + timeline de `events` ordenada por `occurred_at` com metadata pretty-printed (renderer genérico; formatação leve pra `quiz_answer` e milestones se couber).
- **Vídeo (Fase 3):** curva de abandono por VSL.
- **Cards operacionais:** CAPI `failed` nas últimas 24 h · Purchases pendentes de reenvio (+ botão) · taxa `unattributed` · receita bruta e líquida (+ nº de refunds) · "conversões Meta vs CAPI interno" lado a lado (variância residual de 20-40% é normal; janela default last-click 7 dias).
- **Gráficos:** Recharts (`FunnelChart`; Sankey só se o quiz ganhar branches).

---

## 11. Compliance (LGPD + LFPDPPP + Termos da Meta)

### 11.1 Consentimento expresso — **Fase 0a, bloqueante pra rodar tráfego**
A primeira tela do quiz (`deseo`) já é dado de saúde. LFPDPPP (Art. 3-VI, Art. 8) exige consentimento expresso **antes** da coleta. Solução sem tela extra: no card do age-gate em `LandingGate.tsx`, checkbox **não pré-marcado**:
> *Acepto el tratamiento de mis datos, incluidos datos de salud (peso, estatura, objetivo), para generar mi plan — [Aviso de Privacidad]*

Botão "Sí, continuar" desabilitado até marcar. Eventos `consent_view`/`consent_accept` com `policy_version`. Fase 0: aceite em `localStorage` (`accepted_at`, `policy_version`). Fase 1: persistido em `consents`; o SDK só envia eventos com conteúdo de quiz se houver consentimento na sessão.

Atualizar `/privacy` pra nomear explicitamente: dados sensíveis (estado de salud), armazenamento em Supabase, remisión a Meta de dados hasheados, coleta de IP/user-agent pra mensuração, retenção. **Não fazer:** CMP de terceiros, double opt-in, finalidades múltiplas.

### 11.2 Minimização (padrão)
`quiz_answer` grava `{step_id}` — **sem** peso/estatura/dor/área. Strip server-side por allowlist. Com 80 cliques/dia não há poder estatístico pra segmentar por resposta; o funil por step fica 100% preservado. Persistir valores é **decisão do Eduardo (§15-C)**; se sim, só pra sessões com `consent_at` e com retenção curta.

### 11.3 Nomenclatura
Nenhum termo de saúde (`imc`, `peso`, `metabolico`, `adelgazar`) em nomes de evento, `content_name`, paths ou query strings que cheguem à Meta. Copy do site público **não** muda nesta fase.

### 11.4 Restrição "Health and Wellness" — gate da Fase 0b (sequencial, não paralelo)
Eduardo checa Events Manager → Data Sources → restrições do dataset **antes** de escrever o mapeamento Meta.
- **Sem restrição:** segue.
- **Restrito (qualquer nível):** abrir a revisão/apelação **no mesmo dia**; revisitar semanalmente.
- **Leve** (params/URL removidos): `content_name` não chega à Meta; granularidade de milestone vive só no Supabase; ViewContent agregado. Uma nota, zero código.
- **Moderado** (eventos padrão bloqueados): pausa **só** o trabalho Pixel/CAPI. Fases 1-2 (hub, Supabase, dashboard, webhook) **seguem** — viram a única fonte de verdade enquanto a apelação corre.
- Diagnóstico corrigido: os "80 cliques / 0 conversões" de hoje são explicados pelo stub no-op; a checagem diz se há um segundo problema por cima.

### 11.5 Transferência internacional
Hashes via CAPI Brasil→EUA: desde 23/08/2025 exige Cláusulas-Padrão Contratuais (Res. ANPD 19/2024). Não confirmado se os termos da Meta já incorporam o modelo — **validar com jurídico**, fora do escopo de engenharia.

---

## 12. Segurança
- RLS deny-all + `service_role` server-side only (§9).
- Segredos em env: `META_CAPI_TOKEN_<PROJECT>` (System User, escopo mínimo, só o pixel necessário; rotação = novo token + trocar env + redeploy), `KIWIFY_SECRET_<PROJECT>`, `KIWIFY_API_KEY_<PROJECT>`, `META_TEST_EVENT_CODE` (só durante QA), `DASHBOARD_BASIC_AUTH`, `SUPABASE_SERVICE_ROLE_KEY`.
- `project_key` no SDK é identificador público de roteamento, **não** auth.
- Webhook Kiwify é a **única** via de escrita de compra.

---

## 13. Fases revisadas

### Fase 0a — código no quiz-app (hoje, ~meio dia)
1. Meta Pixel no `layout.tsx` (`NEXT_PUBLIC_META_PIXEL_ID`), com `eventID` em todo `track`.
2. Route handler `POST /api/e/capi` **no próprio quiz-app** (same-origin) espelhando Lead/ViewContent/InitiateCheckout via `facebook-nodejs-business-sdk`, com `test_event_code` por env. Este handler **é** o embrião do hub — mesma tabela `EVENT_MAP`, mesmo payload builder tipado (allowlist), migra pro hub na Fase 1 sem mudança de contrato.
3. SDK embrionário em `src/lib/tracking/`: `anon_id`/`session_id`, captura de URL (allowlist §4.2 — estende `KNOWN_UTM_KEYS`), `fbc`/`fbp`, `event_id` determinístico, `EVENT_MAP`, guarda once-per-session.
4. `buildCheckoutUrl`: injetar `s1/s2/s3/sck` (§7.1).
5. Correções de origem: Lead no submit do `nombre`; InitiateCheckout só em `checkout_click`; emissões saem dos `useEffect[currentIndex]`; `vsl_view` vs `vsl_play` (onPlay); `vsl_error`; `quiz_step_view`; `result_view` some.
6. Checkbox de consentimento no `LandingGate` + `/privacy` atualizada (§11.1).
7. QA: ligar `META_TEST_EVENT_CODE`, confirmar no Test Events que cada par browser+servidor aparece como **uma** linha ("Deduplicated"); logar `events_received` e `fbtrace_id`; desligar a env.

### Fase 0b — configuração (Eduardo, hoje, em paralelo com 0a — mas **antes** de ligar o CAPI)
1. Events Manager: restrição Health and Wellness (§11.4) e status do AEM.
2. Events Manager: partner integrations — existe integração Kiwify ligada neste pixel? Inventariar.
3. Painel Kiwify: pixel nativo — decidir §15-A.
4. Anúncios: URL Parameters no nível do anúncio (§4.2). Pode mandar pra re-revisão breve — irrelevante com 80 cliques.
5. Gerar token de System User (escopo mínimo) e `test_event_code`.
6. Kiwify: gerar API key (pra Sales API) e anotar quais meios de pagamento o checkout exibe pra comprador mexicano.

### Fase 1 — hub + Supabase + dashboard (1-3 dias)
Schema §9 (com `capi_status`, `project_id`, `video_watch`, `webhook_events`, `orders`, `consents` já na migração inicial), `POST /api/ingest` (§6), rewrite first-party no quiz-app, dashboard básico + drill-down 2 níveis + cards operacionais, Basic Auth, `consents` persistido. O `/api/e/capi` da Fase 0a vira chamada ao hub. Cláusula de escape: se a Fase 1 escorregar além de ~3 dias, criar o Supabase com `sessions` mínima e insert fire-and-forget já na Fase 0.

### Fase 2 — webhook Kiwify + Purchase real
Handler §7.3, matching §7.4, ciclo de vida §7.5, cron de retry, backfill das vendas do período Fase 0-1 via Sales API (casando por `s1`). **Começa com a compra de teste (§14).** Troca de bastão do Purchase (§7.2).

### Fase 3 — watch-time
Hook §8, `video_watch`, milestones → ViewContent, curva de abandono por VSL no dashboard, `vsl_autoplay_blocked`.

### Fase 4 — multi-projeto e custo
Extrair `@eduardo/tracking-sdk` como pacote; plugar Zoioz/PepDose/Conatex (config no map + rewrite + envs); `ad_spend` + cron Ads Insights (janela retroativa 3-7 dias, upsert); ROAS por criativo; promover `funnel_steps`/`projects` a tabela **só se** surgir necessidade de adicionar projeto sem deploy; Supabase Auth se o dashboard virar multiusuário.

Backlog explícito: passo de email no quiz (§15-B); `video_watch_buckets`; fingerprint IP+UA; AddPaymentInfo pra "pagamento gerado"; Realtime; Sankey; rate limit Upstash; custom event `VSL2_CTA` pra audience.

---

## 14. Compra de teste (gate de entrada da Fase 2) — 5 asserções + reembolso
Checkout com `?s1=<uuid>&s2=<uuid>&s3=fb.1.<ts>.<fbclid-fake>&sck=fb.1.<ts>.<rand>` e `META_TEST_EVENT_CODE` ligado:
1. `s1/s2/s3/sck/utm_*` presentes e íntegros no payload cru de `compra_aprovada`; se ausentes → confirmar que `GET /v1/sales/{id}` os devolve (nível 2 vira caminho dominante).
2. `curl` com token errado → 401.
3. Replay manual do payload 2× → Events Manager mostra **1** Purchase, `currency = MXN`, valor correto (inspecionar `Commissions` pra decidir bruto vs líquido — §15-D), decimal vs centavos.
4. Se o Purchase nativo da Kiwify estiver ligado: anotar seu `event_id` (§7.2).
5. Anotar formato real de `Customer.email/mobile` (hash/E.164).
6. **Reembolsar** a compra → `compra_reembolsada` chega, é gravada como evento distinto (valida UNIQUE composto), `orders.status = refunded`, nenhum Purchase novo.
Também: confirmar quais `event_type` disparam pra cartão/OXXO/SPEI e se `carrinho_abandonado` traz email e `s1`.

---

## 15. Decisões tomadas pelo Eduardo (2026-08-24)

| # | Decisão | Resolução |
|---|---|---|
| **A** | Purchase nativo da Kiwify como sinal interino? | **SIM.** Ligar no painel Kiwify **só** o Purchase (nunca InitiateCheckout) nas Fases 0-1. Desligar na Fase 2 no mesmo dia em que o Purchase via webhook validar (ou manter se o `event_id` da Kiwify for derivado do `order_id` — §7.2). |
| **B** | Passo opcional de email no quiz? | **Fase 1.5 como experimento**, não pré-requisito. Tela "¿A dónde te envío tu plan, {nombre}?" + "Continuar sin correo" entre `nombre` e o loader; medir skip-rate 1-2 semanas antes de tornar obrigatório. |
| **C** | Persistir valores de saúde no Supabase? | **NÃO.** `quiz_answer` grava só `{step_id}`; strip server-side por allowlist. |
| **D** | `value` do Purchase | **Bruto** (VBO). Dashboard mostra líquido. Confirmar formato no objeto `Commissions` na compra de teste. |
| **E** | Otimização da campanha | **Lead** (= submit do `nombre`) até InitiateCheckout atingir ~30-50/semana; depois migrar. |
| **F** | Domínio do hub | Neutro, sem "track"/"analytics"/"pixel" no hostname ou nas rotas. Nome exato definido na Fase 1 (Eduardo escolhe o domínio disponível). |

---

## 16. Incertezas restantes
1. Payload do webhook Kiwify traz `tracking`? (resolvido operacionalmente pelo nível 2 do matching; confirmado na compra de teste)
2. Slots `s2/s3/sck` voltam como `s1`? (compra de teste)
3. Nomes reais dos eventos de "pagamento gerado" pra OXXO/SPEI (compra de teste)
4. Formato/derivação do `event_id` do Purchase nativo da Kiwify (compra de teste)
5. Teto AEM de 8 eventos ainda vale pra esta conta? (Fase 0b)
6. Classificação Health and Wellness do domínio (Fase 0b)
7. Termos da Meta cobrem as CPCs da ANPD? (jurídico)
