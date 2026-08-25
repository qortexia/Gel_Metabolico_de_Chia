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

// A page load that carries any attribution param is a new touch: it wins and
// re-attributes the lead. A direct return with no params (e.g. closing the
// tab and reopening it later) must not erase the click that brought the lead.
export function persistAttribution(search: string): Attribution {
  const incoming = parseAttribution(search);
  const merged: Attribution = Object.keys(incoming).length ? { ...getAttribution(), ...incoming } : getAttribution();
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
  if (!entry) return null;
  const value = entry.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed percent-encoding: return raw value instead of throwing
    return value;
  }
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

// Kiwify forwards utm_*/s1-s3/sck for sure; the ad IDs (campaign_id, adset_id,
// ad_id) are sent too so the test purchase (spec §14) can confirm whether
// Kiwify passes them through — they cost nothing if dropped along the way.
// fbclid and placement are deliberately excluded: fbc (s3) already carries
// fbclid and Meta warns against re-propagating it manually.
const CHECKOUT_FORWARD_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'campaign_id',
  'adset_id',
  'ad_id',
] as const;

export function getCheckoutParams(search?: string): Record<string, string> {
  const currentSearch = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const incoming = parseAttribution(currentSearch);
  const attribution: Attribution = Object.keys(incoming).length ? { ...getAttribution(), ...incoming } : getAttribution();
  const out: Record<string, string> = {};
  for (const key of CHECKOUT_FORWARD_KEYS) {
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
