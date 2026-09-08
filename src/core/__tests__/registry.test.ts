import { describe, expect, it } from 'vitest';
import { RendererRegistry, type Renderer } from '@/core';

const stub = (id: '2D' | '3D'): Renderer => ({
  id,
  label: id,
  render() {},
  animateStep() {},
  highlight() {},
  clear() {},
  snapshot: () => ({ nodeIds: [], edgeIds: [], highlightedIds: [], labels: {} }),
});

describe('RendererRegistry', () => {
  it('registra, consulta, lista y da de baja por modo', () => {
    const r = new RendererRegistry();
    expect(r.has('2D')).toBe(false);
    r.register(stub('2D')).register(stub('3D'));
    expect(r.list().map((x) => x.id)).toEqual(['2D', '3D']);
    expect(r.get('3D')?.id).toBe('3D');
    r.unregister('3D');
    expect(r.has('3D')).toBe(false);
    expect(r.get('3D')).toBeUndefined();
  });

  it('registrar dos veces el mismo modo sustituye al anterior', () => {
    const r = new RendererRegistry();
    const a = stub('2D');
    const b = stub('2D');
    r.register(a).register(b);
    expect(r.get('2D')).toBe(b);
    expect(r.list()).toHaveLength(1);
  });
});
