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
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

export interface MetaSendResult {
  events_received: number;
  fbtrace_id?: string;
}

export async function sendEventsToMeta(events: GraphEvent[], cfg: MetaConfig): Promise<MetaSendResult> {
  const doFetch = cfg.fetchImpl ?? fetch;
  const version = cfg.graphVersion ?? DEFAULT_GRAPH_VERSION;
  const url = `https://graph.facebook.com/${version}/${cfg.pixelId}/events`;
  const body: Record<string, unknown> = { data: events, access_token: cfg.accessToken };
  if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;

  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as {
    events_received?: number;
    fbtrace_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Meta CAPI ${res.status}: ${json.error?.message ?? 'unknown error'}`);
  return { events_received: json.events_received ?? 0, fbtrace_id: json.fbtrace_id };
}
