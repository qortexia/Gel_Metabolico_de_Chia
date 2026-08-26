# Fase 1 — tracking-hub (Supabase + ingest + dashboard) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir o hub central (`qx-hub`) que recebe **todos** os eventos do quiz-app, grava cada sessão/evento no Supabase, espelha Lead/InitiateCheckout pra Meta (assumindo o CAPI que hoje vive no quiz-app) e mostra um dashboard de funil por pessoa com drill-down até a timeline de cada lead — e plugar o quiz-app nele via rewrite first-party.

**Architecture:** Novo app Next.js 15 (App Router, Node runtime) em repositório próprio. `POST /api/ingest` valida (zod + allowlists por projeto), classifica bot, resolve `step_order` pelo funil do projeto, faz `INSERT ... ON CONFLICT (event_id) DO NOTHING` em `events`, upsert em `sessions` (atribuição write-once, `furthest_step` com GREATEST), persiste `consents`, e despacha CAPI só quando o insert retornou linha e o evento é mapeado. Dashboard server-side atrás de Basic Auth, lendo o banco por route handlers (polling 10 s). Config de projeto vive em código (`src/config/projects.ts`); segredos em env vars. Banco acessado com `postgres.js` (`sql.unsafe` + parâmetros) atrás de uma interface `Db` fina, o que permite testar a camada de persistência com um fake que captura SQL/params. Migrações são arquivos SQL aplicados por `scripts/migrate.ts`.

**Tech Stack:** Next.js 15 · React 19 · TypeScript 5 · Tailwind 3 · Vitest 2 + Testing Library · zod 3 · postgres (postgres.js) 3 · recharts 2 · uuid 11 · tsx (migrations) · Supabase (Postgres) · Vercel.

**Spec:** `docs/superpowers/specs/2026-08-24-tracking-hub-design.md` — §3 (arquitetura/rewrite), §4 (identidade), §5.1 (contrato), §6 (ingest), §9 (schema), §10 (dashboard), §11.1-11.2 (consent/minimização), §12 (segurança), §13 Fase 1.

## Global Constraints

- **Rulings deste plano (spec deixou em aberto):** hub = repo `qortexia/qx-hub` (privado), pasta `h:/Second_Brain/03-Dev/Projetos_Pessoal/qx-hub`, projeto Vercel `qx-hub`; Supabase região `us-east-1`; nomes de rota públicos neutros: `/api/ingest`, `/api/hooks/*`, `/api/cron/*`, `/api/dash/*`, `/dashboard/*` — nunca `track`, `tracking`, `analytics`, `pixel`.
- Contrato do ingest (o que o SDK manda) = spec §5.1 **+** `attribution` e `event_source_url`:
  `{ project, anon_id, session_id, event_id, internal_name, meta_event_name|null, occurred_at, event_source_url, metadata, consent_version|null, fbc|null, fbp|null, custom_data?, attribution: { utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, fbclid?, campaign_id?, adset_id?, ad_id?, placement? } }`.
- O hub **nunca traduz** evento interno → Meta; só valida o par `(internal_name, meta_event_name)` contra a tabela do projeto. Mismatch ou nome fora da allowlist → grava, **não** despacha CAPI, loga warning. `Purchase` no ingest → 400.
- `metadata` é **stripada** por allowlist de chaves por evento (mesma tabela do SDK). Nenhum valor de resposta/saúde entra no banco.
- `event_id` UNIQUE em `events`; `INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING id`; CAPI só se retornou linha. Eventos espelhados **sem retry**.
- `sessions`: atribuição write-once (`coalesce(sessions.x, excluded.x)`), `fbc/fbp` último não-nulo (`coalesce(excluded.x, sessions.x)`), `client_ip/user_agent` last-touch, `furthest_step = greatest(...)`, `is_bot = sessions.is_bot or excluded.is_bot`.
- `client_ip_address` = primeiro IP de `x-forwarded-for`; `client_user_agent` = header `user-agent`. Bot = regex `/bot|crawler|spider|preview|headless|facebookexternalhit|meta-externalagent|whatsapp|telegrambot|slurp|bingpreview/i` → `is_bot=true`, grava, **não** despacha CAPI.
- `Origin`/`Referer` (quando presentes) devem pertencer a `allowed_origins` do projeto → senão 403. Ausência de ambos é permitida.
- `event_time` CAPI = `occurred_at` do cliente se `|occurred_at − now| ≤ 10 min`, senão `now`. `action_source: 'website'`. `external_id = sha256(anon_id)`. `fbc/fbp/ip/ua` nunca hasheados. `currency` só com `value` finito.
- RLS **ligado em todas as tabelas, zero policies**. O hub conecta com `DATABASE_URL` (pooler transaction mode, `prepare: false`); migrações usam `DIRECT_URL` (pooler session mode). Nenhuma env `NEXT_PUBLIC_SUPABASE_*`; nenhuma anon key em lugar nenhum.
- Segredos só em env: `META_CAPI_TOKEN_CHIA`, `META_TEST_EVENT_CODE_CHIA` (só QA), `DATABASE_URL`, `DIRECT_URL`, `DASHBOARD_BASIC_AUTH` (`usuario:senha`). Nunca commitar `.env*`.
- Dashboard: funil **por pessoa** (`DISTINCT anon_id`, `MAX(furthest_step)`), filtro `is_bot = false` por padrão, drill-down nível 1 (sessões do step) e nível 2 (timeline da sessão), card "CAPI failed 24 h". Agregação por dia usa `ad_account_timezone` do projeto (`America/Mexico_City`).
- Testes: descrições em português; unitários com `FakeDb` (captura SQL/params); testes de integração com banco real só rodam se `TEST_DATABASE_URL` estiver definido (senão `skip`).
- quiz-app após a integração: `next.config.js` com rewrite `/api/e/:path*` → `${HUB_URL}/api/:path*`; provider posta **todos** os eventos em `/api/e/ingest`; rota `/api/e/capi` e `src/lib/tracking/server/` removidas; envs `META_CAPI_ACCESS_TOKEN`/`META_TEST_EVENT_CODE`/`META_GRAPH_VERSION` removidas do quiz-app (o Pixel ID continua).
- Branches: hub em `main` desde o início (repo novo, sem produção) com commits pequenos; quiz-app em `feat/tracking-fase-1-hub`.

---

## File Structure (qx-hub)

```
qx-hub/
├─ package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js, vitest.config.ts, vitest.setup.ts
├─ .env.example, .gitignore
├─ supabase/migrations/0001_init.sql
├─ scripts/migrate.ts
├─ src/
│  ├─ middleware.ts                       Basic Auth em /dashboard e /api/dash
│  ├─ config/projects.ts                  map de projetos (chia): pixel, envs, origens, timezone, funil, allowlists
│  ├─ lib/db.ts                           interface Db + cliente postgres.js (lazy)
│  ├─ lib/ingest/schema.ts                zod do payload + tipos
│  ├─ lib/ingest/classify.ts              isBot, originAllowed, resolveStep, pickMetadata, checkMetaMapping
│  ├─ lib/ingest/persist.ts               insertEvent, upsertSession, insertConsent, markCapi
│  ├─ lib/capi/build.ts                   sha256, resolveEventTime, buildServerEvent, pickCustomData
│  ├─ lib/capi/send.ts                    sendEventsToMeta (timeout, token no body)
│  ├─ lib/capi/dispatch.ts                decide + envia + marca capi_status
│  ├─ lib/dash/queries.ts                 funnelByPerson, sessionsAtStep, sessionTimeline, capiFailed24h
│  ├─ lib/auth/basic.ts                   parse/verify Basic Auth
│  ├─ app/api/ingest/route.ts
│  ├─ app/api/dash/[project]/funnel/route.ts
│  ├─ app/api/dash/[project]/sessions/route.ts
│  ├─ app/api/dash/[project]/session/[id]/route.ts
│  ├─ app/dashboard/[project]/page.tsx    funil + drill-down nível 1
│  ├─ app/dashboard/[project]/sessions/[id]/page.tsx  timeline
│  ├─ app/dashboard/_components/FunnelChart.tsx, StepSessions.tsx, Timeline.tsx, CapiCard.tsx
│  ├─ app/layout.tsx, app/globals.css, app/page.tsx (redireciona pro dashboard)
│  └─ test/fakeDb.ts                      FakeDb para testes
```

**quiz-app (modificar):** `next.config.js`, `src/lib/tracking/provider.ts` (+test), `src/lib/tracking/eventMap.ts` (+`HEALTH_CONTEXT_EVENTS`), `src/components/tracking/TrackingProvider.tsx`, remover `src/app/api/e/capi/*` e `src/lib/tracking/server/*`, `README.md`, `.env.local.example`.

---

### Task 0: Scaffold do repositório qx-hub

**Files:** todo o esqueleto (create-next-app) + `vitest.config.ts`, `vitest.setup.ts`, `.env.example`, `src/test/fakeDb.ts`

**Interfaces:**
- Produces: `FakeDb` (`src/test/fakeDb.ts`) usado por todos os testes de persistência/queries.

- [ ] **Step 1: Criar o app**

```bash
cd "h:/Second_Brain/03-Dev/Projetos_Pessoal"
npx --yes create-next-app@15 qx-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
cd qx-hub
npm install zod@^3 postgres@^3 recharts@^2 uuid@^11
npm install -D vitest@^2 @vitejs/plugin-react@^4 jsdom@^24 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 tsx@^4 @types/node@^20
```

- [ ] **Step 2: Config de testes**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
```

Adicionar em `package.json` → `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"migrate": "tsx scripts/migrate.ts"`.

- [ ] **Step 3: FakeDb**

```ts
// src/test/fakeDb.ts
import type { Db } from '@/lib/db';

export type Call = { text: string; params: unknown[] };

// Records every query; answers are queued per call in order (default: []).
export class FakeDb implements Db {
  calls: Call[] = [];
  private answers: unknown[][] = [];

  willReturn(...rows: unknown[][]) {
    this.answers.push(...rows);
    return this;
  }

  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    this.calls.push({ text: text.replace(/\s+/g, ' ').trim(), params });
    return (this.answers.shift() ?? []) as T[];
  }

  last(): Call {
    return this.calls[this.calls.length - 1];
  }
}
```

- [ ] **Step 4: `.env.example` e `.gitignore`**

```
# .env.example
DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DASHBOARD_BASIC_AUTH=eduardo:troque-esta-senha
META_CAPI_TOKEN_CHIA=
META_TEST_EVENT_CODE_CHIA=
META_GRAPH_VERSION=v23.0
```

Garantir no `.gitignore`: `.env*` (deixar `!.env.example`), `.vercel`, `.superpowers`.

- [ ] **Step 5: Git + GitHub**

```bash
git init -b main && git add -A && git commit -m "chore: scaffold qx-hub (next 15, vitest, postgres, recharts)"
gh repo create qortexia/qx-hub --private --source=. --remote=origin --push
```

- [ ] **Step 6: Verificar**

Run: `npm test` → "No test files found" é aceitável; `npm run build` → OK.

---

### Task 1: Config de projetos (`src/config/projects.ts`)

**Files:**
- Create: `src/config/projects.ts`, `src/config/projects.test.ts`

**Interfaces:**
- Produces: `type MetaEventName`, `type ProjectConfig`, `PROJECTS`, `getProject(slug)`, `META_EVENT_ALLOWLIST`, `INTERNAL_EVENTS_CHIA`, `EVENT_MAP_CHIA`, `METADATA_ALLOWLIST_CHIA`, `FUNNEL_STEPS_CHIA`, `HEALTH_CONTEXT_EVENTS`

- [ ] **Step 1: Teste**

```ts
// src/config/projects.test.ts
import { describe, it, expect } from 'vitest';
import { getProject, PROJECTS, META_EVENT_ALLOWLIST } from './projects';

