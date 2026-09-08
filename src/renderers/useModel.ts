import { useSyncExternalStore } from 'react';
import type { ObservableModel } from './observable';

export function useModel<T>(model: ObservableModel<T>): T {
  return useSyncExternalStore(model.subscribe, model.get, model.get);
}
