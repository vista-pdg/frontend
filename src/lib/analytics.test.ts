import { expect, it } from 'vitest';
import {
  analyticsCsvName, analyticsDateLabel, duration, emptyAnalyticsFilter, levelLabel, metricNumber, percent, periodLabel,
  sameAnalyticsFilter, structureLabel, validateAnalyticsFilter,
} from './analytics';
const filter = { courseCode: 'CEDI-G1', from: '2026-04-01', to: '2026-04-30', quizId: '' };

it('starts from the whole term of the group with every optional filter empty', () => {
  expect(emptyAnalyticsFilter('CEDI-G1')).toEqual({ courseCode: 'CEDI-G1', from: '', to: '', quizId: '' });
  expect(validateAnalyticsFilter(emptyAnalyticsFilter('CEDI-G1'))).toEqual({});
  expect(periodLabel(emptyAnalyticsFilter())).toBe('Todo el periodo');
});
it('validates dates only when they are written', () => {
  expect(validateAnalyticsFilter(filter)).toEqual({});
  for (const value of ['0000-01-01', '2026-02-30', '2026-13-01', 'abc']) {
    expect(validateAnalyticsFilter({ ...filter, from: value }).from).toBeTruthy();
    expect(validateAnalyticsFilter({ ...filter, to: value }).to).toBeTruthy();
  }
  expect(validateAnalyticsFilter({ ...filter, from: '' })).toEqual({});
  expect(validateAnalyticsFilter({ ...filter, to: '' })).toEqual({});
  expect(validateAnalyticsFilter({ ...filter, courseCode: '', to: '2026-03-31' })).toHaveProperty('courseCode');
  expect(validateAnalyticsFilter({ ...filter, to: '2026-03-31' })).toHaveProperty('to');
  expect(validateAnalyticsFilter({ ...filter, to: filter.from })).toEqual({});
});
it('recognizes pending filters across all four dimensions', () => {
  expect(sameAnalyticsFilter(filter, { ...filter })).toBe(true);
  for (const key of ['courseCode', 'from', 'to', 'quizId']) expect(sameAnalyticsFilter(filter, { ...filter, [key]: 'other' })).toBe(false);
});
it('labels periods and names the CSV like the server', () => {
  expect(periodLabel(filter)).toBe('01/04/2026 – 30/04/2026');
  expect(periodLabel({ from: '2026-04-01', to: '' })).toBe('Desde 01/04/2026');
  expect(periodLabel({ from: '', to: '2026-04-30' })).toBe('Hasta 30/04/2026');
  expect(analyticsCsvName(filter, '2026-1')).toBe('vista-analitica-CEDI-G1-2026-04-01-2026-04-30.csv');
  expect(analyticsCsvName(emptyAnalyticsFilter('CEDI-G1'), '2026-1')).toBe('vista-analitica-CEDI-G1-2026-1.csv');
  expect(analyticsCsvName({ ...filter, to: '' }, '2026-1')).toBe('vista-analitica-CEDI-G1-2026-04-01-hoy.csv');
});
it('formats metrics, durations and levels without inventing zeros', () => {
  expect(analyticsDateLabel('2026-04-30')).toBe('30/04/2026');
  expect(structureLabel('arbol_avl')).toBe('Árbol AVL');
  expect(structureLabel('nuevo_tipo')).toBe('nuevo tipo');
  expect(metricNumber(6.5)).toBe('6,5');
  expect(percent(.384)).toBe('38 %');
  expect(percent(null)).toBe('—');
  expect(duration(48)).toBe('48 s');
  expect(duration(72)).toBe('1 min 12 s');
  expect(duration(120)).toBe('2 min');
  expect(duration(null)).toBe('—');
  expect(levelLabel.DIFICIL.label).toBe('Cuesta trabajo');
  expect(levelLabel.DOMINADO.tone).toBe('success');
});
