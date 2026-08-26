# Fase 0a — Tracking no quiz-app (Pixel + CAPI same-origin) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o quiz-app emitir hoje eventos deduplicados pro Meta (Pixel no browser + Conversions API no servidor, mesmo `event_id`), propagar a identidade da sessão pro checkout Kiwify, exigir consentimento expresso antes do quiz, e corrigir a semântica dos eventos internos — sem hub, sem banco.

**Architecture:** Um mini-SDK em `src/lib/tracking/` (ids determinísticos, atribuição first-party, tabela canônica interno→Meta, provider) plugado no `analytics.ts` já existente via `setAnalyticsProvider`. O provider dispara `fbq(..., {eventID})` e faz `POST /api/e/capi` (route handler no próprio quiz-app, same-origin) que monta um payload de shape fixo e chama o Graph API. Tudo que vai pra Meta passa por uma allowlist tipada — dado de saúde não tem campo por onde sair.

**Tech Stack:** Next.js 14 (App Router, route handler Node), React 18, Zustand, Vitest + Testing Library (jsdom), `uuid` v11 (v4/v5), `node:crypto` (SHA-256), Meta Graph API `v23.0` (Conversions API), Meta Pixel (`fbevents.js`).

**Spec:** `docs/superpowers/specs/2026-08-24-tracking-hub-design.md` — seções §4 (identidade/event_id), §5 (contrato e tabela canônica), §7.1 (propagação pro checkout), §11.1-11.3 (consentimento, minimização, nomenclatura), §13 Fase 0a.

## Global Constraints

- `event_id` = `uuidv5(NAMESPACE, "{scope_id}:{event_name}:{step_ref}")`; scope = `anon_id` para `quiz_complete`, `session_id` para o resto. NAMESPACE fixo `6f1a3b2e-7c4d-4e5f-9a8b-1c2d3e4f5a6b` — nunca mudar (quebraria dedup).
- Só `Lead`, `InitiateCheckout`, `ViewContent` podem chegar à Meta. `Purchase` **nunca** sai do client nem desta API.
- `imc_view`, `projection_view` e qualquer valor de resposta do quiz **nunca** saem do browser.
- Nomes de evento / `content_name` / query strings enviados à Meta **não** contêm termos de saúde (`imc`, `peso`, `metabolico`, `adelgazar`).
- `em/ph/fn/ln` hasheados SHA-256; `fbc/fbp/client_ip_address/client_user_agent` **nunca** hasheados; `external_id` = SHA-256 do `anon_id`.
- `currency: 'MXN'` sempre que houver `value`.
- `action_source: 'website'` sempre. `event_time` = `occurred_at` do cliente se `|occurred_at − now| ≤ 10 min`, senão o horário do servidor.
- Envs: `NEXT_PUBLIC_META_PIXEL_ID` (pública), `META_CAPI_ACCESS_TOKEN` (server-only), `META_TEST_EVENT_CODE` (server-only, só durante QA), `META_GRAPH_VERSION` (opcional, default `v23.0`). Nunca commitar `.env*.local`.
- Copy pro usuário em espanhol (México). Mensagens de teste seguem o padrão existente (descrições em espanhol).
- Chaves de storage prefixadas `gel-chia-quiz-mx:` (padrão já usado em `videoPersistence.ts` e no zustand).
- Branch: `feat/tracking-fase-0a` a partir de `main`. Commits pequenos por tarefa. Sem push até o QA final passar.

---

## File Structure

**Criar**
- `src/lib/tracking/ids.ts` — `getAnonId()`, `getSessionId()`, `eventIdFor()`, `EVENT_ID_NAMESPACE`
- `src/lib/tracking/attribution.ts` — captura/persistência de UTM + IDs de anúncio, cookies `_fbp`/`_fbc`, reconstrução de `fbc`, `getCheckoutParams()`
- `src/lib/tracking/eventMap.ts` — `EVENT_MAP`, `META_EVENT_ALLOWLIST`, `METADATA_ALLOWLIST`, `EVENT_SCOPE`, `stepRefFor()`, `pickMetadata()`
- `src/lib/tracking/consent.ts` — `PRIVACY_POLICY_VERSION`, `getConsent()`, `saveConsent()`
- `src/lib/tracking/metaPixel.ts` — `fbqTrack()` + tipagem global de `window.fbq`
- `src/lib/tracking/provider.ts` — `createTrackingProvider()`, `CapiClientPayload`, `defaultTransport`, `buildCustomData()`
- `src/lib/tracking/server/capi.ts` — `sha256()`, `resolveEventTime()`, `buildServerEvent()`, `sendEventsToMeta()`, tipos `GraphEvent`/`ServerEventInput`
- `src/app/api/e/capi/route.ts` — `POST` handler
- `src/components/tracking/MetaPixelScript.tsx` — snippet do Pixel via `next/script`
- `src/components/tracking/TrackingProvider.tsx` — monta atribuição + provider no client
- testes `.test.ts(x)` ao lado de cada arquivo

**Modificar**
- `src/lib/analytics.ts` — novos eventos, remove `result_view`, exporta `AnalyticsProvider`, bufferiza até haver provider
- `src/app/layout.tsx` — `<MetaPixelScript>` + `<TrackingProvider>`
- `src/components/QuizFunnel.tsx` — Lead no `nombre`, `quiz_step_view`, remove `result_view`/`quiz_start`, checkout com `getCheckoutParams()`
- `src/components/vsl/GatedVSL.tsx` — `vsl_view`, `vsl_play` (onPlay), `vsl_error`, `vsl_continue_without_video`
- `src/components/home/LandingGate.tsx` — checkbox de consentimento, `consent_view/accept`, `quiz_start`
- `src/lib/content/copy.ts` — copy do consentimento
- `src/app/privacy/page.tsx` — aviso de privacidade completo
- `README.md`, `.env.local.example` — envs
- `package.json` — dependência `uuid`

---

### Task 0: Branch, dependência e commit da documentação

**Files:**
- Modify: `package.json`
- Commit: `docs/superpowers/specs/2026-08-24-tracking-hub-design.md`, `docs/superpowers/plans/*.md`

- [ ] **Step 1: Criar a branch**

```bash
cd "h:/Second_Brain/03-Dev/Projetos_Pessoal/Mounjaro de Chia/quiz-app"
git checkout -b feat/tracking-fase-0a
```

- [ ] **Step 2: Commitar spec e planos**

```bash
git add docs/superpowers
git commit -m "docs: tracking hub spec v2 + roadmap + fase 0a plan"
```

- [ ] **Step 3: Instalar `uuid` (v11 já traz tipos)**

```bash
npm install uuid@^11
```

- [ ] **Step 4: Confirmar que a suíte atual continua verde**

Run: `npm test`
Expected: todos os testes existentes PASS (baseline antes de mexer).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add uuid for deterministic tracking ids"
```

---

### Task 1: `analytics.ts` — novos eventos + buffer até o provider existir

**Files:**
- Modify: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts`

**Interfaces:**
- Produces: `type AnalyticsEvent` (união abaixo), `type AnalyticsProvider = (event, payload?) => void`, `track()`, `setAnalyticsProvider()`, `resetAnalytics()` (só para testes)
- Por que buffer: `LandingGate` dispara `landing_view` no mount, e efeitos de filhos rodam **antes** do efeito do `TrackingProvider` no layout. Sem buffer, os primeiros eventos se perdem.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/lib/analytics.test.ts`:

```ts
import { resetAnalytics } from './analytics';

