import { expect, it } from 'vitest';
import { analyticsDateLabel, defaultAnalyticsDates, metricNumber, sameAnalyticsFilter, structureLabel, validateAnalyticsFilter } from './analytics';
const filter = { courseCode: 'CEDI-G1', from: '2026-04-01', to: '2026-04-30' };
it('uses Bogotá civil dates even when UTC is in the next month', () => {
  expect(defaultAnalyticsDates(new Date('2026-05-01T02:00:00Z'))).toEqual({ from: '2026-04-01', to: '2026-04-30' });
});
it('rejects impossible dates, missing fields and reversed periods', () => {
  expect(validateAnalyticsFilter(filter)).toEqual({});
  for (const value of ['', '0000-01-01', '2026-02-30', '2026-13-01', 'abc']) {
    expect(validateAnalyticsFilter({ ...filter, from: value }).from).toBeTruthy();
    expect(validateAnalyticsFilter({ ...filter, to: value }).to).toBeTruthy();
  }
  expect(validateAnalyticsFilter({ ...filter, courseCode: '', to: '2026-03-31' })).toHaveProperty('courseCode');
  expect(validateAnalyticsFilter({ ...filter, to: '2026-03-31' })).toHaveProperty('to');
  expect(validateAnalyticsFilter({ ...filter, to: filter.from })).toEqual({});
});
it('recognizes pending filters across all three dimensions', () => {
  expect(sameAnalyticsFilter(filter, { ...filter })).toBe(true);
  for (const key of ['courseCode', 'from', 'to']) expect(sameAnalyticsFilter(filter, { ...filter, [key]: 'other' })).toBe(false);
});
it('formats metrics without converting suppressed values to zero', () => {
  expect(analyticsDateLabel('2026-04-30')).toBe('30/04/2026');
  expect(structureLabel('arbol_avl')).toBe('Árbol AVL');
  expect(structureLabel('nuevo_tipo')).toBe('nuevo tipo');
  expect(metricNumber(6.5)).toBe('6,5');
});
