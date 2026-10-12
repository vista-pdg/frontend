import type { AnalyticsFilter } from '../types/analytics';
export const INSUFFICIENT_DATA = 'Datos insuficientes para garantizar el anonimato';
export const UNMEASURED_STEPS = 'Sin medición de pasos para todas las ejecuciones del periodo';
export type AnalyticsView = 'structures' | 'algorithms' | 'retries';
export const analyticsViews: { id: AnalyticsView; label: string }[] = [
  { id: 'structures', label: 'Estructuras' }, { id: 'algorithms', label: 'Algoritmos' }, { id: 'retries', label: 'Reintentos' },
];
export function defaultAnalyticsDates(now = new Date()): Pick<AnalyticsFilter, 'from' | 'to'> {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const month = `${part('year')}-${part('month')}`;
  return { from: `${month}-01`, to: `${month}-${part('day')}` };
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateAnalyticsFilter(filter: AnalyticsFilter): Partial<Record<keyof AnalyticsFilter, string>> {
  const errors: Partial<Record<keyof AnalyticsFilter, string>> = {};
  if (!filter.courseCode) errors.courseCode = 'Selecciona un curso.';
  if (!validDate(filter.from)) errors.from = 'Indica una fecha inicial válida.';
  if (!validDate(filter.to)) errors.to = 'Indica una fecha final válida.';
  else if (!errors.from && filter.to < filter.from) errors.to = 'La fecha final debe ser igual o posterior a la inicial.';
  return errors;
}
export const sameAnalyticsFilter = (a: AnalyticsFilter, b: AnalyticsFilter) => a.courseCode === b.courseCode && a.from === b.from && a.to === b.to;
export const analyticsDateLabel = (value: string) => value.split('-').reverse().join('/');
const labels: Record<string, string> = {
  arbol_avl: 'Árbol AVL', arbol_bst: 'Árbol BST', arbol_binario: 'Árbol binario', arbol_b: 'Árbol B', arbol_bplus: 'Árbol B+',
  heap: 'Heap', pila: 'Pila', cola: 'Cola', lista_simple: 'Lista simple', lista_doble: 'Lista doble', lista_circular: 'Lista circular',
  tabla_hash: 'Tabla hash', grafo_sin_detalle: 'Grafo (sin detalle histórico)', grafo_dirigido: 'Grafo dirigido', grafo_no_dirigido: 'Grafo no dirigido',
};
export const structureLabel = (value: string) => labels[value] ?? value.replaceAll('_', ' ');
export const metricNumber = (value: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