describe('projects config', () => {
  it('conhece o projeto chia e rejeita slug desconhecido', () => {
    expect(getProject('chia')?.metaPixelId).toBe('1656688772259170');
    expect(getProject('nope')).toBeNull();
  });

  it('só Lead e InitiateCheckout mapeiam pra Meta no chia; imc_view e projection_view são null', () => {
    const p = PROJECTS.chia;
    expect(p.eventMap.quiz_complete).toBe('Lead');
    expect(p.eventMap.checkout_click).toBe('InitiateCheckout');
    expect(p.eventMap.imc_view).toBeNull();
    expect(p.eventMap.projection_view).toBeNull();
    for (const v of Object.values(p.eventMap)) if (v) expect(META_EVENT_ALLOWLIST).toContain(v);
  });

  it('o funil tem ordem estritamente crescente e chaves únicas', () => {
    const steps = PROJECTS.chia.funnelSteps;
    const orders = steps.map((s) => s.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(new Set(steps.map((s) => s.key)).size).toBe(steps.length);
    expect(steps.find((s) => s.key === 'quiz_step_view:nombre')).toBeTruthy();
    expect(steps.find((s) => s.key === 'checkout_click')?.order).toBeGreaterThan(
      steps.find((s) => s.key === 'offer_view')!.order
    );
  });

  it('metadata allowlist nunca inclui valores de resposta', () => {
    expect(PROJECTS.chia.metadataAllowlist.quiz_answer).toEqual(['step']);
    expect(PROJECTS.chia.metadataAllowlist.imc_view).toBeUndefined();
  });

  it('origens permitidas incluem produção e previews do quiz', () => {
    expect(PROJECTS.chia.allowedOrigins.some((o) => o.test('https://gel-metabolico-de-chia.vercel.app'))).toBe(true);
    expect(PROJECTS.chia.allowedOrigins.some((o) => o.test('https://gel-metabolico-de-chia-git-feat-x-qortexia-6470s-projects.vercel.app'))).toBe(true);
    expect(PROJECTS.chia.allowedOrigins.some((o) => o.test('https://evil.example'))).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar** — `npx vitest run src/config/projects.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
// src/config/projects.ts
export type MetaEventName = 'Lead' | 'InitiateCheckout' | 'ViewContent';
export const META_EVENT_ALLOWLIST: readonly MetaEventName[] = ['Lead', 'InitiateCheckout', 'ViewContent'];

export type FunnelStep = { key: string; order: number; label: string };

export type ProjectConfig = {
  slug: string;
  name: string;
  metaPixelId: string;
  capiTokenEnv: string;
  testEventCodeEnv: string;
  allowedOrigins: RegExp[];
  adAccountTimezone: string;
  internalEvents: readonly string[];
  eventMap: Record<string, MetaEventName | null>;
  metadataAllowlist: Record<string, readonly string[] | undefined>;
  funnelSteps: FunnelStep[];
};

// Events whose payload lives inside the health-questions flow. The SDK only
// sends them after express consent; the hub additionally never forwards them.
export const HEALTH_CONTEXT_EVENTS = ['quiz_step_view', 'quiz_answer', 'imc_view', 'projection_view'] as const;

export const INTERNAL_EVENTS_CHIA = [
  'landing_view', 'consent_view', 'consent_accept', 'landing_cta_click', 'quiz_start', 'quiz_step_view',
  'quiz_answer', 'imc_view', 'projection_view', 'quiz_complete', 'vsl_view', 'vsl_play', 'vsl_cta_reveal',
  'vsl_cta_click', 'vsl_error', 'vsl_continue_without_video', 'offer_view', 'checkout_click',
] as const;

export const EVENT_MAP_CHIA: Record<string, MetaEventName | null> = {
  landing_view: null, consent_view: null, consent_accept: null, landing_cta_click: null, quiz_start: null,
  quiz_step_view: null, quiz_answer: null, imc_view: null, projection_view: null, quiz_complete: 'Lead',
  vsl_view: null, vsl_play: null, vsl_cta_reveal: null, vsl_cta_click: null, vsl_error: null,
  vsl_continue_without_video: null, offer_view: null, checkout_click: 'InitiateCheckout',
};

export const METADATA_ALLOWLIST_CHIA: Record<string, readonly string[] | undefined> = {
  landing_cta_click: ['answer'], consent_accept: ['policy_version'], quiz_step_view: ['step', 'index'],
  quiz_answer: ['step'], vsl_view: ['resumeKey'], vsl_play: ['resumeKey'], vsl_cta_reveal: ['resumeKey'],
  vsl_cta_click: ['resumeKey'], vsl_error: ['resumeKey', 'code'], vsl_continue_without_video: ['resumeKey'],
  checkout_click: ['priceMxn'],
};

// Screen ids in the order of quiz-app's SCREENS (copy.ts). Changing the quiz
// order means updating this list + backfilling step_order (spec §9).
const CHIA_SCREENS = [
  'deseo', 'genero', 'cuerpoActual', 'edad', 'espejo', 'area', 'loader1', 'vsl1', 'peso', 'estatura', 'imc',
  'objetivo', 'proyeccion', 'dolor', 'satisfaccion', 'bloqueo', 'agua', 'sueno', 'rutina', 'cuerpoDeseado',
  'nombre', 'loader2', 'vsl2', 'oferta',
];

export const FUNNEL_STEPS_CHIA: FunnelStep[] = [
  { key: 'landing_view', order: 1, label: 'Landing' },
  { key: 'consent_accept', order: 2, label: 'Consentimiento' },
  { key: 'quiz_start', order: 3, label: 'Inicio del quiz' },
  ...CHIA_SCREENS.map((id, i) => ({ key: `quiz_step_view:${id}`, order: 10 + i, label: `Pantalla ${i + 1}: ${id}` })),
  { key: 'quiz_complete', order: 40, label: 'Lead (nombre)' },
  { key: 'offer_view', order: 45, label: 'Oferta' },
  { key: 'checkout_click', order: 50, label: 'InitiateCheckout' },
  // Fase 2: checkout_abandoned 60, payment_refused 61, purchase 70
];

export const PROJECTS: Record<string, ProjectConfig> = {
  chia: {
    slug: 'chia',
    name: 'Gel Metabólico de Chía',
    metaPixelId: '1656688772259170',
    capiTokenEnv: 'META_CAPI_TOKEN_CHIA',
    testEventCodeEnv: 'META_TEST_EVENT_CODE_CHIA',
    allowedOrigins: [
      /^https:\/\/gel-metabolico-de-chia\.vercel\.app$/,
      /^https:\/\/gel-metabolico-de-chia-[a-z0-9-]+-qortexia-6470s-projects\.vercel\.app$/,
      /^http:\/\/localhost:3000$/,
    ],
    adAccountTimezone: 'America/Mexico_City',
    internalEvents: INTERNAL_EVENTS_CHIA,
    eventMap: EVENT_MAP_CHIA,
    metadataAllowlist: METADATA_ALLOWLIST_CHIA,
    funnelSteps: FUNNEL_STEPS_CHIA,
  },
};

export function getProject(slug: string): ProjectConfig | null {
  return Object.prototype.hasOwnProperty.call(PROJECTS, slug) ? PROJECTS[slug] : null;
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(config): project registry with chia funnel, event map and allowlists`.

---

### Task 2: Camada de banco e migração inicial

**Files:**
- Create: `src/lib/db.ts`, `supabase/migrations/0001_init.sql`, `scripts/migrate.ts`, `scripts/migrate.test.ts`

**Interfaces:**
- Produces: `interface Db { query<T>(text, params?): Promise<T[]> }`, `getDb(): Db`, `splitMigrations(files)`, `applyMigrations(db, migrations)`

- [ ] **Step 1: Teste do runner (puro)**

```ts
// scripts/migrate.test.ts
import { describe, it, expect } from 'vitest';
import { applyMigrations, type Migration } from './migrate';
import { FakeDb } from '@/test/fakeDb';

const m = (name: string, sql: string): Migration => ({ name, sql });

describe('applyMigrations', () => {
  it('cria schema_migrations, aplica só as pendentes em ordem e registra cada uma', async () => {
    const db = new FakeDb().willReturn([], [{ name: '0001_init.sql' }]);
    const applied = await applyMigrations(db, [m('0002_b.sql', 'select 2;'), m('0001_init.sql', 'select 1;')]);
    expect(applied).toEqual(['0002_b.sql']);
    const texts = db.calls.map((c) => c.text);
    expect(texts[0]).toMatch(/create table if not exists schema_migrations/i);
    expect(texts[1]).toMatch(/select name from schema_migrations/i);
    expect(texts[2]).toBe('select 2;');
    expect(texts[3]).toMatch(/insert into schema_migrations/i);
    expect(db.calls[3].params).toEqual(['0002_b.sql']);
  });

  it('não faz nada quando tudo já foi aplicado', async () => {
    const db = new FakeDb().willReturn([], [{ name: '0001_init.sql' }]);
    expect(await applyMigrations(db, [m('0001_init.sql', 'select 1;')])).toEqual([]);
    expect(db.calls).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar `db.ts`**

```ts
// src/lib/db.ts
import postgres from 'postgres';

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

let client: ReturnType<typeof postgres> | null = null;

// Supabase transaction pooler (port 6543) does not support prepared statements.
export function getDb(url = process.env.DATABASE_URL): Db {
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!client) client = postgres(url, { prepare: false, ssl: 'require', max: 1, idle_timeout: 20 });
  const sql = client;
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never)) as unknown as T[];
    },
  };
}
```

- [ ] **Step 4: Migração inicial** (`supabase/migrations/0001_init.sql`) — schema da spec §9:

```sql
create extension if not exists pgcrypto;