describe('analytics buffer', () => {
  afterEach(() => {
    resetAnalytics();
  });

  it('guarda los eventos emitidos antes de configurar el provider y los entrega al configurarlo', () => {
    resetAnalytics();
    track('landing_view');
    track('quiz_start');
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    expect(spy).toHaveBeenNthCalledWith(1, 'landing_view', undefined);
    expect(spy).toHaveBeenNthCalledWith(2, 'quiz_start', undefined);
  });

  it('después de configurado, el provider recibe los eventos directamente (sin repetir los ya entregados)', () => {
    resetAnalytics();
    track('landing_view');
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    track('quiz_start');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('no acumula más de 100 eventos sin provider', () => {
    resetAnalytics();
    for (let i = 0; i < 150; i++) track('quiz_answer', { step: String(i) });
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    expect(spy).toHaveBeenCalledTimes(100);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: FAIL — `resetAnalytics` não existe / provider padrão descarta eventos.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `src/lib/analytics.ts`:

```ts
export type AnalyticsEvent =
  | 'landing_view'
  | 'consent_view'
  | 'consent_accept'
  | 'landing_cta_click'
  | 'quiz_start'
  | 'quiz_step_view'
  | 'quiz_answer'
  | 'imc_view'
  | 'projection_view'
  | 'quiz_complete'
  | 'vsl_view'
  | 'vsl_play'
  | 'vsl_cta_reveal'
  | 'vsl_cta_click'
  | 'vsl_error'
  | 'vsl_continue_without_video'
  | 'offer_view'
  | 'checkout_click';

export type AnalyticsPayload = Record<string, unknown>;
export type AnalyticsProvider = (event: AnalyticsEvent, payload?: AnalyticsPayload) => void;

const BUFFER_CAP = 100;

let provider: AnalyticsProvider | null = null;
let pending: Array<[AnalyticsEvent, AnalyticsPayload | undefined]> = [];

// Child effects (LandingGate's landing_view) run before the layout-level
// TrackingProvider effect that installs the real provider, so early events are
// held here and flushed in order once a provider exists.
export function setAnalyticsProvider(fn: AnalyticsProvider) {
  provider = fn;
  const queued = pending;
  pending = [];
  for (const [event, payload] of queued) fn(event, payload);
}

export function track(event: AnalyticsEvent, payload?: AnalyticsPayload) {
  if (provider) {
    provider(event, payload);
    return;
  }
  if (pending.length < BUFFER_CAP) pending.push([event, payload]);
}

export function resetAnalytics() {
  provider = null;
  pending = [];
}
```

- [ ] **Step 4: Rodar os testes de analytics**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: PASS (os 2 antigos + 3 novos).

- [ ] **Step 5: Rodar a suíte inteira e corrigir referências a `result_view`**

Run: `npm test`
Expected: pode falhar **compilação** em `QuizFunnel.tsx` (`'result_view'` não é mais `AnalyticsEvent`). Vitest não faz type-check, então provavelmente passa; confirme com `npx tsc --noEmit` → esperado 1 erro em `QuizFunnel.tsx:52`. Deixe — a Task 9 corrige. Se algum teste quebrar por eventos vazando entre testes (buffer), adicione `resetAnalytics()` no `afterEach` daquele arquivo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat(tracking): buffer analytics until provider exists; new event taxonomy"
```

---

### Task 2: `ids.ts` — anon_id, session_id e event_id determinístico

**Files:**
- Create: `src/lib/tracking/ids.ts`
- Test: `src/lib/tracking/ids.test.ts`

**Interfaces:**
- Produces: `getAnonId(): string` (localStorage, nunca rotaciona), `getSessionId(): string` (sessionStorage), `eventIdFor(scopeId: string, eventName: string, stepRef?: string): string` (uuid v5), `EVENT_ID_NAMESPACE`

- [ ] **Step 1: Teste**

```ts
// src/lib/tracking/ids.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAnonId, getSessionId, eventIdFor } from './ids';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('ids', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('getAnonId genera un uuid, lo guarda en localStorage y lo reutiliza', () => {
    const anon = getAnonId();
    expect(anon).toMatch(UUID_RE);
    expect(getAnonId()).toBe(anon);
    expect(window.localStorage.getItem('gel-chia-quiz-mx:anon_id')).toBe(anon);
  });

  it('getSessionId vive en sessionStorage y es distinto del anon_id', () => {
    const session = getSessionId();
    expect(session).toMatch(UUID_RE);
    expect(getSessionId()).toBe(session);
    expect(window.sessionStorage.getItem('gel-chia-quiz-mx:session_id')).toBe(session);
    expect(session).not.toBe(getAnonId());
  });

  it('una sesión nueva (sessionStorage vacío) genera otro session_id pero conserva el anon_id', () => {
    const anon = getAnonId();
    const first = getSessionId();
    window.sessionStorage.clear();
    expect(getSessionId()).not.toBe(first);
    expect(getAnonId()).toBe(anon);
  });

  it('eventIdFor es determinístico y cambia con scope, evento y stepRef', () => {
    const id = eventIdFor('scope-1', 'quiz_complete');
    expect(id).toMatch(UUID_RE);
    expect(eventIdFor('scope-1', 'quiz_complete')).toBe(id);
    expect(eventIdFor('scope-1', 'quiz_complete', '')).toBe(id);
    expect(eventIdFor('scope-2', 'quiz_complete')).not.toBe(id);
    expect(eventIdFor('scope-1', 'checkout_click')).not.toBe(id);
    expect(eventIdFor('scope-1', 'quiz_complete', 'nombre')).not.toBe(id);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/ids.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/ids.ts
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const ANON_KEY = 'gel-chia-quiz-mx:anon_id';
const SESSION_KEY = 'gel-chia-quiz-mx:session_id';

// Fixed forever: changing it changes every event_id and breaks dedup against
// events Meta already received.
export const EVENT_ID_NAMESPACE = '6f1a3b2e-7c4d-4e5f-9a8b-1c2d3e4f5a6b';

function safeStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readOrCreate(storage: Storage | null, key: string): string {
  if (!storage) return uuidv4();
  const existing = storage.getItem(key);
  if (existing) return existing;
  const created = uuidv4();
  storage.setItem(key, created);
  return created;
}

export function getAnonId(): string {
  return readOrCreate(safeStorage('local'), ANON_KEY);
}

export function getSessionId(): string {
  return readOrCreate(safeStorage('session'), SESSION_KEY);
}

export function eventIdFor(scopeId: string, eventName: string, stepRef = ''): string {
  return uuidv5(`${scopeId}:${eventName}:${stepRef}`, EVENT_ID_NAMESPACE);
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/ids.ts src/lib/tracking/ids.test.ts
git commit -m "feat(tracking): anon/session ids and deterministic uuid v5 event ids"
```

---

### Task 3: `attribution.ts` — UTM/IDs de anúncio, fbc/fbp, parâmetros do checkout

**Files:**
- Create: `src/lib/tracking/attribution.ts`
- Test: `src/lib/tracking/attribution.test.ts`

**Interfaces:**
- Consumes: `getAnonId()`, `getSessionId()` (Task 2)
- Produces: `ATTRIBUTION_KEYS`, `type Attribution`, `parseAttribution(search)`, `persistAttribution(search)` (write-once), `getAttribution()`, `readCookie(name, cookieString?)`, `getFbp()`, `getFbc()`, `buildFbc(fbclid, nowMs)`, `ensureFbc(search, nowMs?)`, `getCheckoutParams(search?)`

- [ ] **Step 1: Teste**

```ts
// src/lib/tracking/attribution.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseAttribution,
  persistAttribution,
  getAttribution,
  readCookie,
  getFbp,
  getFbc,
  buildFbc,
  ensureFbc,
  getCheckoutParams,
} from './attribution';
import { getAnonId, getSessionId } from './ids';

function clearCookie(name: string) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

describe('attribution', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearCookie('_fbp');
    clearCookie('_fbc');
  });

  it('parseAttribution extrae utm_*, fbclid y los ids dinámicos del anuncio, ignorando el resto', () => {
    const parsed = parseAttribution(
      '?utm_source=ig&utm_campaign=mx01&fbclid=AbC.123&campaign_id=1&adset_id=2&ad_id=3&placement=feed&foo=bar'
    );
    expect(parsed).toEqual({
      utm_source: 'ig',
      utm_campaign: 'mx01',
      fbclid: 'AbC.123',
      campaign_id: '1',
      adset_id: '2',
      ad_id: '3',
      placement: 'feed',
    });
  });

  it('persistAttribution es write-once: una visita posterior sin UTMs no borra la atribución original', () => {
    persistAttribution('?utm_source=ig&ad_id=3');
    persistAttribution('');
    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '3' });
  });

  it('persistAttribution no sobreescribe claves ya guardadas pero completa las que faltaban', () => {
    persistAttribution('?utm_source=ig');
    persistAttribution('?utm_source=fb&ad_id=9');
    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '9' });
  });

  it('readCookie lee una cookie por nombre y decodifica el valor', () => {
    expect(readCookie('_fbp', '_ga=1; _fbp=fb.1.1700000000000.42')).toBe('fb.1.1700000000000.42');
    expect(readCookie('_fbc', '_fbp=x')).toBeNull();
  });

  it('getFbp lee la cookie _fbp del documento', () => {
    document.cookie = '_fbp=fb.1.1700000000000.42; path=/';
    expect(getFbp()).toBe('fb.1.1700000000000.42');
  });

  it('buildFbc arma fb.1.{ts}.{fbclid} sin alterar el fbclid', () => {
    expect(buildFbc('AbC_dEf', 1700000000000)).toBe('fb.1.1700000000000.AbC_dEf');
  });

  it('ensureFbc reconstruye _fbc a partir de fbclid cuando la cookie no existe y la persiste', () => {
    const fbc = ensureFbc('?fbclid=AbC_dEf', 1700000000000);
    expect(fbc).toBe('fb.1.1700000000000.AbC_dEf');
    expect(readCookie('_fbc')).toBe('fb.1.1700000000000.AbC_dEf');
    expect(getFbc()).toBe('fb.1.1700000000000.AbC_dEf');
  });

  it('ensureFbc respeta una cookie _fbc ya existente (la del Pixel gana)', () => {
    document.cookie = '_fbc=fb.1.1600000000000.original; path=/';
    expect(ensureFbc('?fbclid=nuevo', 1700000000000)).toBe('fb.1.1600000000000.original');
  });

  it('ensureFbc devuelve null sin fbclid ni cookie', () => {
    expect(ensureFbc('?utm_source=ig', 1700000000000)).toBeNull();
  });

  it('getCheckoutParams incluye utm_*, s1=session_id, s2=anon_id, s3=fbc y sck=fbp', () => {
    document.cookie = '_fbp=fb.1.1700000000000.42; path=/';
    ensureFbc('?fbclid=AbC', 1700000000000);
    persistAttribution('?utm_source=ig&utm_campaign=mx01&ad_id=3');
    const params = getCheckoutParams('');
    expect(params).toEqual({
      utm_source: 'ig',
      utm_campaign: 'mx01',
      s1: getSessionId(),
      s2: getAnonId(),
      s3: 'fb.1.1700000000000.AbC',
      sck: 'fb.1.1700000000000.42',
    });
  });

  it('getCheckoutParams también toma los UTMs de la URL actual si aún no fueron persistidos', () => {
    const params = getCheckoutParams('?utm_source=direct-test');
    expect(params.utm_source).toBe('direct-test');
    expect(params.s1).toBe(getSessionId());
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/attribution.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/attribution.ts
import { getAnonId, getSessionId } from './ids';

export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

const UTM_KEYS: readonly AttributionKey[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

const ATTRIBUTION_KEY = 'gel-chia-quiz-mx:attribution';
const FBC_KEY = 'gel-chia-quiz-mx:fbc';
const FBC_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function getAttribution(): Attribution {
  const storage = localStorageOrNull();
  if (!storage) return {};
  try {
    const raw = storage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

// Write-once per key: a return visit without UTMs (or with a different
// campaign) must not erase the attribution of the click that brought the lead.
export function persistAttribution(search: string): Attribution {
  const merged: Attribution = { ...parseAttribution(search), ...getAttribution() };
  const storage = localStorageOrNull();
  if (storage) {
    try {
      storage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged));
    } catch {
      // storage full/blocked: attribution still returned for this pageview
    }
  }
  return merged;
}

export function readCookie(name: string, cookieString?: string): string | null {
  const source = cookieString ?? (typeof document !== 'undefined' ? document.cookie : '');
  const entry = source.split('; ').find((c) => c.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function getFbp(): string | null {
  return readCookie('_fbp');
}

export function getFbc(): string | null {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  const storage = localStorageOrNull();
  if (!storage) return null;
  try {
    return storage.getItem(FBC_KEY);
  } catch {
    return null;
  }
}

// Meta's documented format. fbclid is case-sensitive and must be copied verbatim.
export function buildFbc(fbclid: string, nowMs: number): string {
  return `fb.1.${nowMs}.${fbclid}`;
}

export function ensureFbc(search: string, nowMs: number = Date.now()): string | null {
  const existing = getFbc();
  if (existing) return existing;
  const fbclid = new URLSearchParams(search).get('fbclid');
  if (!fbclid) return null;
  const fbc = buildFbc(fbclid, nowMs);
  if (typeof document !== 'undefined') {
    document.cookie = `_fbc=${encodeURIComponent(fbc)}; max-age=${FBC_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
  }
  const storage = localStorageOrNull();
  if (storage) {
    try {
      storage.setItem(FBC_KEY, fbc);
    } catch {
      // cookie already set; localStorage copy is a fallback only
    }
  }
  return fbc;
}

// Only keys Kiwify forwards to its webhook/Sales API (utm_*, s1, s2, s3, sck).
// fbclid is deliberately excluded: fbc (s3) already carries it and Meta warns
// against re-propagating fbclid manually.
export function getCheckoutParams(search?: string): Record<string, string> {
  const currentSearch = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const attribution: Attribution = { ...parseAttribution(currentSearch), ...getAttribution() };
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = attribution[key];
    if (value) out[key] = value;
  }
  out.s1 = getSessionId();
  out.s2 = getAnonId();
  const fbc = getFbc();
  if (fbc) out.s3 = fbc;
  const fbp = getFbp();
  if (fbp) out.sck = fbp;
  return out;
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/attribution.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/attribution.ts src/lib/tracking/attribution.test.ts
git commit -m "feat(tracking): first-party attribution capture, fbc/fbp handling, checkout params"
```

---

### Task 4: `eventMap.ts` — tabela canônica interno→Meta

**Files:**
- Create: `src/lib/tracking/eventMap.ts`
- Test: `src/lib/tracking/eventMap.test.ts`

**Interfaces:**
- Consumes: `AnalyticsEvent` (Task 1)
- Produces: `type MetaEventName = 'Lead' | 'InitiateCheckout' | 'ViewContent'`, `META_EVENT_ALLOWLIST`, `EVENT_MAP: Record<AnalyticsEvent, MetaEventName | null>`, `METADATA_ALLOWLIST`, `EVENT_SCOPE`, `stepRefFor(event, payload?)`, `pickMetadata(event, payload?)`

- [ ] **Step 1: Teste**

```ts
// src/lib/tracking/eventMap.test.ts
import { describe, it, expect } from 'vitest';
import { EVENT_MAP, META_EVENT_ALLOWLIST, EVENT_SCOPE, stepRefFor, pickMetadata } from './eventMap';

describe('eventMap', () => {
  it('solo quiz_complete y checkout_click se traducen a eventos estándar de Meta (Lead / InitiateCheckout)', () => {
    expect(EVENT_MAP.quiz_complete).toBe('Lead');
    expect(EVENT_MAP.checkout_click).toBe('InitiateCheckout');
    const mapped = Object.entries(EVENT_MAP).filter(([, meta]) => meta !== null);
    expect(mapped).toEqual([
      ['quiz_complete', 'Lead'],
      ['checkout_click', 'InitiateCheckout'],
    ]);
  });

  it('los eventos con contexto de salud y los CTA de VSL nunca se mapean a Meta', () => {
    expect(EVENT_MAP.imc_view).toBeNull();
    expect(EVENT_MAP.projection_view).toBeNull();
    expect(EVENT_MAP.vsl_cta_click).toBeNull();
    expect(EVENT_MAP.landing_cta_click).toBeNull();
  });

  it('todo nombre mapeado pertenece a la allowlist de Meta', () => {
    for (const meta of Object.values(EVENT_MAP)) {
      if (meta) expect(META_EVENT_ALLOWLIST).toContain(meta);
    }
  });

  it('Lead usa scope por persona (anon); el resto por sesión', () => {
    expect(EVENT_SCOPE.quiz_complete).toBe('anon');
    expect(EVENT_SCOPE.checkout_click).toBeUndefined();
  });

  it('stepRefFor toma step o resumeKey del payload', () => {
    expect(stepRefFor('quiz_answer', { step: 'peso', value: 85 })).toBe('peso');
    expect(stepRefFor('vsl_play', { resumeKey: 'vsl2' })).toBe('vsl2');
    expect(stepRefFor('quiz_complete')).toBe('');
  });

  it('pickMetadata deja pasar solo las claves permitidas: el valor de la respuesta nunca sale', () => {
    expect(pickMetadata('quiz_answer', { step: 'peso', value: 85 })).toEqual({ step: 'peso' });
    expect(pickMetadata('checkout_click', { priceMxn: 199, extra: 'x' })).toEqual({ priceMxn: 199 });
    expect(pickMetadata('imc_view', { imc: 33 })).toEqual({});
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/eventMap.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/eventMap.ts
import type { AnalyticsEvent, AnalyticsPayload } from '@/lib/analytics';

export type MetaEventName = 'Lead' | 'InitiateCheckout' | 'ViewContent';

export const META_EVENT_ALLOWLIST: readonly MetaEventName[] = ['Lead', 'InitiateCheckout', 'ViewContent'];

// Single source of truth for internal → Meta translation. It happens once, in
// the client; the server only validates against META_EVENT_ALLOWLIST. null =
// stays internal (Supabase-only from Fase 1 on). ViewContent is reserved for
// the VSL milestones of Fase 3.
export const EVENT_MAP: Record<AnalyticsEvent, MetaEventName | null> = {
  landing_view: null, // PageView is fired by the pixel init snippet itself
  consent_view: null,
  consent_accept: null,
  landing_cta_click: null,
  quiz_start: null,
  quiz_step_view: null,
  quiz_answer: null,
  imc_view: null, // health context: must never reach Meta
  projection_view: null, // health context: must never reach Meta
  quiz_complete: 'Lead',
  vsl_view: null,
  vsl_play: null,
  vsl_cta_reveal: null,
  vsl_cta_click: null, // also fires on VSL1 mid-quiz; never InitiateCheckout
  vsl_error: null,
  vsl_continue_without_video: null,
  offer_view: null,
  checkout_click: 'InitiateCheckout',
};

// Keys of a track() payload allowed to leave the browser. Answer values and
// anything health-related are not listed, so they are dropped by construction.
export const METADATA_ALLOWLIST: Partial<Record<AnalyticsEvent, readonly string[]>> = {
  landing_cta_click: ['answer'],
  consent_accept: ['policy_version'],
  quiz_step_view: ['step', 'index'],
  quiz_answer: ['step'],
  vsl_view: ['resumeKey'],
  vsl_play: ['resumeKey'],
  vsl_cta_reveal: ['resumeKey'],
  vsl_cta_click: ['resumeKey'],
  vsl_error: ['resumeKey', 'code'],
  vsl_continue_without_video: ['resumeKey'],
  checkout_click: ['priceMxn'],
};

// Lead is keyed by person: the same person finishing the quiz again tomorrow
// (new session) must produce the same event_id so Meta dedups it.
export const EVENT_SCOPE: Partial<Record<AnalyticsEvent, 'anon'>> = {
  quiz_complete: 'anon',
};

export function stepRefFor(event: AnalyticsEvent, payload?: AnalyticsPayload): string {
  void event;
  const ref = payload?.step ?? payload?.resumeKey ?? '';
  return typeof ref === 'string' || typeof ref === 'number' ? String(ref) : '';
}

export function pickMetadata(event: AnalyticsEvent, payload?: AnalyticsPayload): AnalyticsPayload {
  const allowed = METADATA_ALLOWLIST[event] ?? [];
  const out: AnalyticsPayload = {};
  for (const key of allowed) {
    if (payload && payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/eventMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/eventMap.ts src/lib/tracking/eventMap.test.ts
git commit -m "feat(tracking): canonical internal→Meta event map with metadata allowlist"
```

---

### Task 5: `consent.ts` e `metaPixel.ts`

**Files:**
- Create: `src/lib/tracking/consent.ts`, `src/lib/tracking/metaPixel.ts`
- Test: `src/lib/tracking/consent.test.ts`, `src/lib/tracking/metaPixel.test.ts`

**Interfaces:**
- Produces: `PRIVACY_POLICY_VERSION = '2026-08-24'`, `type ConsentRecord = { accepted_at: string; policy_version: string }`, `getConsent()`, `saveConsent(now?, policyVersion?)`; `fbqTrack(name: MetaEventName, params, eventID): boolean`; declaração global `window.fbq`

- [ ] **Step 1: Testes**

```ts
// src/lib/tracking/consent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getConsent, saveConsent, PRIVACY_POLICY_VERSION } from './consent';

describe('consent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sin aceptación previa devuelve null', () => {
    expect(getConsent()).toBeNull();
  });

  it('saveConsent guarda fecha y versión de la política y getConsent la devuelve', () => {
    const record = saveConsent(new Date('2026-08-24T15:00:00Z'));
    expect(record).toEqual({ accepted_at: '2026-08-24T15:00:00.000Z', policy_version: PRIVACY_POLICY_VERSION });
    expect(getConsent()).toEqual(record);
    expect(window.localStorage.getItem('gel-chia-quiz-mx:consent')).toContain(PRIVACY_POLICY_VERSION);
  });
});
```

```ts
// src/lib/tracking/metaPixel.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fbqTrack } from './metaPixel';

describe('fbqTrack', () => {
  afterEach(() => {
    delete window.fbq;
  });

  it('llama a fbq("track", nombre, params, { eventID }) y devuelve true', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    expect(fbqTrack('Lead', {}, 'evt-1')).toBe(true);
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', {}, { eventID: 'evt-1' });
  });

  it('sin fbq cargado devuelve false sin lanzar', () => {
    expect(fbqTrack('Lead', {}, 'evt-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/consent.test.ts src/lib/tracking/metaPixel.test.ts`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/consent.ts
export const PRIVACY_POLICY_VERSION = '2026-08-24';

const CONSENT_KEY = 'gel-chia-quiz-mx:consent';

export type ConsentRecord = { accepted_at: string; policy_version: string };

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

export function saveConsent(now: Date = new Date(), policyVersion: string = PRIVACY_POLICY_VERSION): ConsentRecord {
  const record: ConsentRecord = { accepted_at: now.toISOString(), policy_version: policyVersion };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      // blocked storage: consent still valid for this pageview
    }
  }
  return record;
}
```

```ts
// src/lib/tracking/metaPixel.ts
import type { MetaEventName } from './eventMap';

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function fbqTrack(name: MetaEventName, params: Record<string, unknown>, eventID: string): boolean {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return false;
  window.fbq('track', name, params, { eventID });
  return true;
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/consent.test.ts src/lib/tracking/metaPixel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/consent.ts src/lib/tracking/consent.test.ts src/lib/tracking/metaPixel.ts src/lib/tracking/metaPixel.test.ts
git commit -m "feat(tracking): consent record and fbq wrapper"
```

---

### Task 6: `provider.ts` — o provider que liga tudo (fbq + CAPI, dedup)

**Files:**
- Create: `src/lib/tracking/provider.ts`
- Test: `src/lib/tracking/provider.test.ts`

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: `interface CapiClientPayload { event_id; meta_event_name; occurred_at; event_source_url; anon_id; session_id; fbc; fbp; custom_data? }`, `type CapiTransport = (payload) => Promise<void>`, `defaultTransport` (POST `/api/e/capi`, `keepalive`), `buildCustomData(meta, payload?)`, `createTrackingProvider({ transport?, now? }): AnalyticsProvider`

- [ ] **Step 1: Teste**

```ts
// src/lib/tracking/provider.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrackingProvider, buildCustomData } from './provider';
import { getAnonId, getSessionId, eventIdFor } from './ids';

describe('createTrackingProvider', () => {
  const fixedNow = () => new Date('2026-08-24T12:00:00Z');

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    delete window.fbq;
  });

  it('checkout_click → fbq InitiateCheckout con eventID determinístico y value/currency MXN, y POST al transport', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });

    provider('checkout_click', { priceMxn: 199 });

    const expectedId = eventIdFor(getSessionId(), 'checkout_click', '');
    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', { value: 199, currency: 'MXN' }, { eventID: expectedId });
    expect(transport).toHaveBeenCalledWith({
      event_id: expectedId,
      meta_event_name: 'InitiateCheckout',
      occurred_at: '2026-08-24T12:00:00.000Z',
      event_source_url: window.location.href,
      anon_id: getAnonId(),
      session_id: getSessionId(),
      fbc: null,
      fbp: null,
      custom_data: { value: 199, currency: 'MXN' },
    });
  });

  it('quiz_complete → Lead con event_id por anon_id: misma persona en otra sesión produce el MISMO id', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const expectedId = eventIdFor(getAnonId(), 'quiz_complete', '');

    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    window.sessionStorage.clear(); // nueva sesión, mismo navegador
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');

    expect(fbq).toHaveBeenCalledTimes(2);
    expect(fbq).toHaveBeenNthCalledWith(1, 'track', 'Lead', {}, { eventID: expectedId });
    expect(fbq).toHaveBeenNthCalledWith(2, 'track', 'Lead', {}, { eventID: expectedId });
  });

  it('no reenvía el mismo evento dos veces en la misma sesión, ni siquiera tras un remount/reload del provider', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);

    const first = createTrackingProvider({ transport, now: fixedNow });
    first('checkout_click', { priceMxn: 199 });
    first('checkout_click', { priceMxn: 199 });
    const afterReload = createTrackingProvider({ transport, now: fixedNow });
    afterReload('checkout_click', { priceMxn: 199 });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('eventos no mapeados (imc_view, quiz_answer…) no tocan fbq ni el transport', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    const transport = vi.fn().mockResolvedValue(undefined);
    const provider = createTrackingProvider({ transport, now: fixedNow });

    provider('imc_view');
    provider('quiz_answer', { step: 'peso', value: 85 });
    provider('vsl_cta_click', { resumeKey: 'vsl1' });

    expect(fbq).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('sin fbq cargado igual envía al transport (el servidor cubre al navegador)', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('incluye fbc y fbp cuando existen las cookies', () => {
    document.cookie = '_fbp=fb.1.1.42; path=/';
    document.cookie = '_fbc=fb.1.1.abc; path=/';
    const transport = vi.fn().mockResolvedValue(undefined);
    createTrackingProvider({ transport, now: fixedNow })('quiz_complete');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ fbc: 'fb.1.1.abc', fbp: 'fb.1.1.42' }));
    document.cookie = '_fbp=; max-age=0; path=/';
    document.cookie = '_fbc=; max-age=0; path=/';
  });

  it('un transport que falla no rompe el flujo', () => {
    const transport = vi.fn().mockRejectedValue(new Error('network'));
    expect(() => createTrackingProvider({ transport, now: fixedNow })('quiz_complete')).not.toThrow();
  });
});

