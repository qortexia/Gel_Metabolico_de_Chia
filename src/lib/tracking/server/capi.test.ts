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

  it('hace POST al endpoint /events del pixel con el token en el body (no en la query) y test_event_code también en el body', async () => {
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
    expect(url).toBe('https://graph.facebook.com/v23.0/123/events');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ data: [event], access_token: 'tok', test_event_code: 'TEST1' });
    // M2: an AbortSignal caps the Graph call so it can't hang the route forever
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sin test_event_code no incluye la clave en el body y respeta META_GRAPH_VERSION', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    await sendEventsToMeta([event], { pixelId: '123', accessToken: 'tok', graphVersion: 'v24.0', fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v24.0/123/events');
    expect(JSON.parse(init.body)).toEqual({ data: [event], access_token: 'tok' });
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
