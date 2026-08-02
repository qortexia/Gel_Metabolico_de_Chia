export function buildCheckoutUrl(baseUrl: string, utms: Record<string, string>): string {
  const url = new URL(baseUrl);
  Object.entries(utms).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

const KNOWN_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function getUtmsFromLocation(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utms: Record<string, string> = {};
  KNOWN_UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) utms[key] = value;
  });
  return utms;
}
