import { describe, expect, it } from 'vitest';
import { MODE_STORAGE_KEY, detectWebGL, loadPreferredMode, savePreferredMode } from '@/core';

function fakeDocument(contexts: Record<string, unknown>) {
  return {
    createElement: () =>
      ({ getContext: (kind: string) => contexts[kind] ?? null }) as unknown as HTMLCanvasElement,
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('detectWebGL (CA-6)', () => {
  it('es verdadero con webgl2 o con webgl', () => {
    expect(detectWebGL(fakeDocument({ webgl2: {} }))).toBe(true);
    expect(detectWebGL(fakeDocument({ webgl: {} }))).toBe(true);
  });

  it('es falso sin contexto, cuando getContext lanza o sin documento', () => {
    expect(detectWebGL(fakeDocument({}))).toBe(false);
    expect(
      detectWebGL({
        createElement: () => {
          throw new Error('bloqueado');
        },
      })
    ).toBe(false);
    expect(detectWebGL(undefined)).toBe(false);
  });
});

describe('preferencia de modo (CA-5)', () => {
  it('guarda y recupera el modo con la clave del proyecto', () => {
    const s = memoryStorage();
    savePreferredMode('2D', s);
    expect(s.data.get(MODE_STORAGE_KEY)).toBe('2D');
    expect(loadPreferredMode(s)).toBe('2D');
  });

  it('ignora valores corruptos y almacenamientos ausentes o rotos', () => {
    expect(loadPreferredMode(memoryStorage({ [MODE_STORAGE_KEY]: '4D' }))).toBeNull();
    expect(loadPreferredMode(null)).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error('QuotaExceeded');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    expect(loadPreferredMode(broken)).toBeNull();
    expect(() => savePreferredMode('3D', broken)).not.toThrow();
    expect(() => savePreferredMode('3D', null)).not.toThrow();
  });
});
