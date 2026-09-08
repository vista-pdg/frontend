/**
 * Modelo observable mínimo para los adaptadores de renderizado.
 *
 * <p>Cada adaptador guarda aquí lo que el motor le ordenó dibujar y su vista React se suscribe con
 * `useSyncExternalStore`. Así la vista depende del adaptador y el adaptador del contrato: ninguna
 * de las dos lee el store de la aplicación.
 */
export interface ObservableModel<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createModel<T>(initial: T): ObservableModel<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