describe('buildCustomData', () => {
  it('InitiateCheckout lleva value + currency MXN', () => {
    expect(buildCustomData('InitiateCheckout', { priceMxn: 199 })).toEqual({ value: 199, currency: 'MXN' });
  });
  it('ViewContent lleva content_name genérico', () => {
    expect(buildCustomData('ViewContent', { content_name: 'vsl2_75' })).toEqual({ content_name: 'vsl2_75' });
  });
  it('Lead no lleva custom_data', () => {
    expect(buildCustomData('Lead', { nombre: 'Ana' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/provider.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/provider.ts
import type { AnalyticsEvent, AnalyticsPayload, AnalyticsProvider } from '@/lib/analytics';
import { getAnonId, getSessionId, eventIdFor } from './ids';
import { EVENT_MAP, EVENT_SCOPE, stepRefFor, type MetaEventName } from './eventMap';
import { getFbc, getFbp } from './attribution';
import { fbqTrack } from './metaPixel';

export interface CapiClientPayload {
  event_id: string;
  meta_event_name: MetaEventName;
  occurred_at: string;
  event_source_url: string;
  anon_id: string;
  session_id: string;
  fbc: string | null;
  fbp: string | null;
  custom_data?: Record<string, string | number>;
}

export type CapiTransport = (payload: CapiClientPayload) => Promise<void>;

const SENT_KEY = 'gel-chia-quiz-mx:sent_event_ids';
const SENT_CAP = 500;

function sessionStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadSent(): Set<string> {
  const storage = sessionStorageOrNull();
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(SENT_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSent(sent: Set<string>, eventId: string) {
  sent.add(eventId);
  const storage = sessionStorageOrNull();
  if (!storage) return;
  try {
    storage.setItem(SENT_KEY, JSON.stringify(Array.from(sent).slice(-SENT_CAP)));
  } catch {
    // in-memory set still guards this pageview
  }
}

// The only custom_data shapes that exist. Anything else in a track() payload
// (answers, IMC, names) has no path to Meta.
export function buildCustomData(meta: MetaEventName, payload?: AnalyticsPayload): Record<string, string | number> | undefined {
  if (meta === 'InitiateCheckout' && typeof payload?.priceMxn === 'number') {
    return { value: payload.priceMxn, currency: 'MXN' };
  }
  if (meta === 'ViewContent' && typeof payload?.content_name === 'string') {
    return { content_name: payload.content_name };
  }
  return undefined;
}

export const defaultTransport: CapiTransport = async (payload) => {
  await fetch('/api/e/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
};

export function createTrackingProvider(
  opts: { transport?: CapiTransport; now?: () => Date } = {}
): AnalyticsProvider {
  const transport = opts.transport ?? defaultTransport;
  const now = opts.now ?? (() => new Date());
  const sent = loadSent();

  return (event: AnalyticsEvent, payload?: AnalyticsPayload) => {
    const anonId = getAnonId();
    const sessionId = getSessionId();
    const scopeId = EVENT_SCOPE[event] === 'anon' ? anonId : sessionId;
    const eventId = eventIdFor(scopeId, event, stepRefFor(event, payload));

    if (sent.has(eventId)) return;
    markSent(sent, eventId);

    const meta = EVENT_MAP[event];
    if (!meta) return;

    const customData = buildCustomData(meta, payload);
    fbqTrack(meta, customData ?? {}, eventId);

    const body: CapiClientPayload = {
      event_id: eventId,
      meta_event_name: meta,
      occurred_at: now().toISOString(),
      event_source_url: window.location.href,
      anon_id: anonId,
      session_id: sessionId,
      fbc: getFbc(),
      fbp: getFbp(),
    };
    if (customData) body.custom_data = customData;
    transport(body).catch(() => {
      // browser pixel already fired; server mirror is best-effort here (retry lives in the hub, Fase 1)
    });
  };
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/provider.ts src/lib/tracking/provider.test.ts
git commit -m "feat(tracking): provider firing fbq + CAPI transport with deterministic dedup"
```

---

### Task 7: `server/capi.ts` — payload de shape fixo e envio ao Graph API

**Files:**
- Create: `src/lib/tracking/server/capi.ts`
- Test: `src/lib/tracking/server/capi.test.ts`

**Interfaces:**
- Consumes: `META_EVENT_ALLOWLIST`, `MetaEventName` (Task 4)
- Produces: `sha256(value)`, `isMetaEventName(v)`, `resolveEventTime(occurredAt, now)`, `interface ServerEventInput`, `interface GraphEvent`, `buildServerEvent(input, now)`, `interface MetaConfig { pixelId; accessToken; testEventCode?; graphVersion?; fetchImpl? }`, `sendEventsToMeta(events, cfg): Promise<{ events_received; fbtrace_id? }>`, `DEFAULT_GRAPH_VERSION = 'v23.0'`, `EVENT_TIME_TOLERANCE_MS`

- [ ] **Step 1: Teste**

```ts
// src/lib/tracking/server/capi.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { sha256, resolveEventTime, buildServerEvent, sendEventsToMeta, isMetaEventName } from './capi';

const NOW = new Date('2026-08-24T12:00:00Z');

describe('sha256', () => {
  it('produce el hex SHA-256 esperado', () => {
    expect(sha256('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  });
});

describe('isMetaEventName', () => {
  it('acepta solo Lead / InitiateCheckout / ViewContent', () => {
    expect(isMetaEventName('Lead')).toBe(true);
    expect(isMetaEventName('Purchase')).toBe(false);
    expect(isMetaEventName(42)).toBe(false);
  });
});

describe('resolveEventTime', () => {
  it('usa occurred_at del cliente cuando está dentro de 10 minutos', () => {
    expect(resolveEventTime('2026-08-24T11:55:00Z', NOW)).toBe(Math.floor(Date.parse('2026-08-24T11:55:00Z') / 1000));
  });
  it('cae al reloj del servidor si el cliente está desfasado más de 10 minutos', () => {
    expect(resolveEventTime('2026-08-24T09:00:00Z', NOW)).toBe(Math.floor(NOW.getTime() / 1000));
  });
  it('cae al reloj del servidor si occurred_at no es una fecha', () => {
    expect(resolveEventTime('ayer', NOW)).toBe(Math.floor(NOW.getTime() / 1000));
  });
});

describe('buildServerEvent', () => {
  const base = {
    event_id: '11111111-1111-5111-8111-111111111111',
    meta_event_name: 'InitiateCheckout' as const,
    occurred_at: '2026-08-24T11:59:00Z',
    event_source_url: 'https://example.com/?utm_source=ig',
    anon_id: 'anon-1',
    fbc: 'fb.1.1.abc',
    fbp: 'fb.1.1.42',
    client_ip_address: '187.1.2.3',
    client_user_agent: 'Mozilla/5.0',
    custom_data: { value: 199, currency: 'MXN' },
  };

  it('arma el evento con action_source website, external_id hasheado y fbc/fbp/ip/ua en claro', () => {
    const event = buildServerEvent(base, NOW);
    expect(event).toEqual({
      event_name: 'InitiateCheckout',
      event_time: Math.floor(Date.parse('2026-08-24T11:59:00Z') / 1000),
      event_id: base.event_id,
      action_source: 'website',
      event_source_url: base.event_source_url,
      user_data: {
        external_id: [sha256('anon-1')],
        fbc: 'fb.1.1.abc',
        fbp: 'fb.1.1.42',
        client_ip_address: '187.1.2.3',
        client_user_agent: 'Mozilla/5.0',
      },
      custom_data: { value: 199, currency: 'MXN' },
    });
  });

  it('omite los campos nulos en vez de mandarlos vacíos', () => {
    const event = buildServerEvent({ ...base, fbc: null, fbp: null, client_ip_address: null, client_user_agent: null, custom_data: undefined }, NOW);
    expect(event.user_data).toEqual({ external_id: [sha256('anon-1')] });
    expect(event).not.toHaveProperty('custom_data');
  });
});

describe('sendEventsToMeta', () => {
  const event = buildServerEvent(
    {
      event_id: '11111111-1111-5111-8111-111111111111',
      meta_event_name: 'Lead',
      occurred_at: NOW.toISOString(),
      event_source_url: 'https://example.com/',
      anon_id: 'anon-1',
      fbc: null,
      fbp: null,
      client_ip_address: null,
      client_user_agent: null,
    },
    NOW
  );

  it('hace POST al endpoint /events del pixel con el token en la query y test_event_code en el body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'trace-1' }), { status: 200 })
    );
    const result = await sendEventsToMeta([event], {
      pixelId: '123',
      accessToken: 'tok',
      testEventCode: 'TEST1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ events_received: 1, fbtrace_id: 'trace-1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v23.0/123/events?access_token=tok');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ data: [event], test_event_code: 'TEST1' });
  });

  it('sin test_event_code no incluye la clave en el body y respeta META_GRAPH_VERSION', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    await sendEventsToMeta([event], { pixelId: '123', accessToken: 'tok', graphVersion: 'v24.0', fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/v24.0/');
    expect(JSON.parse(init.body)).toEqual({ data: [event] });
  });

  it('lanza con el mensaje de error de Meta cuando la respuesta no es 2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid parameter' } }), { status: 400 })
    );
    await expect(
      sendEventsToMeta([event], { pixelId: '123', accessToken: 'tok', fetchImpl: fetchImpl as unknown as typeof fetch })
    ).rejects.toThrow('Meta CAPI 400: Invalid parameter');
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/lib/tracking/server/capi.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/tracking/server/capi.ts
import { createHash } from 'node:crypto';
import { META_EVENT_ALLOWLIST, type MetaEventName } from '../eventMap';

export const DEFAULT_GRAPH_VERSION = 'v23.0';
export const EVENT_TIME_TOLERANCE_MS = 10 * 60 * 1000;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function isMetaEventName(value: unknown): value is MetaEventName {
  return typeof value === 'string' && (META_EVENT_ALLOWLIST as readonly string[]).includes(value);
}

// Client clocks drift and sendBeacon flushes late; beyond the tolerance we
// trust the server clock. Retries (Fase 1+) must reuse the persisted value,
// never call this again with a fresh `now`.
export function resolveEventTime(occurredAt: string, now: Date): number {
  const parsed = Date.parse(occurredAt);
  const withinTolerance = Number.isFinite(parsed) && Math.abs(now.getTime() - parsed) <= EVENT_TIME_TOLERANCE_MS;
  return Math.floor((withinTolerance ? parsed : now.getTime()) / 1000);
}

export interface ServerEventInput {
  event_id: string;
  meta_event_name: MetaEventName;
  occurred_at: string;
  event_source_url: string;
  anon_id: string;
  fbc: string | null;
  fbp: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  custom_data?: Record<string, string | number>;
}

// The only shape that can reach Meta. There is no field for quiz answers or
// health data by design.
export interface GraphEvent {
  event_name: MetaEventName;
  event_time: number;
  event_id: string;
  action_source: 'website';
  event_source_url: string;
  user_data: {
    external_id: string[];
    fbc?: string;
    fbp?: string;
    client_ip_address?: string;
    client_user_agent?: string;
  };
  custom_data?: Record<string, string | number>;
}

export function buildServerEvent(input: ServerEventInput, now: Date): GraphEvent {
  const user_data: GraphEvent['user_data'] = { external_id: [sha256(input.anon_id)] };
  if (input.fbc) user_data.fbc = input.fbc;
  if (input.fbp) user_data.fbp = input.fbp;
  if (input.client_ip_address) user_data.client_ip_address = input.client_ip_address;
  if (input.client_user_agent) user_data.client_user_agent = input.client_user_agent;

  const event: GraphEvent = {
    event_name: input.meta_event_name,
    event_time: resolveEventTime(input.occurred_at, now),
    event_id: input.event_id,
    action_source: 'website',
    event_source_url: input.event_source_url,
    user_data,
  };
  if (input.custom_data) event.custom_data = input.custom_data;
  return event;
}

export interface MetaConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  graphVersion?: string;
  fetchImpl?: typeof fetch;
}

export interface MetaSendResult {
  events_received: number;
  fbtrace_id?: string;
}

export async function sendEventsToMeta(events: GraphEvent[], cfg: MetaConfig): Promise<MetaSendResult> {
  const doFetch = cfg.fetchImpl ?? fetch;
  const version = cfg.graphVersion ?? DEFAULT_GRAPH_VERSION;
  const url = `https://graph.facebook.com/${version}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.accessToken)}`;
  const body: Record<string, unknown> = { data: events };
  if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;

  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    events_received?: number;
    fbtrace_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Meta CAPI ${res.status}: ${json.error?.message ?? 'unknown error'}`);
  return { events_received: json.events_received ?? 0, fbtrace_id: json.fbtrace_id };
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/lib/tracking/server/capi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking/server/capi.ts src/lib/tracking/server/capi.test.ts
git commit -m "feat(tracking): server-side CAPI payload builder and Graph API sender"
```

---

### Task 8: Route handler `POST /api/e/capi`

**Files:**
- Create: `src/app/api/e/capi/route.ts`
- Test: `src/app/api/e/capi/route.test.ts`

**Interfaces:**
- Consumes: Task 7
- Produces: `POST(req: Request): Promise<NextResponse>` — 503 sem env, 400 body inválido, 200 `{ events_received, fbtrace_id }`, 502 se a Meta falhar. `custom_data` aceito só com `value` (number), `currency` (string), `content_name` (string).

- [ ] **Step 1: Teste**

```ts
// src/app/api/e/capi/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { sha256 } from '@/lib/tracking/server/capi';

const VALID_BODY = {
  event_id: '11111111-1111-5111-8111-111111111111',
  meta_event_name: 'Lead',
  occurred_at: new Date().toISOString(),
  event_source_url: 'https://example.com/',
  anon_id: 'anon-1',
  session_id: 'sess-1',
  fbc: 'fb.1.1.abc',
  fbp: 'fb.1.1.42',
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/e/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/e/capi', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123');
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'tok');
    vi.stubEnv('META_TEST_EVENT_CODE', '');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ events_received: 1, fbtrace_id: 't1' }), { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('responde 503 cuando faltan las envs del pixel/token', async () => {
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', '');
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it('responde 400 con JSON inválido', async () => {
    const res = await POST(makeRequest('{not json'));
    expect(res.status).toBe(400);
  });

  it('rechaza nombres fuera de la allowlist (Purchase jamás sale de aquí)', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, meta_event_name: 'Purchase' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza event_id que no sea uuid', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, event_id: 'abc' }));
    expect(res.status).toBe(400);
  });

  it('envía el evento a Meta con ip del primer x-forwarded-for, user-agent y external_id hasheado', async () => {
    const res = await POST(
      makeRequest(VALID_BODY, { 'x-forwarded-for': '187.1.2.3, 10.0.0.1', 'user-agent': 'Mozilla/5.0 test' })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ events_received: 1, fbtrace_id: 't1' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v23.0/123/events?access_token=tok');
    const sent = JSON.parse(init.body);
    expect(sent.data[0]).toMatchObject({
      event_name: 'Lead',
      event_id: VALID_BODY.event_id,
      action_source: 'website',
      user_data: {
        external_id: [sha256('anon-1')],
        fbc: 'fb.1.1.abc',
        fbp: 'fb.1.1.42',
        client_ip_address: '187.1.2.3',
        client_user_agent: 'Mozilla/5.0 test',
      },
    });
    expect(sent).not.toHaveProperty('test_event_code');
  });

  it('incluye test_event_code cuando META_TEST_EVENT_CODE está definido', async () => {
    vi.stubEnv('META_TEST_EVENT_CODE', 'TEST9');
    await POST(makeRequest(VALID_BODY));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).test_event_code).toBe('TEST9');
  });

  it('solo deja pasar value/currency/content_name en custom_data; descarta cualquier otra clave', async () => {
    await POST(
      makeRequest({
        ...VALID_BODY,
        meta_event_name: 'InitiateCheckout',
        custom_data: { value: 199, currency: 'MXN', peso: 85, imc: 33 },
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).data[0].custom_data).toEqual({ value: 199, currency: 'MXN' });
  });

  it('responde 502 si Meta falla, sin lanzar', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 }));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/app/api/e/capi/route.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/app/api/e/capi/route.ts
import { NextResponse } from 'next/server';
import { buildServerEvent, isMetaEventName, sendEventsToMeta } from '@/lib/tracking/server/capi';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// Strict allowlist: this is the compliance guardrail on the server side.
function pickCustomData(value: unknown): Record<string, string | number> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  if (typeof raw.value === 'number') out.value = raw.value;
  if (typeof raw.currency === 'string') out.currency = raw.currency;
  if (typeof raw.content_name === 'string') out.content_name = raw.content_name;
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: Request) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    return NextResponse.json({ error: 'capi_not_configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { event_id, meta_event_name, occurred_at, event_source_url, anon_id } = body;
  if (
    typeof event_id !== 'string' ||
    !UUID_RE.test(event_id) ||
    !isMetaEventName(meta_event_name) ||
    typeof occurred_at !== 'string' ||
    typeof event_source_url !== 'string' ||
    typeof anon_id !== 'string' ||
    anon_id.length === 0
  ) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  const event = buildServerEvent(
    {
      event_id,
      meta_event_name,
      occurred_at,
      event_source_url,
      anon_id,
      fbc: optionalString(body.fbc),
      fbp: optionalString(body.fbp),
      client_ip_address: clientIp(req),
      client_user_agent: req.headers.get('user-agent'),
      custom_data: pickCustomData(body.custom_data),
    },
    new Date()
  );

  try {
    const result = await sendEventsToMeta([event], {
      pixelId,
      accessToken,
      testEventCode: process.env.META_TEST_EVENT_CODE || undefined,
      graphVersion: process.env.META_GRAPH_VERSION || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('capi_send_failed', event.event_name, event.event_id, (err as Error).message);
    return NextResponse.json({ error: 'capi_send_failed' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/app/api/e/capi/route.test.ts`
Expected: PASS. Se `next/server` reclamar de `Request` no ambiente node do Vitest, confirme que o comentário `// @vitest-environment node` está na **primeira linha** do teste.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/e/capi/route.ts src/app/api/e/capi/route.test.ts
git commit -m "feat(tracking): same-origin /api/e/capi route mirroring pixel events to Meta"
```

---

### Task 9: `MetaPixelScript`, `TrackingProvider` e `layout.tsx`

**Files:**
- Create: `src/components/tracking/MetaPixelScript.tsx`, `src/components/tracking/TrackingProvider.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/tracking/TrackingProvider.test.tsx`

**Interfaces:**
- Consumes: `setAnalyticsProvider` (Task 1), `createTrackingProvider` (Task 6), `persistAttribution`/`ensureFbc` (Task 3)
- Produces: `<MetaPixelScript pixelId />`, `<TrackingProvider transport? />`

- [ ] **Step 1: Teste**

```tsx
// src/components/tracking/TrackingProvider.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { TrackingProvider } from './TrackingProvider';
import { track, resetAnalytics } from '@/lib/analytics';
import { getAttribution, getFbc } from '@/lib/tracking/attribution';

describe('TrackingProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetAnalytics();
    document.cookie = '_fbc=; max-age=0; path=/';
    window.history.replaceState({}, '', '/?utm_source=ig&ad_id=7&fbclid=XyZ');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('al montar persiste la atribución de la URL, reconstruye fbc e instala el provider', () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    render(<TrackingProvider transport={transport} />);

    expect(getAttribution()).toEqual({ utm_source: 'ig', ad_id: '7', fbclid: 'XyZ' });
    expect(getFbc()).toMatch(/^fb\.1\.\d+\.XyZ$/);

    track('quiz_complete');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ meta_event_name: 'Lead', fbc: expect.stringMatching(/XyZ$/) }));
  });

  it('entrega al provider los eventos emitidos antes de montar (buffer)', () => {
    track('quiz_complete');
    const transport = vi.fn().mockResolvedValue(undefined);
    render(<TrackingProvider transport={transport} />);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/components/tracking/TrackingProvider.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
// src/components/tracking/TrackingProvider.tsx
'use client';

import { useEffect } from 'react';
import { setAnalyticsProvider } from '@/lib/analytics';
import { createTrackingProvider, type CapiTransport } from '@/lib/tracking/provider';
import { persistAttribution, ensureFbc } from '@/lib/tracking/attribution';

type TrackingProviderProps = { transport?: CapiTransport };

export function TrackingProvider({ transport }: TrackingProviderProps) {
  useEffect(() => {
    persistAttribution(window.location.search);
    ensureFbc(window.location.search);
    setAnalyticsProvider(createTrackingProvider(transport ? { transport } : {}));
  }, [transport]);
  return null;
}
```

```tsx
// src/components/tracking/MetaPixelScript.tsx
import Script from 'next/script';

type MetaPixelScriptProps = { pixelId: string };

// Official base code. fbq queues calls made before fbevents.js loads, so
// early track() calls are safe.
export function MetaPixelScript({ pixelId }: MetaPixelScriptProps) {
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
    </Script>
  );
}
```

Substituir `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MetaPixelScript } from '@/components/tracking/MetaPixelScript';
import { TrackingProvider } from '@/components/tracking/TrackingProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía — Tu plan personalizado',
  description: 'Descubre tu plan personalizado para bajar de peso con Gel Metabólico de Chía.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="es-MX">
      <body className={inter.className}>
        {pixelId ? <MetaPixelScript pixelId={pixelId} /> : null}
        <TrackingProvider />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/components/tracking/TrackingProvider.test.tsx && npx tsc --noEmit`
Expected: testes PASS; `tsc` ainda acusa `result_view` em `QuizFunnel.tsx` (corrigido na Task 10).

- [ ] **Step 5: Commit**

```bash
git add src/components/tracking src/app/layout.tsx
git commit -m "feat(tracking): mount Meta Pixel and tracking provider in root layout"
```

---

### Task 10: `QuizFunnel.tsx` — Lead no `nombre`, `quiz_step_view`, checkout com s1/s2

**Files:**
- Modify: `src/components/QuizFunnel.tsx` (linhas 17-18, 47-57, 182-220, 358-360)
- Test: `src/components/QuizFunnel.test.tsx`

**Interfaces:**
- Consumes: `getCheckoutParams` (Task 3), `track` (Task 1)

- [ ] **Step 1: Testes**

Adicionar ao final de `src/components/QuizFunnel.test.tsx` (dentro do `describe('QuizFunnel')`, antes do fechamento):

```tsx
  describe('eventos de tracking', () => {
    beforeEach(() => {
      resetAnalytics();
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      resetAnalytics();
    });

    it('emite quiz_step_view con el id de la pantalla al montar cada paso', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const imcIndex = SCREENS.findIndex((s) => s.id === 'imc');
      useQuizStore.getState().goToIndex(imcIndex);
      render(<QuizFunnel />);
      expect(spy).toHaveBeenCalledWith('quiz_step_view', { step: 'imc', index: imcIndex });
      expect(spy).toHaveBeenCalledWith('imc_view', undefined);
    });

    it('emite quiz_complete al confirmar el nombre (última pregunta), no al llegar a la oferta', async () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const nombreIndex = SCREENS.findIndex((s) => s.id === 'nombre');
      useQuizStore.getState().goToIndex(nombreIndex);
      render(<QuizFunnel />);
      await userEvent.type(screen.getByPlaceholderText('Escribe tu nombre…'), 'Ana');
      await userEvent.click(screen.getByText('Continuar'));
      expect(spy).toHaveBeenCalledWith('quiz_complete', undefined);
    });

    it('en la pantalla de oferta no emite result_view ni quiz_complete, solo offer_view', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);
      render(<QuizFunnel />);
      expect(spy).toHaveBeenCalledWith('offer_view', undefined);
      expect(spy).not.toHaveBeenCalledWith('quiz_complete', expect.anything());
      const names = spy.mock.calls.map((c) => c[0]);
      expect(names).not.toContain('result_view');
      expect(names).not.toContain('quiz_start');
    });

    it('la URL de checkout lleva s1=session_id y s2=anon_id', async () => {
      const ofertaIndex = SCREENS.findIndex((s) => s.id === 'oferta');
      useQuizStore.getState().goToIndex(ofertaIndex);
      render(<QuizFunnel />);
      await userEvent.click(screen.getByText('QUIERO MI PLAN'));
      const link = screen.getByText('Ir al pago manualmente');
      const href = link.getAttribute('href') ?? '';
      expect(href).toContain(`s1=${getSessionId()}`);
      expect(href).toContain(`s2=${getAnonId()}`);
    });
  });
```

E adicionar os imports no topo do arquivo de teste:

```tsx
import { setAnalyticsProvider, resetAnalytics } from '@/lib/analytics';
import { getAnonId, getSessionId } from '@/lib/tracking/ids';
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/components/QuizFunnel.test.tsx`
Expected: os 4 novos FAIL (step_view não existe; quiz_complete dispara no lugar errado; s1 ausente).

- [ ] **Step 3: Implementar**

Em `src/components/QuizFunnel.tsx`:

(a) Imports — trocar a linha 17:
```tsx
import { buildCheckoutUrl, DEFAULT_CHECKOUT_URL } from '@/lib/checkout';
import { getCheckoutParams } from '@/lib/tracking/attribution';
```

(b) Substituir o `useEffect` das linhas 47-57:
```tsx
  useEffect(() => {
    if (!screen) return;
    track('quiz_step_view', { step: screen.id, index: currentIndex });
    if (screen.kind === 'imc') track('imc_view');
    if (screen.kind === 'projection') track('projection_view');
    if (screen.kind === 'offer') track('offer_view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);
```

(c) No bloco `screen.kind === 'text'`, dentro do `onClick` do botão Continuar, após `track('quiz_answer', ...)` e antes de `goNext()`:
```tsx
              // 'nombre' is the last question: answering it is the semantic
              // "quiz complete" (Lead), long before the VSL2 gate and the offer.
              if (screen.id === 'nombre') track('quiz_complete');
```

(d) Na tela de oferta, substituir as linhas 359-360:
```tsx
  const checkoutUrl = buildCheckoutUrl(checkoutBase, getCheckoutParams());
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/components/QuizFunnel.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros. Se `getUtmsFromLocation` ficou sem uso em `checkout.ts`, **manter** (ainda tem teste; removê-la é limpeza fora do escopo).

- [ ] **Step 5: Commit**

```bash
git add src/components/QuizFunnel.tsx src/components/QuizFunnel.test.tsx
git commit -m "feat(quiz): Lead on name submit, step views, session ids on checkout url"
```

---

### Task 11: `GatedVSL.tsx` — `vsl_view` / `vsl_play` / `vsl_error` / `vsl_continue_without_video`

**Files:**
- Modify: `src/components/vsl/GatedVSL.tsx` (linhas 61-73, 148-158, 185-198)
- Test: `src/components/vsl/GatedVSL.test.tsx`

- [ ] **Step 1: Testes**

Adicionar ao final de `src/components/vsl/GatedVSL.test.tsx` (dentro do `describe` principal). Use os mesmos helpers de render já existentes no arquivo; se não houver, este render mínimo serve:

```tsx
  describe('eventos de video', () => {
    function renderVsl() {
      return render(
        <GatedVSL src="/v.mp4" revealAtSeconds={10} ctaLabel="CTA" onCtaClick={() => {}} resumeKey="vsl1" />
      );
    }

    it('emite vsl_view al montar (sin play) y vsl_play solo en el primer play real', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      renderVsl();
      expect(spy).toHaveBeenCalledWith('vsl_view', { resumeKey: 'vsl1' });
      expect(spy).not.toHaveBeenCalledWith('vsl_play', expect.anything());

      const video = document.querySelector('video') as HTMLVideoElement;
      fireEvent.play(video);
      fireEvent.pause(video);
      fireEvent.play(video);
      expect(spy.mock.calls.filter((c) => c[0] === 'vsl_play')).toHaveLength(1);
      expect(spy).toHaveBeenCalledWith('vsl_play', { resumeKey: 'vsl1' });
    });

    it('emite vsl_error con el código del error al fallar la carga', () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      renderVsl();
      fireEvent.error(document.querySelector('video') as HTMLVideoElement);
      expect(spy).toHaveBeenCalledWith('vsl_error', { resumeKey: 'vsl1', code: null });
      expect(screen.getByText('Continuar sin video')).toBeInTheDocument();
    });

    it('"Continuar sin video" emite vsl_continue_without_video y nunca vsl_cta_click', async () => {
      const spy = vi.fn();
      setAnalyticsProvider(spy);
      renderVsl();
      fireEvent.error(document.querySelector('video') as HTMLVideoElement);
      await userEvent.click(screen.getByText('Continuar sin video'));
      expect(spy).toHaveBeenCalledWith('vsl_continue_without_video', { resumeKey: 'vsl1' });
      expect(spy).not.toHaveBeenCalledWith('vsl_cta_click', expect.anything());
    });
  });
```

Garanta que o arquivo importa `fireEvent`, `screen`, `render` de `@testing-library/react`, `userEvent` de `@testing-library/user-event`, `vi` de `vitest` e `setAnalyticsProvider` de `@/lib/analytics` (já importa, linha 5). Se algum teste antigo asserta `track('vsl_play')` no mount, troque para `'vsl_view'`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/components/vsl/GatedVSL.test.tsx`
Expected: os 3 novos FAIL.

- [ ] **Step 3: Implementar**

Em `src/components/vsl/GatedVSL.tsx`:

(a) Após `const durationRef = useRef<number | null>(null);` (linha 55):
```tsx
  // onPlay fires again after every pause/resume; only the first real play is a signal.
  const playTrackedRef = useRef(false);
```

(b) Na linha 72, trocar `track('vsl_play', { resumeKey });` por:
```tsx
    track('vsl_view', { resumeKey });
```

(c) Após `handleEnded` (linha 127), adicionar:
```tsx
  const handlePlay = () => {
    if (playTrackedRef.current) return;
    playTrackedRef.current = true;
    track('vsl_play', { resumeKey });
  };

  const handleError = () => {
    track('vsl_error', { resumeKey, code: videoRef.current?.error?.code ?? null });
    setVideoError(true);
  };
```

(d) Substituir `handleContinueWithoutVideo` (linhas 156-158):
```tsx
  const handleContinueWithoutVideo = () => {
    track('vsl_continue_without_video', { resumeKey });
    onCtaClick();
  };
```

(e) No `<video>` (linhas 185-198): trocar `onError={() => setVideoError(true)}` por `onError={handleError}` e adicionar `onPlay={handlePlay}`.

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/components/vsl/GatedVSL.test.tsx`
Expected: PASS (novos + antigos).

- [ ] **Step 5: Commit**

```bash
git add src/components/vsl/GatedVSL.tsx src/components/vsl/GatedVSL.test.tsx
git commit -m "feat(vsl): distinguish view/play, emit error and continue-without-video events"
```

---

### Task 12: `LandingGate.tsx` — consentimento expresso + `quiz_start`

**Files:**
- Modify: `src/lib/content/copy.ts` (objeto `LANDING`), `src/components/home/LandingGate.tsx`
- Test: `src/components/home/LandingGate.test.tsx`

**Interfaces:**
- Consumes: `saveConsent`, `PRIVACY_POLICY_VERSION` (Task 5)
- Produces: `LANDING.consentTexto`, `LANDING.consentLink`, `LANDING.consentAria`

- [ ] **Step 1: Testes**

Em `src/components/home/LandingGate.test.tsx`, atualizar o teste `'clic en "Sí, continuar" llama startQuiz() y trackea landing_cta_click'` para marcar o checkbox antes:

```tsx
  it('clic en "Sí, continuar" (con consentimiento marcado) llama startQuiz() y trackea consent_accept, landing_cta_click y quiz_start', async () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    const user = userEvent.setup();
    render(<LandingGate />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText(LANDING.ageGateSi));

    expect(useQuizStore.getState().started).toBe(true);
    expect(spy).toHaveBeenCalledWith('consent_accept', { policy_version: PRIVACY_POLICY_VERSION });
    expect(spy).toHaveBeenCalledWith('landing_cta_click', { answer: 'yes' });
    expect(spy).toHaveBeenCalledWith('quiz_start', undefined);
    expect(getConsent()?.policy_version).toBe(PRIVACY_POLICY_VERSION);
  });

  it('"Sí, continuar" queda deshabilitado hasta marcar el consentimiento', async () => {
    const user = userEvent.setup();
    render(<LandingGate />);
    const yes = screen.getByText(LANDING.ageGateSi);
    expect(yes).toBeDisabled();
    await user.click(yes);
    expect(useQuizStore.getState().started).toBe(false);
    await user.click(screen.getByRole('checkbox'));
    expect(yes).not.toBeDisabled();
  });

  it('el texto de consentimiento menciona datos de salud y enlaza al Aviso de Privacidad', () => {
    render(<LandingGate />);
    expect(screen.getByText(/datos de salud/)).toBeInTheDocument();
    expect(screen.getByText(LANDING.consentLink)).toHaveAttribute('href', '/privacy');
  });

  it('emite consent_view junto con landing_view al montar', () => {
    const spy = vi.fn();
    setAnalyticsProvider(spy);
    render(<LandingGate />);
    expect(spy).toHaveBeenCalledWith('landing_view', undefined);
    expect(spy).toHaveBeenCalledWith('consent_view', { policy_version: PRIVACY_POLICY_VERSION });
  });
```

Imports adicionais no topo do teste:
```tsx
import { getConsent, PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';
```
E no `beforeEach` existente adicionar `window.localStorage.clear();`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/components/home/LandingGate.test.tsx`
Expected: FAIL — não há checkbox; `consentLink` indefinido.

- [ ] **Step 3: Implementar**

(a) Em `src/lib/content/copy.ts`, dentro de `LANDING`, após `ageGateBloqueado`:
```ts
  consentTexto:
    'Acepto el tratamiento de mis datos personales, incluidos datos de salud (peso, estatura y objetivo), para generar mi plan y medir nuestras campañas, conforme al',
  consentLink: 'Aviso de Privacidad',
  consentAria: 'Acepto el tratamiento de mis datos personales, incluidos datos de salud',
```

(b) Substituir `src/components/home/LandingGate.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { saveConsent, PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';
import { LANDING } from '@/lib/content/copy';
import { LegalFooter } from './LegalFooter';

export function LandingGate() {
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const [underage, setUnderage] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    track('landing_view');
    track('consent_view', { policy_version: PRIVACY_POLICY_VERSION });
  }, []);

  const handleYes = () => {
    if (!consented) return;
    saveConsent();
    track('consent_accept', { policy_version: PRIVACY_POLICY_VERSION });
    track('landing_cta_click', { answer: 'yes' });
    startQuiz();
    track('quiz_start');
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

        <div className="mt-6 h-[360px] w-full overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LANDING.heroSrc}
            alt={LANDING.heroAlt}
            width={1122}
            height={1402}
            className="h-full w-full object-cover object-top"
          />
        </div>

        <div className="mt-6 rounded-card border border-neutral-200 bg-white p-5">
          {underage ? (
            <p role="status" aria-live="polite" className="text-neutral-700">
              {LANDING.ageGateBloqueado}
            </p>
          ) : (
            <>
              <p className="font-semibold">{LANDING.ageGateTitulo}</p>
              <label className="mt-4 flex items-start gap-2 text-left text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  aria-label={LANDING.consentAria}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                />
                <span>
                  {LANDING.consentTexto}{' '}
                  <a href="/privacy" className="underline">
                    {LANDING.consentLink}
                  </a>
                  .
                </span>
              </label>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleYes}
                  disabled={!consented}
                  className="min-h-[44px] w-full rounded-full bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-40"
                >
                  {LANDING.ageGateSi}
                </button>
                <button
                  type="button"
                  onClick={handleNo}
                  className="min-h-[44px] w-full rounded-full bg-neutral-100 px-6 py-3 text-lg font-semibold text-neutral-600"
                >
                  {LANDING.ageGateNo}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/components/home/LandingGate.test.tsx src/lib/content/copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/copy.ts src/components/home/LandingGate.tsx src/components/home/LandingGate.test.tsx
git commit -m "feat(landing): express consent checkbox before health questions; quiz_start on real click"
```

---

### Task 13: Aviso de privacidade, README e `.env.local.example`

**Files:**
- Modify: `src/app/privacy/page.tsx`, `README.md`, `.env.local.example`

- [ ] **Step 1: Reescrever `src/app/privacy/page.tsx`**

```tsx
import { LANDING } from '@/lib/content/copy';
import { PRIVACY_POLICY_VERSION } from '@/lib/tracking/consent';

export const metadata = {
  title: 'Aviso de Privacidad — Gel Metabólico de Chía',
};

const SECTION = 'mt-6 text-base font-semibold';
const TEXT = 'mt-2 text-sm text-neutral-600';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <a href="/" className="text-sm text-neutral-500 underline-offset-2 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-4 text-xl font-bold">Aviso de Privacidad</h1>
        <p className={TEXT}>
          Este aviso describe cómo tratamos tus datos conforme a la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares (LFPDPPP) de México y a la Ley General
          de Protección de Datos (LGPD) de Brasil, país desde el que operamos el servicio.
        </p>

        <h2 className={SECTION}>1. Datos que recopilamos</h2>
        <p className={TEXT}>
          <strong>Datos personales sensibles (estado de salud):</strong> las respuestas del test
          (peso, estatura, objetivo de peso, hábitos y cómo te sientes con tu cuerpo). Solo las
          tratamos con tu consentimiento expreso, que otorgas al marcar la casilla antes de iniciar.
        </p>
        <p className={TEXT}>
          <strong>Datos de identificación:</strong> tu nombre y, si compras, los datos que el
          procesador de pagos necesita.
        </p>
        <p className={TEXT}>
          <strong>Identificadores técnicos:</strong> dirección IP, tipo de navegador, identificadores
          de sesión y de visitante que generamos nosotros, cookies de Meta (_fbp, _fbc) y los
          parámetros de la campaña por la que llegaste (utm_*, identificadores de anuncio).
        </p>

        <h2 className={SECTION}>2. Para qué los usamos</h2>
        <p className={TEXT}>
          Para calcular y mostrarte tu protocolo personalizado; para medir el rendimiento de nuestras
          campañas publicitarias (qué anuncios traen visitantes que completan el test o compran); y
          para mejorar el funcionamiento del sitio.
        </p>

        <h2 className={SECTION}>3. Con quién los compartimos</h2>
        <p className={TEXT}>
          <strong>Kiwify</strong> (procesador de pagos), cuando compras.
          <br />
          <strong>Meta (Facebook/Instagram)</strong>: le enviamos únicamente identificadores técnicos
          y eventos de navegación genéricos (por ejemplo, &quot;completó el test&quot;, &quot;fue al
          pago&quot;). Si nos das tu correo o teléfono, los enviamos cifrados de forma irreversible
          (hash SHA-256). <strong>Nunca</strong> enviamos a Meta tus respuestas de salud (peso,
          estatura, objetivo ni hábitos).
          <br />
          <strong>Supabase</strong> (proveedor de infraestructura) aloja nuestra base de datos.
        </p>

        <h2 className={SECTION}>4. Conservación</h2>
        <p className={TEXT}>
          Los identificadores técnicos (IP, navegador) se eliminan a los 90 días. Los datos de tu
          test se conservan mientras uses el servicio o hasta que solicites su eliminación.
        </p>

        <h2 className={SECTION}>5. Tus derechos ARCO y revocación del consentimiento</h2>
        <p className={TEXT}>
          Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, y revocar tu
          consentimiento en cualquier momento, escribiendo a{' '}
          <a href={`mailto:${LANDING.contactoEmail}`} className="underline">
            {LANDING.contactoEmail}
          </a>
          .
        </p>

        <p className="mt-8 text-xs text-neutral-400">Versión del aviso: {PRIVACY_POLICY_VERSION}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Atualizar a tabela de envs no `README.md`**

Adicionar linhas à tabela "Variables de entorno":

```markdown
| `NEXT_PUBLIC_META_PIXEL_ID` | ID del Pixel/dataset de Meta (público) | — (sin él, no carga el Pixel ni el CAPI) |
| `META_CAPI_ACCESS_TOKEN` | Token de System User para la Conversions API (solo servidor) | — |
| `META_TEST_EVENT_CODE` | Código de "Test Events" del Events Manager; definir solo durante QA | vacío |
| `META_GRAPH_VERSION` | Versión del Graph API | `v23.0` |
```

E substituir a frase final "No requiere base de datos ni backend." por: "No requiere base de datos. El route handler `/api/e/capi` reenvía los eventos del Pixel a la Conversions API de Meta (mismo `event_id`, deduplicado)."

- [ ] **Step 3: Atualizar `.env.local.example`**

Acrescentar ao final (se a ferramenta bloquear a escrita em `.env*`, pedir ao Eduardo para colar):

```
NEXT_PUBLIC_META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
META_GRAPH_VERSION=v23.0
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add src/app/privacy/page.tsx README.md .env.local.example
git commit -m "docs: privacy notice with sensitive data, Meta sharing and retention; tracking envs"
```

---

### Task 14: Build local, deploy e QA no Test Events

**Files:** nenhum (validação).

**Pré-requisitos (Fase 0b, Eduardo):** `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_TEST_EVENT_CODE` configurados no Vercel (Production + Preview).

- [ ] **Step 1: Build local**

Run: `npm run build`
Expected: build OK, rota `ƒ /api/e/capi` listada como dynamic.

- [ ] **Step 2: Smoke local com o Pixel real**

Criar `.env.local` (não commitar) com as 3 envs. `npm run dev`. Abrir `http://localhost:3000/?utm_source=qa&ad_id=qa1&fbclid=QAfbclid123`. No console do browser:
- `localStorage.getItem('gel-chia-quiz-mx:attribution')` → contém `utm_source`, `ad_id`, `fbclid`
- `document.cookie` → contém `_fbc=fb.1....QAfbclid123`
- Marcar checkbox → "Sí, continuar" habilita → clicar → `localStorage.getItem('gel-chia-quiz-mx:consent')` preenchido
- Percorrer o quiz até `nombre` → ao continuar, na aba Network aparece `POST /api/e/capi` com `meta_event_name: "Lead"` e resposta `{ events_received: 1 }`
- Chegar na oferta → clicar "QUIERO MI PLAN" → `POST /api/e/capi` com `InitiateCheckout`, `custom_data: {value, currency:'MXN'}`; a URL de destino contém `s1=`, `s2=`, `s3=fb.1...`, `utm_source=qa`

- [ ] **Step 3: Push e deploy**

```bash
git push -u origin feat/tracking-fase-0a
```
Abrir PR para `main` (ou merge direto se Eduardo preferir). Vercel gera preview.

- [ ] **Step 4: Validar no Events Manager → Test Events** (com `META_TEST_EVENT_CODE` ativo no ambiente testado)

Refazer o fluxo do Step 2 no preview. Critérios de aceite:
- `PageView` aparece (browser).
- `Lead` aparece **uma vez**, agrupando browser + servidor; o do servidor marcado como "Deduplicated" (ou equivalente). Duas linhas independentes = `event_id`/`event_name` divergindo → parar e investigar.
- `InitiateCheckout` idem, com `value` e `currency: MXN` visíveis nos parâmetros.
- Nenhum evento chamado `imc_view`, `projection_view`, `quiz_answer` etc. aparece.
- **Nenhum evento `SubscribedButtonClick` aparece e nenhum parâmetro `buttonText` / campo de formulário aparece nos parâmetros de `Lead`/`InitiateCheckout`** (confirma que `autoConfig` está desligado no snippet E no painel — Fase 0b item 2b).
- Recarregar a página da oferta e clicar de novo → **não** gera novo `InitiateCheckout`.
- Nos logs da Vercel (`/api/e/capi`): nenhuma linha `capi_send_failed`.

- [ ] **Step 5: Ligar em produção e remover o código de teste**

Merge em `main` → deploy de produção → repetir Step 4 uma vez em produção → **remover `META_TEST_EVENT_CODE`** do Vercel (Production) → redeploy. Anotar a data/hora do go-live na nota diária (`04-Daily/2026-08-24.md`) e no roadmap (Fase 0a ✅).

- [ ] **Step 6: Registrar no roadmap**

Marcar as caixas da Fase 0a em `docs/superpowers/plans/2026-08-24-tracking-hub-plan.md` e commitar:

```bash
git add docs/superpowers/plans/2026-08-24-tracking-hub-plan.md
git commit -m "docs: fase 0a done"
git push
```

---

## Emendas pós-review final (2026-08-25)

O review da branch inteira encontrou pontos em que **este plano** divergia da spec ou deixava um buraco; o código foi corrigido numa onda única e o plano NÃO foi reescrito — leia estas emendas como sobrepondo o texto das tasks:

- **Task 9 / `MetaPixelScript`:** o snippet chama `fbq('set', 'autoConfig', false, pixelId)` antes do `init`. Sem isso o Pixel auto-coleta texto de botões (ex.: "Protocolo personalizado de 23 kg") e campos de formulário, por fora do `EVENT_MAP` — violação da spec §11.
- **Task 8 / `/api/e/capi`:** ganhou checagem de `Origin`/`Referer` contra o `host` (403 se diferente; ausência de ambos é permitida) e supressão de bots por user-agent (200 `{skipped:'bot'}` sem chamar a Meta) — spec §6 passos 2 e 5. `pickCustomData` só aceita `value` finito **com** `currency`. Token vai no body JSON, não na query. `fetch` com `AbortSignal.timeout(5000)`.
- **Task 3 / `getCheckoutParams`:** encaminha também `campaign_id/adset_id/ad_id` (spec §7.1); continua excluindo `fbclid` e `placement`.
- **Task 3 / `persistAttribution`:** "write-once" é **por toque**, não por pessoa: um pageload com qualquer parâmetro de atribuição substitui o armazenado; um retorno direto (sem parâmetros) mantém o original (spec §4.2).
- **Task 6 / `CapiClientPayload`:** carrega `internal_name`, `metadata` (via `pickMetadata`) e `consent_version` — o contrato da spec §5.1 — para a migração pro hub na Fase 1 trocar só o destino do POST. O servidor ignora esses campos nesta fase.
- **`store.ts`:** `persist` com `version: 1` + `migrate` que força `started: false` em estado v0 — visitantes que já tinham começado o quiz antes do deploy passam pelo consentimento uma vez (spec §11.1).

## Self-review (feito ao escrever o plano)

- **Cobertura da spec §13 Fase 0a:** Pixel (T9) · `/api/e/capi` (T7-8) · SDK embrionário (T2-6) · `s1/s2/s3/sck` (T3, T10) · correções de eventos (T10-12) · consentimento + `/privacy` (T12-13) · QA Test Events (T14). `ViewContent` fica reservado (allowlist) para a Fase 3, conforme spec.
- **Placeholders:** nenhum "TBD"/"similar à Task N"; cada passo tem código.
- **Consistência de nomes:** `getAnonId/getSessionId/eventIdFor` (T2) usados em T3, T6, T10; `CapiClientPayload`/`CapiTransport` (T6) usados em T9; `buildServerEvent/sendEventsToMeta/isMetaEventName/sha256` (T7) usados em T8; `resetAnalytics` (T1) usado em T9, T10; `PRIVACY_POLICY_VERSION/saveConsent/getConsent` (T5) usados em T12, T13; `LANDING.consentTexto/consentLink/consentAria` (T12) usados em T12.
- **Fora do escopo desta fase (deliberado):** rewrite first-party (só faz sentido com o hub, Fase 1); `pickMetadata` fica definido e testado mas só é consumido pelo ingest do hub na Fase 1; `getUtmsFromLocation` permanece em `checkout.ts` (sem uso) até a limpeza da Fase 1.
