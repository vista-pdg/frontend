import type { AnalyticsFilter, TopicLevel } from '../types/analytics';
export const INSUFFICIENT_DATA = 'Datos insuficientes para garantizar el anonimato';
export const UNMEASURED_STEPS = 'Sin medición de pasos para todas las ejecuciones del periodo';

/** HU-36: vistas del panel; «Uso de VISTA» agrupa las tres de HU-06. */
export type AnalyticsTab = 'summary' | 'topics' | 'questions' | 'quizzes' | 'usage';
export const analyticsTabs: { id: AnalyticsTab; label: string }[] = [
  { id: 'summary', label: 'Resumen' }, { id: 'topics', label: 'Temas' }, { id: 'questions', label: 'Preguntas' },
  { id: 'quizzes', label: 'Quizzes' }, { id: 'usage', label: 'Uso de VISTA' },
];
export type AnalyticsView = 'structures' | 'algorithms' | 'retries';
export const analyticsViews: { id: AnalyticsView; label: string }[] = [
  { id: 'structures', label: 'Estructuras' }, { id: 'algorithms', label: 'Algoritmos' }, { id: 'retries', label: 'Reintentos' },
];

/** Sin fechas ni quiz: todo el periodo del grupo (HU-36 · CA-5). */
export const emptyAnalyticsFilter = (courseCode = ''): AnalyticsFilter => ({ courseCode, from: '', to: '', quizId: '' });

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
/** Fechas opcionales: solo se validan si se escriben. */
export function validateAnalyticsFilter(filter: AnalyticsFilter): Partial<Record<keyof AnalyticsFilter, string>> {
  const errors: Partial<Record<keyof AnalyticsFilter, string>> = {};
  if (!filter.courseCode) errors.courseCode = 'Selecciona un curso.';
  if (filter.from && !validDate(filter.from)) errors.from = 'Indica una fecha inicial válida o déjala vacía.';
  if (filter.to && !validDate(filter.to)) errors.to = 'Indica una fecha final válida o déjala vacía.';
  else if (filter.from && filter.to && !errors.from && filter.to < filter.from) errors.to = 'La fecha final debe ser igual o posterior a la inicial.';
  return errors;
}
export const sameAnalyticsFilter = (a: AnalyticsFilter, b: AnalyticsFilter) =>
  a.courseCode === b.courseCode && a.from === b.from && a.to === b.to && a.quizId === b.quizId;
export const analyticsDateLabel = (value: string) => value.split('-').reverse().join('/');

/** «Todo el periodo», «Desde 01/04/2026», «Hasta …» o el rango. */
export function periodLabel(filter: Pick<AnalyticsFilter, 'from' | 'to'>): string {
  if (filter.from && filter.to) return `${analyticsDateLabel(filter.from)} – ${analyticsDateLabel(filter.to)}`;
  if (filter.from) return `Desde ${analyticsDateLabel(filter.from)}`;
  if (filter.to) return `Hasta ${analyticsDateLabel(filter.to)}`;
  return 'Todo el periodo';
}
/** Mismo nombre que da el servidor en Content-Disposition. */
export function analyticsCsvName(filter: AnalyticsFilter, termCode: string): string {
  const scope = !filter.from && !filter.to ? termCode : `${filter.from || 'inicio'}-${filter.to || 'hoy'}`;
  return `vista-analitica-${filter.courseCode}-${scope}.csv`;
}

const labels: Record<string, string> = {
  arbol_avl: 'Árbol AVL', arbol_bst: 'Árbol BST', arbol_binario: 'Árbol binario', arbol_b: 'Árbol B', arbol_bplus: 'Árbol B+',
  heap: 'Heap', pila: 'Pila', cola: 'Cola', lista_simple: 'Lista simple', lista_doble: 'Lista doble', lista_circular: 'Lista circular',
  tabla_hash: 'Tabla hash', grafo_sin_detalle: 'Grafo (sin detalle histórico)', grafo_dirigido: 'Grafo dirigido', grafo_no_dirigido: 'Grafo no dirigido',
};
export const structureLabel = (value: string) => labels[value] ?? value.replaceAll('_', ' ');
export const metricNumber = (value: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

/** Fracción 0–1 como porcentaje entero; «—» si no hay dato. */
export const percent = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${Math.round(value * 100)} %`;

/** 48 s, 1 min 12 s; «—» si no hay dato. */
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

export const levelLabel: Record<TopicLevel, { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral' }> = {
  DIFICIL: { label: 'Cuesta trabajo', tone: 'danger' },
  EN_PROGRESO: { label: 'En progreso', tone: 'warning' },
  DOMINADO: { label: 'Dominado', tone: 'success' },
  SIN_DATOS: { label: 'Sin respuestas', tone: 'neutral' },
};

export const quizPhaseLabel: Record<'SCHEDULED' | 'OPEN' | 'CLOSED', string> = { SCHEDULED: 'Programado', OPEN: 'Abierto', CLOSED: 'Cerrado' };
