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
