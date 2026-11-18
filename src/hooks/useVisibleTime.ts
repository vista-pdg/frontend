import { useCallback, useEffect, useRef } from 'react';

/**
 * HU-36 · CA-9: tiempo que cada pregunta estuvo visible. Se acumula mientras la pregunta es la
 * actual y la pestaña está a la vista; cambiar de pregunta u ocultar la pestaña lo pausa. El
 * servidor lo acota al tiempo real del intento.
 */
export function useVisibleTime(activeKey: number | null) {
  const totals = useRef(new Map<number, number>());
  const active = useRef<number | null>(null);
  const since = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (active.current !== null && since.current !== null) {
      totals.current.set(active.current, (totals.current.get(active.current) ?? 0) + (performance.now() - since.current));
    }
    since.current = null;
  }, []);

  useEffect(() => {
    flush();
    active.current = activeKey;
    since.current = activeKey !== null && document.visibilityState === 'visible' ? performance.now() : null;
  }, [activeKey, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') flush();
      else if (active.current !== null && since.current === null) since.current = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [flush]);

  return useCallback((key: number) => {
    const running = active.current === key && since.current !== null ? performance.now() - since.current : 0;
    return (totals.current.get(key) ?? 0) + running;
  }, []);
}
