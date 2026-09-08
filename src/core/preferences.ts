import { isVisualizationMode, type VisualizationMode } from './model';

/** Clave de la preferencia de modo (HU-18 · CA-5). Es del navegador, no de la cuenta. */
export const MODE_STORAGE_KEY = 'vista_visualization_mode';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPreferredMode(storage: StorageLike | null = defaultStorage()): VisualizationMode | null {
  try {
    const raw = storage?.getItem(MODE_STORAGE_KEY);
    return isVisualizationMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function savePreferredMode(mode: VisualizationMode, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* sin almacenamiento la preferencia simplemente no sobrevive a la sesión */
  }
}
