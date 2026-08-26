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
