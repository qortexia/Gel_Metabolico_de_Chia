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
    expect(url).toBe('https://graph.facebook.com/v23.0/123/events');
    const sent = JSON.parse(init.body);
    expect(sent.access_token).toBe('tok');
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

  it('descarta custom_data si value no es finito, aunque venga con currency', async () => {
    await POST(
      makeRequest({
        ...VALID_BODY,
        meta_event_name: 'InitiateCheckout',
        custom_data: { value: NaN, currency: 'MXN' },
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).data[0]).not.toHaveProperty('custom_data');
  });

  it('descarta custom_data si viene value sin currency', async () => {
    await POST(
      makeRequest({
        ...VALID_BODY,
        meta_event_name: 'InitiateCheckout',
        custom_data: { value: 199 },
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).data[0]).not.toHaveProperty('custom_data');
  });

  it('responde 502 si Meta falla, sin lanzar', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(502);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toBe('capi_send_failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  describe('origen y user-agent', () => {
    it('rechaza con 403 cuando el origin no coincide con el host (CSRF cross-site)', async () => {
      const res = await POST(makeRequest(VALID_BODY, { origin: 'https://evil.example', host: 'localhost' }));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'bad_origin' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('acepta cuando el origin coincide con el host', async () => {
      const res = await POST(makeRequest(VALID_BODY, { origin: 'http://localhost', host: 'localhost' }));
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('usa el referer cuando no hay origin', async () => {
      const res = await POST(makeRequest(VALID_BODY, { referer: 'http://localhost/', host: 'localhost' }));
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('descarta silenciosamente peticiones de bots/crawlers de Meta y otros (sin llamar a Meta)', async () => {
      const res = await POST(makeRequest(VALID_BODY, { 'user-agent': 'facebookexternalhit/1.1' }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ skipped: 'bot' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('ignora internal_name/metadata/consent_version del body: no llegan al payload de Meta', async () => {
    await POST(
      makeRequest({
        ...VALID_BODY,
        internal_name: 'quiz_complete',
        metadata: { step: 'peso' },
        consent_version: '2026-08-24',
      })
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.data[0]).not.toHaveProperty('internal_name');
    expect(sent.data[0]).not.toHaveProperty('metadata');
    expect(sent.data[0]).not.toHaveProperty('consent_version');
  });
});
