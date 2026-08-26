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
