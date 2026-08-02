const PREFIX = 'gel-chia-quiz-mx:video:';

export function saveVideoPosition(key: string, seconds: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${PREFIX}${key}`, String(seconds));
}

export function getVideoPosition(key: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${PREFIX}${key}`);
  return raw ? Number(raw) : null;
}

export function clearVideoPosition(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${PREFIX}${key}`);
}