create table if not exists sessions (
  session_id uuid primary key,
  project_id text not null,
  anon_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  furthest_step int not null default 0,
  furthest_event text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  fbclid text, fbc text, fbp text,
  meta_campaign_id text, meta_adset_id text, meta_ad_id text, placement text,
  landing_url text,
  client_ip inet, client_user_agent text,
  email text, email_sha256 text,
  purchase_status text check (purchase_status in ('approved','refunded','chargeback')),
  is_bot boolean not null default false,
  consent_version text, consent_at timestamptz
);
create index if not exists sessions_project_step_idx on sessions (project_id, furthest_step);
create index if not exists sessions_anon_idx on sessions (anon_id);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  event_id uuid not null unique,
  session_id uuid not null,
  anon_id uuid not null,
  internal_name text not null,
  meta_event_name text,
  step_order int,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  is_bot boolean not null default false,
  capi_status text check (capi_status in ('sent','failed','skipped')),
  capi_error text,
  fbtrace_id text,
  created_at timestamptz not null default now()
);
create index if not exists events_session_time_idx on events (session_id, occurred_at);
create index if not exists events_project_name_time_idx on events (project_id, internal_name, occurred_at);

create table if not exists video_watch (
  project_id text not null,
  session_id uuid not null,
  video_id text not null,
  max_watched_seconds numeric not null default 0,
  engaged_seconds numeric not null default 0,
  unique_seconds numeric not null default 0,
  duration_seconds numeric,
  updated_at timestamptz not null default now(),
  primary key (session_id, video_id)
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  provider text not null default 'kiwify',
  event_type text not null,
  order_id text,
  dedupe_key text not null,
  raw jsonb not null,
  received_at timestamptz not null default now(),
  unique (project_id, dedupe_key, event_type)
);

create table if not exists orders (
  order_id text primary key,
  project_id text not null,
  session_id uuid, anon_id uuid,
  match_type text check (match_type in ('s1','sales_api','unattributed')),
  status text not null check (status in ('approved','refunded','chargeback')),
  value numeric, currency text not null default 'MXN',
  approved_at timestamptz, refunded_at timestamptz,
  customer_email_sha256 text,
  capi_status text check (capi_status in ('pending','sent','failed')),
  capi_attempts int not null default 0, capi_last_error text, capi_purchase_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null, anon_id uuid not null, session_id uuid,
  accepted_at timestamptz not null, policy_version text not null, user_agent text
);

-- Deny-all for PostgREST roles: the hub connects as the table owner and bypasses RLS.
alter table sessions enable row level security;
alter table events enable row level security;
alter table video_watch enable row level security;
alter table webhook_events enable row level security;
alter table orders enable row level security;
alter table consents enable row level security;
```

- [ ] **Step 5: Runner**

```ts
// scripts/migrate.ts
import fs from 'node:fs';
import path from 'node:path';
import type { Db } from '@/lib/db';

export type Migration = { name: string; sql: string };

export function loadMigrations(dir = path.join(process.cwd(), 'supabase', 'migrations')): Migration[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: fs.readFileSync(path.join(dir, name), 'utf8') }));
}

export async function applyMigrations(db: Db, migrations: Migration[]): Promise<string[]> {
  await db.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await db.query<{ name: string }>('select name from schema_migrations')).map((r) => r.name));
  const applied: string[] = [];
  for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(m.name)) continue;
    await db.query(m.sql);
    await db.query('insert into schema_migrations (name) values ($1)', [m.name]);
    applied.push(m.name);
  }
  return applied;
}

async function main() {
  const { getDb } = await import('@/lib/db');
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const db = getDb(url);
  const applied = await applyMigrations(db, loadMigrations());
  console.log(applied.length ? `applied: ${applied.join(', ')}` : 'nothing to apply');
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) main().catch((e) => { console.error(e); process.exit(1); });
```

(`tsx` precisa do alias: adicionar `"tsconfig-paths"`? Não — `tsx` lê `paths` do tsconfig automaticamente.)

- [ ] **Step 6: Rodar** `npx vitest run scripts/migrate.test.ts` → PASS. **Step 7: Commit** `feat(db): postgres client, initial schema migration and runner`.

---

### Task 3: Validação e classificação do ingest

**Files:**
- Create: `src/lib/ingest/schema.ts`, `src/lib/ingest/classify.ts`, `src/lib/ingest/classify.test.ts`, `src/lib/ingest/schema.test.ts`

**Interfaces:**
- Produces: `IngestPayloadSchema` (zod), `type IngestPayload`, `isBotUa(ua)`, `originAllowed(project, origin)`, `resolveStep(project, internal_name, metadata)`, `pickMetadata(project, internal_name, metadata)`, `metaMappingOk(project, internal_name, meta_event_name)`, `firstForwardedIp(header)`

- [ ] **Step 1: Testes**

```ts
// src/lib/ingest/schema.test.ts
import { describe, it, expect } from 'vitest';
import { IngestPayloadSchema } from './schema';

const base = {
  project: 'chia', anon_id: '11111111-1111-4111-8111-111111111111', session_id: '22222222-2222-4222-8222-222222222222',
  event_id: '33333333-3333-5333-8333-333333333333', internal_name: 'quiz_answer', meta_event_name: null,
  occurred_at: '2026-08-26T12:00:00.000Z', event_source_url: 'https://gel-metabolico-de-chia.vercel.app/?utm_source=ig',
  metadata: { step: 'peso', value: 85 }, consent_version: '2026-08-24', fbc: null, fbp: 'fb.1.1.42',
  attribution: { utm_source: 'ig', ad_id: '3' },
};

describe('IngestPayloadSchema', () => {
  it('aceita um payload válido', () => {
    expect(IngestPayloadSchema.safeParse(base).success).toBe(true);
  });
  it('rejeita Purchase, uuid inválido e occurred_at não-ISO', () => {
    expect(IngestPayloadSchema.safeParse({ ...base, meta_event_name: 'Purchase' }).success).toBe(false);
    expect(IngestPayloadSchema.safeParse({ ...base, event_id: 'abc' }).success).toBe(false);
    expect(IngestPayloadSchema.safeParse({ ...base, occurred_at: 'ayer' }).success).toBe(false);
  });
  it('custom_data só aceita value/currency/content_name', () => {
    const r = IngestPayloadSchema.safeParse({ ...base, custom_data: { value: 199, currency: 'MXN', peso: 85 } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.custom_data).toEqual({ value: 199, currency: 'MXN' });
  });
});
```

```ts
// src/lib/ingest/classify.test.ts
import { describe, it, expect } from 'vitest';
import { isBotUa, originAllowed, resolveStep, pickMetadata, metaMappingOk, firstForwardedIp } from './classify';
import { PROJECTS } from '@/config/projects';

const chia = PROJECTS.chia;

describe('classify', () => {
  it('isBotUa detecta crawlers da Meta e previews', () => {
    expect(isBotUa('facebookexternalhit/1.1')).toBe(true);
    expect(isBotUa('Mozilla/5.0 (iPhone) Safari')).toBe(false);
    expect(isBotUa(null)).toBe(false);
  });
  it('originAllowed permite ausência, produção e previews; nega origem estranha', () => {
    expect(originAllowed(chia, null)).toBe(true);
    expect(originAllowed(chia, 'https://gel-metabolico-de-chia.vercel.app')).toBe(true);
    expect(originAllowed(chia, 'https://gel-metabolico-de-chia-git-feat-abc-qortexia-6470s-projects.vercel.app/x')).toBe(true);
    expect(originAllowed(chia, 'https://evil.example')).toBe(false);
  });
  it('resolveStep usa metadata.step para quiz_step_view e o nome para os demais; desconhecido → null', () => {
    expect(resolveStep(chia, 'quiz_step_view', { step: 'nombre' })).toBe(30);
    expect(resolveStep(chia, 'checkout_click', {})).toBe(50);
    expect(resolveStep(chia, 'vsl_play', { resumeKey: 'vsl1' })).toBeNull();
  });
  it('pickMetadata aplica a allowlist do projeto (valor de resposta nunca passa)', () => {
    expect(pickMetadata(chia, 'quiz_answer', { step: 'peso', value: 85 })).toEqual({ step: 'peso' });
    expect(pickMetadata(chia, 'imc_view', { imc: 33 })).toEqual({});
  });
  it('metaMappingOk exige o par exato da tabela do projeto', () => {
    expect(metaMappingOk(chia, 'quiz_complete', 'Lead')).toBe(true);
    expect(metaMappingOk(chia, 'quiz_complete', null)).toBe(true); // client may downgrade, never upgrade
    expect(metaMappingOk(chia, 'imc_view', 'Lead')).toBe(false);
    expect(metaMappingOk(chia, 'unknown_event', null)).toBe(false);
  });
  it('firstForwardedIp pega o primeiro IP da cadeia', () => {
    expect(firstForwardedIp('187.1.2.3, 10.0.0.1')).toBe('187.1.2.3');
    expect(firstForwardedIp(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/ingest/schema.ts
import { z } from 'zod';
import { META_EVENT_ALLOWLIST } from '@/config/projects';

const uuid = z.string().uuid();
const isoDate = z.string().refine((s) => Number.isFinite(Date.parse(s)), 'occurred_at must be ISO-8601');

const CustomData = z
  .object({ value: z.number().finite().optional(), currency: z.string().optional(), content_name: z.string().optional() })
  .strip();

export const AttributionSchema = z
  .object({
    utm_source: z.string().optional(), utm_medium: z.string().optional(), utm_campaign: z.string().optional(),
    utm_term: z.string().optional(), utm_content: z.string().optional(), fbclid: z.string().optional(),
    campaign_id: z.string().optional(), adset_id: z.string().optional(), ad_id: z.string().optional(),
    placement: z.string().optional(),
  })
  .strip();

export const IngestPayloadSchema = z.object({
  project: z.string().min(1).max(32),
  anon_id: uuid,
  session_id: uuid,
  event_id: uuid,
  internal_name: z.string().min(1).max(64),
  meta_event_name: z.enum(META_EVENT_ALLOWLIST as [string, ...string[]]).nullable(),
  occurred_at: isoDate,
  event_source_url: z.string().url().max(2048),
  metadata: z.record(z.unknown()).default({}),
  consent_version: z.string().nullable().default(null),
  fbc: z.string().max(512).nullable().default(null),
  fbp: z.string().max(512).nullable().default(null),
  custom_data: CustomData.optional(),
  attribution: AttributionSchema.default({}),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;
```

```ts
// src/lib/ingest/classify.ts
import type { ProjectConfig } from '@/config/projects';

const BOT_UA_RE = /bot|crawler|spider|preview|headless|facebookexternalhit|meta-externalagent|whatsapp|telegrambot|slurp|bingpreview/i;

export function isBotUa(ua: string | null): boolean {
  return !!ua && BOT_UA_RE.test(ua);
}

// Absent Origin/Referer is allowed (documented casual-abuse layer, not auth).
export function originAllowed(project: ProjectConfig, originOrReferer: string | null): boolean {
  if (!originOrReferer) return true;
  let origin: string;
  try {
    origin = new URL(originOrReferer).origin;
  } catch {
    return false;
  }
  return project.allowedOrigins.some((re) => re.test(origin));
}

export function resolveStep(project: ProjectConfig, internalName: string, metadata: Record<string, unknown>): number | null {
  const step = typeof metadata.step === 'string' ? metadata.step : null;
  const key = internalName === 'quiz_step_view' && step ? `${internalName}:${step}` : internalName;
  return project.funnelSteps.find((s) => s.key === key)?.order ?? null;
}

export function pickMetadata(project: ProjectConfig, internalName: string, metadata: Record<string, unknown>): Record<string, unknown> {
  const allowed = project.metadataAllowlist[internalName] ?? [];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (metadata[k] !== undefined) out[k] = metadata[k];
  return out;
}

// The client may send null for a mapped event (e.g. consent gating), never a different name.
export function metaMappingOk(project: ProjectConfig, internalName: string, metaEventName: string | null): boolean {
  if (!project.internalEvents.includes(internalName)) return false;
  const expected = project.eventMap[internalName] ?? null;
  return metaEventName === null || metaEventName === expected;
}

export function firstForwardedIp(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(',')[0].trim();
  return first.length ? first : null;
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(ingest): payload schema, bot/origin checks, step resolution and metadata strip`.

---

### Task 4: Persistência do ingest (`persist.ts`)

**Files:**
- Create: `src/lib/ingest/persist.ts`, `src/lib/ingest/persist.test.ts`

**Interfaces:**
- Consumes: `Db`, `IngestPayload`, classify helpers
- Produces: `insertEvent(db, row): Promise<boolean>` (true = inserido), `upsertSession(db, row)`, `insertConsent(db, row)`, `markCapi(db, eventId, status, error?, fbtraceId?)`, tipos `EventRow`, `SessionRow`

- [ ] **Step 1: Teste**

```ts
// src/lib/ingest/persist.test.ts
import { describe, it, expect } from 'vitest';
import { insertEvent, upsertSession, insertConsent, markCapi } from './persist';
import { FakeDb } from '@/test/fakeDb';

const ev = {
  project_id: 'chia', event_id: '33333333-3333-5333-8333-333333333333', session_id: '22222222-2222-4222-8222-222222222222',
  anon_id: '11111111-1111-4111-8111-111111111111', internal_name: 'quiz_complete', meta_event_name: 'Lead' as const,
  step_order: 40, occurred_at: '2026-08-26T12:00:00.000Z', metadata: {}, is_bot: false,
};

describe('persist', () => {
  it('insertEvent usa ON CONFLICT (event_id) DO NOTHING RETURNING e devolve true só quando inseriu', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }], []);
    expect(await insertEvent(db, ev)).toBe(true);
    expect(db.last().text).toMatch(/on conflict \(event_id\) do nothing returning id/i);
    expect(db.last().params).toContain(ev.event_id);
    expect(await insertEvent(db, ev)).toBe(false);
  });

  it('upsertSession: write-once na atribuição, último não-nulo em fbc/fbp, GREATEST no furthest_step, OR no is_bot', async () => {
    const db = new FakeDb();
    await upsertSession(db, {
      session_id: ev.session_id, project_id: 'chia', anon_id: ev.anon_id, seen_at: ev.occurred_at,
      furthest_step: 40, furthest_event: 'quiz_complete', attribution: { utm_source: 'ig', ad_id: '3' },
      fbc: 'fb.1.1.abc', fbp: null, landing_url: 'https://x/?a=1', client_ip: '187.1.2.3', client_user_agent: 'UA',
      is_bot: false, consent_version: '2026-08-24',
    });
    const t = db.last().text;
    expect(t).toMatch(/utm_source = coalesce\(sessions\.utm_source, excluded\.utm_source\)/i);
    expect(t).toMatch(/fbc = coalesce\(excluded\.fbc, sessions\.fbc\)/i);
    expect(t).toMatch(/furthest_step = greatest\(sessions\.furthest_step, excluded\.furthest_step\)/i);
    expect(t).toMatch(/is_bot = sessions\.is_bot or excluded\.is_bot/i);
    expect(t).toMatch(/client_ip = coalesce\(excluded\.client_ip, sessions\.client_ip\)/i);
    expect(db.last().params).toContain('ig');
    expect(db.last().params).toContain('3');
  });

  it('insertConsent grava anon, sessão, versão e data', async () => {
    const db = new FakeDb();
    await insertConsent(db, { project_id: 'chia', anon_id: ev.anon_id, session_id: ev.session_id, accepted_at: ev.occurred_at, policy_version: '2026-08-24', user_agent: 'UA' });
    expect(db.last().text).toMatch(/insert into consents/i);
    expect(db.last().params).toEqual(['chia', ev.anon_id, ev.session_id, ev.occurred_at, '2026-08-24', 'UA']);
  });

  it('markCapi atualiza status/erro/fbtrace por event_id', async () => {
    const db = new FakeDb();
    await markCapi(db, ev.event_id, 'failed', 'Meta CAPI 500: boom');
    expect(db.last().text).toMatch(/update events set capi_status = \$1, capi_error = \$2, fbtrace_id = \$3 where event_id = \$4/i);
    expect(db.last().params).toEqual(['failed', 'Meta CAPI 500: boom', null, ev.event_id]);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/ingest/persist.ts
import type { Db } from '@/lib/db';
import type { MetaEventName } from '@/config/projects';

export type EventRow = {
  project_id: string; event_id: string; session_id: string; anon_id: string; internal_name: string;
  meta_event_name: MetaEventName | null; step_order: number | null; occurred_at: string;
  metadata: Record<string, unknown>; is_bot: boolean;
};

export type SessionRow = {
  session_id: string; project_id: string; anon_id: string; seen_at: string;
  furthest_step: number | null; furthest_event: string | null;
  attribution: Record<string, string | undefined>;
  fbc: string | null; fbp: string | null; landing_url: string | null;
  client_ip: string | null; client_user_agent: string | null; is_bot: boolean; consent_version: string | null;
};

export async function insertEvent(db: Db, e: EventRow): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    `insert into events (project_id, event_id, session_id, anon_id, internal_name, meta_event_name, step_order, occurred_at, metadata, is_bot)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     on conflict (event_id) do nothing returning id`,
    [e.project_id, e.event_id, e.session_id, e.anon_id, e.internal_name, e.meta_event_name, e.step_order, e.occurred_at, JSON.stringify(e.metadata), e.is_bot]
  );
  return rows.length > 0;
}

const ATTR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'campaign_id', 'adset_id', 'ad_id', 'placement'] as const;
const ATTR_COLUMN: Record<(typeof ATTR)[number], string> = {
  utm_source: 'utm_source', utm_medium: 'utm_medium', utm_campaign: 'utm_campaign', utm_term: 'utm_term', utm_content: 'utm_content',
  fbclid: 'fbclid', campaign_id: 'meta_campaign_id', adset_id: 'meta_adset_id', ad_id: 'meta_ad_id', placement: 'placement',
};

export async function upsertSession(db: Db, s: SessionRow): Promise<void> {
  const attrCols = ATTR.map((k) => ATTR_COLUMN[k]);
  const attrVals = ATTR.map((k) => s.attribution[k] ?? null);
  const writeOnce = attrCols.map((c) => `${c} = coalesce(sessions.${c}, excluded.${c})`).join(', ');
  await db.query(
    `insert into sessions (session_id, project_id, anon_id, created_at, last_seen_at, furthest_step, furthest_event,
       ${attrCols.join(', ')}, fbc, fbp, landing_url, client_ip, client_user_agent, is_bot, consent_version, consent_at)
     values ($1, $2, $3, $4, $4, $5, $6, ${attrCols.map((_, i) => `$${7 + i}`).join(', ')},
       $${7 + attrCols.length}, $${8 + attrCols.length}, $${9 + attrCols.length}, $${10 + attrCols.length}::inet, $${11 + attrCols.length},
       $${12 + attrCols.length}, $${13 + attrCols.length}, case when $${13 + attrCols.length}::text is null then null else $4::timestamptz end)
     on conflict (session_id) do update set
       last_seen_at = greatest(sessions.last_seen_at, excluded.last_seen_at),
       furthest_event = case when excluded.furthest_step > sessions.furthest_step then excluded.furthest_event else sessions.furthest_event end,
       furthest_step = greatest(sessions.furthest_step, excluded.furthest_step),
       ${writeOnce},
       landing_url = coalesce(sessions.landing_url, excluded.landing_url),
       fbc = coalesce(excluded.fbc, sessions.fbc),
       fbp = coalesce(excluded.fbp, sessions.fbp),
       client_ip = coalesce(excluded.client_ip, sessions.client_ip),
       client_user_agent = coalesce(excluded.client_user_agent, sessions.client_user_agent),
       is_bot = sessions.is_bot or excluded.is_bot,
       consent_version = coalesce(sessions.consent_version, excluded.consent_version),
       consent_at = coalesce(sessions.consent_at, excluded.consent_at)`,
    [s.session_id, s.project_id, s.anon_id, s.seen_at, s.furthest_step ?? 0, s.furthest_event, ...attrVals,
      s.fbc, s.fbp, s.landing_url, s.client_ip, s.client_user_agent, s.is_bot, s.consent_version]
  );
}

export async function insertConsent(db: Db, c: { project_id: string; anon_id: string; session_id: string; accepted_at: string; policy_version: string; user_agent: string | null }) {
  await db.query(
    'insert into consents (project_id, anon_id, session_id, accepted_at, policy_version, user_agent) values ($1, $2, $3, $4, $5, $6)',
    [c.project_id, c.anon_id, c.session_id, c.accepted_at, c.policy_version, c.user_agent]
  );
}

export async function markCapi(db: Db, eventId: string, status: 'sent' | 'failed' | 'skipped', error: string | null = null, fbtraceId: string | null = null) {
  await db.query('update events set capi_status = $1, capi_error = $2, fbtrace_id = $3 where event_id = $4', [status, error, fbtraceId, eventId]);
}
```

- [ ] **Step 4: Rodar** → PASS (ajuste o regex do teste de `client_ip` se o SQL final divergir — o comportamento, não o texto, é o requisito). **Step 5: Commit** `feat(ingest): event insert with dedup, session upsert (write-once attribution), consents`.

---

### Task 5: CAPI no hub (build + send + dispatch)

**Files:**
- Create: `src/lib/capi/build.ts`, `src/lib/capi/send.ts`, `src/lib/capi/dispatch.ts`, `src/lib/capi/build.test.ts`, `src/lib/capi/send.test.ts`, `src/lib/capi/dispatch.test.ts`

**Interfaces:**
- Produces: `sha256`, `resolveEventTime`, `buildServerEvent(input, now): GraphEvent`, `sendEventsToMeta(events, cfg)`, `dispatchCapi(db, project, payload, ctx, deps?)`

- [ ] **Step 1: Testes** — `build.test.ts` e `send.test.ts` são cópia dos testes de `quiz-app/src/lib/tracking/server/capi.test.ts` (Fase 0a), com `// @vitest-environment node` removido (o ambiente já é node), URL sem token na query e `access_token` no body, `signal` `instanceof AbortSignal`. Copiar os arquivos, ajustar imports (`./build`, `./send`).

```ts
// src/lib/capi/dispatch.test.ts
import { describe, it, expect, vi } from 'vitest';
import { dispatchCapi } from './dispatch';
import { FakeDb } from '@/test/fakeDb';
import { PROJECTS } from '@/config/projects';

const payload = {
  project: 'chia', anon_id: '11111111-1111-4111-8111-111111111111', session_id: '22222222-2222-4222-8222-222222222222',
  event_id: '33333333-3333-5333-8333-333333333333', internal_name: 'checkout_click', meta_event_name: 'InitiateCheckout' as const,
  occurred_at: new Date().toISOString(), event_source_url: 'https://gel-metabolico-de-chia.vercel.app/', metadata: {},
  consent_version: null, fbc: 'fb.1.1.abc', fbp: 'fb.1.1.42', custom_data: { value: 199, currency: 'MXN' }, attribution: {},
};
const ctx = { clientIp: '187.1.2.3', userAgent: 'UA', isBot: false };

describe('dispatchCapi', () => {
  it('envia o evento mapeado e marca sent com fbtrace', async () => {
    const db = new FakeDb();
    const send = vi.fn().mockResolvedValue({ events_received: 1, fbtrace_id: 't1' });
    const r = await dispatchCapi(db, PROJECTS.chia, payload, ctx, { send, env: { META_CAPI_TOKEN_CHIA: 'tok' } });
    expect(r).toBe('sent');
    expect(send.mock.calls[0][0][0]).toMatchObject({ event_name: 'InitiateCheckout', event_id: payload.event_id, custom_data: { value: 199, currency: 'MXN' } });
    expect(send.mock.calls[0][1]).toMatchObject({ pixelId: '1656688772259170', accessToken: 'tok' });
    expect(db.last().params).toEqual(['sent', null, 't1', payload.event_id]);
  });
  it('não envia quando meta_event_name é null, bot ou token ausente (skipped)', async () => {
    const send = vi.fn();
    expect(await dispatchCapi(new FakeDb(), PROJECTS.chia, { ...payload, meta_event_name: null }, ctx, { send, env: { META_CAPI_TOKEN_CHIA: 'tok' } })).toBe('skipped');
    expect(await dispatchCapi(new FakeDb(), PROJECTS.chia, payload, { ...ctx, isBot: true }, { send, env: { META_CAPI_TOKEN_CHIA: 'tok' } })).toBe('skipped');
    expect(await dispatchCapi(new FakeDb(), PROJECTS.chia, payload, ctx, { send, env: {} })).toBe('skipped');
    expect(send).not.toHaveBeenCalled();
  });
  it('falha da Meta vira failed com a mensagem, sem lançar', async () => {
    const db = new FakeDb();
    const send = vi.fn().mockRejectedValue(new Error('Meta CAPI 500: boom'));
    expect(await dispatchCapi(db, PROJECTS.chia, payload, ctx, { send, env: { META_CAPI_TOKEN_CHIA: 'tok' } })).toBe('failed');
    expect(db.last().params).toEqual(['failed', 'Meta CAPI 500: boom', null, payload.event_id]);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar** — `build.ts` e `send.ts`: copiar `quiz-app/src/lib/tracking/server/capi.ts` (estado final da Fase 0a, já com timeout e token no body) e dividir: `build.ts` (`sha256`, `isMetaEventName`, `resolveEventTime`, `ServerEventInput`, `GraphEvent`, `buildServerEvent`, `pickCustomData`) e `send.ts` (`MetaConfig`, `sendEventsToMeta`). Importar `META_EVENT_ALLOWLIST` de `@/config/projects`.

```ts
// src/lib/capi/dispatch.ts
import type { Db } from '@/lib/db';
import type { ProjectConfig } from '@/config/projects';
import type { IngestPayload } from '@/lib/ingest/schema';
import { buildServerEvent, pickCustomData, type GraphEvent } from './build';
import { sendEventsToMeta, type MetaConfig, type MetaSendResult } from './send';
import { markCapi } from '@/lib/ingest/persist';

export type DispatchCtx = { clientIp: string | null; userAgent: string | null; isBot: boolean };
type Deps = { send?: (events: GraphEvent[], cfg: MetaConfig) => Promise<MetaSendResult>; env?: Record<string, string | undefined>; now?: () => Date };

export async function dispatchCapi(db: Db, project: ProjectConfig, p: IngestPayload, ctx: DispatchCtx, deps: Deps = {}): Promise<'sent' | 'failed' | 'skipped'> {
  const env = deps.env ?? process.env;
  const token = env[project.capiTokenEnv];
  if (!p.meta_event_name || ctx.isBot || !token) {
    await markCapi(db, p.event_id, 'skipped');
    return 'skipped';
  }
  const event = buildServerEvent(
    {
      event_id: p.event_id, meta_event_name: p.meta_event_name, occurred_at: p.occurred_at, event_source_url: p.event_source_url,
      anon_id: p.anon_id, fbc: p.fbc, fbp: p.fbp, client_ip_address: ctx.clientIp, client_user_agent: ctx.userAgent,
      custom_data: pickCustomData(p.custom_data),
    },
    (deps.now ?? (() => new Date()))()
  );
  try {
    const res = await (deps.send ?? sendEventsToMeta)([event], {
      pixelId: project.metaPixelId, accessToken: token,
      testEventCode: env[project.testEventCodeEnv] || undefined, graphVersion: env.META_GRAPH_VERSION || undefined,
    });
    await markCapi(db, p.event_id, 'sent', null, res.fbtrace_id ?? null);
    return 'sent';
  } catch (err) {
    await markCapi(db, p.event_id, 'failed', (err as Error).message);
    console.error('capi_send_failed', project.slug, p.meta_event_name, p.event_id, (err as Error).message);
    return 'failed';
  }
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(capi): server event builder, Graph sender and per-project dispatch`.

---

### Task 6: `POST /api/ingest`

**Files:**
- Create: `src/app/api/ingest/route.ts`, `src/app/api/ingest/route.test.ts`, `src/lib/ingest/handle.ts`

**Interfaces:**
- Produces: `handleIngest(req, deps): Promise<Response>` (puro, testável) e `POST` que injeta `getDb()`.

- [ ] **Step 1: Teste**

```ts
// src/app/api/ingest/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleIngest } from '@/lib/ingest/handle';
import { FakeDb } from '@/test/fakeDb';

const body = {
  project: 'chia', anon_id: '11111111-1111-4111-8111-111111111111', session_id: '22222222-2222-4222-8222-222222222222',
  event_id: '33333333-3333-5333-8333-333333333333', internal_name: 'quiz_complete', meta_event_name: 'Lead',
  occurred_at: new Date().toISOString(), event_source_url: 'https://gel-metabolico-de-chia.vercel.app/?utm_source=ig',
  metadata: {}, consent_version: '2026-08-24', fbc: null, fbp: null, attribution: { utm_source: 'ig' },
};
const req = (b: unknown, h: Record<string, string> = {}) =>
  new Request('http://hub/api/ingest', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) });

describe('POST /api/ingest', () => {
  it('grava evento + sessão, despacha CAPI e responde 200 {inserted:true, capi:"sent"}', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }]);
    const dispatch = vi.fn().mockResolvedValue('sent');
    const res = await handleIngest(req(body, { origin: 'https://gel-metabolico-de-chia.vercel.app', 'x-forwarded-for': '187.1.2.3', 'user-agent': 'UA' }), { db, dispatch });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inserted: true, capi: 'sent' });
    expect(db.calls[0].text).toMatch(/insert into events/i);
    expect(db.calls[1].text).toMatch(/insert into sessions/i);
    expect(dispatch).toHaveBeenCalledWith(db, expect.objectContaining({ slug: 'chia' }), expect.objectContaining({ event_id: body.event_id }), { clientIp: '187.1.2.3', userAgent: 'UA', isBot: false });
  });
  it('duplicata: 200 {inserted:false} e não despacha', async () => {
    const dispatch = vi.fn();
    const res = await handleIngest(req(body), { db: new FakeDb().willReturn([]), dispatch });
    expect(await res.json()).toEqual({ inserted: false, capi: 'skipped' });
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('consent_accept também grava em consents', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }]);
    await handleIngest(req({ ...body, internal_name: 'consent_accept', meta_event_name: null, metadata: { policy_version: '2026-08-24' } }), { db, dispatch: vi.fn().mockResolvedValue('skipped') });
    expect(db.calls.some((c) => /insert into consents/i.test(c.text))).toBe(true);
  });
  it('mismatch de mapeamento grava mas responde capi:"rejected_mapping" sem despachar', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }]);
    const dispatch = vi.fn();
    const res = await handleIngest(req({ ...body, internal_name: 'imc_view', meta_event_name: 'Lead' }), { db, dispatch });
    expect(await res.json()).toEqual({ inserted: true, capi: 'rejected_mapping' });
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('400 para projeto desconhecido, Purchase e JSON inválido; 403 para origem estranha', async () => {
    const d = { db: new FakeDb(), dispatch: vi.fn() };
    expect((await handleIngest(req({ ...body, project: 'nope' }), d)).status).toBe(400);
    expect((await handleIngest(req({ ...body, meta_event_name: 'Purchase' }), d)).status).toBe(400);
    expect((await handleIngest(new Request('http://hub/api/ingest', { method: 'POST', body: '{nope' }), d)).status).toBe(400);
    expect((await handleIngest(req(body, { origin: 'https://evil.example' }), d)).status).toBe(403);
  });
  it('bot: grava com is_bot e capi skipped', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }]);
    const dispatch = vi.fn().mockResolvedValue('skipped');
    await handleIngest(req(body, { 'user-agent': 'facebookexternalhit/1.1' }), { db, dispatch });
    expect(db.calls[0].params).toContain(true);
    expect(dispatch).toHaveBeenCalledWith(db, expect.anything(), expect.anything(), expect.objectContaining({ isBot: true }));
  });
  it('metadata é stripada antes de gravar (valor de resposta nunca entra)', async () => {
    const db = new FakeDb().willReturn([{ id: 'x' }]);
    await handleIngest(req({ ...body, internal_name: 'quiz_answer', meta_event_name: null, metadata: { step: 'peso', value: 85 } }), { db, dispatch: vi.fn().mockResolvedValue('skipped') });
    expect(db.calls[0].params).toContain(JSON.stringify({ step: 'peso' }));
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/ingest/handle.ts
import type { Db } from '@/lib/db';
import { getProject } from '@/config/projects';
import { IngestPayloadSchema } from './schema';
import { firstForwardedIp, isBotUa, metaMappingOk, originAllowed, pickMetadata, resolveStep } from './classify';
import { insertConsent, insertEvent, upsertSession } from './persist';
import { dispatchCapi as realDispatch } from '@/lib/capi/dispatch';

type Deps = { db: Db; dispatch?: typeof realDispatch };

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function handleIngest(req: Request, deps: Deps): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = IngestPayloadSchema.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_event', issues: parsed.error.issues.map((i) => i.path.join('.')) }, 400);
  const p = parsed.data;

  const project = getProject(p.project);
  if (!project) return json({ error: 'unknown_project' }, 400);
  if (!originAllowed(project, req.headers.get('origin') ?? req.headers.get('referer'))) return json({ error: 'bad_origin' }, 403);

  const userAgent = req.headers.get('user-agent');
  const ctx = { clientIp: firstForwardedIp(req.headers.get('x-forwarded-for')), userAgent, isBot: isBotUa(userAgent) };
  const mappingOk = metaMappingOk(project, p.internal_name, p.meta_event_name);
  const metadata = pickMetadata(project, p.internal_name, p.metadata);
  const stepOrder = resolveStep(project, p.internal_name, p.metadata);

  const inserted = await insertEvent(deps.db, {
    project_id: project.slug, event_id: p.event_id, session_id: p.session_id, anon_id: p.anon_id,
    internal_name: p.internal_name, meta_event_name: mappingOk ? p.meta_event_name : null, step_order: stepOrder,
    occurred_at: p.occurred_at, metadata, is_bot: ctx.isBot,
  });
  if (!inserted) return json({ inserted: false, capi: 'skipped' });

  await upsertSession(deps.db, {
    session_id: p.session_id, project_id: project.slug, anon_id: p.anon_id, seen_at: p.occurred_at,
    furthest_step: stepOrder, furthest_event: stepOrder != null ? p.internal_name : null,
    attribution: p.attribution, fbc: p.fbc, fbp: p.fbp, landing_url: p.event_source_url,
    client_ip: ctx.clientIp, client_user_agent: userAgent, is_bot: ctx.isBot, consent_version: p.consent_version,
  });

  if (p.internal_name === 'consent_accept') {
    await insertConsent(deps.db, {
      project_id: project.slug, anon_id: p.anon_id, session_id: p.session_id, accepted_at: p.occurred_at,
      policy_version: String(metadata.policy_version ?? p.consent_version ?? 'unknown'), user_agent: userAgent,
    });
  }

  if (!mappingOk) {
    console.warn('ingest_mapping_rejected', project.slug, p.internal_name, p.meta_event_name);
    return json({ inserted: true, capi: 'rejected_mapping' });
  }
  const capi = await (deps.dispatch ?? realDispatch)(deps.db, project, p, ctx);
  return json({ inserted: true, capi });
}
```

```ts
// src/app/api/ingest/route.ts
import { getDb } from '@/lib/db';
import { handleIngest } from '@/lib/ingest/handle';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleIngest(req, { db: getDb() });
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(ingest): POST /api/ingest composing validation, persistence and CAPI dispatch`.

---

### Task 7: Basic Auth no dashboard

**Files:**
- Create: `src/lib/auth/basic.ts`, `src/lib/auth/basic.test.ts`, `src/middleware.ts`

- [ ] **Step 1: Teste**

```ts
// src/lib/auth/basic.test.ts
import { describe, it, expect } from 'vitest';
import { basicAuthOk } from './basic';

const enc = (s: string) => 'Basic ' + Buffer.from(s).toString('base64');

describe('basicAuthOk', () => {
  it('aceita usuário:senha iguais ao env e rejeita o resto', () => {
    expect(basicAuthOk(enc('eduardo:s3nha'), 'eduardo:s3nha')).toBe(true);
    expect(basicAuthOk(enc('eduardo:errada'), 'eduardo:s3nha')).toBe(false);
    expect(basicAuthOk(null, 'eduardo:s3nha')).toBe(false);
    expect(basicAuthOk(enc('eduardo:s3nha'), undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/auth/basic.ts
export function basicAuthOk(header: string | null, expected: string | undefined): boolean {
  if (!header || !expected || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  if (decoded.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < decoded.length; i++) diff |= decoded.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
```

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { basicAuthOk } from '@/lib/auth/basic';

export const config = { matcher: ['/dashboard/:path*', '/api/dash/:path*'] };

export function middleware(req: NextRequest) {
  if (basicAuthOk(req.headers.get('authorization'), process.env.DASHBOARD_BASIC_AUTH)) return NextResponse.next();
  return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="qx-hub"' } });
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(auth): basic auth middleware for dashboard routes`.

---

### Task 8: Queries do dashboard

**Files:**
- Create: `src/lib/dash/queries.ts`, `src/lib/dash/queries.test.ts`

**Interfaces:**
- Produces: `funnelByPerson(db, project, sinceIso): Promise<FunnelRow[]>`, `sessionsAtStep(db, project, order, limit)`, `sessionTimeline(db, sessionId)`, `capiFailed24h(db, project)`, `computeFunnel(steps, persons)` (puro)

- [ ] **Step 1: Teste**

```ts
// src/lib/dash/queries.test.ts
import { describe, it, expect } from 'vitest';
import { computeFunnel, funnelByPerson, sessionsAtStep, sessionTimeline, capiFailed24h } from './queries';
import { FakeDb } from '@/test/fakeDb';
import { PROJECTS } from '@/config/projects';

describe('computeFunnel', () => {
  it('conta pessoas cujo furthest_step >= ordem do step, com % overall e relativo', () => {
    const steps = [{ key: 'a', order: 1, label: 'A' }, { key: 'b', order: 2, label: 'B' }, { key: 'c', order: 3, label: 'C' }];
    const rows = computeFunnel(steps, [{ fs: 1, n: 5 }, { fs: 2, n: 3 }, { fs: 3, n: 2 }]);
    expect(rows.map((r) => r.count)).toEqual([10, 5, 2]);
    expect(rows[1].pctOverall).toBe(50);
    expect(rows[2].pctRelative).toBe(40);
    expect(rows[0].pctRelative).toBe(100);
  });
});

describe('sql', () => {
  it('funnelByPerson agrupa por pessoa com MAX(furthest_step) e exclui bots', async () => {
    const db = new FakeDb().willReturn([{ fs: 40, n: 2 }]);
    await funnelByPerson(db, PROJECTS.chia, '2026-08-01T00:00:00Z');
    expect(db.last().text).toMatch(/max\(furthest_step\)/i);
    expect(db.last().text).toMatch(/not is_bot/i);
    expect(db.last().text).toMatch(/group by anon_id/i);
    expect(db.last().params).toEqual(['chia', '2026-08-01T00:00:00Z']);
  });
  it('sessionsAtStep filtra furthest_step = ordem e limita', async () => {
    const db = new FakeDb();
    await sessionsAtStep(db, PROJECTS.chia, 40, 50);
    expect(db.last().text).toMatch(/furthest_step = \$2/i);
    expect(db.last().params).toEqual(['chia', 40, 50]);
  });
  it('sessionTimeline ordena por occurred_at', async () => {
    const db = new FakeDb();
    await sessionTimeline(db, '22222222-2222-4222-8222-222222222222');
    expect(db.last().text).toMatch(/order by occurred_at/i);
  });
  it('capiFailed24h conta failed nas últimas 24h', async () => {
    const db = new FakeDb().willReturn([{ n: 3 }]);
    expect(await capiFailed24h(db, PROJECTS.chia)).toBe(3);
    expect(db.last().text).toMatch(/capi_status = 'failed'/i);
    expect(db.last().text).toMatch(/interval '24 hours'/i);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/dash/queries.ts
import type { Db } from '@/lib/db';
import type { FunnelStep, ProjectConfig } from '@/config/projects';

export type FunnelRow = { key: string; order: number; label: string; count: number; pctOverall: number; pctRelative: number };
type PersonBucket = { fs: number; n: number };

export function computeFunnel(steps: FunnelStep[], persons: PersonBucket[]): FunnelRow[] {
  const total = persons.reduce((a, p) => a + Number(p.n), 0);
  let prev: number | null = null;
  return steps.map((s) => {
    const count = persons.filter((p) => Number(p.fs) >= s.order).reduce((a, p) => a + Number(p.n), 0);
    const pctOverall = total ? Math.round((count / total) * 1000) / 10 : 0;
    const pctRelative = prev == null ? 100 : prev ? Math.round((count / prev) * 1000) / 10 : 0;
    prev = count;
    return { key: s.key, order: s.order, label: s.label, count, pctOverall, pctRelative };
  });
}

export async function funnelByPerson(db: Db, project: ProjectConfig, sinceIso: string): Promise<FunnelRow[]> {
  const persons = await db.query<PersonBucket>(
    `with persons as (
       select anon_id, max(furthest_step) as fs from sessions
       where project_id = $1 and not is_bot and created_at >= $2
       group by anon_id)
     select fs, count(*)::int as n from persons group by fs`,
    [project.slug, sinceIso]
  );
  return computeFunnel(project.funnelSteps, persons);
}

export type SessionSummary = {
  session_id: string; anon_id: string; created_at: string; last_seen_at: string; furthest_step: number; furthest_event: string | null;
  utm_source: string | null; utm_content: string | null; meta_ad_id: string | null; purchase_status: string | null;
};

export async function sessionsAtStep(db: Db, project: ProjectConfig, order: number, limit = 100): Promise<SessionSummary[]> {
  return db.query<SessionSummary>(
    `select session_id, anon_id, created_at, last_seen_at, furthest_step, furthest_event, utm_source, utm_content, meta_ad_id, purchase_status
     from sessions where project_id = $1 and not is_bot and furthest_step = $2
     order by last_seen_at desc limit $3`,
    [project.slug, order, limit]
  );
}

export type TimelineEvent = { event_id: string; internal_name: string; meta_event_name: string | null; step_order: number | null; occurred_at: string; metadata: Record<string, unknown>; capi_status: string | null };

export async function sessionTimeline(db: Db, sessionId: string): Promise<{ session: SessionSummary | null; events: TimelineEvent[] }> {
  const [session] = await db.query<SessionSummary>(
    'select session_id, anon_id, created_at, last_seen_at, furthest_step, furthest_event, utm_source, utm_content, meta_ad_id, purchase_status from sessions where session_id = $1',
    [sessionId]
  );
  const events = await db.query<TimelineEvent>(
    'select event_id, internal_name, meta_event_name, step_order, occurred_at, metadata, capi_status from events where session_id = $1 order by occurred_at',
    [sessionId]
  );
  return { session: session ?? null, events };
}

export async function capiFailed24h(db: Db, project: ProjectConfig): Promise<number> {
  const [row] = await db.query<{ n: number }>(
    `select count(*)::int as n from events where project_id = $1 and capi_status = 'failed' and occurred_at > now() - interval '24 hours'`,
    [project.slug]
  );
  return Number(row?.n ?? 0);
}
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(dash): funnel-by-person, step drill-down, session timeline and CAPI health queries`.

---

### Task 9: Rotas `/api/dash/*`

**Files:**
- Create: `src/app/api/dash/[project]/funnel/route.ts`, `src/app/api/dash/[project]/sessions/route.ts`, `src/app/api/dash/[project]/session/[id]/route.ts`, `src/lib/dash/handlers.ts`, `src/lib/dash/handlers.test.ts`

- [ ] **Step 1: Teste**

```ts
// src/lib/dash/handlers.test.ts
import { describe, it, expect } from 'vitest';
import { funnelHandler, sessionsHandler, sessionHandler } from './handlers';
import { FakeDb } from '@/test/fakeDb';

describe('dash handlers', () => {
  it('funnel: 404 para projeto desconhecido; 200 com steps e capiFailed', async () => {
    expect((await funnelHandler(new FakeDb(), 'nope', new URL('http://h/api/dash/nope/funnel'))).status).toBe(404);
    const db = new FakeDb().willReturn([{ fs: 50, n: 1 }], [{ n: 0 }]);
    const res = await funnelHandler(db, 'chia', new URL('http://h/api/dash/chia/funnel?days=7'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.steps.at(-1)).toMatchObject({ key: 'checkout_click', count: 1 });
    expect(body.capiFailed24h).toBe(0);
    expect(db.calls[0].params[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('sessions: exige step numérico', async () => {
    expect((await sessionsHandler(new FakeDb(), 'chia', new URL('http://h/x?step=abc'))).status).toBe(400);
    expect((await sessionsHandler(new FakeDb(), 'chia', new URL('http://h/x?step=40'))).status).toBe(200);
  });
  it('session: 404 quando não existe', async () => {
    const db = new FakeDb().willReturn([], []);
    expect((await sessionHandler(db, '22222222-2222-4222-8222-222222222222')).status).toBe(404);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```ts
// src/lib/dash/handlers.ts
import type { Db } from '@/lib/db';
import { getProject } from '@/config/projects';
import { capiFailed24h, funnelByPerson, sessionTimeline, sessionsAtStep } from './queries';

const json = (d: unknown, status = 200) => Response.json(d, { status });

export async function funnelHandler(db: Db, slug: string, url: URL): Promise<Response> {
  const project = getProject(slug);
  if (!project) return json({ error: 'unknown_project' }, 404);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? 7)));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [steps, capiFailed] = [await funnelByPerson(db, project, since), await capiFailed24h(db, project)];
  return json({ project: project.slug, days, steps, capiFailed24h: capiFailed, generatedAt: new Date().toISOString() });
}

export async function sessionsHandler(db: Db, slug: string, url: URL): Promise<Response> {
  const project = getProject(slug);
  if (!project) return json({ error: 'unknown_project' }, 404);
  const step = Number(url.searchParams.get('step'));
  if (!Number.isInteger(step)) return json({ error: 'step_required' }, 400);
  return json({ step, sessions: await sessionsAtStep(db, project, step, 100) });
}

export async function sessionHandler(db: Db, sessionId: string): Promise<Response> {
  const data = await sessionTimeline(db, sessionId);
  if (!data.session) return json({ error: 'not_found' }, 404);
  return json(data);
}
```

Rotas (cada uma 6 linhas): `funnel/route.ts` → `export async function GET(req, { params }) { const { project } = await params; return funnelHandler(getDb(), project, new URL(req.url)); }`; `sessions/route.ts` idem com `sessionsHandler`; `session/[id]/route.ts` → `sessionHandler(getDb(), id)`. Todas com `export const runtime = 'nodejs'` e `export const dynamic = 'force-dynamic'`.

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(dash): API routes for funnel, step sessions and session timeline`.

---

### Task 10: Dashboard UI

**Files:**
- Create: `src/app/dashboard/[project]/page.tsx`, `src/app/dashboard/[project]/sessions/[id]/page.tsx`, `src/app/dashboard/_components/FunnelView.tsx`, `src/app/dashboard/_components/Timeline.tsx`, `src/app/dashboard/_components/FunnelView.test.tsx`, `src/app/page.tsx` (redirect), `src/app/layout.tsx` (título neutro)

- [ ] **Step 1: Teste (jsdom)**

```tsx
// src/app/dashboard/_components/FunnelView.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunnelView } from './FunnelView';

const funnel = {
  project: 'chia', days: 7, capiFailed24h: 2, generatedAt: '2026-08-26T12:00:00Z',
  steps: [
    { key: 'landing_view', order: 1, label: 'Landing', count: 10, pctOverall: 100, pctRelative: 100 },
    { key: 'quiz_complete', order: 40, label: 'Lead (nombre)', count: 4, pctOverall: 40, pctRelative: 40 },
  ],
};

describe('FunnelView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/funnel')) return new Response(JSON.stringify(funnel));
      return new Response(JSON.stringify({ step: 40, sessions: [{ session_id: 'abc', anon_id: 'p1', created_at: '2026-08-26T10:00:00Z', last_seen_at: '2026-08-26T10:05:00Z', furthest_step: 40, furthest_event: 'quiz_complete', utm_source: 'ig', utm_content: 'ad1', meta_ad_id: '3', purchase_status: null }] }));
    }));
  });

  it('mostra os steps com contagem e o card de CAPI failed', async () => {
    render(<FunnelView project="chia" pollMs={0} />);
    expect(await screen.findByText('Lead (nombre)')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/CAPI failed \(24h\)/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('clicar num step carrega as sessões daquele bucket com link para a timeline', async () => {
    render(<FunnelView project="chia" pollMs={0} />);
    await userEvent.click(await screen.findByText('Lead (nombre)'));
    await waitFor(() => expect(screen.getByText('ad1')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /abc/ })).toHaveAttribute('href', '/dashboard/chia/sessions/abc');
  });
});
```

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

```tsx
// src/app/dashboard/_components/FunnelView.tsx
'use client';

import { useEffect, useState } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';

type Step = { key: string; order: number; label: string; count: number; pctOverall: number; pctRelative: number };
type FunnelData = { project: string; days: number; steps: Step[]; capiFailed24h: number; generatedAt: string };
type Session = { session_id: string; anon_id: string; created_at: string; last_seen_at: string; furthest_step: number; furthest_event: string | null; utm_source: string | null; utm_content: string | null; meta_ad_id: string | null; purchase_status: string | null };

export function FunnelView({ project, pollMs = 10000 }: { project: string; pollMs?: number }) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<Step | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/dash/${project}/funnel?days=${days}`, { cache: 'no-store' });
      if (res.ok && alive) setData(await res.json());
    };
    load();
    if (!pollMs) return () => { alive = false; };
    const id = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [project, days, pollMs]);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/dash/${project}/sessions?step=${selected.order}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((d) => setSessions(d.sessions ?? []));
  }, [project, selected]);

  if (!data) return <p className="p-6 text-neutral-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Funil · {data.project}</h1>
        <div className="flex items-center gap-3 text-sm">
          <label>
            Período{' '}
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border px-2 py-1">
              {[1, 7, 30, 90].map((d) => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </label>
          <span className="text-neutral-500">atualizado {new Date(data.generatedAt).toLocaleTimeString()}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Pessoas (landing)" value={data.steps[0]?.count ?? 0} />
        <Card title="Leads" value={data.steps.find((s) => s.key === 'quiz_complete')?.count ?? 0} />
        <Card title="CAPI failed (24h)" value={data.capiFailed24h} warn={data.capiFailed24h > 0} />
      </section>

      <section className="rounded-lg border p-4">
        <div className="h-72">
          <ResponsiveContainer>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="count" data={data.steps.map((s) => ({ ...s, name: s.label, fill: '#2563eb' }))} isAnimationActive={false}>
                <LabelList position="right" dataKey="name" fill="#111" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-neutral-500"><tr><th>Step</th><th className="text-right">Pessoas</th><th className="text-right">% total</th><th className="text-right">% anterior</th></tr></thead>
          <tbody>
            {data.steps.map((s) => (
              <tr key={s.key} onClick={() => setSelected(s)} className={`cursor-pointer border-t hover:bg-neutral-50 ${selected?.key === s.key ? 'bg-blue-50' : ''}`}>
                <td className="py-1">{s.label}</td>
                <td className="text-right">{s.count}</td>
                <td className="text-right">{s.pctOverall}%</td>
                <td className="text-right">{s.pctRelative}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Sessões paradas em: {selected.label}</h2>
          {sessions.length === 0 ? <p className="mt-2 text-sm text-neutral-500">Nenhuma sessão neste bucket.</p> : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-neutral-500"><tr><th>Sessão</th><th>Início</th><th>Último evento</th><th>utm_source</th><th>utm_content</th><th>ad_id</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.session_id} className="border-t">
                    <td className="py-1"><a className="text-blue-700 underline" href={`/dashboard/${project}/sessions/${s.session_id}`}>{s.session_id.slice(0, 8)}…{s.session_id.slice(-4)}</a></td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>{s.furthest_event ?? '—'}</td>
                    <td>{s.utm_source ?? '—'}</td>
                    <td>{s.utm_content ?? '—'}</td>
                    <td>{s.meta_ad_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Card({ title, value, warn = false }: { title: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? 'border-red-300 bg-red-50' : ''}`}>
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
```

O teste do link usa `getByRole('link', { name: /abc/ })` — o texto renderizado é `abc…` só se o id tiver ≥ 12 chars; no teste o id é `abc`, então ajuste o componente para exibir o id inteiro quando tiver menos de 12 chars: `{s.session_id.length > 12 ? \`${s.session_id.slice(0, 8)}…${s.session_id.slice(-4)}\` : s.session_id}`.

```tsx
// src/app/dashboard/_components/Timeline.tsx
import type { TimelineEvent, SessionSummary } from '@/lib/dash/queries';

export function Timeline({ project, session, events }: { project: string; session: SessionSummary; events: TimelineEvent[] }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <a href={`/dashboard/${project}`} className="text-sm text-blue-700 underline">← Funil</a>
      <h1 className="text-xl font-semibold">Sessão {session.session_id}</h1>
      <dl className="grid grid-cols-2 gap-2 rounded-lg border p-4 text-sm sm:grid-cols-4">
        {[['Pessoa', session.anon_id.slice(0, 8)], ['Início', new Date(session.created_at).toLocaleString()], ['Último', new Date(session.last_seen_at).toLocaleString()],
          ['Step máx.', String(session.furthest_step)], ['utm_source', session.utm_source ?? '—'], ['utm_content', session.utm_content ?? '—'], ['ad_id', session.meta_ad_id ?? '—'], ['Compra', session.purchase_status ?? '—']]
          .map(([k, v]) => (<div key={k}><dt className="text-neutral-500">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <ol className="space-y-2">
        {events.map((e) => (
          <li key={e.event_id} className="rounded border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{e.internal_name}{e.meta_event_name ? ` → ${e.meta_event_name}` : ''}</span>
              <span className="text-neutral-500">{new Date(e.occurred_at).toLocaleTimeString()} · step {e.step_order ?? '—'}{e.capi_status ? ` · capi ${e.capi_status}` : ''}</span>
            </div>
            {Object.keys(e.metadata).length ? <pre className="mt-1 overflow-x-auto text-xs text-neutral-600">{JSON.stringify(e.metadata)}</pre> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

```tsx
// src/app/dashboard/[project]/page.tsx
import { notFound } from 'next/navigation';
import { getProject } from '@/config/projects';
import { FunnelView } from '../_components/FunnelView';

export default async function DashboardPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  if (!getProject(project)) notFound();
  return <FunnelView project={project} />;
}
```

```tsx
// src/app/dashboard/[project]/sessions/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { sessionTimeline } from '@/lib/dash/queries';
import { Timeline } from '../../../_components/Timeline';

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ project: string; id: string }> }) {
  const { project, id } = await params;
  const data = await sessionTimeline(getDb(), id);
  if (!data.session) notFound();
  return <Timeline project={project} session={data.session} events={data.events} />;
}
```

`src/app/page.tsx`: `import { redirect } from 'next/navigation'; export default function Home() { redirect('/dashboard/chia'); }`. `layout.tsx`: título "qx-hub", `lang="pt-BR"`, sem branding do produto.

- [ ] **Step 4: Rodar** `npx vitest run src/app/dashboard` → PASS; `npm run build` → OK. **Step 5: Commit** `feat(dash): funnel page with step drill-down and session timeline`.

---

### Task 11: Supabase + Vercel do hub (configuração) e migração em produção

**Files:** nenhum novo (config + execução). Passos do Eduardo marcados **[E]**.

- [ ] **Step 1 [E]: Criar projeto Supabase** — supabase.com → New project: nome `qx-hub`, região **East US (N. Virginia)**, senha forte do banco (guardar no gerenciador de senhas). Depois: Project Settings → Database → **Connection string** → aba *Transaction* (porta 6543) = `DATABASE_URL`; aba *Session* (porta 5432) = `DIRECT_URL`. Colar ambas em `qx-hub/.env` (gitignored).
- [ ] **Step 2: Migrar** — `cd qx-hub && npm run migrate` → `applied: 0001_init.sql`. Verificar no SQL Editor do Supabase: `select tablename, rowsecurity from pg_tables where schemaname='public';` → todas `true`.
- [ ] **Step 3: Projeto Vercel** — `npx vercel@latest link --yes --project qx-hub` (cria o projeto) e conectar o Git: `npx vercel@latest git connect` (ou no dashboard: Settings → Git → conectar `qortexia/qx-hub`). Envs (Production + Preview): `DATABASE_URL`, `DIRECT_URL` (Secret), `DASHBOARD_BASIC_AUTH` (Secret), `META_CAPI_TOKEN_CHIA` (Secret — mesmo token que está no quiz-app como `META_CAPI_ACCESS_TOKEN`), `META_GRAPH_VERSION=v23.0` (Config), `META_TEST_EVENT_CODE_CHIA` (Config, **só Preview**).
  ```bash
  npx vercel@latest env add DATABASE_URL production --sensitive --value "..."   # repetir para preview
  ```
- [ ] **Step 4: Deploy** — `git push origin main` → deploy automático; anotar a URL de produção do hub (`https://qx-hub.vercel.app`). Smoke: `curl -s -X POST https://qx-hub.vercel.app/api/ingest -d '{}' -H 'content-type: application/json'` → 400 `invalid_json`/`invalid_event`; `curl -u eduardo:senha https://qx-hub.vercel.app/api/dash/chia/funnel` → 200 com `steps`.
- [ ] **Step 5: Deployment Protection** — Vercel → qx-hub → Settings → Deployment Protection → **desligar Vercel Authentication para Production** (o rewrite do quiz-app precisa alcançar o hub sem cookie). Previews podem ficar protegidos.

---

### Task 12: quiz-app → hub (rewrite, provider, remover CAPI local)

**Files (quiz-app, branch `feat/tracking-fase-1-hub`):**
- Modify: `next.config.js`, `src/lib/tracking/provider.ts`, `src/lib/tracking/provider.test.ts`, `src/lib/tracking/eventMap.ts`, `src/lib/tracking/eventMap.test.ts`, `README.md`, `.env.local.example`
- Delete: `src/app/api/e/capi/route.ts`, `src/app/api/e/capi/route.test.ts`, `src/lib/tracking/server/capi.ts`, `src/lib/tracking/server/capi.test.ts`

**Interfaces:**
- Produces: `IngestPayload` (renomeado de `CapiClientPayload`, com `project`, `attribution`), `HEALTH_CONTEXT_EVENTS`, transporte default `POST /api/e/ingest`.

- [ ] **Step 1: Testes** — em `provider.test.ts`:
  - trocar as expectativas de `CapiClientPayload` para incluir `project: 'chia'` e `attribution` (objeto de `getAttribution()` filtrado por chaves, vazio no teste);
  - **novo:** "eventos não mapeados também vão ao transport" (`quiz_answer` → transport chamado com `meta_event_name: null`, `metadata: { step: 'peso' }`);
  - **novo:** "eventos de contexto de saúde não saem sem consentimento" (`quiz_step_view` sem `saveConsent()` → transport **não** chamado; após `saveConsent()` → chamado);
  - manter os testes de dedup/fbq.
  Em `eventMap.test.ts`: `HEALTH_CONTEXT_EVENTS` = `['quiz_step_view','quiz_answer','imc_view','projection_view']`.

- [ ] **Step 2: Rodar para ver falhar.**

- [ ] **Step 3: Implementar**

`eventMap.ts`: `export const HEALTH_CONTEXT_EVENTS: readonly AnalyticsEvent[] = ['quiz_step_view', 'quiz_answer', 'imc_view', 'projection_view'];`

`provider.ts` (mudanças):
```ts
export const PROJECT_SLUG = 'chia';
export interface IngestPayload {
  project: string; event_id: string; internal_name: AnalyticsEvent; meta_event_name: MetaEventName | null; occurred_at: string;
  event_source_url: string; anon_id: string; session_id: string; fbc: string | null; fbp: string | null;
  custom_data?: Record<string, string | number>; metadata: AnalyticsPayload; consent_version: string | null;
  attribution: Record<string, string>;
}
export type IngestTransport = (payload: IngestPayload) => Promise<void>;
export const defaultTransport: IngestTransport = async (payload) => {
  await fetch('/api/e/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
};
```
No closure: (1) calcular `meta`; (2) guard de dedup para **todo** evento (agora todos são enviados); (3) se `HEALTH_CONTEXT_EVENTS.includes(event) && !getConsent()` → `return` sem enviar; (4) `fbqTrack` só se `meta`; (5) montar `IngestPayload` com `attribution: getAttribution()` (só chaves com valor) e enviar sempre. Manter `try { transport(body).catch(noop) } catch {}`.

`next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const hub = process.env.HUB_URL;
    return hub ? [{ source: '/api/e/:path*', destination: `${hub}/api/:path*` }] : [];
  },
};
module.exports = nextConfig;
```
`HUB_URL=https://qx-hub.vercel.app` (env de build, Production + Preview). Sem `HUB_URL` o site continua funcionando (Pixel só).

Remover `src/app/api/e/capi/*` e `src/lib/tracking/server/*`; remover do README as envs `META_CAPI_ACCESS_TOKEN`/`META_TEST_EVENT_CODE`/`META_GRAPH_VERSION` e adicionar `HUB_URL`; `.env.local.example` idem.

- [ ] **Step 4: Rodar** `npm test && npx tsc --noEmit && npm run build` → tudo verde. **Step 5: Commit** `feat(tracking): send all events to the hub via first-party rewrite; drop local CAPI route`.

- [ ] **Step 6: Deploy** — `HUB_URL` no Vercel do quiz-app (Config, Production + Preview); remover `META_CAPI_ACCESS_TOKEN`, `META_TEST_EVENT_CODE`, `META_GRAPH_VERSION` do quiz-app (**só depois** de o hub estar respondendo em produção — Task 11 Step 4); push da branch → PR → merge → deploy.

---

### Task 13: QA ponta a ponta

- [ ] **Step 1: Preview do quiz-app** (com `META_TEST_EVENT_CODE_CHIA` no hub *Preview*? — não: o preview do quiz reescreve para o hub de **produção**; para QA com Test Events, definir temporariamente `META_TEST_EVENT_CODE_CHIA` em Production do hub, rodar, remover). Abrir o preview com `?utm_source=qa&ad_id=qa1&fbclid=QA123`, consentir, responder até o nome, ir à oferta, clicar no CTA.
- [ ] **Step 2: Dashboard** — `https://qx-hub.vercel.app/dashboard/chia` (Basic Auth): a pessoa aparece no funil, clicando em "Lead (nombre)" aparece a sessão, e a timeline mostra `landing_view → consent_accept → quiz_start → quiz_step_view:* → quiz_complete (→ Lead, capi sent) → ... → checkout_click (→ InitiateCheckout, capi sent)`, com `metadata` só de `step`/`resumeKey`/`priceMxn`.
- [ ] **Step 3: Test Events** — `Lead` e `InitiateCheckout` continuam uma linha só (navegador + servidor deduplicados), agora com o servidor sendo o hub.
- [ ] **Step 4: IP** — na sessão, `client_ip` preenchido (SQL Editor: `select client_ip, client_user_agent from sessions order by created_at desc limit 1`). Se vier `null`, o rewrite do Vercel não repassou `x-forwarded-for`: adicionar em `quiz-app/src/middleware.ts` um `NextResponse.rewrite` para `/api/e/*` que copie `request.ip`/`x-forwarded-for` para o header `x-client-ip`, e ler esse header no hub (`firstForwardedIp(req.headers.get('x-client-ip') ?? req.headers.get('x-forwarded-for'))`).
- [ ] **Step 5: Bots** — `curl -A facebookexternalhit ... /api/e/ingest` pelo domínio do quiz → a sessão aparece com `is_bot=true` e **não** aparece no funil.
- [ ] **Step 6: Remover** `META_TEST_EVENT_CODE_CHIA` de Production do hub; redeploy. Marcar Fase 1 ✅ no roadmap; nota diária.

---

## Self-review (feito ao escrever o plano)

- **Cobertura da spec §13 Fase 1:** hub em domínio neutro (T0/T11) · migração completa com todas as tabelas + RLS (T2) · `projects.ts` (T1) · `/api/ingest` com origin/shape/allowlist/strip/bot/ON CONFLICT/step_order/upsert/CAPI sem retry (T3-T6) · rewrite + `/api/e/ingest` + remoção do CAPI local (T12) · `consents` persistido (T4/T6) · dashboard com Basic Auth, funil por pessoa, drill-down 2 níveis, card CAPI failed (T7-T10) · polling (T10). **Fora desta fase, de propósito:** circuit breaker de volume (spec §6) — fica para quando houver volume; card "Meta vs CAPI" e receita (dependem da Fase 2/4); `video_watch` (tabela criada, escrita na Fase 3).
- **Placeholders:** nenhum; cada passo tem código ou comando.
- **Consistência de nomes:** `Db.query(text, params)` (T2) usado por T4/T8/T9/T10; `IngestPayloadSchema`/`IngestPayload` (T3) em T5/T6; `insertEvent/upsertSession/insertConsent/markCapi` (T4) em T5/T6; `dispatchCapi(db, project, payload, ctx, deps)` (T5) em T6; `funnelByPerson/sessionsAtStep/sessionTimeline/capiFailed24h` (T8) em T9/T10; `FUNNEL_STEPS_CHIA` keys `quiz_step_view:<id>` (T1) resolvidas por `resolveStep` (T3) e usadas no teste de T9 (`checkout_click`, order 50).
- **Risco conhecido:** propagação do IP pelo rewrite do Vercel — verificado em T13 Step 4 com fallback definido.
